'use client';
/**
 * Ein einzelnes Foto: zeigt erst die dominante Farbe, dann blendet das Bild ein.
 * Das Seitenverhältnis wird reserviert, damit beim Laden nichts springt.
 */
import { useState } from 'react';
import { photoSrc, type Photo as PhotoType } from '@/content/photos';

type Props = {
  photo: PhotoType;
  size?: 'sm' | 'lg';
  alt?: string;
  className?: string;
  /** Feste Höhe statt Seitenverhältnis (z. B. im Filmstreifen) */
  fill?: boolean;
  eager?: boolean;
  imgClassName?: string;
};

export default function Photo({ photo, size = 'sm', alt = '', className = '', fill, eager, imgClassName = '' }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`photo ${className}`}
      style={{
        ['--photo-color' as string]: photo.color,
        aspectRatio: fill ? undefined : `${photo.width} / ${photo.height}`,
      }}
    >
      <img
        src={photoSrc(photo, size)}
        alt={alt}
        width={photo.width}
        height={photo.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`${imgClassName} ${loaded ? 'is-loaded' : ''}`}
        ref={(el) => { if (el?.complete && el.naturalWidth) setLoaded(true); }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
