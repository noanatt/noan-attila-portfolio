'use client';
/**
 * 3D-Szene im Hero: ein Flug durch ein Universum aus Fotos.
 *
 * Phase 1 (Scroll 0 → TUNNEL_END): Die Kamera fliegt durch einen Raum voller
 *   Fotos auf drei Tiefenebenen (nah, mittel, fern) und ein Sternenfeld.
 *   Größe, Neigung, Position und Eigenbewegung sind pro Foto zufällig
 *   (aber bei jedem Laden gleich). Schnelles Scrollen weitet das Sichtfeld
 *   (Warp-Effekt). Die Raumfarbe folgt dem Foto, an dem man vorbeifliegt.
 * Phase 2 (TUNNEL_END → 1): Alle Fotos fliegen vor der Kamera zu einer
 *   nach Farbe sortierten Wand zusammen.
 *
 * Jedes Foto lädt für sich und blendet ein, sobald es da ist.
 * Klick auf ein Foto öffnet die Lightbox.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import * as THREE from 'three';
import { photoSrc, type Photo } from '@/content/photos';
import { isNeutral } from '@/lib/color';

/* Stellschrauben ---------------------------------------------------- */
const SPACING = 0.95;        // mittlerer Abstand der Fotos in der Tiefe
const CAMERA_START = 6;      // Startposition der Kamera
const TUNNEL_END = 0.8;      // Anteil des Scrollwegs für den Flug
const WALL_DISTANCE = 9;     // Abstand der Farbwand vor der Kamera
const DRIFT = 0.7;           // wie stark jedes Foto beim Scrollen eigenständig kreist
const SIZE = 1.3;            // Grundgröße der Fotos
const MAT = 0.07;            // Breite des farbigen Rahmens an der Farbwand
const FOV = 52;              // Sichtfeld in Ruhe
const WARP = 22;             // zusätzliches Sichtfeld bei schnellem Scrollen
const STARS = 3200;          // Anzahl Lichtpunkte im Raum

type Props = {
  photos: Photo[];
  progress: RefObject<number>;
  active: boolean;
  onSelect: (index: number) => void;
  /** Bereich, in dem Maus und Klicks die Szene erreichen (nur der Hero, nicht die ganze Seite) */
  eventSource: RefObject<HTMLElement | null>;
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
  if (isNeutral(p.key)) return c.setHSL(p.key.h / 360, 0.05, 0.03, THREE.SRGBColorSpace);
  return c.setHSL(p.key.h / 360, (Math.min(p.key.s, 70) / 100) * 0.75, 0.075, THREE.SRGBColorSpace);
}

type Item = {
  size: [number, number];
  tunnel: {
    angle: number; rx: number; ry: number; z: number;
    roll: number; tiltX: number; tiltY: number; drift: number; phase: number;
  };
  wall: { x: number; y: number; scale: number };
};

/* ------------------------------------------------------------------
   Layout: wo jedes Foto im Raum und an der Wand sitzt
   ------------------------------------------------------------------ */
