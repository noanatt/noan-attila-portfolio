import Link from 'next/link';
import { site } from '@/content/site';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span>&copy; {new Date().getFullYear()} {site.name}</span>
      <nav className={styles.links} aria-label="Rechtliches und Social Media">
        <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href={`mailto:${site.email}`}>E-Mail</a>
        <Link href="/impressum/">Impressum</Link>
        <Link href="/datenschutz/">Datenschutz</Link>
      </nav>
    </footer>
  );
}
