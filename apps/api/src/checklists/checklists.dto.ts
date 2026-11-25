import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ChecklistProgressDto } from '../trips/trips.dto.js';

export class CreateChecklistCategoryDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateChecklistCategoryDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateChecklistItemDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 99, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity = 1;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}

export class UpdateChecklistItemDto {
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

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isPacked?: boolean;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}

export class ImportChecklistItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  sourceItemId!: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class ImportChecklistDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  sourceTripId!: string;

  @ApiProperty({ type: () => [ImportChecklistItemDto], minItems: 1, maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportChecklistItemDto)
  items!: ImportChecklistItemDto[];
}

export class PackedStateDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isPacked!: boolean;
}

export class ChecklistItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Number })
  quantity!: number;

  @ApiProperty({ type: Boolean })
  isPacked!: boolean;

  @ApiProperty({ type: Boolean })
  isEssential!: boolean;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  assignedToUserId!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Member who last changed the packed state',
  })
  packedChangedByUserId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ type: Number })
  position!: number;

  @ApiProperty({ type: Number })
  version!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class ChecklistCategoryDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Number })
  position!: number;

  @ApiProperty({ type: Number })
  version!: number;

  @ApiProperty({ type: () => [ChecklistItemDto] })
  items!: ChecklistItemDto[];
}

export class ChecklistDto {
  @ApiProperty({ type: String, format: 'uuid' })
  tripId!: string;

  @ApiProperty({ type: () => ChecklistProgressDto })
  progress!: ChecklistProgressDto;

  @ApiProperty({ type: () => [ChecklistCategoryDto] })
  categories!: ChecklistCategoryDto[];
}
