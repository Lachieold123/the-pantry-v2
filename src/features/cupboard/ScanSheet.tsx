// Scan a receipt or a photo of your food into the cupboard (D-030; v1's
// PantryScanFlow). Four steps: choose a photo, read it, check the list, add.
// The camera works (src/lib/photos.ts); the reader isn't connected yet
// (src/lib/scan.ts), and until it is this sheet says so plainly and offers the
// typed list instead. The rest is built and tested, so connecting the reader
// is the only step left.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { guessesFromScan, startTicked, type ScanGuess, type ScanKind } from '@/domain/cupboard/scan';
import { shortDate } from '@/lib/dates';
import { goBack } from '@/lib/navigation';
import { capturePhotos, captureProblem, type PhotoSource } from '@/lib/photos';
import { readPhoto, SCAN_CONNECTED } from '@/lib/scan';
import { useCupboard } from '@/store/cupboard';
import { useScanAllowance, useScans } from '@/store/scans';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';
import { ListReview, toggled } from './ListReview';

const COPY: Record<ScanKind, { title: string; lead: string; found: string }> = {
  receipt: {
    title: 'Scan a receipt',
    lead: 'Take a photo of your shopping receipt and we’ll add what you bought to your cupboard.',
    found: 'From your receipt',
  },
  food: {
    title: 'Photo of your food',
    lead: 'Take a photo of your fridge, a shelf or the bench, and we’ll pick out the ingredients.',
    found: 'We spotted these',
  },
};

type Stage = { at: 'choose' } | { at: 'reading' } | { at: 'review'; guesses: ScanGuess[]; storeName?: string | undefined };

export function ScanSheet({ kind: requested }: { kind: string | undefined }) {
  const kind: ScanKind = requested === 'food' ? 'food' : 'receipt';
  const copy = COPY[kind];
  const router = useRouter();
  const toast = useToast();
  const { colours } = useTheme();
  const items = useCupboard((s) => s.items);
  const add = useCupboard((s) => s.add);
  const restore = useCupboard((s) => s.restore);
  const record = useScans((s) => s.record);
  const allowance = useScanAllowance();
  const [stage, setStage] = useState<Stage>({ at: 'choose' });
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | undefined>();
  const have = new Set(items.map((i) => i.ingredientId));
  const close = () => goBack(router);

  const scan = async (source: PhotoSource) => {
    setProblem(undefined);
    const photo = await capturePhotos(source);
    if (photo.status === 'cancelled') return;
    if (photo.status !== 'ok' || !photo.uris[0]) {
      if (photo.status !== 'ok') setProblem(captureProblem(photo, source));
      return;
    }
    setStage({ at: 'reading' });
    const reading = await readPhoto(kind, photo.uris[0]);
    if (reading.status !== 'ok') {
      // A failed read doesn't use up a scan; back to the start to try again.
      setProblem(reading.status === 'failed' ? reading.message : 'Reading photos isn’t connected yet.');
      setStage({ at: 'choose' });
      return;
    }
    record();
    const guesses = guessesFromScan(reading.result, INGREDIENTS);
    setTicked(startTicked(guesses, have));
    setStage({ at: 'review', guesses, storeName: reading.result.storeName });
  };

  const commit = () => {
    const before = items;
    add([...ticked], kind === 'receipt' ? 'receipt' : 'scan');
    toast({ message: `${ticked.size} added to your cupboard`, undo: () => restore(before) });
    close();
  };

  return (
    <Sheet kicker="Cupboard" title={copy.title} onClose={close}>
      {stage.at === 'choose' ? (
        SCAN_CONNECTED ? (
          <View style={{ gap: SPACE.md }} testID="scan-choose">
            <Text variant="body" colour="inkSoft">
              {copy.lead}
            </Text>
            <Text variant="meta" testID="scan-allowance">
              {allowance.left > 0
                ? `${allowance.left} free ${allowance.left === 1 ? 'scan' : 'scans'} left this month`
                : `You’ve used this month’s free scans. More on ${shortDate(allowance.resetsAt)}.`}
            </Text>
            {problem ? (
              <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="scan-problem">
                {problem}
              </Text>
            ) : null}
            <Button
              label="Take a photo"
              icon="camera"
              kind="primary"
              block
              disabled={allowance.left === 0}
              onPress={() => void scan('camera')}
              testID="scan-camera"
            />
            <Button
              label="Choose from your photos"
              kind="soft"
              block
              disabled={allowance.left === 0}
              onPress={() => void scan('library')}
              testID="scan-library"
            />
          </View>
        ) : (
          <NotYet lead={copy.lead} onList={() => router.replace('/cupboard/add-list')} onClose={close} />
        )
      ) : stage.at === 'reading' ? (
        <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xxl }} testID="scan-reading">
          <ActivityIndicator color={colours.inkMuted} />
          <Text variant="body" colour="inkSoft">
            {kind === 'receipt' ? 'Reading your receipt…' : 'Looking at your photo…'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: SPACE.md }} testID="scan-review">
          <Text variant="kickerSection" accessibilityRole="header">
            {stage.storeName ? `${copy.found} · ${stage.storeName}` : copy.found}
          </Text>
          {stage.guesses.length === 0 ? (
            <Text variant="body" colour="inkSoft">
              We couldn’t make out any food in that one. Try again in better light, or type a list instead.
            </Text>
          ) : (
            <ListReview
              guesses={stage.guesses}
              have={have}
              ticked={ticked}
              onToggle={(id) => setTicked((t) => toggled(t, id))}
              testIDPrefix="scan"
            />
          )}
          <Button
            label={ticked.size ? `Add ${ticked.size} to your cupboard` : 'Nothing to add'}
            kind="primary"
            block
            disabled={ticked.size === 0}
            onPress={commit}
            testID="scan-commit"
          />
        </View>
      )}
    </Sheet>
  );
}

/** Until the camera and reader are connected: say so, and offer what works today. */
function NotYet({ lead, onList, onClose }: { lead: string; onList: () => void; onClose: () => void }) {
  return (
    <View style={{ gap: SPACE.md }} testID="scan-not-yet">
      <Text variant="body" colour="inkSoft">
        {lead}
      </Text>
      <Text variant="cardTitle">Coming soon</Text>
      <Text variant="body" colour="inkSoft">
        Scanning isn’t switched on yet. Until it is, the quickest way in is to type or paste a list: “eggs, 2 onions, feta”.
      </Text>
      <Button label="Type a list instead" icon="list" kind="primary" block onPress={onList} testID="scan-use-list" />
      <Button label="Not now" kind="quiet" block onPress={onClose} testID="scan-not-now" />
    </View>
  );
}
