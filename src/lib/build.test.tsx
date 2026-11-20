// The build flags (REL2-1, REL2-8, REPO-13): a store build turns every
// internal part off. src/app/buildKinds.test.tsx proves what each screen does
// with them.
type Flags = typeof import('./build');

/** The flags as a build with this __DEV__ and EXPO_PUBLIC_SHOW_DRAFT_RECIPES would read them. */
function read(dev: boolean, env: string | undefined): Flags {
  const g = global as unknown as { __DEV__: boolean };
  const was = { dev: g.__DEV__, env: process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES };
  g.__DEV__ = dev;
  if (env === undefined) delete process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES;
  else process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES = env;
  let flags: Flags | undefined;
  jest.isolateModules(() => {
    flags = jest.requireActual<Flags>('./build');
  });
  g.__DEV__ = was.dev;
  if (was.env === undefined) delete process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES;
  else process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES = was.env;
  return flags!;
}

const OFF = { INTERNAL_BUILD: false, COMMUNITY_SHOWN: false, SCAN_WAYS_SHOWN: false };
const ON = { INTERNAL_BUILD: true, COMMUNITY_SHOWN: true, SCAN_WAYS_SHOWN: true };

it('a store build (not development, no testing flag) turns every internal part off', () => {
  expect(read(false, undefined)).toEqual(OFF);
  expect(read(false, '0')).toEqual(OFF);
});

it('development and preview builds turn them on', () => {
  expect(read(true, undefined)).toEqual(ON);
  expect(read(false, '1')).toEqual(ON);
});
