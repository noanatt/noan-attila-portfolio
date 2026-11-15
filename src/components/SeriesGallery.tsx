'use client';
/**
 * Serienseite: Titel, Text, Umschalter für die Sortierung (Reihenfolge / Farbe)
 * und alle Fotos der Serie. Beim Umsortieren gleiten die Fotos mit GSAP Flip
 * von ihrem alten an ihren neuen Platz.
 */
import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { spectrumSort, spread, type Series } from '@/content/photos';
import { gsap, Flip, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import PhotoGrid from './PhotoGrid';
import styles from './SeriesGallery.module.css';

type Props = { series: Series; intro?: string; others: Series[] };
type Sort = 'original' | 'farbe';

export default function SeriesGallery({ series, intro, others }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<Sort>('original');
  const flipState = useRef<Flip.FlipState | null>(null);

  // Vor dem Umsortieren die Positionen merken (First) …
  const changeSort = (next: Sort) => {
    if (next === sort) return;
    if (!prefersReducedMotion() && ref.current) {
      const items = ref.current.querySelectorAll<HTMLElement>('[data-item]');
      // Ausstehende Einblendungen beenden: ihre Auslöser passen nach dem
      // Umsortieren nicht mehr zur Position, die Fotos blieben sonst unsichtbar.
      gsap.killTweensOf(items);
      gsap.set(items, { opacity: 1, y: 0 });
      flipState.current = Flip.getState(items);
    }
    setSort(next);
  };

  // … nach dem neuen Rendern (Last) von dort aus animieren (Invert, Play)
  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 1.3,
      ease: 'power3.inOut',
      stagger: { amount: 0.5, from: 'start' },
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, [sort]);
  const photos = useMemo(
    () => (sort === 'farbe' ? spectrumSort(series.photos) : series.photos),
    [sort, series.photos],
  );
  const swatches = useMemo(() => spread(spectrumSort(series.photos), 9).map((p) => p.key.hex), [series.photos]);

  useGSAP(() => {
    gsap.from('[data-char]', { yPercent: 110, duration: prefersReducedMotion() ? 0 : 1.2, ease: 'expo.out', stagger: 0.03 });
  }, { scope: ref });

  return (
    <div ref={ref} className={styles.page}>
      <header className={styles.head} data-ambient="#000000">
        <h1 className={styles.title}>
          <span className={styles.line}>
            {series.title.split('').map((c, i) => (
              <span key={i} data-char className={styles.char}>{c === ' ' ? ' ' : c}</span>
            ))}
          </span>
        </h1>
        <div className={styles.meta}>
          {intro && <p>{intro}</p>}
          <ul className="swatches" aria-hidden="true">
            {swatches.map((c, i) => <li key={i} style={{ ['--c' as string]: c }} />)}
          </ul>
        </div>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.count}>{series.photos.length} Fotos</span>
        <div className={styles.toggle} role="group" aria-label="Sortierung">
          <button type="button" aria-pressed={sort === 'original'} onClick={() => changeSort('original')}>Reihenfolge</button>
          <button type="button" aria-pressed={sort === 'farbe'} onClick={() => changeSort('farbe')}>Nach Farbe</button>
        </div>
      </div>

      <PhotoGrid photos={photos} label={series.title} />

      {others.length > 0 && (
        <nav className={styles.next} aria-label="Weitere Serien" data-ambient="#000000">
          <span className={styles.nextLabel}>Nächste Serie</span>
          {others.map((o) => (
            <Link key={o.slug} href={`/serien/${o.slug}/`} className={styles.nextLink}>{o.title}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
