'use client';
/**
 * Hero: großer Name über der 3D-Szene.
 * Der Abschnitt ist mehrere Bildschirmhöhen hoch; der Inhalt bleibt kleben
 * (sticky), während der Scroll-Fortschritt die Kamerafahrt steuert.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { featured } from '@/content/photos';
import { site } from '@/content/site';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useLightbox } from '../Lightbox';
import styles from './Hero.module.css';

// Three.js nur im Browser laden (kein Server-Rendering)
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const { open } = useLightbox();
  const photos = featured.hero;

  // 3D-Rendering pausieren, wenn der Hero nicht sichtbar ist (spart Akku)
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(() => {
    const reduced = prefersReducedMotion();

    // Einmalige Eröffnung: Buchstaben steigen aus der Grundlinie
    gsap.from('[data-char]', {
      yPercent: 110,
      duration: reduced ? 0 : 1.4,
      ease: 'expo.out',
      stagger: 0.035,
      delay: 0.2,
    });
    gsap.from('[data-fade]', { opacity: 0, duration: reduced ? 0 : 1.2, delay: 0.9, stagger: 0.1 });

    if (reduced) return;

    // Scroll-Fortschritt → Kamera
    ScrollTrigger.create({
      trigger: section.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress;
        gsap.set('[data-progress]', { scaleX: self.progress });
      },
    });

    // Name tritt beim ersten Scrollen zurück
    gsap.to('[data-title]', {
      yPercent: -30,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: section.current, start: 'top top', end: '18% top', scrub: true },
    });
    gsap.to('[data-fade]', {
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: section.current, start: '2% top', end: '10% top', scrub: true },
    });
  }, { scope: section });

  const name = site.name.split(' ');

  return (
    <section ref={section} className={styles.hero} aria-label="Einstieg">
      <div className={styles.sticky}>
        <div className={`${styles.canvas} ${ready ? styles.ready : ''}`}>
          <HeroScene
            photos={photos}
            progress={progress}
            active={active}
            onSelect={(i) => open(photos, i)}
            onReady={handleReady}
          />
        </div>
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.overlay}>
          <h1 className={styles.title} data-title>
            {name.map((word) => (
              <span key={word} className={styles.line}>
                {word.split('').map((c, i) => (
                  <span key={i} data-char className={styles.char}>{c}</span>
                ))}
              </span>
            ))}
          </h1>
          <p className={styles.kicker} data-fade>{site.heroKicker}</p>
          <span className={styles.hint} data-fade>{site.heroHint}</span>
        </div>

        <div className={styles.progress} data-progress aria-hidden="true" />
      </div>
    </section>
  );
}
