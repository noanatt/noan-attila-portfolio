'use client';
/**
 * Seitenübergang: Beim Klick auf einen internen Link breitet sich eine Fläche
 * in der Farbe des Ziels als Kreis vom Klickpunkt aus. In der Mitte steigt der
 * Name des Ziels aus einer Maske auf. Dahinter lädt die neue Seite, dann zieht
 * sich die Fläche nach oben zusammen und gibt sie frei.
 * Nichts wird überblendet oder unscharf, alles verändert nur seine Form.
 *
 * Ohne Übergang: Zurück/Vorwärts im Browser, Sprünge innerhalb einer Seite,
 * neue Tabs (Strg/Cmd-Klick), externe Links und „Bewegung reduzieren“.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { featured, series } from '@/content/photos';
import { deepTone } from '@/lib/color';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import styles from './PageTransition.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const LIGHT = { bg: '#e9e7e2', fg: '#0d0d0d' };
const DARK = { bg: '#000000', fg: '#f3f0ea' };

/* Stellschrauben */
const COVER = 0.7;    // Sekunden: Kreis füllt den Bildschirm
const REVEAL = 0.75;  // Sekunden: Fläche zieht sich nach oben zurück
const HOLD = 0.12;    // Sekunden: mindestens so lange steht der Name

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

/** Farbe und Name des Ziels anhand des Pfads */
function targetLook(path: string): { bg: string; fg: string; label?: string } {
  const p = norm(path.slice(BASE.length) || '/');
  const m = p.match(/^\/serien\/([^/]+)/);
  if (m) {
    const s = series.find((x) => x.slug === m[1]);
    const cover = s?.photos.find((ph) => ph.id === featured.covers[m[1]]) ?? s?.photos[0];
    return { bg: cover ? deepTone(cover.key) : DARK.bg, fg: DARK.fg, label: s?.title };
  }
  if (p === '/about' || p === '/impressum' || p === '/datenschutz') {
    return { ...LIGHT, label: { '/about': 'About', '/impressum': 'Impressum', '/datenschutz': 'Datenschutz' }[p] };
  }
  if (p === '/farben') return { ...DARK, label: 'Farben' };
  return { ...DARK, label: 'noan attila' };
}

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const layer = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const arrived = useRef<((path: string) => void) | null>(null);

  // Meldet, wenn die neue Seite gerendert ist
  useEffect(() => {
    arrived.current?.(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      if (busy.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (norm(url.pathname) === norm(location.pathname)) return; // nur Sprung auf derselben Seite
      if (prefersReducedMotion()) return;
      const el = layer.current;
      const text = label.current;
      if (!el || !text) return;

      e.preventDefault();
      e.stopPropagation();
      busy.current = true;

      const route = url.pathname.slice(BASE.length) + url.search + url.hash;
      router.prefetch(url.pathname.slice(BASE.length));
      const look = targetLook(url.pathname);
      const x = e.clientX || innerWidth / 2;
      const y = e.clientY || innerHeight / 2;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;
      text.textContent = look.label ?? '';
      gsap.killTweensOf([el, text]);
      gsap.set(el, {
        display: 'grid',
        backgroundColor: look.bg,
        color: look.fg,
        clipPath: `circle(0px at ${x}px ${y}px)`,
      });
      gsap.set(text, { yPercent: 110 });

      // 1) Kreis füllt den Bildschirm, Name steigt auf
      const cover = gsap.timeline();
      cover
        .to(el, { clipPath: `circle(${r}px at ${x}px ${y}px)`, duration: COVER, ease: 'power2.inOut' })
        .to(text, { yPercent: 0, duration: 0.55, ease: 'power3.out' }, COVER * 0.45);

      // 2) Neue Seite laden, während die Fläche alles verdeckt
      const target = norm(url.pathname.slice(BASE.length) || '/');
      const loaded = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 5000); // Sicherheitsnetz
        arrived.current = (path) => {
          if (norm(path) === target) { clearTimeout(timer); resolve(); }
        };
      });
      await cover.then();
      router.push(route);
      await Promise.all([loaded, new Promise((r2) => setTimeout(r2, HOLD * 1000))]);
      arrived.current = null;
      await new Promise((r2) => requestAnimationFrame(r2));

      // 3) Fläche zieht sich nach oben zusammen, Name steigt hinaus
      gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.timeline({
        onComplete: () => {
          gsap.set(el, { display: 'none' });
          busy.current = false;
        },
      })
        .to(text, { yPercent: -110, duration: 0.4, ease: 'power2.in' }, 0)
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: REVEAL, ease: 'power2.inOut' }, 0.08);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      <span className={styles.mask}>
        <span ref={label} className={styles.label} />
      </span>
    </div>
  );
}
