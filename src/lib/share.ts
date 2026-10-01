// Sending text (the week's plan, the shopping list, a recipe). On a phone this
// opens the share sheet. On the web there often isn't one, so the text is
// copied instead and the caller can say so, rather than reporting a failure.
import { Platform, Share } from 'react-native';

import { logger } from './logger';

export type ShareResult = 'shared' | 'copied' | 'failed';

export async function shareText(message: string, title?: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    try {
      if (nav && typeof nav.share === 'function') {
        await nav.share({ text: message, ...(title ? { title } : {}) });
        return 'shared';
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        return 'copied';
      }
    } catch (e) {
      // Cancelled or blocked: fall through to report it.
      logger.warn('share', "couldn't share or copy on the web", e);
    }
    return 'failed';
  }
  try {
    await Share.share(title ? { message, title } : { message });
    return 'shared';
  } catch (e) {
    logger.warn('share', "couldn't open the share sheet", e);
    return 'failed';
  }
}
