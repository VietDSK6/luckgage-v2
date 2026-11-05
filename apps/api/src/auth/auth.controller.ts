import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import type { Environment } from '../config/environment.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import type { RequestWithContext } from '../http/request-context.js';
import { toUserDto, UserDto } from '../users/user.dto.js';
import {
  AdminCsrfGuard,
  AdminSessionGuard,
  clearAdminCookies,
  readAdminSessionCookie,
  setAdminCookies,
} from './admin-session.js';
import { CurrentUser } from './auth.decorators.js';
import { AdminLoginResponseDto, AuthResponseDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto.js';
import { JwtAuthGuard } from './auth.guards.js';
import { AuthRateLimit, AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import type { AuthPrincipal } from './auth.types.js';

const FIVE_MINUTES = 5 * 60_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'register',
    windowMs: FIVE_MINUTES,
    ipLimit: 10,
    identifierLimit: 5,
    identifierField: 'email',
  })
  @ApiOperation({ summary: 'Register a user and create a mobile session' })
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  @ApiUnprocessableEntityResponse({ type: ProblemDetailsDto })
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'login',
    windowMs: FIVE_MINUTES,
    ipLimit: 20,
    identifierLimit: 5,
    identifierField: 'email',
  })
  @ApiOperation({ summary: 'Create a mobile session' })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'refresh',
    windowMs: FIVE_MINUTES,
    ipLimit: 30,
    identifierLimit: 10,
    identifierField: 'refreshToken',
  })
  @ApiOperation({ summary: 'Rotate a mobile refresh token' })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  refresh(@Body() input: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current mobile session family' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  async logout(@CurrentUser() principal: AuthPrincipal): Promise<void> {
    await this.authService.logout(principal);
  }
}

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'admin-login',
    windowMs: FIVE_MINUTES,
    ipLimit: 10,
    identifierLimit: 5,
    identifierField: 'email',
  })
  @ApiOperation({ summary: 'Create a secure admin web session' })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminLoginResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminLoginResponseDto> {
    const result = await this.authService.loginAdmin(input);
    setAdminCookies(
      response,
      result.sessionToken,
      result.csrfToken,
      result.expiresAt,
      this.isProduction(),
    );
    return { user: toUserDto(result.user), csrfToken: result.csrfToken };
  }

  @Get('me')
  @UseGuards(AdminSessionGuard)
  @ApiCookieAuth('adminSession')
  @ApiOperation({ summary: 'Get the current admin profile' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  me(@CurrentUser() principal: AuthPrincipal): UserDto {
    return toUserDto({
      id: principal.userId,
      email: principal.email,
      displayName: principal.displayName,
      role: principal.role,
      status: principal.status,
      locale: principal.locale,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminSessionGuard, AdminCsrfGuard)
  @ApiCookieAuth('adminSession')
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOperation({ summary: 'Revoke the current admin web session' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAdmin(
      readAdminSessionCookie(request as RequestWithContext),
    );
    clearAdminCookies(response, this.isProduction());
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
