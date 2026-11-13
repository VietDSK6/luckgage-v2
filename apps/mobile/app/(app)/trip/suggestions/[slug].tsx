import { useLocalSearchParams } from 'expo-router';

import { TripSuggestionDetailScreen } from '@/features/trip-suggestions/TripSuggestionDetailScreen';

export default function TripSuggestionDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <TripSuggestionDetailScreen slug={slug?.trim() ?? ''} />;
}
