import type { MessageKey } from '@/i18n/messages';

import type { TripType } from './domain/trip';

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
