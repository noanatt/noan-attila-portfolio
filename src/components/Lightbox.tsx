'use client';
/**
 * Lightbox: Vollbild-Ansicht eines Fotos.
 * Öffnen von überall mit:  const { open } = useLightbox();  open(fotos, index)
 * Bedienung: ESC schließt, Pfeiltasten blättern, Wischen auf dem Handy.
 *
 * Öffnen und Schließen als Verwandlung: Das angeklickte Foto wächst von seinem
 * Platz (samt Ausschnitt und Ecken) zum großen Bild und gleitet beim Schließen
 * dorthin zurück. Ohne Ausgangsfoto (3D-Hero) blendet es weich ein.
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

/** Sichtbarer Rahmen des angeklickten Fotos (nicht im 3D-Hero) */
function thumbOf(el: Element | null): HTMLElement | null {
  const host = el?.closest('button, a');
  return (host?.querySelector('.photo') as HTMLElement | null) ?? null;
}
import styles from './Lightbox.module.css';

type Ctx = { open: (photos: Photo[], index: number) => void };
const LightboxContext = createContext<Ctx>({ open: () => {} });
export const useLightbox = () => useContext(LightboxContext);

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const thumb = useRef<HTMLElement | null>(null);
  const openedAt = useRef(-1);
  const opening = useRef(false);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const lastPointer = useRef<{ el: Element | null; t: number }>({ el: null, t: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Merkt sich, wo zuletzt geklickt wurde (Safari fokussiert Buttons beim Klick nicht)
  useEffect(() => {
    const onDown = (e: PointerEvent) => { lastPointer.current = { el: e.target as Element, t: performance.now() }; };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  const open = useCallback((photos: Photo[], index: number) => {
    lastFocus.current = document.activeElement as HTMLElement;
    const recent = performance.now() - lastPointer.current.t < 1000;
    thumb.current = thumbOf(recent ? lastPointer.current.el : document.activeElement);
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
    if (!img || prefersReducedMotion()) return;
    if (t) {
      const radius = parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0;
      gsap.fromTo(img, fromThumb(img, t.getBoundingClientRect(), radius), { ...FULL, duration: MORPH, ease: 'power3.inOut' });
      t.style.visibility = 'hidden'; // Foto ist herausgehoben
    } else {
      gsap.fromTo(img, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
    }
  }, [state]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    const img = imgRef.current;
    const t = thumb.current;
    const finish = () => {
      if (t) t.style.visibility = '';
      thumb.current = null;
      closingRef.current = false;
      setClosing(false);
      setState(null);
      lastFocus.current?.focus();
    };
    if (!img || prefersReducedMotion()) return finish();
    closingRef.current = true;
    setClosing(true);
    const r = t?.getBoundingClientRect();
    const visible = r && r.bottom > 0 && r.top < innerHeight && r.width > 0;
    if (t && r && visible && stateRef.current?.index === openedAt.current) {
      const radius = parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0;
      gsap.to(img, { ...fromThumb(img, r, radius), duration: MORPH * 0.85, ease: 'power3.inOut', onComplete: finish });
    } else {
      if (t) t.style.visibility = '';
      gsap.to(img, { opacity: 0, scale: 0.96, duration: 0.35, ease: 'power2.in', onComplete: finish });
    }
  }, []);

  const step = useCallback((dir: number) => {
    // Beim Blättern das Ausgangsfoto wieder zeigen
    if (thumb.current) thumb.current.style.visibility = '';
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
    <LightboxContext.Provider value={{ open }}>
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
              className={`${styles.img} ${loaded ? styles.loaded : ''}`}
              style={{
                ['--ratio' as string]: `${photo.width / photo.height}`,
                // bis das große Bild da ist: das schon geladene kleine Foto
                backgroundImage: `url(${photoSrc(photo, 'sm')})`,
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
