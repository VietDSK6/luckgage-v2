import { addCalendarDays, type CalendarDate } from '@/features/trips/domain/calendarDate';
import type { TripDestination, TripDraft, TripType } from '@/features/trips/domain/trip';

export type TripSuggestion = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image: {
    url: string;
    alt: string;
  };
  tags: string[];
  destination: TripDestination;
  tripType: TripType | null;
  suggestedDurationDays: number;
};

export function suggestionToTripDraft(
  suggestion: TripSuggestion,
  today: CalendarDate,
): TripDraft {
  return {
    name: suggestion.title,
    destination: suggestion.destination.label,
    destinationDetails: suggestion.destination,
    startDate: today,
    endDate: addCalendarDays(today, Math.max(1, suggestion.suggestedDurationDays) - 1),
    tripType: suggestion.tripType ?? 'leisure',
    note: '',
  };
}
