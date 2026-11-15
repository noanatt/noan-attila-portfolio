import type { Metadata } from 'next';
import { site } from '@/content/site';
import styles from '@/components/TextPage.module.css';

export const metadata: Metadata = {
  title: 'About',
  description: site.about[0],
  alternates: { canonical: '/about/' },
};

export default function About() {
  return (
    <article className={styles.page} data-ambient="#e9e7e2" data-ambient-fg="#0d0d0d">
      <h1 className={styles.title}>About</h1>
      {/* Platzhalter für ein Porträt: <div className={styles.portrait}><img src=... /></div> */}
      <div className={`${styles.body} ${styles.lead}`}>
        {site.about.map((text, i) => <p key={i}>{text}</p>)}
        <p>
          Für Anfragen schreib mir an <a href={`mailto:${site.email}`}>{site.email}</a> oder
          auf <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>.
        </p>
      </div>
    </article>
  );
}
