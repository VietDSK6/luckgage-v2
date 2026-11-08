export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN';
  status: 'ACTIVE';
  locale: 'vi' | 'en';
};

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  locale: 'vi' | 'en';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type ManagedUserDetail = ManagedUser & {
  ownedTripCount: number;
  activeMembershipCount: number;
  activeSessionCount: number;
  lastSessionActivityAt: string | null;
};

export type UsersPage = {
  items: ManagedUser[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UsersQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sort?: 'createdAt' | '-createdAt' | 'email' | '-email';
};

export type DashboardSummary = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalTrips: number;
  activeTrips: number;
  joinsLast7Days: number;
  publishedPackingRules: number;
  publishedTripSuggestions: number;
  generatedAt: string;
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
