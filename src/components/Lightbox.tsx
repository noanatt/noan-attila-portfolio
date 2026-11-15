'use client';
/**
 * Lightbox: Vollbild-Ansicht eines Fotos.
 * Öffnen von überall mit:  const { open } = useLightbox();  open(fotos, index)
 * Bedienung: ESC schließt, Pfeiltasten blättern, Wischen auf dem Handy.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { photoSrc, toneFor, type Photo } from '@/content/photos';
import { useLenis } from './SmoothScroll';
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

  const open = useCallback((photos: Photo[], index: number) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setLoaded(false);
    setState({ photos, index });
  }, []);

  const close = useCallback(() => {
    setState(null);
    lastFocus.current?.focus();
  }, []);

  const step = useCallback((dir: number) => {
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
          className={styles.overlay}
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
              src={photoSrc(photo, 'lg')}
              alt=""
              className={`${styles.img} ${loaded ? styles.loaded : ''}`}
              style={{ aspectRatio: `${photo.width} / ${photo.height}`, background: photo.color }}
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
