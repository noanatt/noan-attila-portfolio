'use client';
/**
 * Nachbearbeitung der 3D-Szene im Hero (three.js EffectComposer):
 * - leichtes Glühen (Bloom) für helle Stellen in den Fotos und die Sterne
 * - Warp: bei schnellem Scrollen ziehen sich Streifen strahlenförmig vom
 *   Bildmittelpunkt nach außen, die Farben trennen sich am Rand auf
 * - Vignette und feines Filmkorn – das Korn erst, wenn die Scroll-Animation
 *   beginnt; das Startbild bleibt sauber
 *
 * Reihenfolge laut three.js: RenderPass → Effekte → OutputPass (Farbraum).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
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
const GRAIN = 0.045;         // Filmkorn
const GRAIN_IN: [number, number] = [0.004, 0.06]; // Scroll-Fortschritt, in dem das Korn einblendet
const MAX_DPR = 1.25;        // höchste Pixeldichte der Nachbearbeitung (spart Rechenzeit)

const WarpShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uStreak: { value: STREAK },
    uSplit: { value: SPLIT },
    uGrain: { value: 0 },
    uAspect: { value: 1 },
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
    uniform float uWarp, uTime, uStreak, uSplit, uGrain, uAspect;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir * vec2(uAspect, 1.0));

      // Radiale Zoom-Streifen: mehrere Proben Richtung Bildmitte, nach außen stärker
      vec3 col = vec3(0.0);
      float total = 0.0;
      float len = uStreak * uWarp * smoothstep(0.05, 0.75, dist);
      // Ohne Warp reicht eine Probe pro Pixel, bei vollem Warp sind es 12
      float samples = 1.0 + floor(11.0 * smoothstep(0.0, 0.35, uWarp));
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

      // Filmkorn
      col += (hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

type Props = {
  /** Warp-Stärke 0–1, wird von der Kamera (Rig) aus der Scroll-Geschwindigkeit gesetzt */
  warp: RefObject<number>;
  /** Scroll-Fortschritt der Hero-Animation 0–1 */
  progress: RefObject<number>;
};

export default function HeroEffects({ warp, progress }: Props) {
  const { gl, scene, camera, size } = useThree();

  const { composer, warpPass } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      samples: 4, // Kantenglättung auch im Composer
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), BLOOM, 0.5, BLOOM_THRESHOLD));
    const warpPass = new ShaderPass(WarpShader);
    composer.addPass(warpPass);
    composer.addPass(new OutputPass());
    return { composer, warpPass };
    // nur einmal pro Renderer/Szene aufbauen; Größe wird unten nachgeführt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), MAX_DPR));
    composer.setSize(size.width, size.height);
    warpPass.uniforms.uAspect.value = size.width / size.height;
  }, [composer, warpPass, gl, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  // Priorität 1: R3F rendert dann nicht mehr selbst, der Composer übernimmt
  useFrame((state) => {
    warpPass.uniforms.uWarp.value = warp.current ?? 0;
    warpPass.uniforms.uTime.value = state.clock.elapsedTime;
    const p = progress.current ?? 0;
    warpPass.uniforms.uGrain.value = GRAIN * THREE.MathUtils.smoothstep(p, GRAIN_IN[0], GRAIN_IN[1]);
    composer.render();
  }, 1);

  return null;
}
