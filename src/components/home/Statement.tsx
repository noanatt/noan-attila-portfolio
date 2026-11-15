'use client';
/**
 * Großer Einleitungstext: die Wörter hellen sich nacheinander auf,
 * während man scrollt (an die Scroll-Position gekoppelt, nicht zeitbasiert).
 */
import { useRef } from 'react';
import { site } from '@/content/site';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import styles from './Statement.module.css';

export default function Statement() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo('[data-word]', { opacity: 0.16 }, {
      opacity: 1,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: ref.current, start: 'top 75%', end: 'bottom 55%', scrub: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className={styles.statement}>
      <p className={styles.text}>
        {site.statement.split(' ').map((w, i) => (
          <span key={i} data-word>{w} </span>
        ))}
      </p>
    </section>
  );
}
