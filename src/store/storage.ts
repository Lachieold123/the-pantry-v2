// All persisted state goes through here, so the storage engine can change
// (for example to add sync in v1.1) without touching the slices.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const STORAGE_PREFIX = 'the-pantry-v2';

export const persistentStorage = createJSONStorage(() => AsyncStorage);
