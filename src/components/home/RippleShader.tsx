'use client';
/**
 * WebGPU-Wellen über einem Foto: Das Bild verzerrt sich wie Wasser dort,
 * wo die Maus darüberfährt. Wird nur geladen, wenn der Browser WebGPU kann
 * (siehe QuoteReveal) – sonst bleibt das normale Foto stehen.
 */
import { CursorRipples, ImageTexture, Shader } from 'shaders/react';

type Props = { imageUrl: string; ready: boolean; onReady: () => void; className?: string };

export default function RippleShader({ imageUrl, ready, onReady, className = '' }: Props) {
  return (
    <Shader
      className={`${className}${ready ? ' is-ready' : ''}`}
      toneMapping="aces"
      disableTelemetry
      onReady={onReady}
      aria-hidden="true"
    >
      <ImageTexture url={imageUrl} objectFit="cover" />
      {/* intensity 0–20, decay 0–20 (kleiner = schwingt länger), radius 0.1–1, chromaticSplit 0–3 */}
      <CursorRipples intensity={18} decay={4} radius={0.85} chromaticSplit={2.2} />
    </Shader>
  );
}
