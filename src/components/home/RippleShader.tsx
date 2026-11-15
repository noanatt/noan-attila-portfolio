'use client';
/**
 * Wasserwellen über einem Foto (WebGL mit three.js, läuft in allen Browsern):
 * Wo die Maus über das Foto fährt, entstehen Ringe, die sich ausbreiten und
 * abklingen. An den Wellenkanten trennen sich die Farben leicht auf.
 *
 * Gerendert wird nur, solange Wellen unterwegs sind – sonst steht die Szene.
 * Das normale Foto liegt darunter und bleibt sichtbar, bis das erste Bild
 * gezeichnet ist (siehe QuoteReveal).
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* Stellschrauben ---------------------------------------------------- */
const MAX_DROPS = 48;     // gleichzeitige Wellenzentren
const LIFETIME = 2.2;     // Sekunden, bis eine Welle verschwunden ist
const STRENGTH = 0.05;    // Verschiebung der Bildpunkte
const SPEED = 0.38;       // Ausbreitung (Bildhöhen pro Sekunde)
const WAVELENGTH = 0.045; // Abstand der Ringe
const SPLIT = 0.6;        // Farbtrennung an den Wellenkanten (0 = keine)
const SPACING = 0.018;    // Mindestabstand zwischen zwei Wellenzentren

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform vec2 uCover;          // Skalierung für object-fit: cover
  uniform float uAspect;        // Breite / Höhe der Fläche
  uniform float uTime;
  uniform vec4 uDrops[${MAX_DROPS}]; // x, y, Startzeit, Stärke
  varying vec2 vUv;

  vec2 cover(vec2 uv) { return (uv - 0.5) * uCover + 0.5; }

  void main() {
    vec2 offset = vec2(0.0);
    float edge = 0.0;
    for (int i = 0; i < ${MAX_DROPS}; i++) {
      vec4 d = uDrops[i];
      float age = uTime - d.z;
      if (d.w <= 0.0 || age < 0.0 || age > ${LIFETIME.toFixed(2)}) continue;
      vec2 delta = (vUv - d.xy) * vec2(uAspect, 1.0);
      float dist = length(delta);
      float front = age * ${SPEED.toFixed(3)};
      // Ringpaket um die Wellenfront, klingt mit der Zeit ab
      float envelope = exp(-pow((dist - front) / 0.09, 2.0)) * exp(-age * 1.6);
      float wave = sin((dist - front) / ${WAVELENGTH.toFixed(3)} * 6.2831) * envelope * d.w;
      offset += normalize(delta + 1e-5) * wave / vec2(uAspect, 1.0);
      edge += abs(wave);
    }
    vec2 uv = vUv + offset * ${STRENGTH.toFixed(4)};
    vec2 split = offset * ${(STRENGTH * SPLIT).toFixed(4)};
    vec3 col;
    col.r = texture2D(uImage, cover(uv + split)).r;
    col.g = texture2D(uImage, cover(uv)).g;
    col.b = texture2D(uImage, cover(uv - split)).b;
    // ganz leichter Glanz auf den Wellenkämmen
    col += min(edge, 1.0) * 0.06;
    gl_FragColor = vec4(col, 1.0);
  }
`;

type Props = { imageUrl: string; ready: boolean; onReady: () => void; className?: string };

export default function RippleShader({ imageUrl, ready, onReady, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return; // kein WebGL → das normale Foto bleibt stehen
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // Farben unverändert durchreichen
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);

    const drops = Array.from({ length: MAX_DROPS }, () => new THREE.Vector4(0, 0, -10, 0));
    const uniforms = {
      uImage: { value: null as THREE.Texture | null },
      uCover: { value: new THREE.Vector2(1, 1) },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uDrops: { value: drops },
    };
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }));
    scene.add(mesh);

    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;
    let imageAspect = 1;
    let next = 0;
    let last: { x: number; y: number } | null = null;
    let raf = 0;
    let lastDrop = -10;
    let disposed = false;

    const draw = () => {
      if (!uniforms.uImage.value) return;
      uniforms.uTime.value = now();
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      uniforms.uAspect.value = aspect;
      // object-fit: cover – die Fläche wird vollständig gefüllt
      uniforms.uCover.value.set(
        aspect > imageAspect ? 1 : aspect / imageAspect,
        aspect > imageAspect ? imageAspect / aspect : 1,
      );
      draw();
    };

    // Nur rendern, solange Wellen unterwegs sind
    const loop = () => {
      draw();
      raf = now() - lastDrop < LIFETIME + 0.1 ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { last = null; return; }
      const prev = last;
      if (!prev) { last = { x, y }; return; }
      const moved = Math.hypot((x - prev.x) * uniforms.uAspect.value, y - prev.y);
      if (moved < SPACING) return;
      last = { x, y };
      // schnelle Bewegung → kräftigere Welle
      const t = now();
      drops[next].set(x, y, t, Math.min(1, 0.55 + moved * 8));
      next = (next + 1) % MAX_DROPS;
      lastDrop = t;
      wake();
    };

    new THREE.TextureLoader().load(imageUrl, (tex) => {
      if (disposed) { tex.dispose(); return; }
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const img = tex.image as HTMLImageElement;
      imageAspect = img.width / img.height;
      uniforms.uImage.value = tex;
      resize();
      readyRef.current();
    });

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      uniforms.uImage.value?.dispose();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [imageUrl]);

  return <div ref={wrap} className={`${className}${ready ? ' is-ready' : ''}`} aria-hidden="true" />;
}
