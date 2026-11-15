'use client';
/**
 * Mehrschichtige Parallax-Galerie:
 * – die Spalten bewegen sich unterschiedlich schnell (Ebenen-Effekt)
 * – zusätzlich verschiebt sich jedes Foto leicht in seinem Rahmen
 */
import Link from 'next/link';
import { useRef } from 'react';
import type { Photo as PhotoType } from '@/content/photos';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from '../Photo';
import { useLightbox } from '../Lightbox';
import styles from './ParallaxGallery.module.css';

type Props = {
  title: string;
  intro?: string;
  photos: PhotoType[];
  total: number;
  href: string;
};

/** Wie stark jede Spalte relativ zum Scrollen wandert (Anteil der Spaltenhöhe) */
const COLUMN_SPEED = [0.04, 0.2, 0.1];

export default function ParallaxGallery({ title, intro, photos, total, href }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { open } = useLightbox();

  // Fotos reihum auf 3 Spalten verteilen
  const columns: { photo: PhotoType; index: number }[][] = [[], [], []];
  photos.forEach((photo, index) => columns[index % 3].push({ photo, index }));

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 700px)', () => {
      gsap.utils.toArray<HTMLElement>('[data-column]').forEach((col, i) => {
        gsap.to(col, {
          y: () => -col.offsetHeight * COLUMN_SPEED[i],
          ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      });
    });
    gsap.utils.toArray<HTMLElement>('[data-inner]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }, { scope: ref });

  return (
    <section ref={ref} className={styles.section}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <div className="section-meta">
          {intro && <p>{intro}</p>}
          <Link href={href} className="link">Alle {total} Fotos ansehen</Link>
        </div>
      </div>

      <div className={styles.grid}>
        {columns.map((col, c) => (
          <div key={c} className={styles.column} data-column>
            {col.map(({ photo, index }) => (
              <button
                key={photo.id}
                type="button"
                className={styles.item}
                onClick={() => open(photos, index)}
                aria-label={`Foto ${index + 1} von ${photos.length} öffnen`}
              >
                <Photo photo={photo} imgClassName={styles.inner} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
