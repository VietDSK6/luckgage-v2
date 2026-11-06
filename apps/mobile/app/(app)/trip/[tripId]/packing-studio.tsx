import { useLocalSearchParams } from 'expo-router';

import { PackingStudioScreen } from '@/features/packing-suggestions/PackingStudioScreen';

export default function PackingStudioRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  return <PackingStudioScreen tripId={tripId?.trim() ?? ''} />;
}
