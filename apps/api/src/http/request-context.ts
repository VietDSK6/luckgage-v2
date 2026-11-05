import type { Request } from 'express';

import type { AuthPrincipal } from '../auth/auth.types.js';

export type RequestWithContext = Request & {
  requestId?: string;
  auth?: AuthPrincipal;
};
