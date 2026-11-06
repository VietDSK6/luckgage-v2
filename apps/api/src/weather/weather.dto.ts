import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length } from 'class-validator';

export enum WeatherStatus {
  FRESH = 'FRESH',
  CACHED = 'CACHED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ApiLocale {
  vi = 'vi',
  en = 'en',
}

export class LocationSearchQueryDto {
  @ApiProperty({ type: String, minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  q!: string;

  @ApiProperty({ enum: ApiLocale, enumName: 'ApiLocale', default: ApiLocale.vi })
  @IsEnum(ApiLocale)
  locale: ApiLocale = ApiLocale.vi;
}

export class LocationDto {
  @ApiProperty({ type: String })
  id!: string;
  @ApiProperty({ type: String })
  label!: string;
  @ApiProperty({ type: Number })
  latitude!: number;
  @ApiProperty({ type: Number })
  longitude!: number;
  @ApiProperty({ type: String })
  timezone!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  countryCode!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  adminArea!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  country!: string | null;
}

export class LocationsResponseDto {
  @ApiProperty({ type: () => [LocationDto] })
  items!: LocationDto[];
}

export class WeatherDayDto {
  @ApiProperty({ type: String, format: 'date' })
  date!: string;
  @ApiProperty({ type: Number })
  weatherCode!: number;
  @ApiProperty({ type: Number })
  highTemperatureCelsius!: number;
  @ApiProperty({ type: Number })
  lowTemperatureCelsius!: number;
  @ApiProperty({ type: Number })
  rainChancePercent!: number;
}

export class WeatherResponseDto {
  @ApiProperty({ enum: WeatherStatus, enumName: 'WeatherStatus' })
  status!: WeatherStatus;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  fetchedAt!: string | null;
  @ApiProperty({ type: () => [WeatherDayDto] })
  daily!: WeatherDayDto[];
  @ApiPropertyOptional({ type: Number, nullable: true })
  lowTemperatureCelsius!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  highTemperatureCelsius!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  rainChancePercent!: number | null;
}
