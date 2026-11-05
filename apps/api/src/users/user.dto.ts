import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserLocale, UserRole, UserStatus } from '../generated/prisma/enums.js';

export class UserDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email' })
  email!: string;

  @ApiProperty({ type: String, example: 'Mai' })
  displayName!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status!: UserStatus;

  @ApiProperty({ enum: UserLocale, enumName: 'UserLocale' })
  locale!: UserLocale;
}

export class AdminUserDto extends UserDto {
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLoginAt!: string | null;
}

export type PublicUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  locale: UserLocale;
};

export type UserRecord = PublicUserRecord & {
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export function toUserDto(user: PublicUserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    locale: user.locale,
  };
}

export function toAdminUserDto(user: UserRecord): AdminUserDto {
  return {
    ...toUserDto(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
