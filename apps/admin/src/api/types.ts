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

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuantityMode = 'FIXED' | 'PER_DAY';
export type TripType =
  | 'LEISURE'
  | 'BUSINESS'
  | 'CAMPING'
  | 'BEACH'
  | 'HIKING'
  | 'CITY_TRIP'
  | 'ROAD_TRIP'
  | 'INTERNATIONAL'
  | 'OTHER';

export type PackingRuleItem = {
  categoryKey: string;
  categoryNameVi: string;
  categoryNameEn: string;
  itemKey: string;
  itemNameVi: string;
  itemNameEn: string;
  quantityMode: QuantityMode;
  baseQuantity: number;
  noteVi?: string | null;
  noteEn?: string | null;
  position?: number;
};

export type PackingRuleInput = {
  key: string;
  name: string;
  priority: number;
  tripType?: TripType | null;
  minDays?: number | null;
  maxDays?: number | null;
  minTempC?: number | null;
  maxTempC?: number | null;
  minRainPercent?: number | null;
  activityKey?: string | null;
  reasonVi: string;
  reasonEn: string;
  items: PackingRuleItem[];
};

export type PackingRule = {
  id: string;
  key: string;
  name: string;
  status: ContentStatus;
  version: number;
  priority: number;
  items: PackingRuleItem[];
  conditions: {
    tripType: TripType | null;
    minDays: number | null;
    maxDays: number | null;
    minTempC: number | null;
    maxTempC: number | null;
    minRainPercent: number | null;
    activityKey: string | null;
  };
  reasonVi: string;
  reasonEn: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type PackingRuleSample = {
  tripType: TripType;
  durationDays: number;
  activities: string[];
  lowTemperatureCelsius?: number;
  highTemperatureCelsius?: number;
  rainChancePercent?: number;
  locale: 'vi' | 'en';
};

export type PackingPreview = {
  source: 'RULE_BASED';
  sourceLabel: string;
  generatedAt: string;
  weatherStatus: 'FRESH' | 'CACHED' | 'UNAVAILABLE';
  categories: Array<{
    clientKey: string;
    name: string;
    items: Array<{
      clientKey: string;
      name: string;
      quantity: number;
      note: string | null;
      reason: string;
      matchedRules: Array<{ ruleId: string; version: number }>;
    }>;
  }>;
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
