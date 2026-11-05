import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';

import type { UserRole } from '../generated/prisma/enums.js';
import type { RequestWithContext } from '../http/request-context.js';
import type { AuthPrincipal } from './auth.types.js';

export const ROLES_KEY = Symbol('ROLES_KEY');

export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.auth) {
      throw new Error('CurrentUser requires an authentication guard.');
    }
    return request.auth;
  },
);
