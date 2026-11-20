import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/features/app/NotFoundScreen';
import { ScanSheet } from '@/features/cupboard/ScanSheet';
import { SCAN_WAYS_SHOWN } from '@/lib/build';

export default function ScanRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  // Store builds hide the scan ways in until scanning is switched on (REL2-8); an old link lands on not-found.
  if (!SCAN_WAYS_SHOWN) return <NotFoundScreen />;
  return <ScanSheet kind={kind} />;
}
