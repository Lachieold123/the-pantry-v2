// Bundled images imported statically. Metro turns each into an asset reference
// that expo-image and <Image> accept; it's typed as the number native builds use,
// as the old `require(...) as number` was.
declare module '*.jpg' {
  const source: number;
  export default source;
}
