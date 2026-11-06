import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

import { TripMemberRole } from '../generated/prisma/enums.js';

export class CreateInviteDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: 168, default: 24 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours = 24;

  @ApiProperty({ type: Number, minimum: 1, maximum: 50, default: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxUses = 5;
}

export class InviteCodeDto {
  @ApiProperty({ type: String, example: 'LUCK-8K4M2P7Q' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(8, 32)
  code!: string;
}

export class InviteCreatedDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: Number })
  maxUses!: number;

  @ApiProperty({ type: Number })
  useCount!: number;
}

export class InvitePreviewDto {
  @ApiProperty({ type: String, format: 'uuid' })
  tripId!: string;

  @ApiProperty({ type: String })
  tripName!: string;

  @ApiProperty({ type: String })
  destinationLabel!: string;

  @ApiProperty({ type: String, format: 'date' })
  startDate!: string;

  @ApiProperty({ type: String, format: 'date' })
  endDate!: string;

  @ApiProperty({ type: String })
  ownerDisplayName!: string;

  @ApiProperty({ type: Number })
  memberCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;
}

export class TripMemberDto {
  @ApiProperty({ type: String, format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String })
  displayName!: string;

  @ApiProperty({ enum: TripMemberRole, enumName: 'TripMemberRole' })
  role!: TripMemberRole;

  @ApiProperty({ type: String, format: 'date-time' })
  joinedAt!: string;
}

export class TripMembersDto {
  @ApiProperty({ type: () => [TripMemberDto] })
  items!: TripMemberDto[];
}
