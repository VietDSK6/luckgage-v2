export type ApiLocale = 'vi' | 'en';
export type ApiUserRole = 'USER' | 'ADMIN';
export type ApiUserStatus = 'ACTIVE' | 'SUSPENDED';

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  locale: ApiLocale;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AuthResponsePayload = {
  user: ApiUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AuthSession = {
  user: ApiUser;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type ApiFieldError = {
  field: string;
  code: string;
  message: string;
};

export type ApiProblem = {
  status: number;
  code: string;
  title: string;
  detail: string;
  requestId?: string;
  fieldErrors?: ApiFieldError[];
};
