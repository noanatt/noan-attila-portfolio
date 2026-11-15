'use client';
/**
 * Nachbearbeitung der 3D-Szene im Hero (three.js EffectComposer):
 * - leichtes Glühen (Bloom) für helle Stellen in den Fotos und die Sterne
 * - Warp: bei schnellem Scrollen ziehen sich Streifen strahlenförmig vom
 *   Bildmittelpunkt nach außen, die Farben trennen sich am Rand auf
 * - Vignette
 *
 * Qualität passt sich dem Gerät an: Läuft die Szene zu langsam, wird stufenweise
 * reduziert (Pixeldichte, Kantenglättung, Glühen, Warp-Proben). Reicht auch die
 * niedrigste Stufe nicht, wird die Nachbearbeitung ganz abgeschaltet.
 *
 * Reihenfolge laut three.js: RenderPass → Effekte → OutputPass (Farbraum).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* Stellschrauben ---------------------------------------------------- */
const BLOOM = 0.45;          // Stärke des Glühens
const BLOOM_THRESHOLD = 0.72;// ab welcher Helligkeit etwas glüht
const STREAK = 0.09;         // Länge der Warp-Streifen bei voller Geschwindigkeit
const SPLIT = 0.012;         // Farbtrennung am Rand bei voller Geschwindigkeit
/** Qualitätsstufen, beste zuerst */
const LEVELS = [
  { dpr: 1.25, msaa: 4, bloom: true, warpSamples: 12 },
  { dpr: 1, msaa: 0, bloom: true, warpSamples: 8 },
  { dpr: 0.8, msaa: 0, bloom: false, warpSamples: 5 },
];
const MIN_FPS = 48;          // darunter wird die Qualität gesenkt
const WARMUP = 1.5;          // Sekunden nach dem Start nicht messen (Texturen, Shader)
const WINDOW = 1;            // Messfenster in Sekunden

/** Aktueller Stand. Wird im Browser gespeichert, damit beim nächsten Besuch nicht neu gemessen wird. */
const STORE = 'hero-quality-v1';
export const heroQuality = (() => {
  const q = { level: 0, fps: 0, effects: true };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (saved && typeof saved.level === 'number') Object.assign(q, { level: saved.level, effects: saved.effects !== false });
  } catch { /* privates Fenster o. Ä.: dann eben neu messen */ }
  return q;
})();
export function saveHeroQuality() {
  try { localStorage.setItem(STORE, JSON.stringify({ level: heroQuality.level, effects: heroQuality.effects })); } catch { /* egal */ }
}

const WarpShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uWarp: { value: 0 },
    uStreak: { value: STREAK },
    uSplit: { value: SPLIT },
    uAspect: { value: 1 },
    uMaxSamples: { value: 12 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uWarp, uStreak, uSplit, uAspect, uMaxSamples;
    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir * vec2(uAspect, 1.0));

      // Radiale Zoom-Streifen: mehrere Proben Richtung Bildmitte, nach außen stärker
      vec3 col = vec3(0.0);
      float total = 0.0;
      float len = uStreak * uWarp * smoothstep(0.05, 0.75, dist);
      // Ohne Warp reicht eine Probe pro Pixel, bei vollem Warp bis zu uMaxSamples
      float samples = 1.0 + floor((uMaxSamples - 1.0) * smoothstep(0.0, 0.35, uWarp));
      for (int i = 0; i < 12; i++) {
        if (float(i) >= samples) break;
        float t = samples > 1.0 ? float(i) / (samples - 1.0) : 0.0;
        float w = 1.0 - t * 0.7;
        vec2 uv = vUv - dir * len * t;
        // Farbtrennung: Rot nach außen, Blau nach innen
        float s = uSplit * (0.25 + uWarp) * dist;
        col.r += texture2D(tDiffuse, uv + dir * s).r * w;
        col.g += texture2D(tDiffuse, uv).g * w;
        col.b += texture2D(tDiffuse, uv - dir * s).b * w;
        total += w;
      }
      col /= total;

      // Vignette
      col *= mix(1.0, smoothstep(1.05, 0.25, dist), 0.55);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

type Props = {
  /** Warp-Stärke 0–1, wird von der Kamera (Rig) aus der Scroll-Geschwindigkeit gesetzt */
  warp: RefObject<number>;
  /** Wird aufgerufen, wenn selbst die niedrigste Stufe zu langsam ist */
  onGiveUp: () => void;
};

export default function HeroEffects({ warp, onGiveUp }: Props) {
  const { gl, scene, camera, size } = useThree();
  const [level, setLevel] = useState(heroQuality.level);
  const q = LEVELS[level];
  const meter = useRef({ t: 0, frames: 0, elapsed: 0 });

  const { composer, warpPass } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      samples: q.msaa,
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    if (q.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), BLOOM, 0.5, BLOOM_THRESHOLD));
    const warpPass = new ShaderPass(WarpShader);
    warpPass.uniforms.uMaxSamples.value = q.warpSamples;
    composer.addPass(warpPass);
    composer.addPass(new OutputPass());
    return { composer, warpPass };
    // pro Renderer/Szene/Stufe aufbauen; Größe wird unten nachgeführt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, level]);

  useEffect(() => {
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), q.dpr));
    composer.setSize(size.width, size.height);
    warpPass.uniforms.uAspect.value = size.width / size.height;
  }, [composer, warpPass, gl, size, q.dpr]);

  useEffect(() => () => composer.dispose(), [composer]);
  useEffect(() => { meter.current = { t: 0, frames: 0, elapsed: 0 }; }, [composer]);

  // Priorität 1: R3F rendert dann nicht mehr selbst, der Composer übernimmt
  useFrame((_, delta) => {
    warpPass.uniforms.uWarp.value = warp.current ?? 0;
    composer.render();

    // Bildrate messen und bei Bedarf die Qualität senken
    const m = meter.current;
    m.elapsed += delta;
    if (m.elapsed < WARMUP || delta > 0.5) return; // Anlauf und Tab-Wechsel ignorieren
    m.t += delta;
    m.frames++;
    if (m.t < WINDOW) return;
    const fps = m.frames / m.t;
    heroQuality.fps = Math.round(fps);
    m.t = 0;
    m.frames = 0;
    if (fps >= MIN_FPS) return;
    if (level < LEVELS.length - 1) {
      heroQuality.level = level + 1;
      saveHeroQuality();
      setLevel(level + 1);
    } else {
      heroQuality.effects = false;
      saveHeroQuality();
      onGiveUp();
    }
  }, 1);

  return null;
}
