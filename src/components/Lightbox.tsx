'use client';
/**
 * Lightbox: Vollbild-Ansicht eines Fotos.
 * Öffnen von überall mit:  const { open } = useLightbox();  open(fotos, index)
 * Bedienung: ESC schließt, Pfeiltasten blättern, Wischen auf dem Handy.
 *
 * Öffnen und Schließen als Verwandlung: Das angeklickte Foto wächst von seinem
 * Platz (samt Ausschnitt und Ecken) zum großen Bild und gleitet beim Schließen
 * dorthin zurück. Fotos aus dem 3D-Hero geben ihre Bildschirmposition selbst mit.
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { photoSrc, toneFor, type Photo } from '@/content/photos';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useLenis } from './SmoothScroll';

const MORPH = 0.8; // Sekunden für die Verwandlung

/** Startwerte, damit das große Bild genau wie das kleine Foto aussieht */
function fromThumb(img: HTMLElement, from: DOMRect, radius: number) {
  const to = img.getBoundingClientRect();
  const s = Math.max(from.width / to.width, from.height / to.height);
  const ix = Math.max(0, (to.width - from.width / s) / 2);
  const iy = Math.max(0, (to.height - from.height / s) / 2);
  return {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    scale: s,
    clipPath: `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${radius / s}px)`,
  };
}
const FULL = { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px round 0px)' };

/** Sichtbarer Rahmen des angeklickten Fotos im Seitenlayout */
function thumbOf(el: Element | null): LightboxOrigin | null {
  const host = el?.closest('button, a');
  const t = (host?.querySelector('.photo') as HTMLElement | null) ?? null;
  if (!t) return null;
  return {
    rect: () => t.getBoundingClientRect(),
    hide: () => { t.style.visibility = 'hidden'; },
    show: () => { t.style.visibility = ''; },
    radius: parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0,
  };
}
import styles from './Lightbox.module.css';

