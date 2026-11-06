import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
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

import { ContentStatus, QuantityMode, TripType } from '../generated/prisma/enums.js';
import { ChecklistProgressDto } from '../trips/trips.dto.js';
import { ApiLocale, WeatherStatus } from '../weather/weather.dto.js';

export class PackingRuleItemInputDto {
  @ApiProperty({ type: String }) @Matches(/^[a-z0-9-]{1,80}$/) categoryKey!: string;
  @ApiProperty({ type: String }) @Length(1, 80) categoryNameVi!: string;
  @ApiProperty({ type: String }) @Length(1, 80) categoryNameEn!: string;
  @ApiProperty({ type: String }) @Matches(/^[a-z0-9-]{1,100}$/) itemKey!: string;
  @ApiProperty({ type: String }) @Length(1, 120) itemNameVi!: string;
  @ApiProperty({ type: String }) @Length(1, 120) itemNameEn!: string;
  @ApiProperty({ enum: QuantityMode, enumName: 'QuantityMode' })
  @IsEnum(QuantityMode)
  quantityMode: QuantityMode = QuantityMode.FIXED;
  @ApiProperty({ type: Number, minimum: 1, maximum: 99 })
  @IsInt() @Min(1) @Max(99) baseQuantity = 1;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) noteVi?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) noteEn?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) position = 0;
}

export class CreatePackingRuleDto {
  @ApiProperty({ type: String }) @Matches(/^[a-z0-9-]{1,80}$/) key!: string;
  @ApiProperty({ type: String }) @Length(1, 120) name!: string;
  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 10000 })
  @IsOptional() @IsInt() @Min(0) @Max(10_000) priority = 100;
  @ApiPropertyOptional({ enum: TripType, enumName: 'TripType', nullable: true })
  @IsOptional() @IsEnum(TripType) tripType?: TripType | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional() @IsInt() @Min(1) minDays?: number | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional() @IsInt() @Min(1) maxDays?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional() @IsNumber() minTempC?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional() @IsNumber() maxTempC?: number | null;
  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100, nullable: true })
  @IsOptional() @IsInt() @Min(0) @Max(100) minRainPercent?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 60 })
  @IsOptional() @IsString() @MaxLength(60) activityKey?: string | null;
  @ApiProperty({ type: String }) @Length(1, 240) reasonVi!: string;
  @ApiProperty({ type: String }) @Length(1, 240) reasonEn!: string;
  @ApiProperty({ type: () => [PackingRuleItemInputDto], minItems: 1, maxItems: 50 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => PackingRuleItemInputDto)
  items!: PackingRuleItemInputDto[];
}

export class UpdatePackingRuleDto {
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 120) name?: string;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() @Min(0) @Max(10_000) priority?: number;
  @ApiPropertyOptional({ enum: TripType, nullable: true }) @IsOptional() @IsEnum(TripType) tripType?: TripType | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsInt() @Min(1) minDays?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsInt() @Min(1) maxDays?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() minTempC?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() maxTempC?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(100) minRainPercent?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(60) activityKey?: string | null;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 240) reasonVi?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 240) reasonEn?: string;
  @ApiPropertyOptional({ type: () => [PackingRuleItemInputDto] })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => PackingRuleItemInputDto)
  items?: PackingRuleItemInputDto[];
}

export class RuleSampleDto {
  @ApiProperty({ enum: TripType, enumName: 'TripType' }) @IsEnum(TripType) tripType!: TripType;
  @ApiProperty({ type: Number, minimum: 1, maximum: 30 }) @IsInt() @Min(1) @Max(30) durationDays!: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) activities: string[] = [];
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() lowTemperatureCelsius?: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() highTemperatureCelsius?: number;
  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100, nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(100) rainChancePercent?: number;
  @ApiProperty({ enum: ApiLocale, enumName: 'ApiLocale', default: ApiLocale.vi }) @IsEnum(ApiLocale) locale: ApiLocale = ApiLocale.vi;
}

export class PackingRuleDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) key!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' }) status!: ContentStatus;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: Number }) priority!: number;
  @ApiProperty({ type: () => [PackingRuleItemInputDto] }) items!: PackingRuleItemInputDto[];
  @ApiProperty({ type: Object }) conditions!: Record<string, unknown>;
  @ApiProperty({ type: String }) reasonVi!: string;
  @ApiProperty({ type: String }) reasonEn!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class PackingRulesPageDto {
  @ApiProperty({ type: () => [PackingRuleDto] }) items!: PackingRuleDto[];
}

export class PackingPreviewRequestDto {
  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) activities: string[] = [];
  @ApiPropertyOptional({ type: String, maxLength: 1000 }) @IsOptional() @IsString() @MaxLength(1000) notes = '';
  @ApiProperty({ enum: ApiLocale, enumName: 'ApiLocale', default: ApiLocale.vi }) @IsEnum(ApiLocale) locale: ApiLocale = ApiLocale.vi;
}

export class MatchedRuleDto {
  @ApiProperty({ type: String, format: 'uuid' }) ruleId!: string;
  @ApiProperty({ type: Number }) version!: number;
}

export class PackingPreviewItemDto {
  @ApiProperty({ type: String }) clientKey!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Number }) quantity!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) note!: string | null;
  @ApiProperty({ type: String }) reason!: string;
  @ApiProperty({ type: () => [MatchedRuleDto] }) matchedRules!: MatchedRuleDto[];
}

export class PackingPreviewCategoryDto {
  @ApiProperty({ type: String }) clientKey!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: () => [PackingPreviewItemDto] }) items!: PackingPreviewItemDto[];
}

export class PackingPreviewDto {
  @ApiProperty({ type: String, example: 'RULE_BASED' }) source!: 'RULE_BASED';
  @ApiProperty({ type: String }) sourceLabel!: string;
  @ApiProperty({ type: String, format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ enum: WeatherStatus, enumName: 'WeatherStatus' }) weatherStatus!: WeatherStatus;
  @ApiProperty({ type: () => [PackingPreviewCategoryDto] }) categories!: PackingPreviewCategoryDto[];
}

export class ApplyPackingItemDto {
  @ApiProperty({ type: String }) @Length(1, 120) name!: string;
  @ApiProperty({ type: Number, minimum: 1, maximum: 99 }) @IsInt() @Min(1) @Max(99) quantity!: number;
  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true }) @IsOptional() @IsString() @MaxLength(500) note?: string | null;
}

export class ApplyPackingCategoryDto {
  @ApiProperty({ type: String }) @Length(1, 80) name!: string;
  @ApiProperty({ type: () => [ApplyPackingItemDto], maxItems: 100 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => ApplyPackingItemDto)
  items!: ApplyPackingItemDto[];
}

export class ApplyPackingRequestDto {
  @ApiProperty({ type: () => [ApplyPackingCategoryDto], maxItems: 25 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(25)
  @ValidateNested({ each: true }) @Type(() => ApplyPackingCategoryDto)
  categories!: ApplyPackingCategoryDto[];
}

export class ApplyPackingResponseDto {
  @ApiProperty({ type: Number }) addedCategoryCount!: number;
  @ApiProperty({ type: Number }) addedItemCount!: number;
  @ApiProperty({ type: () => ChecklistProgressDto }) checklistProgress!: ChecklistProgressDto;
}
