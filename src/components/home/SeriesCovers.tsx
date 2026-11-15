'use client';
/**
 * Die beiden Serien als große Bogenfenster mit Titel, Anzahl und Farbpalette.
 */
import Link from 'next/link';
import { useRef } from 'react';
import { featured, pick, series, spectrumSort, spread } from '@/content/photos';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from '../Photo';
import styles from './SeriesCovers.module.css';

export default function SeriesCovers() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.utils.toArray<HTMLElement>('[data-cover-img]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    gsap.fromTo('[data-offset]', { y: 80 }, {
      y: -80,
      ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className={styles.section} data-ambient="#000000" aria-label="Serien">
      <h2 className={styles.heading}>Serien</h2>
      <div className={styles.grid}>
        {series.map((s, i) => {
          const cover = pick([featured.covers[s.slug]])[0] ?? s.photos[0];
          const swatches = spread(spectrumSort(s.photos), 7).map((p) => p.key.hex);
          return (
            <Link key={s.slug} href={`/serien/${s.slug}/`} className={styles.card} data-offset={i % 2 ? '' : undefined}>
              <Photo photo={cover} shape="arch" aspect={3 / 4} imgClassName={styles.img} className={styles.photo} />
              <div className={styles.info}>
                <h3 className={styles.title}>{s.title}</h3>
                <span className={styles.count}>{s.photos.length} Fotos</span>
              </div>
              <ul className="swatches" aria-hidden="true">
                {swatches.map((c, k) => <li key={k} style={{ ['--c' as string]: c }} />)}
              </ul>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
