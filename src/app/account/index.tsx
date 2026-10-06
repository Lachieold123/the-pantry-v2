import { useLocalSearchParams } from 'expo-router';

import { AccountSheet } from '@/features/account/AccountSheet';

export default function AccountRoute() {
  const { moment } = useLocalSearchParams<{ moment?: string }>();
  return <AccountSheet moment={moment} />;
}
