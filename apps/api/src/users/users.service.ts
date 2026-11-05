import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { UserStatus } from '../generated/prisma/enums.js';
import { toAdminUserDto, toUserDto, type AdminUserDto, type UserDto } from './user.dto.js';
import type {
  AdminUsersPageDto,
  AdminUsersQueryDto,
  UpdateMeDto,
} from './users.dto.js';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCurrent(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw userNotFound();
    }
    return toUserDto(user);
  }

  async updateCurrent(userId: string, input: UpdateMeDto): Promise<UserDto> {
    if (input.displayName === undefined && input.locale === undefined) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        title: 'Validation failed',
        detail: 'At least one profile field must be provided.',
        fieldErrors: [
          {
            field: 'body',
            code: 'AT_LEAST_ONE_FIELD_REQUIRED',
            message: 'Provide displayName or locale.',
          },
        ],
      });
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
      },
      select: SAFE_USER_SELECT,
    });
    return toUserDto(user);
  }

  async listAdminUsers(query: AdminUsersQueryDto): Promise<AdminUsersPageDto> {
    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { displayName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const orderBy = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' as const }
      : { [query.sort]: 'asc' as const };
    const [users, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: SAFE_USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: users.map(toAdminUserDto),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  async getAdminUser(userId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw userNotFound();
    }
    return toAdminUserDto(user);
  }

  async updateStatus(
    actor: AuthPrincipal,
    userId: string,
    status: UserStatus,
  ): Promise<AdminUserDto> {
    if (actor.userId === userId && status === UserStatus.SUSPENDED) {
      throw new ConflictException({
        code: 'ADMIN_SELF_SUSPEND_FORBIDDEN',
        title: 'Conflict',
        detail: 'An admin cannot suspend their own account.',
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) {
      throw userNotFound();
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: userId },
        data: { status },
        select: SAFE_USER_SELECT,
      });
      if (status === UserStatus.SUSPENDED) {
        await transaction.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
    return toAdminUserDto(updated);
  }
}

function userNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'USER_NOT_FOUND',
    title: 'Not found',
    detail: 'The requested user does not exist.',
  });
}
