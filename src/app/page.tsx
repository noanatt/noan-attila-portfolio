/**
 * Startseite – Reihenfolge der Abschnitte von oben nach unten.
 * Abschnitte einfach verschieben oder auskommentieren.
 */
import { chapters } from '@/content/photos';
import Hero from '@/components/home/Hero';
import Statement from '@/components/home/Statement';
import Spectrum from '@/components/home/Spectrum';
import ColorChapter from '@/components/home/ColorChapter';
import SeriesCovers from '@/components/home/SeriesCovers';
import QuoteReveal from '@/components/home/QuoteReveal';
import Contact from '@/components/home/Contact';

export default function Home() {
  return (
    <>
      <Hero />
      <Statement />
      <Spectrum />
      {chapters.map((chapter, i) => (
        <ColorChapter key={chapter.slug} chapter={chapter} mirrored={i % 2 === 1} />
      ))}
      <SeriesCovers />
      <QuoteReveal />
      <Contact />
    </>
  );
}
