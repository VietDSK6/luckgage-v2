import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { UserLocale, UserStatus } from '../generated/prisma/enums.js';
import { AdminUserDto } from './user.dto.js';

export class UpdateMeDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @ApiPropertyOptional({ enum: UserLocale, enumName: 'UserLocale' })
  @IsOptional()
  @IsEnum(UserLocale)
  locale?: UserLocale;
}

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', '-createdAt', 'email', '-email'],
    default: '-createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', '-createdAt', 'email', '-email'])
  sort: 'createdAt' | '-createdAt' | 'email' | '-email' = '-createdAt';
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class AdminUsersPageDto {
  @ApiProperty({ type: () => [AdminUserDto] })
  items!: AdminUserDto[];

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  pageSize!: number;

  @ApiProperty({ type: Number })
  totalItems!: number;

  @ApiProperty({ type: Number })
  totalPages!: number;
}
