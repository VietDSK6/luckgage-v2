import { useLocalSearchParams } from 'expo-router';

import { ChecklistScreen } from '@/features/checklist/ChecklistScreen';

export default function ChecklistRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  return <ChecklistScreen tripId={tripId?.trim() ?? ''} />;
}
