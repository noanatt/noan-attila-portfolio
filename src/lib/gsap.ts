'use client';
/**
 * Zentrale GSAP-Einrichtung: Plugins nur einmal registrieren.
 * Alle Komponenten importieren gsap/ScrollTrigger von hier.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/** true, wenn im Betriebssystem „Bewegung reduzieren“ aktiv ist */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, ScrollTrigger, useGSAP };
