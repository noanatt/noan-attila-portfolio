'use client';
/**
 * Ein Farbkapitel: Titel, Text, Farbmuster und eine ruhige, redaktionelle
 * Komposition aus 8 Fotos (nur Rechtecke, Kanten an einem gemeinsamen Raster).
 * Der Seitenhintergrund nimmt die Farbe des Kapitels an (Ambient).
 *
 * Das Layout ist ein Raster aus quadratischen Zellen (12 Spalten, Handy 6).
 * Jedes Foto hat einen festen Platz (SLOTS) und eine leichte Parallax-Bewegung.
 * Bei jedem zweiten Kapitel wird das Layout gespiegelt.
 */
import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { chapterHighlights, type Chapter, type Photo as PhotoType } from '@/content/photos';
import { site } from '@/content/site';
import { gsap, SplitText, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from '../Photo';
import { useLightbox } from '../Lightbox';
import styles from './ColorChapter.module.css';

type Area = [colStart: number, colEnd: number, rowStart: number, rowEnd: number];
type Slot = {
  prefer: 'portrait' | 'landscape' | 'any';
  desktop: Area;
  mobile: Area;
  /** Parallax: positiv = bewegt sich schneller nach oben als die Seite */
  speed: number;
};

/* Platz für den Text: Desktop Spalten 1–6 / Zeilen 1–4, Handy Zeilen 1–6.
   Bereiche: [Spalte von, Spalte bis, Zeile von, Zeile bis] (Rasterlinien).
   Große Fotos bewegen sich langsam, kleine etwas schneller. */
const SLOTS: Slot[] = [
  { prefer: 'portrait',  desktop: [8, 13, 1, 7],   mobile: [1, 6, 7, 13],  speed: 0.25 }, // groß, hoch
  { prefer: 'any',       desktop: [4, 7, 5, 8],    mobile: [4, 7, 14, 17], speed: 0.7 },  // quadratisch
  { prefer: 'landscape', desktop: [1, 7, 9, 13],   mobile: [1, 7, 18, 22], speed: 0.2 },  // quer
  { prefer: 'portrait',  desktop: [8, 12, 8, 13],  mobile: [1, 4, 23, 27], speed: 0.45 }, // hoch
  { prefer: 'portrait',  desktop: [2, 5, 14, 18],  mobile: [4, 7, 25, 29], speed: 0.6 },  // hoch, klein
  { prefer: 'landscape', desktop: [6, 12, 14, 18], mobile: [1, 7, 30, 34], speed: 0.2 },  // quer
  { prefer: 'any',       desktop: [10, 13, 19, 22],mobile: [1, 4, 35, 38], speed: 0.7 },  // quadratisch
  { prefer: 'portrait',  desktop: [4, 8, 19, 24],  mobile: [4, 7, 35, 39], speed: 0.35 }, // hoch
];

/**
 * Verteilt die Fotos auf die Formen. Bei handverlesener Auswahl (site.ts → highlights)
 * gilt genau deren Reihenfolge, sonst wird nach Hoch-/Querformat passend verteilt.
 */
function assign(photos: PhotoType[], manual: boolean): (PhotoType | undefined)[] {
  if (manual) return SLOTS.map((_, i) => photos[i]);
  const pool = [...photos];
  return SLOTS.map((slot) => {
    if (!pool.length) return undefined;
    const match = (p: PhotoType) =>
      slot.prefer === 'any' || (slot.prefer === 'portrait' ? p.height > p.width : p.width >= p.height);
    const idx = Math.max(0, pool.findIndex(match));
    return pool.splice(idx, 1)[0];
  });
}

const mirrorArea = ([a, b, r1, r2]: Area, cols: number): Area => [cols + 2 - b, cols + 2 - a, r1, r2];

export default function ColorChapter({ chapter, mirrored = false }: { chapter: Chapter; mirrored?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { open } = useLightbox();
  const highlights = useMemo(() => chapterHighlights(chapter, SLOTS.length), [chapter]);
  const isManual = Boolean(site.chapters.find((d) => d.slug === chapter.slug)?.highlights?.length);
  const placed = useMemo(() => assign(highlights, isManual), [highlights, isManual]);
  const lightboxList = placed.filter((p): p is PhotoType => Boolean(p));

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
      const speed = Number(el.dataset.speed);
      gsap.fromTo(el, { y: speed * 80 }, {
        y: speed * -80,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    // Überschrift: Buchstaben steigen einzeln aus einer Maske auf (GSAP SplitText).
    // autoSplit teilt neu, wenn Schrift geladen ist oder sich die Breite ändert.
    SplitText.create('[data-split]', {
      type: 'words,chars',
      mask: 'words',
      wordsClass: 'split-word',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.chars, {
        yPercent: 120,
        rotate: 14,
        transformOrigin: '0% 100%',
        duration: 1.6,
        ease: 'expo.out',
        stagger: 0.07,
        scrollTrigger: { trigger: self.elements[0], start: 'top 72%', once: true },
      }),
    });

    // Formen öffnen sich beim ersten Erscheinen
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        clipPath: 'inset(100% 0% 0% 0%)',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
  }, { scope: ref });

  const { tone } = chapter;

  return (
    <section
      ref={ref}
      id={chapter.slug}
      className={styles.chapter}
      data-ambient={tone.bg}
      data-ambient-fg={tone.fg}
      style={{ ['--accent' as string]: tone.accent }}
      aria-labelledby={`${chapter.slug}-title`}
    >
      <div className={styles.grid}>
        <header className={`${styles.head} ${mirrored ? styles.headMirrored : ''}`}>
          <h2 id={`${chapter.slug}-title`} className={styles.title} data-split>{chapter.title}</h2>
          <p className={styles.text}>{chapter.text}</p>
          <div className={styles.meta}>
            <ul className="swatches" aria-hidden="true">
              {chapter.swatches.map((c, i) => <li key={i} style={{ ['--c' as string]: c }} />)}
            </ul>
            <Link href={`/farben/#${chapter.slug}`} className="link">
              Alle {chapter.photos.length} Fotos
            </Link>
          </div>
        </header>

        {placed.map((photo, i) => {
          if (!photo) return null;
          const slot = SLOTS[i];
          const d = mirrored ? mirrorArea(slot.desktop, 12) : slot.desktop;
          const m = mirrored ? mirrorArea(slot.mobile, 6) : slot.mobile;
          return (
            <button
              key={photo.id}
              type="button"
              className={styles.item}
              data-speed={slot.speed}
              style={{
                ['--d' as string]: `${d[2]} / ${d[0]} / ${d[3]} / ${d[1]}`,
                ['--m' as string]: `${m[2]} / ${m[0]} / ${m[3]} / ${m[1]}`,
              }}
              onClick={() => open(lightboxList, lightboxList.indexOf(photo))}
              aria-label={`${chapter.title}: Foto ${i + 1} öffnen`}
            >
              <div className={styles.reveal} data-reveal>
                <Photo photo={photo} fill className={styles.photo} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
