import type { AuthSessionKind, UserLocale, UserRole, UserStatus } from '../generated/prisma/enums.js';

export type AuthPrincipal = {
  userId: string;
  sessionId: string;
  sessionFamilyId: string;
  sessionKind: AuthSessionKind;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  locale: UserLocale;
};
