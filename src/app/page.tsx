/**
 * Startseite – Reihenfolge der Abschnitte von oben nach unten.
 * Abschnitte einfach verschieben oder auskommentieren.
 */
import { featured, getSeries } from '@/content/photos';
import { site } from '@/content/site';
import Hero from '@/components/home/Hero';
import Statement from '@/components/home/Statement';
import ParallaxGallery from '@/components/home/ParallaxGallery';
import FilmStrip from '@/components/home/FilmStrip';
import QuoteReveal from '@/components/home/QuoteReveal';
import Contact from '@/components/home/Contact';

export default function Home() {
  const ny = getSeries('new-york');
  const usa = getSeries('usa-roadtrip');

  return (
    <>
      <Hero />
      <Statement />
      {ny && (
        <ParallaxGallery
          title={ny.title}
          intro={site.seriesIntro[ny.slug]}
          photos={featured.newYork}
          total={ny.photos.length}
          href={`/serien/${ny.slug}/`}
        />
      )}
      {usa && (
        <FilmStrip
          title={usa.title}
          intro={site.seriesIntro[usa.slug]}
          photos={featured.roadtrip}
          total={usa.photos.length}
          href={`/serien/${usa.slug}/`}
        />
      )}
      <QuoteReveal />
      <Contact />
    </>
  );
}
