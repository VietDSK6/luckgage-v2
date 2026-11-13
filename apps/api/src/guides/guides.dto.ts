import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

import { ContentStatus } from '../generated/prisma/enums.js';
import { ApiLocale } from '../weather/weather.dto.js';

export type GuideSection =
  | { type: 'heading' | 'paragraph' | 'callout'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'bulletList'; items: string[] };

export class GuideInputDto {
  @ApiProperty({ type: String }) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(100) slug!: string;
  @ApiProperty({ type: String }) @Length(1, 160) titleVi!: string;
  @ApiProperty({ type: String }) @Length(1, 160) titleEn!: string;
  @ApiProperty({ type: String }) @Length(1, 500) summaryVi!: string;
  @ApiProperty({ type: String }) @Length(1, 500) summaryEn!: string;
  @ApiProperty({ type: String }) @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) coverUrl!: string;
  @ApiProperty({ type: String }) @Length(1, 200) coverAltVi!: string;
  @ApiProperty({ type: String }) @Length(1, 200) coverAltEn!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 40, { each: true }) tags!: string[];
  @ApiProperty({ type: [Object] }) @IsArray() @ArrayMaxSize(30) sectionsVi!: GuideSection[];
  @ApiProperty({ type: [Object] }) @IsArray() @ArrayMaxSize(30) sectionsEn!: GuideSection[];
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsUUID() tripSuggestionId?: string | null;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() sortOrder?: number;
}

export class GuideQueryDto {
  @ApiPropertyOptional({ enum: ApiLocale }) @IsOptional() @IsEnum(ApiLocale) locale: ApiLocale = ApiLocale.vi;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class GuideListItemDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: String }) coverUrl!: string;
  @ApiProperty({ type: String }) coverAlt!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ type: Boolean }) isSaved!: boolean;
}

export class GuideDetailDto extends GuideListItemDto {
  @ApiProperty({ type: [Object] }) sections!: GuideSection[];
  @ApiPropertyOptional({ type: String, nullable: true }) relatedSuggestionSlug!: string | null;
}

export class GuidePageDto {
  @ApiProperty({ type: [GuideListItemDto] }) items!: GuideListItemDto[];
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
  @ApiProperty({ type: Number }) totalItems!: number;
  @ApiProperty({ type: Number }) totalPages!: number;
}

export class AdminGuideDto extends GuideInputDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ enum: ContentStatus }) status!: ContentStatus;
  @ApiPropertyOptional({ type: String, nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: String }) updatedAt!: string;
}

export class AdminGuidePageDto {
  @ApiProperty({ type: [AdminGuideDto] }) items!: AdminGuideDto[];
}
