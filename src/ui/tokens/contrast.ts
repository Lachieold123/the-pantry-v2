// WCAG 2.x contrast maths, used by the token tests.

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

type RGBA = { r: number; g: number; b: number; a: number };

export function parseColour(colour: string): RGBA {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour);
  if (short) {
    const [r, g, b] = [short[1], short[2], short[3]].map((h) => parseInt(`${h}${h}`, 16));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: 1 };
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (hex) {
    const n = parseInt(hex[1] ?? '0', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(colour);
  if (rgba) return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  throw new Error(`Unsupported colour: ${colour}`);
}

/** Flatten a translucent colour onto its background. */
export function composite(fg: string, bg: string): RGBA {
  const f = parseColour(fg);
  const b = parseColour(bg);
  return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 };
}

function luminance(c: RGBA): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(fg: string, bg: string): number {
  // A see-through background has no colour of its own: the answer depends on what's under it,
  // so a ratio against it would be made up. Flatten it with composite() first.
  if (parseColour(bg).a < 1) throw new Error(`Background ${bg} is translucent; composite it onto its surface first`);
  const a = luminance(composite(fg, bg));
  const b = luminance(parseColour(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function hex(c: RGBA): string {
  return `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Contrast of text drawn at reduced opacity (a faded past plan row) over a solid surface. */
export function fadedContrast(fg: string, surface: string, opacity: number): number {
  const f = parseColour(fg);
  return contrastRatio(hex(composite(`rgba(${f.r},${f.g},${f.b},${f.a * opacity})`, surface)), surface);
}
