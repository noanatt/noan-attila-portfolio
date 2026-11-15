'use client';
/**
 * 3D-Szene: Abzüge der Fotos hängen in einem dunklen Raum.
 * Beim Scrollen fährt die Kamera durch die Reihe hindurch (progress 0 → 1),
 * die Maus verschiebt den Blick leicht. Nebel lässt ferne Bilder aus dem
 * Dunkel auftauchen. Klick auf ein Bild öffnet die Lightbox.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { photoSrc, type Photo } from '@/content/photos';

/** Abstand der Bilder in der Tiefe – größer = längere Kamerafahrt */
export const SPACING = 3.4;
const CAMERA_START = 9;

type Props = {
  photos: Photo[];
  progress: RefObject<number>;
  active: boolean;
  onSelect: (index: number) => void;
  /** wird aufgerufen, sobald alle Fotos als Texturen geladen sind */
  onReady?: () => void;
};

/** Steht im selben Suspense-Bereich wie die Fotos → läuft erst, wenn alle geladen sind */
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => { onReady?.(); }, [onReady]);
  return null;
}

/** Deterministischer Zufall, damit das Layout bei jedem Laden gleich ist */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Print({ photo, index, onSelect }: { photo: Photo; index: number; onSelect: (i: number) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(photoSrc(photo, 'sm'));
  const aspect = useThree((s) => s.size.width / s.size.height);

  // Position: abwechselnd links/rechts einer freien Mittelachse.
  // Auf schmalen Bildschirmen (Handy hochkant) rücken die Bilder näher zusammen.
  const { position, size, rotation } = useMemo(() => {
    const spread = THREE.MathUtils.clamp(aspect / 1.4, 0.45, 1);
    const scale = THREE.MathUtils.clamp(aspect / 1.1, 0.62, 1);
    const side = index % 2 === 0 ? -1 : 1;
    const landscape = photo.width > photo.height;
    const h = (landscape ? (2.7 * photo.height) / photo.width : 2.1) * scale;
    const w = (h * photo.width) / photo.height;
    return {
      position: new THREE.Vector3(
        side * (1.25 + w / 2 + rand(index) * 0.9) * spread,
        (rand(index + 9) - 0.5) * 1.4,
        -index * SPACING,
      ),
      size: [w, h] as [number, number],
      rotation: side * -(0.1 + rand(index + 3) * 0.12),
    };
  }, [photo, index, aspect]);

  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    // Leichtes Schweben
    m.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
    const s = THREE.MathUtils.damp(m.scale.x, hovered ? 1.05 : 1, 6, delta);
    m.scale.set(s, s, 1);
  });

  return (
    <mesh
      ref={ref}
      position={position}
      rotation-y={rotation}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function CameraRig({ progress, depth }: { progress: RefObject<number>; depth: number }) {
  useFrame((state, delta) => {
    const cam = state.camera;
    const p = progress.current ?? 0;
    const targetZ = CAMERA_START - p * depth;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetZ, 3.5, delta);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 0.45, 2.5, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, state.pointer.y * 0.25, 2.5, delta);
    cam.lookAt(cam.position.x * 0.4, cam.position.y * 0.4, cam.position.z - 8);
  });
  return null;
}

export default function HeroScene({ photos, progress, active, onSelect, onReady }: Props) {
  const depth = (photos.length - 1) * SPACING + CAMERA_START - 3;
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, CAMERA_START], fov: 50, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
      aria-hidden="true"
    >
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 5, 22]} />
      <Suspense fallback={null}>
        {photos.map((p, i) => (
          <Print key={p.id} photo={p} index={i} onSelect={onSelect} />
        ))}
        <Ready onReady={onReady} />
      </Suspense>
      <CameraRig progress={progress} depth={depth} />
    </Canvas>
  );
}
