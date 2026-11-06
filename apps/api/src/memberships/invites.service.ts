import { createHash, randomInt } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { dateToCalendarDate } from '../common/calendar-date.js';
import { PrismaService } from '../database/prisma.service.js';
import { TripMemberRole, UserStatus } from '../generated/prisma/enums.js';
import type {
  CreateInviteDto,
  InviteCreatedDto,
  InvitePreviewDto,
} from './memberships.dto.js';
import { MembershipsService } from './memberships.service.js';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SERIALIZABLE_RETRIES = 3;

@Injectable()
export class InvitesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
  ) {}

  async create(
    ownerUserId: string,
    tripId: string,
    input: CreateInviteDto,
  ): Promise<InviteCreatedDto> {
    await this.memberships.requireOwner(ownerUserId, tripId);
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3_600_000);
    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        codeHash: hashInviteCode(code),
        codeHint: code.slice(-2),
        createdByUserId: ownerUserId,
        expiresAt,
        maxUses: input.maxUses,
      },
    });
    return {
      id: invite.id,
      code,
      expiresAt: invite.expiresAt.toISOString(),
      maxUses: invite.maxUses,
      useCount: invite.useCount,
    };
  }

  async revoke(ownerUserId: string, tripId: string, inviteId: string): Promise<void> {
    await this.memberships.requireOwner(ownerUserId, tripId);
    const updated = await this.prisma.tripInvite.updateMany({
      where: { id: inviteId, tripId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) {
      const exists = await this.prisma.tripInvite.count({ where: { id: inviteId, tripId } });
      if (exists === 0) {
        throw new NotFoundException({
          code: 'INVITE_NOT_FOUND',
          title: 'Not found',
          detail: 'The trip invite does not exist.',
        });
      }
    }
  }

  async preview(code: string): Promise<InvitePreviewDto> {
    const invite = await this.prisma.tripInvite.findUnique({
      where: { codeHash: hashInviteCode(code) },
      include: {
        trip: {
          include: {
            members: {
              where: { removedAt: null },
              select: {
                role: true,
                user: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });
    this.assertUsable(invite);
    const owner = invite.trip.members.find((member) => member.role === TripMemberRole.OWNER);
    if (!owner) {
      throw invalidInvite();
    }
    return {
      tripId: invite.trip.id,
      tripName: invite.trip.name,
      destinationLabel: invite.trip.destinationLabel,
      startDate: dateToCalendarDate(invite.trip.startDate),
      endDate: dateToCalendarDate(invite.trip.endDate),
      ownerDisplayName: owner.user.displayName,
      memberCount: invite.trip.members.length,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async join(userId: string, code: string): Promise<string> {
    for (let attempt = 1; attempt <= SERIALIZABLE_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const invite = await transaction.tripInvite.findUnique({
              where: { codeHash: hashInviteCode(code) },
            });
            if (!invite) {
              throw invalidInvite();
            }
            const user = await transaction.user.findUnique({
              where: { id: userId },
              select: { status: true },
            });
            if (!user || user.status !== UserStatus.ACTIVE) {
              throw new BadRequestException({
                code: 'JOIN_USER_INACTIVE',
                title: 'Join unavailable',
                detail: 'The account cannot join this trip.',
              });
            }
            const membership = await transaction.tripMember.findUnique({
              where: { tripId_userId: { tripId: invite.tripId, userId } },
            });
            if (membership && !membership.removedAt) {
              return invite.tripId;
            }
            this.assertUsable(invite);
            if (membership) {
              await transaction.tripMember.update({
                where: { tripId_userId: { tripId: invite.tripId, userId } },
                data: {
                  role: TripMemberRole.MEMBER,
                  joinedAt: new Date(),
                  removedAt: null,
                },
              });
            } else {
              await transaction.tripMember.create({
                data: { tripId: invite.tripId, userId, role: TripMemberRole.MEMBER },
              });
            }
            await transaction.tripInvite.update({
              where: { id: invite.id },
              data: { useCount: { increment: 1 } },
            });
            return invite.tripId;
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if (hasPrismaCode(error, 'P2034') && attempt < SERIALIZABLE_RETRIES) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Invite join retry loop ended unexpectedly.');
  }

  private assertUsable<T extends {
    revokedAt: Date | null;
    expiresAt: Date;
    useCount: number;
    maxUses: number;
  }>(invite: T | null): asserts invite is T {
    if (!invite) {
      throw invalidInvite();
    }
    if (invite.revokedAt) {
      throw new BadRequestException({
        code: 'INVITE_REVOKED',
        title: 'Invite unavailable',
        detail: 'This invite has been revoked.',
      });
    }
    if (invite.expiresAt <= new Date()) {
      throw new BadRequestException({
        code: 'INVITE_EXPIRED',
        title: 'Invite expired',
        detail: 'This invite has expired.',
      });
    }
    if (invite.useCount >= invite.maxUses) {
      throw new BadRequestException({
        code: 'INVITE_MAX_USES_REACHED',
        title: 'Invite unavailable',
        detail: 'This invite has reached its maximum number of uses.',
      });
    }
  }
}

function generateInviteCode(): string {
  let value = 'LUCK-';
  for (let index = 0; index < 8; index += 1) {
    value += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return value;
}

function hashInviteCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

function invalidInvite(): NotFoundException {
  return new NotFoundException({
    code: 'INVITE_INVALID',
    title: 'Invite not found',
    detail: 'The invite code is invalid.',
  });
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'code') === code;
}
