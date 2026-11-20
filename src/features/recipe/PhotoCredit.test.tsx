// The photo credit's links (K-17): a Commons photo links to its page and its
// licence as real links; an old Pexels credit stays plain text.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { PhotoCredit } from './PhotoCredit';

const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));

const PAGE = 'https://commons.wikimedia.org/wiki/File:Pancakes_with_Berries_(Unsplash).jpg';

let openURL: jest.SpyInstance;
beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => {
  openURL.mockRestore();
  mockToast.mockClear();
});

describe('PhotoCredit', () => {
  it('links a Commons photo to its file page and licence', async () => {
    await render(<PhotoCredit credit="Photo: Herson Rodriguez / Wikimedia Commons (CC BY-SA 4.0)" page={PAGE} />);
    expect(screen.getByTestId('recipe-photo-credit')).toHaveTextContent(
      'Photo: Herson Rodriguez / Wikimedia Commons (CC BY-SA 4.0), cropped',
    );

    const page = screen.getByRole('link', { name: 'Photo page on Wikimedia Commons' });
    await fireEvent.press(page);
    expect(openURL).toHaveBeenLastCalledWith(PAGE);

    await fireEvent.press(screen.getByRole('link', { name: 'Licence, CC BY-SA 4.0' }));
    expect(openURL).toHaveBeenLastCalledWith('https://creativecommons.org/licenses/by-sa/4.0/');
  });

  it('links only the page for a public domain photo', async () => {
    await render(<PhotoCredit credit="Photo: A Cook / Wikimedia Commons (public domain)" page={PAGE} />);
    expect(screen.getByTestId('recipe-photo-page')).toBeTruthy();
    expect(screen.queryByTestId('recipe-photo-licence')).toBeNull();
  });

  it('leaves an old Pexels credit as plain text with no links', async () => {
    await render(<PhotoCredit credit="Photo: Jane Doe / Pexels" page={undefined} />);
    expect(screen.getByTestId('recipe-photo-credit')).toHaveTextContent('Photo: Jane Doe / Pexels');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('says so when the link won’t open', async () => {
    openURL.mockRejectedValue(new Error('no browser'));
    await render(<PhotoCredit credit="Photo: A Cook / Wikimedia Commons (CC0)" page={PAGE} />);
    await fireEvent.press(screen.getByTestId('recipe-photo-licence'));
    await new Promise((done) => setImmediate(done));
    expect(mockToast).toHaveBeenCalledWith({ message: "Couldn't open the link. Try again." });
  });
});
