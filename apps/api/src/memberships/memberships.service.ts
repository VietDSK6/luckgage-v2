import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { TripMemberRole } from '../generated/prisma/enums.js';
import type { TripMemberDto } from './memberships.dto.js';

@Injectable()
export class MembershipsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async requireMember(userId: string, tripId: string): Promise<TripMemberRole> {
    const membership = await this.prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { role: true, removedAt: true },
    });
    if (!membership || membership.removedAt) {
      throw tripNotFound();
    }
    return membership.role;
  }

  async requireOwner(userId: string, tripId: string): Promise<void> {
    const role = await this.requireMember(userId, tripId);
    if (role !== TripMemberRole.OWNER) {
      throw new ForbiddenException({
        code: 'TRIP_OWNER_REQUIRED',
        title: 'Forbidden',
        detail: 'Only the trip owner can perform this action.',
      });
    }
  }

  async list(userId: string, tripId: string): Promise<TripMemberDto[]> {
    await this.requireMember(userId, tripId);
    const members = await this.prisma.tripMember.findMany({
      where: { tripId, removedAt: null },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: { select: { displayName: true } },
      },
    });
    return members.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    }));
  }

  async remove(ownerUserId: string, tripId: string, targetUserId: string): Promise<void> {
    await this.requireOwner(ownerUserId, tripId);
    const membership = await this.prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: targetUserId } },
    });
    if (!membership || membership.removedAt) {
      throw new NotFoundException({
        code: 'TRIP_MEMBER_NOT_FOUND',
        title: 'Not found',
        detail: 'The active trip member does not exist.',
      });
    }
    if (membership.role === TripMemberRole.OWNER) {
      throw new ConflictException({
        code: 'TRIP_OWNER_REMOVE_FORBIDDEN',
        title: 'Conflict',
        detail: 'The trip owner cannot be removed.',
      });
    }
    await this.prisma.tripMember.update({
      where: { tripId_userId: { tripId, userId: targetUserId } },
      data: { removedAt: new Date() },
    });
  }
}

export function tripNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'TRIP_NOT_FOUND',
    title: 'Not found',
    detail: 'The trip does not exist or is not available to this account.',
  });
}
