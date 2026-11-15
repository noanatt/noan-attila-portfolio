/**
 * FOTOS
 * ------------------------------------------------------------------
 * `photos.generated.json` wird von `npm run photos` erzeugt – nicht von Hand bearbeiten.
 *
 * Hier wählst du nur aus, WELCHE Fotos auf der Startseite wo erscheinen.
 * Die IDs sind die Dateinamen in Kleinbuchstaben ohne Endung,
 * z. B. "P1045650.jpg" → "p1045650".
 */
import data from './photos.generated.json';
import { asset } from '@/lib/asset';

export type Photo = {
  id: string;
  series: string;
  width: number;
  height: number;
  /** Dominante Farbe – wird angezeigt, solange das Bild lädt */
  color: string;
};

export type Series = { slug: string; title: string; photos: Photo[] };

export const series: Series[] = data.series.map((s) => ({
  slug: s.slug,
  title: s.title,
  photos: s.photos.map((p) => ({ ...p, series: s.slug })),
}));

export function getSeries(slug: string): Series | undefined {
  return series.find((s) => s.slug === slug);
}

/** URL eines Fotos. 'sm' = max. 900 px, 'lg' = max. 2200 px */
export function photoSrc(photo: Photo, size: 'sm' | 'lg' = 'sm'): string {
  return asset(`/photos/${photo.series}/${photo.id}-${size}.jpg`);
}

/** Sucht Fotos per ID (über alle Serien). Unbekannte IDs werden ignoriert. */
function pick(ids: string[]): Photo[] {
  const all = series.flatMap((s) => s.photos);
  return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is Photo => Boolean(p));
}

/* ------------------------------------------------------------------
   AUSWAHL FÜR DIE STARTSEITE – hier einfach IDs tauschen
   ------------------------------------------------------------------ */
export const featured = {
  /** Fotos, die in der 3D-Szene im Raum schweben (ca. 10–16) */
  hero: pick([
    'p1045650', '_a670198', 'p1045834', '_a670283', 'p1046414', '_a670302',
    'p1045989', '_a670322', 'p1046493', '_a670285', 'p1046020', '_a670452',
    'p1046564', '_a670473',
  ]),

  /** Parallax-Galerie „New York“ */
  newYork: pick([
    'p1045650', 'p1045834', 'p1046414', 'p1045989', 'p1046020', 'p1046186',
    'p1046258', 'p1046384', 'p1046265', 'p1046029', 'p1046457', 'p1046508',
    'p1045761', 'p1046564', 'p1046493',
  ]),

  /** Horizontaler Filmstreifen „USA Roadtrip“ */
  roadtrip: pick([
    '_a670090', '_a670120', '_a670156', '_a670198', '_a670188', '_a670232',
    '_a670302', '_a670283', '_a670285', '_a670322', '_a670344', '_a670366',
    '_a670452', '_a670496',
  ]),

  /** Großes Vollbild-Foto hinter dem Zitat (am besten Querformat) */
  reveal: pick(['p1046422'])[0],

  /** Vorschaubild beim Teilen auf Social Media */
  share: pick(['p1045650'])[0],
};
