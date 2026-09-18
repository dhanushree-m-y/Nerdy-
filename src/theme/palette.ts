// Colour helpers for the illustration system: consistent shading, highlights and outlines.

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')}`;

/** Darken toward a warm shadow (not pure black — keeps illustrations lively). */
export function shade(hex: string, amount = 0.18): string {
  const [r, g, b] = parse(hex);
  return toHex(r * (1 - amount) + 18 * amount, g * (1 - amount) + 24 * amount, b * (1 - amount) + 34 * amount);
}

/** Lighten toward sunlight. */
export function tint(hex: string, amount = 0.18): string {
  const [r, g, b] = parse(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (250 - b) * amount);
}

/** The ink outline used on every illustrated object. */
export const outline = (hex: string, amount = 0.42) => shade(hex, amount);

/** rgba() from a hex + alpha. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Desaturate for "damaged / not yet restored" states. */
export function drain(hex: string, amount = 0.65): string {
  const [r, g, b] = parse(hex);
  const grey = r * 0.299 + g * 0.587 + b * 0.114;
  return toHex(r + (grey - r) * amount, g + (grey - g) * amount, b + (grey - b) * amount);
}

/** Standard illustration stroke width for a given drawing size. */
export const strokeFor = (size: number) => Math.max(1.4, Math.min(3, size * 0.03));
