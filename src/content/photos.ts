/**
 * FOTOS
 * ------------------------------------------------------------------
 * `photos.generated.json` wird von `npm run photos` erzeugt – nicht von Hand bearbeiten.
 * Hier steht, wie die Fotos sortiert, nach Farben gruppiert und auf der
 * Startseite verteilt werden.
 *
 * Foto-IDs sind die Dateinamen in Kleinbuchstaben ohne Endung,
 * z. B. "P1045650.jpg" → "p1045650".
 */
import data from './photos.generated.json';
import { asset } from '@/lib/asset';
import { deepTone, accentTone, hueDistance, isNeutral, meanHue, type HSL } from '@/lib/color';
import { site } from './site';

export type Photo = {
  id: string;
  series: string;
  width: number;
  height: number;
  /** Dominante Farbe – wird angezeigt, solange das Bild lädt */
  color: string;
  /** 5 Farben des Fotos, häufigste zuerst */
  palette: string[];
  /** Prägnanteste Farbe des Fotos */
  key: HSL & { hex: string };
  /** Mittlere Helligkeit 0–100 */
  lightness: number;
};

export type Series = { slug: string; title: string; photos: Photo[] };

type RawPhoto = Omit<Photo, 'series' | 'palette' | 'key' | 'lightness'> & Partial<Photo>;

export const series: Series[] = data.series.map((s) => ({
  slug: s.slug,
  title: s.title,
  photos: (s.photos as RawPhoto[]).map((p) => ({
    palette: [p.color],
    key: { hex: p.color, h: 0, s: 0, l: 20 },
    lightness: 20,
    ...p,
    series: s.slug,
  })),
}));

export const allPhotos: Photo[] = series.flatMap((s) => s.photos);

export function getSeries(slug: string): Series | undefined {
  return series.find((s) => s.slug === slug);
}

/** URL eines Fotos. 'xs' = 480 px, 'sm' = 900 px, 'lg' = 2200 px */
export function photoSrc(photo: Photo, size: 'xs' | 'sm' | 'lg' = 'sm'): string {
  return asset(`/photos/${photo.series}/${photo.id}-${size}.jpg`);
}

/** Sucht Fotos per ID (über alle Serien). Unbekannte IDs werden ignoriert. */
export function pick(ids: string[]): Photo[] {
  return ids.map((id) => allPhotos.find((p) => p.id === id)).filter((p): p is Photo => Boolean(p));
}

/* ------------------------------------------------------------------
   SPEKTRUM: alle Fotos nach Farbe sortiert
   Erst die neutralen (dunkel → hell), dann einmal um den Farbkreis:
   Blau → Violett → Rot → Orange → Gelb → Grün.
   ------------------------------------------------------------------ */
const SPECTRUM_START = 165;
export function spectrumSort(photos: Photo[]): Photo[] {
  const neutral = photos.filter((p) => isNeutral(p.key)).sort((a, b) => a.lightness - b.lightness);
  const chroma = photos
    .filter((p) => !isNeutral(p.key))
    .sort((a, b) => ((a.key.h - SPECTRUM_START + 360) % 360) - ((b.key.h - SPECTRUM_START + 360) % 360) || a.key.l - b.key.l);
  return [...neutral, ...chroma];
}
export const spectrum = spectrumSort(allPhotos);

/** Gleichmäßig verteilte Auswahl aus einer Liste */
export function spread<T>(list: T[], count: number): T[] {
  if (list.length <= count) return list;
  return Array.from({ length: count }, (_, i) => list[Math.floor((i * list.length) / count)]);
}

/* ------------------------------------------------------------------
   FARBKAPITEL
   Definiert in site.ts (Name, Text, Farbtöne). Jedes Foto landet im
   Kapitel, dessen Farbtonbereich passt; neutrale Fotos im Kapitel ohne Farbton.
   ------------------------------------------------------------------ */
