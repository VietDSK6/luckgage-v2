import { daysBetween, dateToCalendarDate } from '../common/calendar-date.js';
import type { TripMemberRole, TripType } from '../generated/prisma/enums.js';
import type {
  ChecklistProgressDto,
  MemberPreviewDto,
  TimelineStatus,
  TripDetailDto,
  TripListItemDto,
} from './trips.dto.js';
import { TimelineStatus as TimelineStatusValues } from './trips.dto.js';

export type TripViewRecord = {
  id: string;
  name: string;
  destinationLabel: string;
  providerPlaceId: string | null;
  latitude: { toNumber(): number } | null;
  longitude: { toNumber(): number } | null;
  destinationTimezone: string | null;
  countryCode: string | null;
  adminArea: string | null;
  country: string | null;
  startDate: Date;
  endDate: Date;
  tripType: TripType;
  note: string | null;
  version: number;
  updatedAt: Date;
};

export function getTimelineStatus(
  startDate: string,
  endDate: string,
  today: string,
): TimelineStatus {
  if (today < startDate) {
    return TimelineStatusValues.UPCOMING;
  }
  if (today > endDate) {
    return TimelineStatusValues.PAST;
  }
  return TimelineStatusValues.ACTIVE;
}

export function toTripListItem(
  trip: TripViewRecord,
  role: TripMemberRole,
  progress: ChecklistProgressDto,
  memberPreview: MemberPreviewDto[],
  today: string,
): TripListItemDto {
  const startDate = dateToCalendarDate(trip.startDate);
  const endDate = dateToCalendarDate(trip.endDate);
  return {
    id: trip.id,
    name: trip.name,
    destination: {
      label: trip.destinationLabel,
      providerPlaceId: trip.providerPlaceId,
      latitude: trip.latitude?.toNumber() ?? null,
      longitude: trip.longitude?.toNumber() ?? null,
      timezone: trip.destinationTimezone,
      countryCode: trip.countryCode,
      adminArea: trip.adminArea,
      country: trip.country,
    },
    startDate,
    endDate,
    tripType: trip.tripType,
    timelineStatus: getTimelineStatus(startDate, endDate, today),
    daysUntilStart: daysBetween(today, startDate),
    checklistProgress: progress,
    memberPreview,
    currentUserRole: role,
    version: trip.version,
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export function toTripDetail(
  trip: TripViewRecord,
  role: TripMemberRole,
  progress: ChecklistProgressDto,
  memberPreview: MemberPreviewDto[],
  today: string,
): TripDetailDto {
  return {
    ...toTripListItem(trip, role, progress, memberPreview, today),
    note: trip.note,
    weather: { status: 'UNAVAILABLE' },
  };
}
