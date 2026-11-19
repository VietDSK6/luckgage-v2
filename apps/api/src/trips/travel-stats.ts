import { daysBetween } from '../common/calendar-date.js';

export type TravelTripInput = {
  id: string;
  name: string;
  destinationLabel: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  packedItemCount: number;
};

export type TravelTripStats = TravelTripInput & { dayCount: number };

export type TravelStats = {
  tripCount: number;
  dayCount: number;
  packedItemCount: number;
  trips: TravelTripStats[];
};

/**
 * Summarises trips that have already started on `today`. Days of a trip still in progress are
 * counted up to and including today; upcoming trips are ignored.
 */
export function summarizeTravel(trips: readonly TravelTripInput[], today: string): TravelStats {
  const started = trips
    .filter((trip) => trip.startDate <= today)
    .map((trip) => {
      const lastDay = trip.endDate < today ? trip.endDate : today;
      return { ...trip, dayCount: daysBetween(trip.startDate, lastDay) + 1 };
    })
    .sort((first, second) => (first.startDate < second.startDate ? 1 : first.startDate > second.startDate ? -1 : 0));

  return {
    tripCount: started.length,
    dayCount: started.reduce((total, trip) => total + trip.dayCount, 0),
    packedItemCount: started.reduce((total, trip) => total + trip.packedItemCount, 0),
    trips: started,
  };
}
