// Lets node scripts import src/data/catalogue (which reads React Native's __DEV__): preview-build view, drafts shown.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
