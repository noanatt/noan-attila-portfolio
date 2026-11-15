import type { Metadata } from 'next';
import { site } from '@/content/site';
import styles from '@/components/TextPage.module.css';

export const metadata: Metadata = { title: 'Datenschutz', robots: { index: false } };

export default function Datenschutz() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Datenschutz</h1>
      <div className={styles.body}>
        <h2>Verantwortlicher</h2>
        <p>
          {site.name}<br />
          E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>

        <h2>Erhebung personenbezogener Daten</h2>
        <p>
          Diese Website setzt keine Cookies und verwendet keine Analyse- oder Trackingtools.
          Schriften und Bilder werden direkt von dieser Website geladen, nicht von Drittanbietern.
        </p>

        <h2>Hosting und Server-Logfiles</h2>
        <p>
          Der Hosting-Anbieter (GitHub Pages, GitHub Inc.) kann beim Aufruf automatisch
          Informationen in Server-Logfiles speichern, zum Beispiel IP-Adresse, Browsertyp sowie
          Datum und Uhrzeit des Zugriffs. Das dient dem sicheren und technisch fehlerfreien Betrieb
          (Art. 6 Abs. 1 lit. f DSGVO). Weitere Informationen:{' '}
          <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">
            Datenschutzerklärung von GitHub
          </a>.
        </p>

        <h2>Kontakt per E-Mail</h2>
        <p>
          Wenn du mir eine E-Mail schreibst, verarbeite ich deine Angaben nur, um deine Anfrage
          zu beantworten.
        </p>

        <h2>Externe Links</h2>
        <p>
          Diese Website enthält Links zu externen Angeboten wie Instagram. Für deren Inhalte und
          Datenverarbeitung sind die jeweiligen Anbieter verantwortlich.
        </p>

        <h2>Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung deiner personenbezogenen Daten. Schreib dazu einfach eine E-Mail an{' '}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>

        <p>Stand: November 2026</p>
      </div>
    </article>
  );
}
