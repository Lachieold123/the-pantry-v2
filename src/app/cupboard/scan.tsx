import { useLocalSearchParams } from 'expo-router';

import { ScanSheet } from '@/features/cupboard/ScanSheet';

export default function ScanRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return <ScanSheet kind={kind} />;
}
