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

export type TripSuggestionInput = {
  slug: string;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  destinationLabel: string;
  providerPlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  destinationTimezone?: string | null;
  countryCode?: string | null;
  adminArea?: string | null;
  country?: string | null;
  imageUrl: string;
  imageAltVi: string;
  imageAltEn: string;
  tags: string[];
  tripType?: TripType | null;
  suggestedDurationDays: number;
  sortOrder: number;
};

export type TripSuggestion = TripSuggestionInput & {
  id: string;
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
};

export type GuideSection =
  | { type: 'heading' | 'paragraph' | 'callout'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'bulletList'; items: string[] };

export type GuideInput = {
  slug: string; titleVi: string; titleEn: string; summaryVi: string; summaryEn: string;
  coverUrl: string; coverAltVi: string; coverAltEn: string; tags: string[];
  sectionsVi: GuideSection[]; sectionsEn: GuideSection[];
  tripSuggestionId: string | null; sortOrder: number;
};

export type Guide = GuideInput & {
  id: string; status: ContentStatus; publishedAt: string | null; updatedAt: string;
};

export type AdminTripSupportItem = {
  id: string;
  name: string;
  destinationLabel: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  timelineStatus: 'UPCOMING' | 'ACTIVE' | 'PAST';
  ownerDisplayName: string;
  memberCount: number;
  checklistProgress: { packedItems: number; totalItems: number; percentage: number };
  createdAt: string;
  updatedAt: string;
};

export type AdminTripsPage = {
  items: AdminTripSupportItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminTripsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'UPCOMING' | 'ACTIVE' | 'PAST';
};

export type AdminLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string | null;
  adminArea: string | null;
  country: string | null;
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
