import { useLocalSearchParams } from 'expo-router';

import { QuickCheckScreen } from '@/features/quick-check/QuickCheckScreen';

export default function QuickCheckRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  return <QuickCheckScreen tripId={tripId?.trim() ?? ''} />;
}
