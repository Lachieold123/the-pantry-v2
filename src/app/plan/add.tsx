import { useLocalSearchParams } from 'expo-router';

import { AddToPlanSheet } from '@/features/plan/AddToPlanSheet';

export default function AddToPlanRoute() {
  const { day, slot } = useLocalSearchParams<{ day: string; slot?: string }>();
  return <AddToPlanSheet day={day} slot={slot} />;
}