function useLayout(photos: Photo[]) {
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;

  return useMemo(() => {
    const n = photos.length;

    // Reihenfolge im Raum: gemischt, die ersten fünf sind helle, farbige Fotos.
    // An der Farbwand gilt dagegen die Farbsortierung (Index i).
    const shuffled = photos.map((_, i) => i).sort((a, b) => rand(a + 500) - rand(b + 500));
    const vivid = [...shuffled]
      .sort((a, b) => photos[b].lightness * photos[b].key.s - photos[a].lightness * photos[a].key.s)
      .slice(0, 5);
    const byDepth = [...vivid, ...shuffled.filter((i) => !vivid.includes(i))];
    const depthOf = new Array<number>(n);
    byDepth.forEach((photoIndex, d) => { depthOf[photoIndex] = d; });

    // Winkel in Tiefen-Reihenfolge: jedes Foto springt um 100°–260° weiter
    const angles = new Array<number>(n);
    let a = rand(99) * Math.PI * 2;
    byDepth.forEach((photoIndex, d) => { a += THREE.MathUtils.degToRad(100 + rand(d + 21) * 160); angles[photoIndex] = a; });

    const lastZ = -(n - 1) * SPACING;
    const camEnd = lastZ - 2;
    const wallZ = camEnd - WALL_DISTANCE;

    // Raster der Farbwand passend zum Bildschirm
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * WALL_DISTANCE;
    const visW = visH * aspect;
    const cols = Math.max(5, Math.round(Math.sqrt(n * aspect * 1.3)));
    const rows = Math.ceil(n / cols);
    const cellW = (visW * 0.9) / cols;
    const cellH = (visH * 0.68) / rows;

    // Breite Bildschirme: Fotos eher seitlich verteilen, Hochformat (Handy): eher oben/unten
    const spreadX = THREE.MathUtils.clamp(aspect, 0.55, 1.7);
    const spreadY = THREE.MathUtils.clamp(1 / aspect, 0.8, 1.6) * 0.8;
    const screenScale = THREE.MathUtils.clamp(aspect / 1.1, 0.7, 1);

    const items: Item[] = photos.map((p, i) => {
      const d = depthOf[i];
      // Ebene: 55 % nah, 30 % mittel, 15 % fern (ferne Fotos etwas größer)
      const layerRoll = rand(i + 81);
      const layer = layerRoll < 0.55 ? 0 : layerRoll < 0.85 ? 1 : 2;
      const grow = (0.8 + rand(i + 11) * 0.5) * [1, 1.15, 1.6][layer];
      const landscape = p.width > p.height;
      const h = (landscape ? (2.2 * p.height) / p.width : 1.7) * screenScale * SIZE * grow;
      const w = (h * p.width) / p.height;
      const minR = Math.max(w, h) * 0.5 + 0.6;
      const r = [minR + rand(i) * 2, 4.2 + rand(i) * 3.2, 8.5 + rand(i) * 5][layer];
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        size: [w, h],
        tunnel: {
          angle: angles[i],
          rx: r * spreadX,
          ry: r * spreadY,
          z: -d * SPACING + (rand(i + 31) - 0.5) * SPACING * 2,
          roll: (rand(i + 7) - 0.5) * 0.35,
          tiltX: (rand(i + 41) - 0.5) * 0.6,
          tiltY: (rand(i + 51) - 0.5) * 0.7,
          drift: (rand(i + 61) - 0.5) * 2 * DRIFT,
          phase: rand(i + 71) * Math.PI * 2,
        },
        wall: {
          x: (col - (cols - 1) / 2) * cellW,
          y: ((rows - 1) / 2 - row) * cellH + visH * 0.02,
          scale: Math.min((cellW * 0.88) / (w + MAT * 2), (cellH * 0.88) / (h + MAT * 2)),
        },
      };
    });
    return { items, camEnd, wallZ, byDepth };
  }, [photos, aspect]);
}

/* ------------------------------------------------------------------
   Ein Foto im Raum
   ------------------------------------------------------------------ */
type PrintProps = {
  photo: Photo;
  item: Item;
  index: number;
  count: number;
  wallZ: number;
  progress: RefObject<number>;
  hover: MutableRefObject<number>;
  onSelect: (i: number) => void;
};

function Print({ photo, item, index, count, wallZ, progress, hover, onSelect }: PrintProps) {
  const texture = useTexture(photoSrc(photo, 'xs'));
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const frame = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef({ appear: 0, hover: 1 });

  useFrame((three, delta) => {
    const m = mesh.current;
    if (!m) return;
    const p = progress.current ?? 0;
    const t = item.tunnel;
    const time = three.clock.elapsedTime;
    const s = state.current;

    // Einblenden nach dem Laden (von Schwarz zur vollen Helligkeit)
    s.appear = Math.min(1, s.appear + delta * 0.9);
    mat.current?.color.setScalar(s.appear * s.appear);

    // Position im Raum: eigenes Kreisen und Schweben
    const angle = t.angle + p * t.drift * 3;
    const tx = Math.cos(angle) * t.rx + Math.sin(time * 0.35 + t.phase) * 0.12;
    const ty = Math.sin(angle) * t.ry + Math.cos(time * 0.45 + t.phase) * 0.1;

    // Übergang zur Farbwand, gestaffelt nach Farbreihenfolge
    const wallP = clamp01((p - TUNNEL_END) / (0.97 - TUNNEL_END));
    const local = easeInOut(clamp01((wallP - (index / count) * 0.45) / 0.55));
    m.position.set(
      THREE.MathUtils.lerp(tx, item.wall.x, local),
      THREE.MathUtils.lerp(ty, item.wall.y, local),
      THREE.MathUtils.lerp(t.z, wallZ, local),
    );
    m.rotation.set(
      THREE.MathUtils.lerp(ty * 0.04 + t.tiltX + Math.sin(time * 0.3 + t.phase) * 0.04, 0, local),
      THREE.MathUtils.lerp(-tx * 0.04 + t.tiltY, 0, local),
      THREE.MathUtils.lerp(t.roll, 0, local),
    );
    s.hover = THREE.MathUtils.damp(s.hover, hover.current === index ? 1.08 : 1, 8, delta);
    const scale = THREE.MathUtils.lerp(1, item.wall.scale, local) * s.hover;
    m.scale.set(scale, scale, 1);
    if (frame.current) frame.current.opacity = local * local;
  });

  return (
    <mesh
      ref={mesh}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return; // Maus wurde beim Klicken bewegt → kein Klick
        onSelect(index);
      }}
      onPointerOver={(e) => { e.stopPropagation(); hover.current = index; document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { if (hover.current === index) hover.current = -1; document.body.style.cursor = ''; }}
    >
      <planeGeometry args={item.size} />
      <meshBasicMaterial ref={mat} map={texture} toneMapped={false} color="#000000" />
      {/* Passepartout in der Schlüsselfarbe – erscheint erst an der Farbwand */}
      <mesh position-z={-0.01}>
        <planeGeometry args={[item.size[0] + MAT * 2, item.size[1] + MAT * 2]} />
        <meshBasicMaterial ref={frame} color={photo.key.hex} transparent opacity={0} toneMapped={false} />
      </mesh>
    </mesh>
  );
}

