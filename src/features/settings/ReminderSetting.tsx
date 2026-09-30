// The Sunday planning reminder switch. It reads as on only when the phone will
// actually deliver it: the saved flag is checked against the phone's permission
// whenever Settings comes into view or the app returns from the phone's
// Settings (audit F137), and it flips at once while the permission prompt is up
// instead of snapping back (audit F164).
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';

import { logger } from '@/lib/logger';
import { notificationPermission, setSundayReminder } from '@/lib/notifications';
import { usePreferences } from '@/store/preferences';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { ListRow } from '@/ui/primitives/ListRow';
import { Switch } from '@/ui/primitives/Switch';
import { SPACE } from '@/ui/tokens/type';

// The web build has no phone Settings to send anyone to.
const CAN_OPEN_SETTINGS = Platform.OS !== 'web';

export function ReminderSetting() {
  const toast = useToast();
  const saved = usePreferences((s) => s.sundayReminder);
  const save = usePreferences((s) => s.setSundayReminder);
  // What the cook just asked for, shown while the phone decides.
  const [pending, setPending] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);

  const reconcile = useCallback(async () => {
    const permission = await notificationPermission();
    setBlocked(permission === 'blocked');
    // Turned off in the phone's Settings since: the reminder can't arrive, so don't claim it will.
    if (permission !== 'granted' && usePreferences.getState().sundayReminder) save(false);
  }, [save]);

  useFocusEffect(
    useCallback(() => {
      void reconcile();
    }, [reconcile]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);

  const openSettings = () =>
    void Linking.openSettings().catch((e: unknown) => logger.warn('settings', "couldn't open the phone's Settings", e));

  const toggle = async (on: boolean) => {
    if (pending !== null) return;
    setPending(on);
    try {
      const scheduled = await setSundayReminder(on);
      save(scheduled);
      if (on && !scheduled) {
        const permission = await notificationPermission();
        setBlocked(permission === 'blocked');
        toast({
          message: 'Notifications are off for The Pantry, so the reminder can’t reach you.',
          tone: 'problem',
          ...(CAN_OPEN_SETTINGS ? { actionLabel: 'Open Settings', undo: openSettings } : {}),
        });
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={{ gap: SPACE.sm }}>
      <SectionHeader title="Reminders" />
      <Switch
        label="Sunday planning reminder"
        detail="4pm on Sundays, and nothing else"
        value={pending ?? saved}
        onChange={(on) => void toggle(on)}
        testID="settings-sunday-reminder"
      />
      {blocked && CAN_OPEN_SETTINGS ? (
        <ListRow
          title="Notifications are off"
          detail="Allow them in your phone’s Settings to get the reminder"
          onPress={openSettings}
          testID="settings-open-notifications"
        />
      ) : null}
    </View>
  );
}
