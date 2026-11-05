import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRole } from '../generated/prisma/enums.js';
import type { RequestWithContext } from '../http/request-context.js';
import { ROLES_KEY } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.header('authorization');
    const [scheme, token, extra] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw new UnauthorizedException({
        code: 'ACCESS_TOKEN_REQUIRED',
        title: 'Unauthorized',
        detail: 'A valid bearer access token is required.',
      });
    }
    request.auth = await this.authService.authenticateAccessToken(token);
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.auth || !roles.includes(request.auth.role)) {
      throw new ForbiddenException({
        code: 'ROLE_FORBIDDEN',
        title: 'Forbidden',
        detail: 'The authenticated account does not have the required role.',
      });
    }
    return true;
  }
}
