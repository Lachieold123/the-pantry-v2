// Taking or choosing photos (expo-image-picker), for posting a dish you
// cooked and for scanning (D-030, D-033). Asks permission first and answers
// plainly when it's refused, so a screen can say what to do instead of failing.
import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

export type Capture =
  | { status: 'ok'; uris: string[] }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'failed'; message: string };

type Options = { max?: number | undefined };

export async function capturePhotos(source: PhotoSource, { max = 1 }: Options = {}): Promise<Capture> {
  try {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      ...(max > 1 && source === 'library' ? { allowsMultipleSelection: true, selectionLimit: max } : {}),
    };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
    return { status: 'ok', uris: result.assets.slice(0, max).map((a) => a.uri) };
  } catch (e) {
    // The simulator has no camera; that lands here rather than crashing.
    const message = e instanceof Error ? e.message : '';
    return /camera.*not available|unavailable/i.test(message)
      ? { status: 'unavailable' }
      : { status: 'failed', message: 'Couldn’t open the photos. Try again.' };
  }
}

/** What to tell the cook when a photo didn't come back. */
export function captureProblem(capture: Exclude<Capture, { status: 'ok' } | { status: 'cancelled' }>, source: PhotoSource): string {
  if (capture.status === 'denied')
    return source === 'camera'
      ? 'The Pantry doesn’t have access to the camera. You can turn it on in Settings › The Pantry.'
      : 'The Pantry doesn’t have access to your photos. You can turn it on in Settings › The Pantry.';
  if (capture.status === 'unavailable') return 'There’s no camera here. Choose from your photos instead.';
  return capture.message;
}
