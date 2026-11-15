# noan attila – Portfolio

Foto-Portfolio mit Next.js (React), GSAP-Scrollanimationen, weichem Scrollen (Lenis)
und einer 3D-Szene (Three.js / React Three Fiber). Die Seite wird als rein statische
Website exportiert und läuft auf GitHub Pages, Netlify oder Vercel.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) (Version 20 oder neuer).

```bash
npm install      # einmalig
npm run dev      # Entwicklungsserver → http://localhost:3000
```

Fertige Seite bauen (landet im Ordner `out/`):

```bash
npm run build
```

## Fotos hinzufügen oder ändern

1. Trage deine Foto-Ordner in `photos.sources.json` ein. Jede Serie bekommt einen
   `slug` (für die Adresse, z. B. `/serien/new-york`), einen Titel und einen oder mehrere Ordner.
   Diese Datei bleibt nur auf deinem Computer (sie steht in `.gitignore`).
2. Führe den Import aus:

   ```bash
   npm run photos
   ```

   Das Skript erzeugt Web-Versionen (900 px und 2200 px) in `public/photos/`,
   entfernt EXIF-Daten wie GPS-Standorte und schreibt die Bildliste
   `src/content/photos.generated.json`. Neue Fotos werden ergänzt, bereits
   verarbeitete übersprungen. Mit `npm run photos -- --force` wird alles neu erzeugt.
3. Welche Fotos auf der **Startseite** erscheinen (3D-Szene, Galerie, Filmstreifen,
   Vollbild hinter dem Zitat), legst du in `src/content/photos.ts` unter `featured` fest.
   Die ID ist der Dateiname in Kleinbuchstaben ohne Endung (`P1045650.jpg` → `p1045650`).

Auf den Serienseiten erscheinen automatisch alle Fotos einer Serie.

## Texte ändern

Alle Texte (Einleitung, Zitat, Serienbeschreibungen, About, E-Mail, Instagram)
stehen in `src/content/site.ts`. Impressum und Datenschutz liegen in
`src/app/impressum/page.tsx` und `src/app/datenschutz/page.tsx`.

**Wichtig:** Im Impressum stehen noch Platzhalter für deine Anschrift.

## Aufbau

| Bereich | Datei |
| --- | --- |
| Reihenfolge der Abschnitte auf der Startseite | `src/app/page.tsx` |
| 3D-Szene (Kamerafahrt durch die Fotos) | `src/components/home/HeroScene.tsx` |
| Hero mit Namen | `src/components/home/Hero.tsx` |
| Text, der sich beim Scrollen aufhellt | `src/components/home/Statement.tsx` |
| Parallax-Galerie (New York) | `src/components/home/ParallaxGallery.tsx` |
| Horizontaler Filmstreifen (Roadtrip) | `src/components/home/FilmStrip.tsx` |
| Vollbild-Reveal mit Zitat | `src/components/home/QuoteReveal.tsx` |
| Serienseiten | `src/app/serien/[slug]/page.tsx`, `src/components/SeriesGallery.tsx` |
| Lightbox | `src/components/Lightbox.tsx` |
| Farben, Schrift, Abstände | `src/app/globals.css` (Variablen ganz oben) |

Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt eine ruhige
Version ohne Kamerafahrt, Parallax und weiches Scrollen.

## Veröffentlichen

**GitHub Pages:** Jeder Push auf `main` baut und veröffentlicht die Seite automatisch
(siehe `.github/workflows/deploy.yml`). In den Repo-Einstellungen unter
*Settings → Pages* muss als Quelle „GitHub Actions“ ausgewählt sein.

```bash
git add .
git commit -m "Neue Fotos"
git push
```

**Netlify / Vercel:** Repository verbinden, Build-Befehl `npm run build`,
Ausgabeordner `out`. Dort keinen `NEXT_PUBLIC_BASE_PATH` setzen.
