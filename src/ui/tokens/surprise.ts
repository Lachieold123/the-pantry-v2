// The Surprise me deck and motion (spec §4.19, §6). v1's numbers, kept so it moves the same.
export const SURPRISE = {
  heroMax: 320,
  peekMax: 260,
  /** A peek card is this share of the stage width. */
  peekShare: 0.78,
  radius: 22,
  stagePadX: 28,
  cornerInset: 18,
  cornerRule: 24,
  cornerGap: 10,
  labelTop: 30,
  labelBottom: 22,
  metaGap: 6,
  peek: { x: 22, xOpen: 30, y: 14, yOpen: 18, tilt: 7, tiltOpen: 11 },
  tick: { x: 8, tilt: 2, scale: 0.97, ms: 140 },
  settle: { scale: 1.04, ms: 220, backMs: 200 },
  driftMs: 400,
  hintMs: 250,
  hintDim: 0.4,
  iconMs: 600,
  iconTurns: 720,
  /** Bezier control points: the settle overshoots a little; the drift eases out. */
  settleCurve: [0.34, 1.56, 0.64, 1],
  driftCurve: [0.2, 0.7, 0.3, 1],
  reasonKeyWidth: 78,
} as const;
