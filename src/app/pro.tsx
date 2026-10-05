import { useLocalSearchParams } from 'expo-router';

import { PaywallScreen } from '@/features/pro/PaywallScreen';

export default function ProRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <PaywallScreen from={from} />;
}
