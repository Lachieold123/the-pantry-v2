import { useLocalSearchParams } from 'expo-router';

import { AddToPlanSheet } from '@/features/plan/AddToPlanSheet';

export default function AddToPlanRoute() {
  const { day } = useLocalSearchParams<{ day: string }>();
  return <AddToPlanSheet day={day} />;
}
