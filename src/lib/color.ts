/**
 * Farb-Helfer: aus der Schlüsselfarbe eines Fotos werden passende
 * Hintergrund- und Akzenttöne für die Seite abgeleitet.
 */
export type HSL = { h: number; s: number; l: number };

// Komma-Schreibweise, damit GSAP die Farben weich überblenden kann
export const hsl = ({ h, s, l }: HSL) => `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

/** Ist die Farbe so ungesättigt oder dunkel, dass sie als „neutral“ gilt? */
export const isNeutral = (c: HSL) => c.s < 18 || c.l < 10;

/** Tiefer, abgedunkelter Ton für Hintergründe hinter Fotos */
export function deepTone(c: HSL): string {
  if (isNeutral(c)) return hsl({ h: c.h, s: 6, l: 7 });
  return hsl({ h: c.h, s: Math.min(c.s, 60) * 0.65, l: 9 });
}

/** Hellerer Akzent derselben Farbe (z. B. für Linien oder Zahlen) */
export function accentTone(c: HSL): string {
  if (isNeutral(c)) return hsl({ h: c.h, s: 8, l: 62 });
  return hsl({ h: c.h, s: Math.max(45, Math.min(c.s, 75)), l: 64 });
}

/** Kreisförmiger Mittelwert von Farbtönen (0–360) */
export function meanHue(hues: number[]): number {
  if (!hues.length) return 0;
  let x = 0, y = 0;
  for (const h of hues) { x += Math.cos((h * Math.PI) / 180); y += Math.sin((h * Math.PI) / 180); }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Abstand zweier Farbtöne auf dem Farbkreis */
export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
