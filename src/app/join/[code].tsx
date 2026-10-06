import { useLocalSearchParams } from 'expo-router';

import { JoinScreen } from '@/features/household/JoinScreen';

export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <JoinScreen code={code ?? ''} />;
}
