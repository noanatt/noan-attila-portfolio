import type { NextConfig } from 'next';

/**
 * Die Seite wird als rein statische Website exportiert (Ordner `out/`),
 * damit sie auf GitHub Pages, Netlify oder Vercel ohne Server läuft.
 *
 * NEXT_PUBLIC_BASE_PATH wird nur auf GitHub Pages gebraucht, weil die
 * Seite dort unter /noan-attila-portfolio liegt. Lokal bleibt er leer.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
