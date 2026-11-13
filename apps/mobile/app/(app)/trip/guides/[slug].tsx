import { useLocalSearchParams } from 'expo-router';
import { GuideDetailScreen } from '@/features/guides/GuideDetailScreen';
export default function GuideDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <GuideDetailScreen slug={slug?.trim() ?? ''} />;
}
