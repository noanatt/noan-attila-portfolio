'use client';
/**
 * Ein einzelnes Foto: zeigt erst die dominante Farbe, dann blendet das Bild ein.
 * Das Seitenverhältnis wird reserviert, damit beim Laden nichts springt.
 *
 * shape:  'arch' (Bogen) | 'circle' | 'slit' (schmaler Streifen) | 'soft' (abgerundet) | 'wide'
 * aspect: festes Seitenverhältnis (z. B. 4/5) – das Foto wird dann passend beschnitten
 */
import { useState } from 'react';
import { photoSrc, type Photo as PhotoType } from '@/content/photos';

export type Shape = 'arch' | 'circle' | 'slit' | 'soft' | 'wide';

type Props = {
  photo: PhotoType;
  size?: 'xs' | 'sm' | 'lg';
  alt?: string;
  className?: string;
  shape?: Shape;
  aspect?: number;
  /** Feste Höhe statt Seitenverhältnis (Elternelement bestimmt die Größe) */
  fill?: boolean;
  eager?: boolean;
  imgClassName?: string;
};

export default function Photo({
  photo, size = 'sm', alt = '', className = '', shape, aspect, fill, eager, imgClassName = '',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const ratio = aspect ?? photo.width / photo.height;
  return (
    <div
      className={`photo ${shape ? `shape-${shape}` : ''} ${className}`}
      style={{
        ['--photo-color' as string]: photo.color,
        aspectRatio: fill ? undefined : `${ratio}`,
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