/* ------------------------------------------------------------------
   Kamera, Warp-Effekt und Raumfarbe
   ------------------------------------------------------------------ */
function Rig({ photos, progress, camEnd, byDepth }: {
  photos: Photo[]; progress: RefObject<number>; camEnd: number; byDepth: number[];
}) {
  const colors = useMemo(() => photos.map(roomColor), [photos]);
  const target = useMemo(() => new THREE.Color(), []);
  const black = useMemo(() => new THREE.Color('#000000'), []);
  const last = useRef({ p: 0, speed: 0 });

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const p = progress.current ?? 0;
    const n = photos.length;

    // Flug: gleichmäßig bis TUNNEL_END, dann stehen bleiben
    const travel = clamp01(p / TUNNEL_END);
    const camZ = CAMERA_START + (camEnd - CAMERA_START) * travel;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, camZ, 3.2, delta);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 0.6, 2.5, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, state.pointer.y * 0.35, 2.5, delta);
    cam.lookAt(cam.position.x * 0.3, cam.position.y * 0.3, cam.position.z - 10);

    // Warp: Scroll-Geschwindigkeit weitet das Sichtfeld und kippt die Kamera leicht
    const l = last.current;
    const speed = Math.abs(p - l.p) / Math.max(delta, 0.001);
    l.p = p;
    l.speed = THREE.MathUtils.damp(l.speed, speed, 4, delta);
    const wallP = clamp01((p - TUNNEL_END) / (0.97 - TUNNEL_END));
    const warp = Math.min(1, l.speed * 6) * (1 - wallP);
    cam.fov = THREE.MathUtils.damp(cam.fov, FOV + warp * WARP, 5, delta);
    cam.rotation.z += Math.sin(p * Math.PI * 3) * 0.06 * (1 - wallP);
    cam.updateProjectionMatrix();

    // Raumfarbe: Farbe des Fotos vor der Kamera, zur Wand hin Schwarz
    const ahead = Math.min(n - 1, Math.max(0, Math.round((CAMERA_START - cam.position.z) / SPACING)));
    target.copy(colors[byDepth[ahead]]).lerp(black, wallP);
    const bg = state.scene.background as THREE.Color;
    bg.lerp(target, 1 - Math.exp(-2 * delta));
    const fog = state.scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = THREE.MathUtils.lerp(4, WALL_DISTANCE + 3, wallP);
    fog.far = THREE.MathUtils.lerp(26, WALL_DISTANCE + 16, wallP);
  });
  return null;
}

/* ------------------------------------------------------------------
   Sternenfeld: feine Lichtpunkte über die ganze Flugstrecke
   ------------------------------------------------------------------ */
function Stars({ depth }: { depth: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      // nicht direkt auf der Flugbahn
      const a = rand(i + 900) * Math.PI * 2;
      const r = 1.2 + Math.pow(rand(i + 1900), 0.6) * 22;
      pos[i * 3] = Math.cos(a) * r * 1.4;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = CAMERA_START + 4 - rand(i + 2900) * (depth + 30);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [depth]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.035} color="#f4e6cf" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
function Universe({ photos, progress, onSelect }: Omit<Props, 'active' | 'eventSource'>) {
  const { items, camEnd, wallZ, byDepth } = useLayout(photos);
  const hover = useRef(-1);
  return (
    <>
      <Rig photos={photos} progress={progress} camEnd={camEnd} byDepth={byDepth} />
      <Stars depth={photos.length * SPACING} />
      {photos.map((p, i) => (
        // jedes Foto in eigenem Suspense: es erscheint, sobald es geladen ist
        <Suspense key={p.id} fallback={null}>
          <Print
            photo={p}
            item={items[i]}
            index={i}
            count={photos.length}
            wallZ={wallZ}
            progress={progress}
            hover={hover}
            onSelect={onSelect}
          />
        </Suspense>
      ))}
    </>
  );
}

export default function HeroScene({ photos, progress, active, onSelect, eventSource }: Props) {
  const [bg] = useState(() => new THREE.Color('#000000'));
  return (
    <Canvas
      flat
      dpr={[1, 1.6]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, CAMERA_START], fov: FOV, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      scene={{ background: bg }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#000000', 4, 26]} />
      <Universe photos={photos} progress={progress} onSelect={onSelect} />
    </Canvas>
  );
}
