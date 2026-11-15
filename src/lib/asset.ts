/**
 * Hängt den Base-Path (nur nötig, wenn die Seite in einem Unterordner liegt)
 * vor Pfade aus dem public-Ordner. Next.js macht das für <Link> automatisch,
 * für normale <img>-Tags und 3D-Texturen aber nicht.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function asset(path: string): string {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
