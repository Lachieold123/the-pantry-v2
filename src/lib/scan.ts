// The two outside pieces a scan needs, behind one small interface so the
// screens never change when they're connected (D-030):
//
// 1. Taking or choosing a photo. Needs expo-image-picker, a native module,
//    which waits for Lachlan's go-ahead (CLAUDE.md: ask before adding one).
// 2. Reading the photo. Needs our server and a vision model's API key; the
//    model is picked by testing ~30 real photos, and the key goes to Lachlan.
//
// Until then both answer honestly that they aren't connected, and the scan
// sheet says so in plain words instead of pretending. Nothing here returns
// made-up items (CLAUDE.md: no fake data).
import type { ScanKind, ScanResult } from '@/domain/cupboard/scan';

export type PhotoSource = 'camera' | 'library';

export type Capture = { status: 'ok'; uri: string } | { status: 'cancelled' } | { status: 'unavailable' };

export type Reading = { status: 'ok'; result: ScanResult } | { status: 'not-connected' } | { status: 'failed'; message: string };

/** True once both pieces are in. The scan sheet shows the camera buttons only then. */
export const SCAN_CONNECTED: boolean = false;

/** Opens the camera or the photo library. Connect: expo-image-picker's launchCameraAsync / launchImageLibraryAsync, after asking permission. */
export async function capturePhoto(source: PhotoSource): Promise<Capture> {
  void source;
  return { status: 'unavailable' };
}

/**
 * Sends the photo to the server to read. Connect: shrink the photo (about
 * 1,500px on the long side), post it with the kind, and map the reply to
 * ScanResult. Only a reading that comes back `ok` counts towards the
 * allowance.
 */
export async function readPhoto(kind: ScanKind, uri: string): Promise<Reading> {
  void kind;
  void uri;
  return { status: 'not-connected' };
}
