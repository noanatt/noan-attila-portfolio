'use client';
/**
 * Masonry-Raster (Hoch- und Querformat gemischt): Desktop 3 Spalten,
 * Tablet 2, Handy 1. Jedes Foto färbt beim Scrollen den Seitenhintergrund
 * in einem tiefen Ton seiner eigenen Farbe ein.
 */
import { useEffect, useRef } from 'react';
import { toneFor, type Photo as PhotoType } from '@/content/photos';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from './Photo';
import { useLightbox } from './Lightbox';
import styles from './PhotoGrid.module.css';

type Props = { photos: PhotoType[]; label: string };

export default function PhotoGrid({ photos, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { open } = useLightbox();

  // Nach jeder Änderung der Reihenfolge die Ambient-Farben neu einlesen
  useEffect(() => {
    window.dispatchEvent(new Event('ambient:refresh'));
  }, [photos]);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.utils.toArray<HTMLElement>('[data-item]').forEach((el) => {
      gsap.from(el, {
        y: 60,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 94%', once: true },
      });
    });
  }, { scope: ref });

  return (
    <div ref={ref} className={styles.grid}>
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          type="button"
          className={styles.item}
          data-item
          data-ambient={toneFor(photo)}
          onClick={() => open(photos, i)}
          aria-label={`${label}: Foto ${i + 1} von ${photos.length} öffnen`}
        >
          <Photo photo={photo} shape="soft" />
        </button>
      ))}
    </div>
  );
}
