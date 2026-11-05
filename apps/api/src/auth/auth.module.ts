import { Module } from '@nestjs/common';

import { AdminAuthController, AuthController } from './auth.controller.js';
import { AdminCsrfGuard, AdminSessionGuard } from './admin-session.js';
import { JwtAuthGuard, RolesGuard } from './auth.guards.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

@Module({
  controllers: [AuthController, AdminAuthController],
  providers: [
    TokenService,
    AuthService,
    AuthRateLimitGuard,
    JwtAuthGuard,
    AdminSessionGuard,
    AdminCsrfGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, AdminSessionGuard, AdminCsrfGuard, RolesGuard],
})
export class AuthModule {}
