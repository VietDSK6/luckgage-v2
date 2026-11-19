import type { MessageKey } from '@/i18n/messages';

import type { Trip, TripType } from './domain/trip';

export function getTripHeaderTitle(trip: Pick<Trip, 'name' | 'destination'>): string {
  const name = trip.name.trim();
  if (name !== trip.destination.trim()) return name;
  return name.split(',')[0]?.trim() || name;
}

export const tripTypeMessageKeys: Record<TripType, MessageKey> = {
  leisure: 'tripTypeLeisure',
  business: 'tripTypeBusiness',
  camping: 'tripTypeCamping',
  beach: 'tripTypeBeach',
  hiking: 'tripTypeHiking',
  cityTrip: 'tripTypeCityTrip',
  roadTrip: 'tripTypeRoadTrip',
  international: 'tripTypeInternational',
  other: 'tripTypeOther',
};
