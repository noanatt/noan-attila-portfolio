'use client';
/**
 * Ambient-Farbe: Der Seitenhintergrund nimmt die Farbe des Bereichs an,
 * der gerade in der Bildschirmmitte ist.
 *
 * Verwendung in jedem Element:
 *   <section data-ambient="hsl(30, 40%, 9%)" data-ambient-fg="#f3f0ea">
 * Nach Änderungen an der Reihenfolge (z. B. Sortierung) neu einlesen mit:
 *   window.dispatchEvent(new Event('ambient:refresh'))
 */
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

const DEFAULT_FG = '#f3f0ea';

export default function AmbientController() {
  const pathname = usePathname();

  useEffect(() => {
    let triggers: ScrollTrigger[] = [];
    const body = document.body;

    const apply = (el: HTMLElement, instant = false) => {
      gsap.to(body, {
        '--bg': el.dataset.ambient,
        '--fg': el.dataset.ambientFg ?? DEFAULT_FG,
        duration: instant || prefersReducedMotion() ? 0 : 1.1,
        ease: 'power2.out',
        overwrite: true,
      });
    };

    const setup = () => {
      triggers.forEach((t) => t.kill());
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-ambient]'));
      triggers = els.map((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top 50%',
          end: 'bottom 50%',
          onToggle: (self) => { if (self.isActive) apply(el); },
        }),
      );
      // Startfarbe: das Element in der Bildschirmmitte (oder das erste)
      const mid = window.innerHeight / 2;
      const current = els.find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      }) ?? els[0];
      if (current) apply(current, true);
    };

    const id = requestAnimationFrame(setup);
    window.addEventListener('ambient:refresh', setup);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('ambient:refresh', setup);
      triggers.forEach((t) => t.kill());
    };
  }, [pathname]);

  return null;
}