export type Chapter = {
  slug: string;
  title: string;
  text: string;
  photos: Photo[];
  /** Hintergrund, Text- und Akzentfarbe des Kapitels */
  tone: { bg: string; fg: string; accent: string; light: boolean };
  /** Farbmuster für die Kopfzeile des Kapitels */
  swatches: string[];
};

function inRange(h: number, [from, to]: [number, number]) {
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

export const chapters: Chapter[] = (() => {
  const defs = site.chapters;
  const buckets = new Map<string, Photo[]>(defs.map((d) => [d.slug, []]));
  const neutralDef = defs.find((d) => !d.hues);
  const chromaDefs = defs.filter((d) => d.hues);

  // Handverlesene Fotos (highlights) gehören fest zu ihrem Kapitel
  const manual = new Map<string, string>();
  for (const d of defs) for (const id of d.highlights ?? []) if (!manual.has(id)) manual.set(id, d.slug);

  for (const p of allPhotos) {
    const fixed = manual.get(p.id);
    if (fixed) { buckets.get(fixed)!.push(p); continue; }
    if (isNeutral(p.key) && neutralDef) { buckets.get(neutralDef.slug)!.push(p); continue; }
    const hit = chromaDefs.find((d) => d.hues!.some((r) => inRange(p.key.h, r)));
    // Kein Bereich passt → nächstgelegenes Kapitel auf dem Farbkreis
    const target = hit ?? [...chromaDefs].sort((a, b) =>
      hueDistance(p.key.h, (a.hues![0][0] + a.hues![0][1]) / 2) - hueDistance(p.key.h, (b.hues![0][0] + b.hues![0][1]) / 2))[0];
    buckets.get(target.slug)!.push(p);
  }

  return defs
    .map((d) => {
      const photos = spectrumSort(buckets.get(d.slug)!);
      const h = meanHue(photos.filter((p) => !isNeutral(p.key)).map((p) => p.key.h));
      const s = photos.length ? photos.reduce((sum, p) => sum + p.key.s, 0) / photos.length : 0;
      const light = !d.hues; // das neutrale Kapitel bekommt einen hellen Hintergrund
      const tone = light
        ? { bg: '#e9e7e2', fg: '#0d0d0d', accent: '#6f6c66', light }
        : { bg: deepTone({ h, s, l: 40 }), fg: '#f3f0ea', accent: accentTone({ h, s, l: 50 }), light };
      // 6 Farbmuster: die Schlüsselfarben, gleichmäßig über das Kapitel verteilt
      const swatches = spread(photos, 6).map((p) => p.key.hex);
      return { slug: d.slug, title: d.title, text: d.text, photos, tone, swatches };
    })
    .filter((c) => c.photos.length > 0);
})();

/** Die Fotos eines Kapitels, die auf der Startseite erscheinen */
export function chapterHighlights(chapter: Chapter, count = 8): Photo[] {
  const manual = site.chapters.find((d) => d.slug === chapter.slug)?.highlights;
  if (manual?.length) return pick(manual);
  // Automatisch: die farbkräftigsten Fotos, gleichmäßig über das Kapitel verteilt
  const ranked = [...chapter.photos].sort((a, b) => b.key.s * (1 + b.lightness / 100) - a.key.s * (1 + a.lightness / 100));
  const top = ranked.slice(0, Math.max(count * 2, count));
  return spectrumSort(spread(spectrumSort(top), count));
}

export const toneFor = (p: Photo) => deepTone(p.key);

/* ------------------------------------------------------------------
   AUSWAHL FÜR DIE STARTSEITE
   ------------------------------------------------------------------ */
export const featured = {
  /** Fotos im 3D-Tunnel: über das ganze Farbspektrum verteilt */
  hero: spread(spectrum, 36),

  /** Großes Foto hinter dem Zitat (am besten Querformat) */
  reveal: pick(['p1046422'])[0],

  /** Titelbilder der Serien */
  covers: { 'new-york': 'p1046414', 'usa-roadtrip': '_a670198', 'hard-juniors': '_a671060' } as Record<string, string>,

  /** Vorschaubild beim Teilen auf Social Media */
  share: pick(['p1045650'])[0],
};