/** Wo das Foto herkommt: Position auf dem Bildschirm, ausblenden, wieder zeigen */
export type LightboxOrigin = {
  rect: () => DOMRect | null;
  hide: () => void;
  show: () => void;
  radius?: number;
};
type Ctx = {
  open: (photos: Photo[], index: number, origin?: LightboxOrigin) => void;
  /** true, solange die Lightbox ruhig offen steht (z. B. um die 3D-Szene zu pausieren) */
  settled: boolean;
};
const LightboxContext = createContext<Ctx>({ open: () => {}, settled: false });
export const useLightbox = () => useContext(LightboxContext);

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const thumb = useRef<LightboxOrigin | null>(null);
  const openedAt = useRef(-1);
  const opening = useRef(false);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [settled, setSettled] = useState(false);
  const lastPointer = useRef<{ el: Element | null; t: number }>({ el: null, t: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Merkt sich, wo zuletzt geklickt wurde (Safari fokussiert Buttons beim Klick nicht)
  useEffect(() => {
    const onDown = (e: PointerEvent) => { lastPointer.current = { el: e.target as Element, t: performance.now() }; };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  const open = useCallback((photos: Photo[], index: number, origin?: LightboxOrigin) => {
    lastFocus.current = document.activeElement as HTMLElement;
    const recent = performance.now() - lastPointer.current.t < 1000;
    thumb.current = origin ?? thumbOf(recent ? lastPointer.current.el : document.activeElement);
    openedAt.current = index;
    opening.current = true;
    setLoaded(false);
    setState({ photos, index });
  }, []);

  // Verwandlung beim Öffnen: vom kleinen Foto zum großen Bild
  useLayoutEffect(() => {
    if (!opening.current || !state) return;
    opening.current = false;
    const img = imgRef.current;
    const t = thumb.current;
    if (!img || prefersReducedMotion()) { setSettled(true); return; }
    const r = t?.rect();
    // Startzustand sofort setzen, die Bewegung aber erst zwei Bilder später starten:
    // so ist der Aufbau der Lightbox fertig und die ersten Bilder ruckeln nicht
    let tween: gsap.core.Tween | undefined;
    const done = () => setSettled(true);
    if (t && r) {
      gsap.set(img, fromThumb(img, r, t.radius ?? 0));
      t.hide(); // Foto ist herausgehoben
    } else {
      gsap.set(img, { opacity: 0, scale: 0.96 });
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      tween = t && r
        ? gsap.to(img, { ...FULL, duration: MORPH, ease: 'power3.inOut', onComplete: done })
        : gsap.to(img, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', onComplete: done });
    }));
    return () => { cancelAnimationFrame(raf); tween?.kill(); };
  }, [state]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    setSettled(false);
    const img = imgRef.current;
    const t = thumb.current;
    const finish = () => {
      t?.show();
      thumb.current = null;
      closingRef.current = false;
      setClosing(false);
      setState(null);
      lastFocus.current?.focus();
    };
    if (!img || prefersReducedMotion()) return finish();
    closingRef.current = true;
    setClosing(true);
    const r = t?.rect();
    const visible = r && r.bottom > 0 && r.top < innerHeight && r.width > 0;
    if (t && r && visible && stateRef.current?.index === openedAt.current) {
      gsap.to(img, { ...fromThumb(img, r, t.radius ?? 0), duration: MORPH * 0.85, ease: 'power3.inOut', onComplete: finish });
    } else {
      t?.show();
      gsap.to(img, { opacity: 0, scale: 0.96, duration: 0.35, ease: 'power2.in', onComplete: finish });
    }
  }, []);

  const step = useCallback((dir: number) => {
    // Beim Blättern das Ausgangsfoto wieder zeigen
    thumb.current?.show();
    setLoaded(false);
    setState((s) => s && { ...s, index: (s.index + dir + s.photos.length) % s.photos.length });
  }, []);

  // Scrollen sperren, Fokus setzen, Tastatur
  useEffect(() => {
    if (!state) return;
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lenis?.start();
      document.documentElement.style.overflow = '';
    };
  }, [state !== null, lenis, close, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nächstes und vorheriges Bild vorladen
  useEffect(() => {
    if (!state) return;
    const { photos, index } = state;
    [1, -1].forEach((d) => {
      const img = new Image();
      img.src = photoSrc(photos[(index + d + photos.length) % photos.length], 'lg');
    });
  }, [state]);

  const photo = state?.photos[state.index];

  return (
    <LightboxContext.Provider value={{ open, settled }}>
      {children}
      {state && photo && (
        <div
          className={`${styles.overlay} ${closing ? styles.closing : ''}`}
          style={{ ['--tone' as string]: toneFor(photo) }}
          role="dialog"
          aria-modal="true"
          aria-label="Foto in groß"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onTouchStart={(e) => { touchX.current = e.changedTouches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = touchX.current - e.changedTouches[0].clientX;
            if (Math.abs(dx) > 50) step(dx > 0 ? 1 : -1);
          }}
        >
          <figure className={styles.figure} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <img
              key={photo.id}
              ref={imgRef}
              src={photoSrc(photo, 'lg')}
              alt=""
              decoding="async"
              className={`${styles.img} ${loaded ? styles.loaded : ''}`}
              style={{
                ['--ratio' as string]: `${photo.width / photo.height}`,
                // bis das große Bild da ist: die schon geladenen kleineren Versionen
                backgroundImage: `url(${photoSrc(photo, 'sm')}), url(${photoSrc(photo, 'xs')})`,
                backgroundColor: photo.color,
              }}
              onLoad={() => setLoaded(true)}
            />
          </figure>
          <div className={styles.bar}>
            <div className={styles.info}>
              <span className={styles.count}>
                {state.index + 1} / {state.photos.length}
              </span>
              <ul className="swatches" aria-label="Farbpalette des Fotos">
                {photo.palette.map((c) => <li key={c} title={c} style={{ ['--c' as string]: c }} />)}
              </ul>
            </div>
            <div className={styles.controls}>
              <button type="button" onClick={() => step(-1)}>Zurück</button>
              <button type="button" onClick={() => step(1)}>Weiter</button>
              <button type="button" ref={closeRef} onClick={close}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </LightboxContext.Provider>
  );
}
