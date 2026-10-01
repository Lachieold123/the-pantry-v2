import { useLocalSearchParams } from 'expo-router';

import { PlateScreen } from '@/features/plates/PlateScreen';

export default function PlateRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlateScreen id={id} />;
}
