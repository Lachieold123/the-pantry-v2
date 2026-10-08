// Settings › About's links to the privacy policy, terms and help (REL-01).
// Each appears only once its page is published (lib/legal), so there's never
// a row that goes nowhere.
import { Linking } from 'react-native';

import { legalLinks, LEGAL_URLS } from '@/lib/legal';
import { ListRow } from '@/ui/primitives/ListRow';

export function LegalRows({ urls = LEGAL_URLS }: { urls?: typeof LEGAL_URLS }) {
  return (
    <>
      {legalLinks(urls).map((l) => (
        <ListRow
          key={l.label}
          icon="info"
          title={l.label}
          onPress={() => void Linking.openURL(l.url)}
          testID={`settings-legal-${l.label}`}
        />
      ))}
    </>
  );
}
