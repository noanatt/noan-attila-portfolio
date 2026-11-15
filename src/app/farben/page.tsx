/**
 * Farben: alle Fotos beider Serien, gruppiert in die Farbkapitel
 * und innerhalb jedes Kapitels nach Farbton sortiert.
 */
import type { Metadata } from 'next';
import { allPhotos, chapters, series } from '@/content/photos';
import PhotoGrid from '@/components/PhotoGrid';
import styles from './farben.module.css';

export const metadata: Metadata = {
  title: 'Farben',
  description: 'Alle Fotos von noan attila, nach Farbe sortiert.',
  alternates: { canonical: '/farben/' },
};

export default function Farben() {
  return (
    <div className={styles.page}>
      <header className={styles.head} data-ambient="#000000">
        <h1 className={styles.title}>Farben</h1>
        <p className={styles.intro}>
          {allPhotos.length} Fotos aus {series.map((s) => s.title).join(', ').replace(/, ([^,]*)$/, ' und $1')}, nach Farbe sortiert.
        </p>
        <nav className={styles.index} aria-label="Farbkapitel">
          {chapters.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} style={{ ['--c' as string]: c.swatches[2] ?? c.tone.accent }}>
              {c.title} <span>{c.photos.length}</span>
            </a>
          ))}
        </nav>
      </header>

      {chapters.map((c) => (
        <section key={c.slug} id={c.slug} className={styles.chapter} aria-labelledby={`${c.slug}-h`}>
          <div className={styles.chapterHead}>
            <h2 id={`${c.slug}-h`}>{c.title}</h2>
            <ul className="swatches" aria-hidden="true">
              {c.swatches.map((s, i) => <li key={i} style={{ ['--c' as string]: s }} />)}
            </ul>
          </div>
          <PhotoGrid photos={c.photos} label={c.title} />
        </section>
      ))}
    </div>
  );
}
