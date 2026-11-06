import {
  type CalendarDate,
  compareCalendarDates,
  differenceInCalendarDays,
  parseCalendarDate,
} from './calendarDate';

export const tripTypes = [
  'leisure',
  'business',
  'camping',
  'beach',
  'hiking',
  'cityTrip',
  'roadTrip',
  'international',
  'other',
] as const;

export type TripType = (typeof tripTypes)[number];

export type TripDestination = {
  label: string;
  providerPlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  countryCode: string | null;
  adminArea: string | null;
  country: string | null;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  destinationDetails?: TripDestination;
  startDate: CalendarDate;
  endDate: CalendarDate;
  tripType: TripType;
  note: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TripDraft = {
  name: string;
  destination: string;
  destinationDetails?: TripDestination;
  startDate: string;
  endDate: string;
  tripType: TripType;
  note: string;
};

export type NormalizedTripDraft = Omit<TripDraft, 'startDate' | 'endDate'> & {
  startDate: CalendarDate;
  endDate: CalendarDate;
  note: string;
};

export type TripDraftErrors = Partial<
  Record<'destination' | 'startDate' | 'endDate' | 'dateRange', 'required' | 'invalid' | 'reversed'>
>;

export type TripTimelineStatus = 'upcoming' | 'startsToday' | 'inProgress' | 'past';

export type TripTimeline = {
  status: TripTimelineStatus;
  daysUntilStart: number;
};

export type TripTimelineGroups = {
  current: Trip[];
  upcoming: Trip[];
  past: Trip[];
};

export function isTripType(value: string): value is TripType {
  return tripTypes.includes(value as TripType);
}

export function validateTripDraft(draft: TripDraft): {
  errors: TripDraftErrors;
  value: NormalizedTripDraft | null;
} {
  const destination = draft.destination.trim();
  const startDate = parseCalendarDate(draft.startDate.trim());
  const endDate = parseCalendarDate(draft.endDate.trim());
  const errors: TripDraftErrors = {};

  if (!destination) {
    errors.destination = 'required';
  }

  if (!startDate) {
    errors.startDate = 'invalid';
  }

  if (!endDate) {
    errors.endDate = 'invalid';
  }

  if (startDate && endDate && compareCalendarDates(endDate, startDate) < 0) {
    errors.dateRange = 'reversed';
  }

  if (Object.keys(errors).length > 0 || !startDate || !endDate) {
    return { errors, value: null };
  }

  return {
    errors,
    value: {
      name: draft.name.trim() || destination,
      destination,
      ...(draft.destinationDetails?.label === destination
        ? { destinationDetails: draft.destinationDetails }
        : {}),
      startDate,
      endDate,
      tripType: draft.tripType,
      note: draft.note.trim(),
    },
  };
}

export function tripToDraft(trip: Trip): TripDraft {
  return {
    name: trip.name,
    destination: trip.destination,
    ...(trip.destinationDetails ? { destinationDetails: trip.destinationDetails } : {}),
    startDate: trip.startDate,
    endDate: trip.endDate,
    tripType: trip.tripType,
    note: trip.note ?? '',
  };
}

export function getTripDurationDays(trip: Pick<Trip, 'startDate' | 'endDate'>): number {
  return differenceInCalendarDays(trip.startDate, trip.endDate) + 1;
}

export function getTripTimeline(trip: Trip, today: CalendarDate): TripTimeline {
  if (compareCalendarDates(today, trip.startDate) < 0) {
    return {
      status: 'upcoming',
      daysUntilStart: differenceInCalendarDays(today, trip.startDate),
    };
  }

  if (compareCalendarDates(today, trip.startDate) === 0) {
    return { status: 'startsToday', daysUntilStart: 0 };
  }

  if (compareCalendarDates(today, trip.endDate) <= 0) {
    return { status: 'inProgress', daysUntilStart: 0 };
  }

  return { status: 'past', daysUntilStart: 0 };
}

export function groupTripsByTimeline(trips: Trip[], today: CalendarDate): TripTimelineGroups {
  const groups: TripTimelineGroups = { current: [], upcoming: [], past: [] };

  for (const trip of trips) {
    const timeline = getTripTimeline(trip, today);

    if (timeline.status === 'past') {
      groups.past.push(trip);
    } else if (timeline.status === 'upcoming') {
      groups.upcoming.push(trip);
    } else {
      groups.current.push(trip);
    }
  }

  groups.current.sort(compareUpcomingTrips);
  groups.upcoming.sort(compareUpcomingTrips);
  groups.past.sort((first, second) => compareUpcomingTrips(second, first));

  return groups;
}

function compareUpcomingTrips(first: Trip, second: Trip): number {
  return (
    compareCalendarDates(first.startDate, second.startDate) || first.createdAt - second.createdAt
  );
}
