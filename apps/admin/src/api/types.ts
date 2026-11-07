export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN';
  status: 'ACTIVE';
  locale: 'vi' | 'en';
};

export type AdminSession = {
  user: AdminUser;
  csrfToken: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type FieldError = {
  field: string;
  code: string;
  message: string;
};

export type ProblemDetails = {
  status: number;
  code: string;
  title: string;
  detail: string;
  requestId: string;
  fieldErrors?: FieldError[];
};
