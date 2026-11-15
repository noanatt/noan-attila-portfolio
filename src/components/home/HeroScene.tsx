'use client';
/**
 * 3D-Szene im Hero.
 *
 * Phase 1 (Scroll 0 → TUNNEL_END): Die Fotos hängen spiralförmig um die
 *   Kamera, die durch sie hindurchfliegt. Die Fotos sind nach Farbe sortiert,
 *   und die Raumfarbe folgt dem Foto, an dem man gerade vorbeifliegt.
 * Phase 2 (TUNNEL_END → 1): Alle Fotos fliegen vor der Kamera zu einer
 *   nach Farbe sortierten Wand zusammen.
 *
 * Klick auf ein Foto öffnet die Lightbox.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { photoSrc, type Photo } from '@/content/photos';
import { isNeutral } from '@/lib/color';

/* Stellschrauben ---------------------------------------------------- */
const SPACING = 1.55;        // Abstand der Fotos in der Tiefe
const CAMERA_START = 6;      // Startposition der Kamera
const TUNNEL_END = 0.76;     // Anteil des Scrollwegs für die Kamerafahrt
const WALL_DISTANCE = 8.5;   // Abstand der Farbwand vor der Kamera
const TWIST = 1.4;           // wie stark sich die Spirale beim Scrollen dreht
const MAT = 0.09;            // Breite des farbigen Rahmens an der Farbwand

type Props = {
  photos: Photo[];
  progress: RefObject<number>;
  active: boolean;
  onSelect: (index: number) => void;
  onReady?: () => void;
};

/** Deterministischer Zufall, damit das Layout bei jedem Laden gleich ist */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Raumfarbe zu einem Foto: dunkel, aber deutlich gefärbt */
function roomColor(p: Photo) {
  const c = new THREE.Color();
  if (isNeutral(p.key)) return c.setHSL(p.key.h / 360, 0.05, 0.035, THREE.SRGBColorSpace);
  return c.setHSL(p.key.h / 360, Math.min(p.key.s, 70) / 100 * 0.75, 0.085, THREE.SRGBColorSpace);
}

type Layout = {
  tunnel: { angle: number; rx: number; ry: number; z: number; roll: number };
  wall: { x: number; y: number; scale: number };
  size: [number, number];
};

function useLayout(photos: Photo[]) {
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  return useMemo(() => {
    const n = photos.length;
    const lastZ = -(n - 1) * SPACING;
    const camEnd = lastZ - 1.5;
    const wallZ = camEnd - WALL_DISTANCE;

    // Raster der Farbwand passend zum Bildschirm
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(25)) * WALL_DISTANCE;
    const visW = visH * aspect;
    const cols = Math.max(4, Math.round(Math.sqrt(n * aspect * 1.25)));
    const rows = Math.ceil(n / cols);
    const cellW = (visW * 0.86) / cols;
    const cellH = (visH * 0.66) / rows;

    const spreadX = THREE.MathUtils.clamp(aspect, 0.55, 1.7);
    const scale = THREE.MathUtils.clamp(aspect / 1.1, 0.7, 1);

    const items: Layout[] = photos.map((p, i) => {
      const landscape = p.width > p.height;
      const h = (landscape ? (2.2 * p.height) / p.width : 1.7) * scale;
      const w = (h * p.width) / p.height;
      const r = 2.1 + rand(i) * 0.9;
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        tunnel: {
          angle: i * 2.18 + rand(i + 4) * 0.4,
          rx: r * spreadX,
          ry: r * 0.82,
          z: -i * SPACING,
          roll: (rand(i + 7) - 0.5) * 0.22,
        },
        wall: {
          x: (col - (cols - 1) / 2) * cellW,
          y: ((rows - 1) / 2 - row) * cellH + visH * 0.06,
          scale: Math.min((cellW * 0.86) / (w + MAT * 2), (cellH * 0.86) / (h + MAT * 2)),
        },
        size: [w, h],
      };
    });
    return { items, camEnd, wallZ };
  }, [photos, aspect]);
}

