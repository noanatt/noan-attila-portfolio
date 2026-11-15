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

   Das Skript
   - erzeugt Web-Versionen (480, 900 und 2200 px) in `public/photos/`,
   - **hellt zu dunkle Fotos automatisch auf** (Schatten und Mitteltöne werden
     angehoben, Schwarz bleibt Schwarz; Stärke über `BRIGHTEN` im Skript, einzelne
     Fotos ausnehmen mit `"noBrighten": ["p1046479"]` bei der Serie in `photos.sources.json`),
   - berechnet pro Foto eine **Farbpalette** (5 Farben + Schlüsselfarbe),
   - entfernt EXIF-Daten wie GPS-Standorte,
   - schreibt die Bildliste `src/content/photos.generated.json`.

   Neue Fotos werden ergänzt, bereits verarbeitete übersprungen.
   Mit `npm run photos -- --force` wird alles neu erzeugt.

Die Fotos landen automatisch in den Serienseiten, im Farbspektrum, auf der Seite
`/farben` und in den **Farbkapiteln** der Startseite.

### Farbkapitel

Die Kapitel (Schatten, Blaue Stunde, Signalrot, Natriumlicht) stehen in
`src/content/site.ts` unter `chapters`: Name, Text und Farbtonbereich in Grad
auf dem Farbkreis. Jedes Foto landet im Kapitel, dessen Bereich seine
Schlüsselfarbe trifft. Mit `highlights: ['p1045650', …]` legst du fest, welche
Fotos ein Kapitel auf der Startseite zeigt (sonst automatisch die farbkräftigsten).

### Auswahl in `src/content/photos.ts`

Unter `featured`: Fotos in der 3D-Szene (Standard: 36 über das ganze Spektrum
verteilt), Foto hinter dem Zitat, Titelbilder der Serien, Vorschaubild für Social Media.
Die ID ist der Dateiname in Kleinbuchstaben ohne Endung (`P1045650.jpg` → `p1045650`).

## Texte ändern

Alle Texte (Einleitung, Zitat, Serienbeschreibungen, About, E-Mail, Instagram)
stehen in `src/content/site.ts`. Impressum und Datenschutz liegen in
`src/app/impressum/page.tsx` und `src/app/datenschutz/page.tsx`.

**Wichtig:** Im Impressum stehen noch Platzhalter für deine Anschrift.

## Aufbau

| Bereich | Datei |
| --- | --- |
| Reihenfolge der Abschnitte auf der Startseite | `src/app/page.tsx` |
| 3D-Szene (Spirale, Farbwand am Ende) | `src/components/home/HeroScene.tsx` |
| Hero mit Namen | `src/components/home/Hero.tsx` |
| Text, der sich beim Scrollen aufhellt | `src/components/home/Statement.tsx` |
| Farbspektrum aller Fotos | `src/components/home/Spectrum.tsx` |
| Farbkapitel mit Formen (Bogen, Kreis …) | `src/components/home/ColorChapter.tsx` |
| Serien als Bogenfenster | `src/components/home/SeriesCovers.tsx` |
| Vollbild-Reveal mit Zitat | `src/components/home/QuoteReveal.tsx` |
| Hintergrundfarbe, die beim Scrollen wechselt | `src/components/Ambient.tsx` |
| Serienseiten (Sortierung nach Farbe) | `src/app/serien/[slug]/page.tsx`, `src/components/SeriesGallery.tsx` |
| Seite „Farben“ | `src/app/farben/page.tsx` |
| Lightbox (Hintergrund in Fotofarbe, Palette) | `src/components/Lightbox.tsx` |
| Farbberechnung (Hintergrundtöne) | `src/lib/color.ts` |
| Farben, Schrift, Abstände, Formen | `src/app/globals.css` (Variablen ganz oben) |

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
