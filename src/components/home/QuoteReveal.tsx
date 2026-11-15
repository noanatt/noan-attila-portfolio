'use client';
/**
 * Ein Foto öffnet sich beim Scrollen aus einem schmalen Bogenfenster zum
 * Vollbild, danach erscheint das Zitat darüber. Mit WebGPU wirft das Foto
 * unter der Maus Wasserwellen (Shaders-Bibliothek, nachgeladen).
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { featured, photoSrc, toneFor } from '@/content/photos';
import { site } from '@/content/site';
import { gsap, SplitText, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Photo from '../Photo';
import styles from './QuoteReveal.module.css';

const RippleShader = lazy(() => import('./RippleShader'));

export default function QuoteReveal() {
  const ref = useRef<HTMLElement>(null);
  const photo = featured.reveal;
  const [shaderOn, setShaderOn] = useState(false);
  const [shaderReady, setShaderReady] = useState(false);

  // Nur mit WebGPU, nur mit Maus und ohne „Bewegung reduzieren“
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const sync = () => {
      const on = 'gpu' in navigator && !reduce.matches && fine.matches;
      setShaderOn(on);
      if (!on) setShaderReady(false);
    };
    sync();
    reduce.addEventListener('change', sync);
    return () => reduce.removeEventListener('change', sync);
  }, []);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: true },
    });
    tl.fromTo('[data-frame]',
      { clipPath: 'inset(16% 36% 10% 36% round 999px 999px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', duration: 1 })
      .fromTo('[data-zoom]', { scale: 1.4 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo('[data-shade]', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.75)
      .fromTo('[data-quote]', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.8);
    // Zitat Wort für Wort aus einer Maske (GSAP SplitText), an den Scroll gekoppelt
    const split = SplitText.create('[data-quote] p', { type: 'words', mask: 'words', wordsClass: 'split-word' });
    tl.from(split.words, { yPercent: 110, rotate: 8, transformOrigin: '0% 100%', stagger: 0.025, duration: 0.15, ease: 'power3.out' }, 0.8);
  }, { scope: ref });

  if (!photo) return null;

  return (
    <section ref={ref} className={styles.section} aria-label="Zitat" data-ambient={toneFor(photo)}>
      <div className={styles.sticky}>
        <div className={styles.frame} data-frame>
          <div className={styles.zoom} data-zoom>
            <Photo photo={photo} size="lg" fill />
            {shaderOn && (
              <Suspense fallback={null}>
                <RippleShader
                  className={styles.ripple}
                  imageUrl={photoSrc(photo, 'lg')}
                  ready={shaderReady}
                  onReady={() => setShaderReady(true)}
                />
              </Suspense>
            )}
          </div>
        </div>
        <div className={styles.shade} data-shade aria-hidden="true" />
        <blockquote className={styles.quote} data-quote>
          <p>&bdquo;{site.quote}&ldquo;</p>
        </blockquote>
      </div>
    </section>
  );
}
