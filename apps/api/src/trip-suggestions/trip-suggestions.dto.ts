import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ContentStatus, TripType } from '../generated/prisma/enums.js';
import { ApiLocale } from '../weather/weather.dto.js';

export class CreateTripSuggestionDto {
  @ApiProperty({ type: String })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ type: String }) @Length(1, 160) titleVi!: string;
  @ApiProperty({ type: String }) @Length(1, 160) titleEn!: string;
  @ApiProperty({ type: String }) @Length(1, 500) summaryVi!: string;
  @ApiProperty({ type: String }) @Length(1, 500) summaryEn!: string;
  @ApiProperty({ type: String }) @Length(1, 160) destinationLabel!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @MaxLength(160) providerPlaceId?: string;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsLatitude() latitude?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsLongitude() longitude?: number;
  @ApiPropertyOptional({ type: String }) @IsOptional() @MaxLength(64) destinationTimezone?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @MaxLength(100) adminArea?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @MaxLength(100) country?: string;
  @ApiProperty({ type: String }) @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) imageUrl!: string;
  @ApiProperty({ type: String }) @Length(1, 200) imageAltVi!: string;
  @ApiProperty({ type: String }) @Length(1, 200) imageAltEn!: string;
  @ApiProperty({ type: [String], maxItems: 20 })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? (value as unknown[]).map((tag: unknown) =>
          typeof tag === 'string' ? tag.trim() : tag,
        )
      : value,
  )
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 40, { each: true })
  tags!: string[];
  @ApiPropertyOptional({ enum: TripType, nullable: true }) @IsOptional() @IsEnum(TripType) tripType?: TripType | null;
  @ApiProperty({ type: Number, minimum: 1, maximum: 30 }) @IsInt() @Min(1) @Max(30) suggestedDurationDays!: number;
  @ApiPropertyOptional({ type: Number, default: 0 }) @IsOptional() @IsInt() sortOrder = 0;
}

export class UpdateTripSuggestionDto {
  @ApiPropertyOptional({ type: String }) @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(100) slug?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 160) titleVi?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 160) titleEn?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 500) summaryVi?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 500) summaryEn?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 160) destinationLabel?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @MaxLength(160) providerPlaceId?: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsLatitude() latitude?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsLongitude() longitude?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @MaxLength(64) destinationTimezone?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @MaxLength(100) adminArea?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @MaxLength(100) country?: string | null;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) imageUrl?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 200) imageAltVi?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Length(1, 200) imageAltEn?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? (value as unknown[]).map((tag: unknown) =>
          typeof tag === 'string' ? tag.trim() : tag,
        )
      : value,
  )
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 40, { each: true })
  tags?: string[];
  @ApiPropertyOptional({ enum: TripType, nullable: true }) @IsOptional() @IsEnum(TripType) tripType?: TripType | null;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() @Min(1) @Max(30) suggestedDurationDays?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() sortOrder?: number;
}

export class TripSuggestionsQueryDto {
  @ApiPropertyOptional({ enum: ApiLocale, default: ApiLocale.vi }) @IsOptional() @IsEnum(ApiLocale) locale: ApiLocale = ApiLocale.vi;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(40) tag?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class TripSuggestionDetailQueryDto {
  @ApiPropertyOptional({ enum: ApiLocale, default: ApiLocale.vi })
  @IsOptional()
  @IsEnum(ApiLocale)
  locale: ApiLocale = ApiLocale.vi;
}

export class SuggestionDestinationDto {
  @ApiProperty({ type: String }) label!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) providerPlaceId!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) latitude!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) longitude!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) timezone!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) countryCode!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) adminArea!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) country!: string | null;
}

export class TripSuggestionImageDto {
  @ApiProperty({ type: String }) url!: string;
  @ApiProperty({ type: String }) alt!: string;
}

export class TripSuggestionPrefillDto {
  @ApiProperty({ type: () => SuggestionDestinationDto }) destination!: SuggestionDestinationDto;
  @ApiPropertyOptional({ enum: TripType, nullable: true }) tripType!: TripType | null;
  @ApiProperty({ type: Number }) suggestedDurationDays!: number;
}

export class TripSuggestionDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: () => TripSuggestionImageDto }) image!: TripSuggestionImageDto;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ type: () => TripSuggestionPrefillDto }) tripPrefill!: TripSuggestionPrefillDto;
}

export class TripSuggestionsPageDto {
  @ApiProperty({ type: () => [TripSuggestionDto] }) items!: TripSuggestionDto[];
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
  @ApiProperty({ type: Number }) total!: number;
}

export class AdminTripSuggestionDto extends CreateTripSuggestionDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ContentStatus }) status!: ContentStatus;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class AdminTripSuggestionsPageDto {
  @ApiProperty({ type: () => [AdminTripSuggestionDto] }) items!: AdminTripSuggestionDto[];
}
