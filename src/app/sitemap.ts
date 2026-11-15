/** Sitemap für Suchmaschinen – wird beim Build als /sitemap.xml erzeugt. */
import type { MetadataRoute } from 'next';
import { series } from '@/content/photos';
import { site } from '@/content/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', 'farben/', 'about/', ...series.map((s) => `serien/${s.slug}/`)];
  return paths.map((p) => ({ url: new URL(p, site.url).toString() }));
}
