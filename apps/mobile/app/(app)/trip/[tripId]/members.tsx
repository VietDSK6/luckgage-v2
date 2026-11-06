import { useLocalSearchParams } from 'expo-router';

import { MembersScreen } from '@/features/members/MembersScreen';

export default function MembersRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  return <MembersScreen tripId={tripId?.trim() ?? ''} />;
}
