import { useLocalSearchParams } from 'expo-router';

import { ChecklistImportScreen } from '@/features/checklist/ChecklistImportScreen';

export default function ChecklistImportRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  return <ChecklistImportScreen tripId={tripId?.trim() ?? ''} />;
}
