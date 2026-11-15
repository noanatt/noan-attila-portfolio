'use client';
/**
 * Farbspektrum: alle Fotos als schmale Streifen, nach Farbe sortiert.
 * Mit der Maus (oder Tastatur) öffnet sich ein Streifen wie unter einer Lupe,
 * darunter stehen Serie und Farbpalette des Fotos. Klick öffnet die Lightbox.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getSeries, photoSrc, spectrum } from '@/content/photos';
import { site } from '@/content/site';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useLightbox } from '../Lightbox';
import styles from './Spectrum.module.css';

export default function Spectrum() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const { open } = useLightbox();
  const photos = spectrum;
  const current = active !== null ? photos[active] : null;

  // Bilder erst laden, wenn der Abschnitt in die Nähe kommt
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from('[data-sliver]', {
      scaleY: 0,
      transformOrigin: '50% 100%',
      duration: 1.2,
      ease: 'expo.out',
      stagger: { each: 0.006, from: 'center' },
      scrollTrigger: { trigger: '[data-strip]', start: 'top 80%', once: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className={styles.section} data-ambient="#000000" aria-labelledby="spectrum-title">
      <div className={styles.head}>
        <h2 id="spectrum-title" className={styles.title}>{site.spectrumTitle}</h2>
        <Link href="/farben/" className="link">Alle {photos.length} Fotos nach Farbe ansehen</Link>
      </div>

      <div className={styles.strip} data-strip onMouseLeave={() => setActive(null)}>
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            data-sliver
            className={styles.sliver}
            style={{ ['--c' as string]: p.key.hex }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => open(photos, i)}
            aria-label={`Foto ${i + 1} von ${photos.length} öffnen`}
          >
            {visible && <img src={photoSrc(p, 'xs')} alt="" loading="lazy" decoding="async" />}
          </button>
        ))}
      </div>

      <div className={styles.caption} aria-live="polite">
        {current ? (
          <>
            <span>{getSeries(current.series)?.title}</span>
            <ul className="swatches" aria-hidden="true">
              {current.palette.map((c) => <li key={c} style={{ ['--c' as string]: c }} />)}
            </ul>
          </>
        ) : (
          <span className={styles.hint}>Mit der Maus über das Spektrum fahren.</span>
        )}
      </div>
    </section>
  );
}