function Prints({ photos, progress, onSelect }: Pick<Props, 'photos' | 'progress' | 'onSelect'>) {
  const textures = useTexture(photos.map((p) => photoSrc(p, 'xs')));
  const { items, camEnd, wallZ } = useLayout(photos);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const hover = useRef<number>(-1);
  const hoverScale = useRef<number[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const colors = useMemo(() => photos.map(roomColor), [photos]);
  const black = useMemo(() => new THREE.Color('#000000'), []);
  const target = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const p = progress.current ?? 0;
    const cam = state.camera;
    const n = photos.length;

    // Kamera: fährt bis TUNNEL_END durch die Spirale, bleibt dann stehen
    const travel = clamp01(p / TUNNEL_END);
    const camZ = CAMERA_START + (camEnd - CAMERA_START) * travel;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, camZ, 4, delta);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 0.5, 2.5, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, state.pointer.y * 0.3, 2.5, delta);
    cam.lookAt(cam.position.x * 0.3, cam.position.y * 0.3, cam.position.z - 10);

    // Fortschritt der Farbwand (0 = Tunnel, 1 = Wand)
    const wallP = clamp01((p - TUNNEL_END) / (0.97 - TUNNEL_END));

    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      const t = it.tunnel;
      const angle = t.angle + p * TWIST;
      const tx = Math.cos(angle) * t.rx;
      const ty = Math.sin(angle) * t.ry + Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.04;

      // gestaffelt: die ersten Fotos fliegen zuerst zur Wand
      const local = easeInOut(clamp01((wallP - (i / n) * 0.4) / 0.6));
      m.position.set(
        THREE.MathUtils.lerp(tx, it.wall.x, local),
        THREE.MathUtils.lerp(ty, it.wall.y, local),
        THREE.MathUtils.lerp(t.z, wallZ, local),
      );
      m.rotation.set(
        THREE.MathUtils.lerp(ty * 0.1, 0, local),
        THREE.MathUtils.lerp(-tx * 0.1, 0, local),
        THREE.MathUtils.lerp(t.roll, 0, local),
      );
      const mat = mats.current[i];
      if (mat) mat.opacity = local * local;
      const base = THREE.MathUtils.lerp(1, it.wall.scale, local);
      hoverScale.current[i] = THREE.MathUtils.damp(hoverScale.current[i] ?? 1, hover.current === i ? 1.07 : 1, 8, delta);
      const s = base * hoverScale.current[i];
      m.scale.set(s, s, 1);
    });

    // Raumfarbe: Farbe des nächsten Fotos vor der Kamera, zur Wand hin Schwarz
    const ahead = Math.min(n - 1, Math.max(0, Math.round((CAMERA_START - cam.position.z) / SPACING)));
    target.copy(colors[ahead]).lerp(black, wallP);
    const bg = state.scene.background as THREE.Color;
    bg.lerp(target, 1 - Math.exp(-2.5 * delta));
    const fog = state.scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = THREE.MathUtils.lerp(3.5, WALL_DISTANCE + 2, wallP);
    fog.far = THREE.MathUtils.lerp(17, WALL_DISTANCE + 14, wallP);
  });

  return (
    <>
      {items.map((it, i) => (
        <mesh
          key={photos[i].id}
          ref={(el) => { refs.current[i] = el; }}
          onClick={(e) => { e.stopPropagation(); onSelect(i); }}
          onPointerOver={(e) => { e.stopPropagation(); hover.current = i; document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { hover.current = -1; document.body.style.cursor = ''; }}
        >
          <planeGeometry args={it.size} />
          <meshBasicMaterial map={textures[i]} toneMapped={false} />
          {/* Passepartout in der Schlüsselfarbe – erscheint erst an der Farbwand */}
          <mesh position-z={-0.01}>
            <planeGeometry args={[it.size[0] + MAT * 2, it.size[1] + MAT * 2]} />
            <meshBasicMaterial
              ref={(el) => { mats.current[i] = el; }}
              color={photos[i].key.hex}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        </mesh>
      ))}
    </>
  );
}

/** Feiner Staub im Raum – gibt Tiefe, ohne abzulenken */
function Dust({ count = 700, depth = 70 }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand(i + 100) - 0.5) * 14;
      pos[i * 3 + 1] = (rand(i + 200) - 0.5) * 9;
      pos[i * 3 + 2] = CAMERA_START - rand(i + 300) * depth;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, depth]);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 0.01; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.022} color="#f1d9b0" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Läuft erst, wenn alle Texturen geladen sind (gleicher Suspense-Bereich) */
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => { onReady?.(); }, [onReady]);
  return null;
}

export default function HeroScene({ photos, progress, active, onSelect, onReady }: Props) {
  const [bg] = useState(() => new THREE.Color('#000000'));
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, CAMERA_START], fov: 50, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
      scene={{ background: bg }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#000000', 3.5, 17]} />
      <Dust depth={photos.length * SPACING + 16} />
      <Suspense fallback={null}>
        <Prints photos={photos} progress={progress} onSelect={onSelect} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
