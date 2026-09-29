// WCAG 2.x contrast maths, used by the token tests so no colour pair can
// ship below AA (map §9).

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

type RGBA = { r: number; g: number; b: number; a: number };

export function parseColour(colour: string): RGBA {
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
  const a = luminance(composite(fg, bg));
  const b = luminance(parseColour(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** True for obviously green hues, which the brand rules out. */
export function isGreen(colour: string): boolean {
  const { r, g, b } = parseColour(colour);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 20) return false; // near-grey
  let hue: number;
  if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
  else if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
  else hue = 60 * ((r - g) / (max - min) + 4);
  if (hue < 0) hue += 360;
  return hue >= 75 && hue <= 165;
}
