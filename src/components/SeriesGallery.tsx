'use client';
/**
 * Alle Fotos einer Serie als Masonry-Raster (Hoch- und Querformat gemischt).
 * Desktop 3 Spalten, Tablet 2, Handy 1. Spalten mit leichtem Parallax.
 */
import Link from 'next/link';
import { useRef } from 'react';
import type { Series } from '@/content/photos';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from './Photo';
import { useLightbox } from './Lightbox';
import styles from './SeriesGallery.module.css';

type Props = { series: Series; intro?: string; others: Series[] };

export default function SeriesGallery({ series, intro, others }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { open } = useLightbox();

  useGSAP(() => {
    const reduced = prefersReducedMotion();
    gsap.from('[data-char]', { yPercent: 110, duration: reduced ? 0 : 1.2, ease: 'expo.out', stagger: 0.03 });
    if (reduced) return;

    // Fotos tauchen beim Erreichen leicht von unten auf
    gsap.utils.toArray<HTMLElement>('[data-item]').forEach((el) => {
      gsap.from(el, {
        y: 60,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
  }, { scope: ref });

  return (
    <div ref={ref} className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>
          <span className={styles.line}>
            {series.title.split('').map((c, i) => (
              <span key={i} data-char className={styles.char}>{c === ' ' ? ' ' : c}</span>
            ))}
          </span>
        </h1>
        <div className={styles.meta}>
          {intro && <p>{intro}</p>}
          <p className={styles.count}>{series.photos.length} Fotos</p>
        </div>
      </header>

      <div className={styles.grid}>
        {series.photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className={styles.item}
            data-item
            onClick={() => open(series.photos, i)}
            aria-label={`Foto ${i + 1} von ${series.photos.length} öffnen`}
          >
            <Photo photo={photo} />
          </button>
        ))}
      </div>

      {others.length > 0 && (
        <nav className={styles.next} aria-label="Weitere Serien">
          <span className={styles.nextLabel}>Nächste Serie</span>
          {others.map((o) => (
            <Link key={o.slug} href={`/serien/${o.slug}/`} className={styles.nextLink}>
              {o.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
