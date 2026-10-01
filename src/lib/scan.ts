// Reading a scan (D-030). The photo itself comes from src/lib/photos.ts; the
// reading needs our server and a vision model's API key. The model is picked
// by testing about 30 real photos, and the key goes to Lachlan first.
//
// Until then readPhoto answers honestly that it isn't connected, and the scan
// sheet says "Coming soon" instead of pretending. Nothing here returns
// made-up items (CLAUDE.md: no fake data).
import type { ScanKind, ScanResult } from '@/domain/cupboard/scan';

export type Reading = { status: 'ok'; result: ScanResult } | { status: 'not-connected' } | { status: 'failed'; message: string };

/** True once the reader is in. The scan sheet shows the camera buttons only then, so nobody takes a photo for nothing. */
export const SCAN_CONNECTED: boolean = false;

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
