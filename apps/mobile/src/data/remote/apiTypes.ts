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

export type ApiTripType =
  | 'LEISURE'
  | 'BUSINESS'
  | 'CAMPING'
  | 'BEACH'
  | 'HIKING'
  | 'CITY_TRIP'
  | 'ROAD_TRIP'
  | 'INTERNATIONAL'
  | 'OTHER';

export type ApiDestination = {
  label: string;
  providerPlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  countryCode: string | null;
  adminArea: string | null;
  country: string | null;
};

export type ApiLocation = Omit<ApiDestination, 'providerPlaceId'> & {
  id: string;
};

export type ApiLocationsResponse = {
  items: ApiLocation[];
};

export type ApiTripMemberRole = 'OWNER' | 'MEMBER';

export type ApiMemberPreview = {
  userId: string;
  displayName: string;
  role: ApiTripMemberRole;
};

export type ApiChecklistProgress = {
  packedItems: number;
  totalItems: number;
  percentage: number;
};

export type ApiTrip = {
  id: string;
  name: string;
  destination: ApiDestination;
  startDate: string;
  endDate: string;
  tripType: ApiTripType;
  timelineStatus: 'UPCOMING' | 'ACTIVE' | 'PAST';
  daysUntilStart: number;
  checklistProgress: ApiChecklistProgress;
  memberPreview: ApiMemberPreview[];
  currentUserRole: ApiTripMemberRole;
  version: number;
  updatedAt: string;
  note?: string | null;
  weather?: { status: 'UNAVAILABLE' };
};

export type ApiTripsPage = {
  items: ApiTrip[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ApiChecklistItem = {
  id: string;
  name: string;
  quantity: number;
  isPacked: boolean;
  note: string | null;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiChecklistCategory = {
  id: string;
  name: string;
  position: number;
  version: number;
  items: ApiChecklistItem[];
};

export type ApiChecklist = {
  tripId: string;
  categories: ApiChecklistCategory[];
};

export type ApiWeatherStatus = 'FRESH' | 'CACHED' | 'UNAVAILABLE';

export type ApiWeatherResponse = {
  status: ApiWeatherStatus;
  fetchedAt: string | null;
  daily: {
    date: string;
    weatherCode: number;
    highTemperatureCelsius: number;
    lowTemperatureCelsius: number;
    rainChancePercent: number;
  }[];
  lowTemperatureCelsius: number | null;
  highTemperatureCelsius: number | null;
  rainChancePercent: number | null;
};

export type ApiPackingPreview = {
  source: 'RULE_BASED';
  sourceLabel: string;
  generatedAt: string;
  weatherStatus: ApiWeatherStatus;
  categories: {
    clientKey: string;
    name: string;
    items: {
      clientKey: string;
      name: string;
      quantity: number;
      note: string | null;
      reason: string;
      matchedRules: { ruleId: string; version: number }[];
    }[];
  }[];
};

export type ApiPackingApplyResponse = {
  addedCategoryCount: number;
  addedItemCount: number;
};

export type ApiInvitePreview = {
  tripId: string;
  tripName: string;
  destinationLabel: string;
  startDate: string;
  endDate: string;
  ownerDisplayName: string;
  memberCount: number;
  expiresAt: string;
};

export type ApiTripMember = {
  userId: string;
  displayName: string;
  role: ApiTripMemberRole;
  joinedAt: string;
};

export type ApiTripMembers = {
  items: ApiTripMember[];
};

export type ApiInviteCreated = {
  id: string;
  code: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
};
