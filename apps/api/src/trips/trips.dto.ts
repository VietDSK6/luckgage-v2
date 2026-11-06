import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { TripMemberRole, TripType } from '../generated/prisma/enums.js';

export enum TimelineStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  PAST = 'PAST',
}

export class DestinationInputDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 160 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 160)
  label!: string;

  @ApiPropertyOptional({ type: String, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerPlaceId?: string;

  @ApiPropertyOptional({ type: Number, minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ type: Number, minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ type: String, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ type: String, pattern: '^[A-Z]{2}$' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adminArea?: string;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class CreateTripDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiProperty({ type: () => DestinationInputDto })
  @ValidateNested()
  @Type(() => DestinationInputDto)
  destination!: DestinationInputDto;

  @ApiProperty({ type: String, format: 'date', example: '2026-12-10' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-12-13' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @ApiProperty({ enum: TripType, enumName: 'TripType' })
  @IsEnum(TripType)
  tripType!: TripType;

  @ApiPropertyOptional({ type: String, maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class UpdateTripDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ type: () => DestinationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DestinationInputDto)
  destination?: DestinationInputDto;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional({ enum: TripType, enumName: 'TripType' })
  @IsOptional()
  @IsEnum(TripType)
  tripType?: TripType;

  @ApiPropertyOptional({ type: String, maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class TripsQueryDto {
  @ApiPropertyOptional({ enum: TimelineStatus, enumName: 'TimelineStatus' })
  @IsOptional()
  @IsEnum(TimelineStatus)
  status?: TimelineStatus;

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
}

export class DestinationDto {
  @ApiProperty({ type: String })
  label!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  providerPlaceId!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  longitude!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  timezone!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  countryCode!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  adminArea!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  country!: string | null;
}

export class ChecklistProgressDto {
  @ApiProperty({ type: Number })
  packedItems!: number;

  @ApiProperty({ type: Number })
  totalItems!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100 })
  percentage!: number;
}

export class MemberPreviewDto {
  @ApiProperty({ type: String, format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiProperty({ enum: TripMemberRole, enumName: 'TripMemberRole' })
  role!: TripMemberRole;
}

export class TripListItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: () => DestinationDto })
  destination!: DestinationDto;

  @ApiProperty({ type: String, format: 'date' })
  startDate!: string;

  @ApiProperty({ type: String, format: 'date' })
  endDate!: string;

  @ApiProperty({ enum: TripType, enumName: 'TripType' })
  tripType!: TripType;

  @ApiProperty({ enum: TimelineStatus, enumName: 'TimelineStatus' })
  timelineStatus!: TimelineStatus;

  @ApiProperty({ type: Number })
  daysUntilStart!: number;

  @ApiProperty({ type: () => ChecklistProgressDto })
  checklistProgress!: ChecklistProgressDto;

  @ApiProperty({ type: () => [MemberPreviewDto] })
  memberPreview!: MemberPreviewDto[];

  @ApiProperty({ enum: TripMemberRole, enumName: 'TripMemberRole' })
  currentUserRole!: TripMemberRole;

  @ApiProperty({ type: Number })
  version!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class TripDetailDto extends TripListItemDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ type: Object, example: { status: 'UNAVAILABLE' } })
  weather!: { status: 'UNAVAILABLE' };
}

export class TripsPageDto {
  @ApiProperty({ type: () => [TripListItemDto] })
  items!: TripListItemDto[];

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  pageSize!: number;

  @ApiProperty({ type: Number })
  totalItems!: number;

  @ApiProperty({ type: Number })
  totalPages!: number;
}
