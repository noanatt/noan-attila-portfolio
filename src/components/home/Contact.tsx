import { site } from '@/content/site';
import styles from './Contact.module.css';

export default function Contact() {
  return (
    <section className={styles.contact} id="kontakt" data-ambient="#e9e7e2" data-ambient-fg="#0d0d0d">
      <p className={styles.lead}>{site.contactTitle}</p>
      <a href={`mailto:${site.email}`} className={styles.mail}>{site.email}</a>
      <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="link">
        Instagram
      </a>
    </section>
  );
}
