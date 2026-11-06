import { useLocalSearchParams } from 'expo-router';

import { TripFormScreen } from '@/features/trips/TripFormScreen';

export default function EditTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  return <TripFormScreen tripId={tripId?.trim() || 'invalid'} />;
}
