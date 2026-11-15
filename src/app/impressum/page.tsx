import type { Metadata } from 'next';
import { site } from '@/content/site';
import styles from '@/components/TextPage.module.css';

export const metadata: Metadata = { title: 'Impressum', robots: { index: false }, alternates: { canonical: '/impressum/' } };

export default function Impressum() {
  return (
    <article className={styles.page} data-ambient="#e9e7e2" data-ambient-fg="#0d0d0d">
      <h1 className={styles.title}>Impressum</h1>
      <div className={styles.body}>
        <h2>Angaben gemäß § 5 ECG und Offenlegung gemäß § 25 MedienG</h2>
        <address>
          noan attila schwendinger<br />
          Eicheleweg 3d<br />
          6971 Hard<br />
          Österreich
        </address>

        <h2>Kontakt</h2>
        <p>E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a></p>

        <h2>Medieninhaber und verantwortlich für den Inhalt</h2>
        <p>noan attila schwendinger, Anschrift wie oben.</p>

        <h2>Blattlinie</h2>
        <p>Persönliches Fotografie-Portfolio von {site.name}.</p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Alle auf dieser Website veröffentlichten Fotos und Texte sind urheberrechtlich geschützt.
          Eine Vervielfältigung, Bearbeitung oder Verbreitung ohne ausdrückliche schriftliche
          Genehmigung ist nicht gestattet.
        </p>
      </div>
    </article>
  );
}
