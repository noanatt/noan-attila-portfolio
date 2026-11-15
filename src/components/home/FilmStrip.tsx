'use client';
/**
 * Horizontaler Filmstreifen: der Abschnitt bleibt stehen (pin) und die
 * Fotos ziehen beim vertikalen Scrollen seitlich vorbei – wie aus dem
 * Autofenster. Jedes Foto bewegt sich zusätzlich leicht in seinem Rahmen.
 */
import Link from 'next/link';
import { useRef } from 'react';
import type { Photo as PhotoType } from '@/content/photos';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from '../Photo';
import { useLightbox } from '../Lightbox';
import styles from './FilmStrip.module.css';

type Props = {
  title: string;
  intro?: string;
  photos: PhotoType[];
  total: number;
  href: string;
};

export default function FilmStrip({ title, intro, photos, total, href }: Props) {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { open } = useLightbox();

  useGSAP(() => {
    if (prefersReducedMotion() || !track.current) return;
    const t = track.current;
    const distance = () => t.scrollWidth - window.innerWidth;

    const scroll = gsap.to(t, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });

    // Innere Bewegung der Fotos, gekoppelt an die horizontale Fahrt
    gsap.utils.toArray<HTMLElement>('[data-inner]').forEach((img) => {
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: img.parentElement,
          containerAnimation: scroll,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      });
    });
  }, { scope: ref });

  return (
    <section ref={ref} className={styles.section}>
      <div ref={track} className={styles.track}>
        <div className={styles.head}>
          <h2 className="section-title">{title}</h2>
          {intro && <p className={styles.intro}>{intro}</p>}
          <Link href={href} className="link">Alle {total} Fotos ansehen</Link>
        </div>

        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className={styles.item}
            data-pos={i % 3}
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            onClick={() => open(photos, i)}
            aria-label={`Foto ${i + 1} von ${photos.length} öffnen`}
          >
            <Photo photo={photo} fill imgClassName={styles.inner} />
          </button>
        ))}

        <Link href={href} className={styles.end}>
          <span>Weiter zur Serie</span>
          <span className={styles.endCount}>{total} Fotos</span>
        </Link>
      </div>
    </section>
  );
}
