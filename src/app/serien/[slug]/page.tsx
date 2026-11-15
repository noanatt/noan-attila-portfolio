/**
 * Serienseite: zeigt alle Fotos einer Serie.
 * Für jeden Eintrag in photos.sources.json entsteht automatisch eine Seite.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSeries, series } from '@/content/photos';
import { site } from '@/content/site';
import SeriesGallery from '@/components/SeriesGallery';

export const dynamicParams = false;

export function generateStaticParams() {
  return series.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getSeries(slug);
  if (!s) return {};
  const cover = s.photos[0];
  return {
    title: s.title,
    description: site.seriesIntro[slug] ?? site.description,
    alternates: { canonical: `/serien/${slug}/` },
    openGraph: {
      type: 'website',
      siteName: site.name,
      url: `/serien/${slug}/`,
      images: cover ? [`photos/${cover.series}/${cover.id}-og.jpg`] : undefined,
    },
  };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const s = getSeries(slug);
  if (!s) notFound();
  const others = series.filter((o) => o.slug !== slug);
  return <SeriesGallery series={s} intro={site.seriesIntro[slug]} others={others} />;
}
