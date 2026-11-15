'use client';
/**
 * Kopfzeile: bleibt oben fixiert. Durch mix-blend-mode: difference
 * ist sie auf hellen und dunklen Bereichen automatisch lesbar.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { series } from '@/content/photos';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.replace(/\/$/, '') === href.replace(/\/$/, '');

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo} aria-current={isActive('/') ? 'page' : undefined}>
        {site.name}
      </Link>
      <nav className={styles.nav} aria-label="Hauptnavigation">
        {series.map((s) => (
          <Link
            key={s.slug}
            href={`/serien/${s.slug}/`}
            className={styles.series}
            aria-current={isActive(`/serien/${s.slug}`) ? 'page' : undefined}
          >
            {s.title}
          </Link>
        ))}
        <Link href="/farben/" aria-current={isActive('/farben') ? 'page' : undefined}>Farben</Link>
        <Link href="/about/" aria-current={isActive('/about') ? 'page' : undefined}>About</Link>
        <a href={`mailto:${site.email}`}>Kontakt</a>
      </nav>
    </header>
  );
}
