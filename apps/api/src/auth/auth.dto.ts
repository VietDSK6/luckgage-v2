import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserLocale } from '../generated/prisma/enums.js';
import { UserDto } from '../users/user.dto.js';

export class RegisterDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: String, format: 'password', minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @ApiProperty({ enum: UserLocale, enumName: 'UserLocale', default: UserLocale.vi })
  @IsEnum(UserLocale)
  locale: UserLocale = UserLocale.vi;
}

export class LoginDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: String, format: 'password', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ type: String, minLength: 32, maxLength: 512 })
  @IsString()
  @Length(32, 512)
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: () => UserDto })
  user!: UserDto;

  @ApiProperty({ type: String })
  accessToken!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  accessTokenExpiresAt!: string;

  @ApiProperty({ type: String })
  refreshToken!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  refreshTokenExpiresAt!: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({ type: () => UserDto })
  user!: UserDto;

  @ApiProperty({ type: String, description: 'Send as x-csrf-token on mutating admin requests.' })
  csrfToken!: string;
}
