'use client';
/**
 * 3D-Szene im Hero: ein Flug durch ein Universum aus Fotos.
 *
 * Phase 1 (Scroll 0 → TUNNEL_END): Die Kamera fliegt durch einen Raum voller
 *   Fotos auf drei Tiefenebenen (nah, mittel, fern) und ein Sternenfeld.
 *   Die Fotos verteilen sich über das ganze Bildfeld bis in die Ecken. Ferne
 *   Fotos liegen weit außen und schwenken beim Näherkommen von oben, unten,
 *   links und rechts auf ihren Platz ein – als kämen sie aus dem All geflogen.
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
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import * as THREE from 'three';
import { photoSrc, type Photo } from '@/content/photos';
import { isNeutral } from '@/lib/color';
import HeroEffects from './HeroEffects';

/* Stellschrauben ---------------------------------------------------- */
const SPACING = 0.55;        // mittlerer Abstand der Fotos in der Tiefe
const CAMERA_START = 6;      // Startposition der Kamera
const TUNNEL_END = 0.8;      // Anteil des Scrollwegs für den Flug
const WALL_DISTANCE = 9;     // Abstand der Farbwand vor der Kamera
const DRIFT = 0.7;           // wie stark jedes Foto beim Scrollen eigenständig kreist
const SIZE = 1.3;            // Grundgröße der Fotos
const MAT = 0.07;            // Breite des farbigen Rahmens an der Farbwand
const FOV = 52;              // Sichtfeld in Ruhe
const WARP = 22;             // zusätzliches Sichtfeld bei schnellem Scrollen
const STARS = 5000;          // Anzahl Lichtpunkte im Raum
const FLY_IN = 11;           // wie weit draußen ferne Fotos starten
const FLY_NEAR = 7;          // ab dieser Entfernung sitzt ein Foto an seinem Platz
const FLY_FAR = 26;          // ab dieser Entfernung ist ein Foto ganz draußen
const FOG_FAR = 28;          // Sichtweite im Raum

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
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Halton-Folge: gleichmäßig verteilte, aber unregelmäßig wirkende Werte 0–1 */
const halton = (i: number, base: number) => { let f = 1, r = 0; while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); } return r; };
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
    /** Anflug: Richtung nach außen, Weite und Drehung */
    dirX: number; dirY: number; fly: number; spin: number;
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

    // Winkel und Abstand in Tiefen-Reihenfolge aus einer Halton-Folge: deckt
    // den ganzen Bildausschnitt gleichmäßig ab, aufeinanderfolgende Fotos
    // landen auf verschiedenen Seiten.
    const angles = new Array<number>(n);
    const radial = new Array<number>(n);
    const offset = rand(99);
    byDepth.forEach((photoIndex, d) => {
      angles[photoIndex] = (halton(d + 1, 2) + offset + (rand(d + 21) - 0.5) * 0.08) * Math.PI * 2;
      radial[photoIndex] = halton(d + 1, 3);
    });

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

    // Verteilung auf ein Rechteck im Seitenverhältnis des Bildschirms (statt
    // Kreis), damit auch die Ecken oben/unten links/rechts besetzt sind
    const halfW = THREE.MathUtils.clamp(aspect, 0.55, 1.9);
    const halfH = 1;
    const screenScale = THREE.MathUtils.clamp(aspect / 1.1, 0.7, 1);

    const items: Item[] = photos.map((p, i) => {
      const d = depthOf[i];
      // Ebene: 45 % nah, 35 % mittel, 20 % fern (ferne Fotos etwas größer)
      const layerRoll = radial[i];
      const layer = layerRoll < 0.45 ? 0 : layerRoll < 0.8 ? 1 : 2;
      const grow = (0.8 + rand(i + 11) * 0.5) * [1, 1.15, 1.6][layer];
      const landscape = p.width > p.height;
      const h = (landscape ? (2.2 * p.height) / p.width : 1.7) * screenScale * SIZE * grow;
      const w = (h * p.width) / p.height;
      const minR = Math.max(w, h) * 0.5 + 0.6;
      const r = [minR + rand(i) * 2, Math.max(minR, 4) + rand(i) * 3.2, 8 + rand(i) * 5][layer];
      // Punkt auf dem Rechteck in Richtung des Winkels
      const cx = Math.cos(angles[i]), cy = Math.sin(angles[i]);
      const toEdge = 1 / Math.max(Math.abs(cx) / halfW, Math.abs(cy) / halfH);
      // in den Ecken nicht ganz so weit raus wie an den Kanten
      const reach = THREE.MathUtils.lerp(1, toEdge, 0.85);
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        size: [w, h],
        tunnel: {
          angle: angles[i],
          rx: r * reach,
          ry: r * reach,
          z: -d * SPACING + (rand(i + 31) - 0.5) * SPACING * 2,
          roll: (rand(i + 7) - 0.5) * 0.35,
          tiltX: (rand(i + 41) - 0.5) * 0.6,
          tiltY: (rand(i + 51) - 0.5) * 0.7,
          drift: (rand(i + 61) - 0.5) * 2 * DRIFT,
          phase: rand(i + 71) * Math.PI * 2,
          dirX: cx * halfW,
          dirY: cy * halfH,
          fly: FLY_IN * (0.7 + rand(i + 91) * 0.7),
          spin: (rand(i + 101) - 0.5) * 2.2,
        },
        wall: {
          // letzte, unvollständige Reihe mittig
          x: (col - ((row === rows - 1 ? n - row * cols : cols) - 1) / 2) * cellW,
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
  textures: RefObject<(THREE.Texture | undefined)[]>;
};

/* ------------------------------------------------------------------
   Fotos laden, ohne die Animation zu stören:
   - Bilder werden im Hintergrund dekodiert (ImageBitmap, nicht im Hauptthread)
   - pro Bild nur wenige an die Grafikkarte übergeben (UPLOADS_PER_FRAME)
   - kein React-Update pro Foto: jedes Foto holt sich seine Textur selbst ab
   ------------------------------------------------------------------ */
const UPLOADS_PER_FRAME = 6;
/** Platzhalter, bis das echte Foto da ist (gleicher Shader, kein Neukompilieren) */
const PLACEHOLDER = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
PLACEHOLDER.needsUpdate = true;

function usePhotoTextures(photos: Photo[]) {
  const gl = useThree((st) => st.gl);
  const ready = useRef<(THREE.Texture | undefined)[]>([]);
  const queue = useRef<[number, THREE.Texture][]>([]);

  useEffect(() => {
    let alive = true;
    const loaded: THREE.Texture[] = [];
    const loader = new THREE.ImageBitmapLoader();
    loader.setOptions({ imageOrientation: 'flipY' });
    photos.forEach((p, i) => {
      loader.load(photoSrc(p, 'xs'), (bitmap) => {
        if (!alive) { bitmap.close(); return; }
        const t = new THREE.Texture(bitmap);
        t.flipY = false; // schon beim Dekodieren gedreht
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        loaded.push(t);
        queue.current.push([i, t]);
      });
    });
    return () => {
      alive = false;
      loaded.forEach((t) => { t.dispose(); (t.image as ImageBitmap).close?.(); });
      ready.current = [];
      queue.current = [];
    };
  }, [photos]);

  // Ein paar Texturen pro Bild an die Grafikkarte übergeben
  useFrame(() => {
    for (let n = 0; n < UPLOADS_PER_FRAME && queue.current.length; n++) {
      const [i, t] = queue.current.shift()!;
      gl.initTexture(t);
      ready.current[i] = t;
    }
  });

  return ready;
}

function Print({ photo, item, index, count, wallZ, progress, hover, onSelect, textures }: PrintProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const frame = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef({ appear: 0, intro: 0, hover: 1 });

  useFrame((three, delta) => {
    const m = mesh.current;
    if (!m) return;
    const p = progress.current ?? 0;
    const t = item.tunnel;
    const time = three.clock.elapsedTime;
    const s = state.current;

    // Foto erst zeigen, wenn seine Textur bereit ist
    const mt = mat.current;
    if (mt && mt.map === PLACEHOLDER) {
      const tx = textures.current[index];
      if (tx) mt.map = tx;
    }
    m.visible = mt?.map !== PLACEHOLDER;
    if (!m.visible) return;

    // Einblenden nach dem Laden (von Schwarz zur vollen Helligkeit)
    s.appear = Math.min(1, s.appear + delta * 0.9);
    s.intro = Math.min(1, s.intro + delta * 0.45);
    mat.current?.color.setScalar(s.appear * s.appear);

    // Anflug aus dem All: weit entfernte Fotos liegen draußen und weiter hinten,
    // beim Näherkommen schwenken sie auf ihren Platz. Beim Laden genauso.
    const ahead = three.camera.position.z - t.z;
    const intro = 1 - (1 - s.intro) ** 3;
    const fly = Math.max(smooth(FLY_NEAR, FLY_FAR, ahead), 1 - intro);
    const flyEase = fly * fly;

    // Position im Raum: eigenes Kreisen und Schweben
    const angle = t.angle + p * t.drift * 3;
    const tx = Math.cos(angle) * t.rx + Math.sin(time * 0.35 + t.phase) * 0.12 + t.dirX * t.fly * flyEase;
    const ty = Math.sin(angle) * t.ry + Math.cos(time * 0.45 + t.phase) * 0.1 + t.dirY * t.fly * flyEase;
    const tz = t.z - flyEase * 8;

    // Übergang zur Farbwand, gestaffelt nach Farbreihenfolge
    const wallP = clamp01((p - TUNNEL_END) / (0.97 - TUNNEL_END));
    const local = easeInOut(clamp01((wallP - (index / count) * 0.45) / 0.55));
    m.position.set(
      THREE.MathUtils.lerp(tx, item.wall.x, local),
      THREE.MathUtils.lerp(ty, item.wall.y, local),
      THREE.MathUtils.lerp(tz, wallZ, local),
    );
    m.rotation.set(
      THREE.MathUtils.lerp(ty * 0.04 + t.tiltX + Math.sin(time * 0.3 + t.phase) * 0.04, 0, local),
      THREE.MathUtils.lerp(-tx * 0.04 + t.tiltY, 0, local),
      THREE.MathUtils.lerp(t.roll + t.spin * flyEase, 0, local),
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
      <meshBasicMaterial ref={mat} map={PLACEHOLDER} toneMapped={false} color="#000000" />
      {/* Passepartout in der Schlüsselfarbe – erscheint erst an der Farbwand */}
      <mesh position-z={-0.01} raycast={() => null}>
        <planeGeometry args={[item.size[0] + MAT * 2, item.size[1] + MAT * 2]} />
        <meshBasicMaterial ref={frame} color={photo.key.hex} transparent opacity={0} toneMapped={false} />
      </mesh>
    </mesh>
  );
}

/* ------------------------------------------------------------------
   Kamera, Warp-Effekt und Raumfarbe
   ------------------------------------------------------------------ */
function Rig({ photos, progress, camEnd, byDepth, warpOut }: {
  photos: Photo[]; progress: RefObject<number>; camEnd: number; byDepth: number[];
  /** Warp-Stärke 0–1 für die Nachbearbeitung (HeroEffects) */
  warpOut: MutableRefObject<number>;
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
    warpOut.current = warp;
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
    fog.far = THREE.MathUtils.lerp(FOG_FAR, WALL_DISTANCE + 16, wallP);
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
      pos[i * 3] = Math.cos(a) * r * 1.6;
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
  const warp = useRef(0);
  const textures = usePhotoTextures(photos);
  // Nachbearbeitung nur auf größeren Bildschirmen (auf Handys zu rechenintensiv)
  const wide = useThree((s) => s.size.width >= 700);
  return (
    <>
      <Rig photos={photos} progress={progress} camEnd={camEnd} byDepth={byDepth} warpOut={warp} />
      {wide && <HeroEffects warp={warp} />}
      <Stars depth={photos.length * SPACING} />
      {photos.map((p, i) => (
        <Print
            key={p.id}
            photo={p}
            item={items[i]}
            index={i}
            count={photos.length}
            wallZ={wallZ}
            progress={progress}
            hover={hover}
            onSelect={onSelect}
            textures={textures}
          />
      ))}
    </>
  );
}

export default function HeroScene({ photos, progress, active, onSelect, eventSource }: Props) {
  const [bg] = useState(() => new THREE.Color('#000000'));
  return (
    <Canvas
      flat
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, CAMERA_START], fov: FOV, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      scene={{ background: bg }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#000000', 4, FOG_FAR]} />
      <Universe photos={photos} progress={progress} onSelect={onSelect} />
    </Canvas>
  );
}
