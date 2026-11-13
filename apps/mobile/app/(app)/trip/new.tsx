import { useLocalSearchParams } from 'expo-router';

import { TripFormScreen } from '@/features/trips/TripFormScreen';

export default function NewTripRoute() {
  const { suggestion } = useLocalSearchParams<{ suggestion?: string }>();
  return <TripFormScreen suggestionSlug={suggestion?.trim() || undefined} />;
}
