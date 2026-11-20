// Choosing photos never asks for the whole library; only the camera asks (REL-07).
import * as ImagePicker from 'expo-image-picker';

import { capturePhotos } from './photos';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'cam.jpg' }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'lib.jpg' }] })),
}));

it('opens the photo picker without asking for library access', async () => {
  expect(await capturePhotos('library')).toEqual({ status: 'ok', uris: ['lib.jpg'] });
  expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
});

it('still asks for the camera', async () => {
  expect(await capturePhotos('camera')).toEqual({ status: 'ok', uris: ['cam.jpg'] });
  expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
});
