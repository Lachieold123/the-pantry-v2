import { useLocalSearchParams } from 'expo-router';

import { AddToPlanSheet } from '@/features/plan/AddToPlanSheet';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function AddToPlanRoute() {
  const { day, slot } = useLocalSearchParams<{ day: string; slot?: string }>();
  return <AddToPlanSheet day={day} slot={slot} />;
}
