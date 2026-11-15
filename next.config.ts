import type { NextConfig } from 'next';

/**
 * Die Seite wird als rein statische Website exportiert (Ordner `out/`),
 * damit sie auf GitHub Pages, Netlify oder Vercel ohne Server läuft.
 *
 * Die Seite läuft unter https://noanattila.com im Stammverzeichnis (/).
 * NEXT_PUBLIC_BASE_PATH ist nur nötig, falls sie je in einem Unterordner liegt.
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
