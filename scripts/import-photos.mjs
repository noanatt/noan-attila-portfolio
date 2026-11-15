/**
 * Foto-Import
 * ------------------------------------------------------------------
 * Liest deine Original-Fotos aus den Ordnern in `photos.sources.json`,
 * erzeugt daraus Web-Versionen und schreibt eine Bildliste für die Seite.
 *
 *   npm run photos            → nur neue Fotos verarbeiten
 *   npm run photos -- --force → alles neu erzeugen
 *
 * Pro Foto entstehen vier Dateien in public/photos/<serie>/:
 *   <name>-xs.webp  (max. 480 px)   → 3D-Szene, Farbspektrum (WebP: schnell zu dekodieren)
 *   <name>-sm.avif  (max. 900 px)   → Galerien
 *   <name>-lg.avif  (max. 2200 px)  → Lightbox / Vollbild
 *   <name>-og.jpg   (max. 1200 px)  → Vorschaubild beim Teilen (WhatsApp, Instagram …
 *                                     zeigen WebP nicht überall an)
 * AVIF ist bei gleicher Qualität etwa halb so groß wie JPG (gemessen: Ø 138 statt 279 KB).
 *
 * Ändert sich nur das Dateiformat (Dateien fehlen, Foto ist aber bekannt),
 * werden nur die Dateien neu erzeugt – Farben und Reihenfolge bleiben gleich.
 *
 * Zu dunkle Fotos werden automatisch aufgehellt (siehe BRIGHTEN unten),
 * danach wird pro Foto eine Farbpalette berechnet.
 * EXIF-Daten (Kamera, GPS-Standort …) werden dabei entfernt.
 * Die Originale werden nie verändert.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = path.join(ROOT, 'photos.sources.json');
const OUT_DIR = path.join(ROOT, 'public', 'photos');
const MANIFEST = path.join(ROOT, 'src', 'content', 'photos.generated.json');

const SIZES = { xs: 480, sm: 900, lg: 2200, og: 1200 };

/**
 * Automatisches Aufhellen zu dunkler Fotos.
 * Gemessen wird die mittlere Helligkeit (Median, 0–1). Liegt sie unter
 * `threshold`, werden Schatten und Mitteltöne per Gammakurve angehoben,
 * bis ungefähr `target` erreicht ist. Schwarz bleibt Schwarz, Lichter bleiben hell.
 * `maxLift` begrenzt die Stärke (kleiner = stärker, 1 = aus).
 * Einzelne Fotos ausnehmen: in photos.sources.json bei der Serie
 *   "noBrighten": ["p1046479"]
 */
const BRIGHTEN = { threshold: 0.2, target: 0.26, maxLift: 0.55 };
const QUALITY = { xs: 75, sm: 55, lg: 55, og: 80 };
const FORMAT = { xs: 'webp', sm: 'avif', lg: 'avif', og: 'jpg' };
const CONCURRENCY = 4;
const FORCE = process.argv.includes('--force');
const IMAGE_EXT = /\.(jpe?g|png|tiff?|webp|heic)$/i;

const config = JSON.parse(await fs.readFile(SOURCES, 'utf8'));

/* ------------------------------------------------------------------
   FARBANALYSE
   Pro Foto: Palette aus 5 Farben (k-means), die „Schlüsselfarbe“
   (die prägnanteste, nicht nur die häufigste Farbe) und die mittlere Helligkeit.
   ------------------------------------------------------------------ */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

async function analyzeColors(file) {
  const { data } = await sharp(file).resize(64, 64, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);

  // k-means mit fester Startbelegung (reproduzierbar)
  const K = 5;
  const sorted = [...px].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centers = Array.from({ length: K }, (_, k) => sorted[Math.floor(((k + 0.5) / K) * sorted.length)].slice());
  let assign = new Array(px.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < K; k++) {
        const d = (px[i][0] - centers[k][0]) ** 2 + (px[i][1] - centers[k][1]) ** 2 + (px[i][2] - centers[k][2]) ** 2;
        if (d < bestD) { bestD = d; best = k; }
      }
      assign[i] = best;
    }
    const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
    px.forEach((p, i) => { const s = sums[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    centers = sums.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[k]));
  }
  const counts = new Array(K).fill(0);
  assign.forEach((k) => counts[k]++);

  const palette = centers
    .map((c, k) => ({ hex: toHex(c), weight: +(counts[k] / px.length).toFixed(3), hsl: rgbToHsl(...c) }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  // Schlüsselfarbe: Gewicht × Sättigung, sehr dunkle/helle Töne zählen weniger
  const score = (c) => {
    const [, s, l] = c.hsl;
    const lightness = l < 6 || l > 94 ? 0.05 : 1 - Math.abs(l - 45) / 60;
    return Math.sqrt(c.weight) * (s / 100 + 0.05) * lightness;
  };
  const key = [...palette].sort((a, b) => score(b) - score(a))[0];
  const meanL = Math.round(palette.reduce((sum, c) => sum + c.hsl[2] * c.weight, 0));

  return {
    palette: palette.map((c) => c.hex),
    key: { hex: key.hex, h: key.hsl[0], s: key.hsl[1], l: key.hsl[2] },
    lightness: meanL,
  };
}

// Alte Bildliste laden, damit bereits verarbeitete Fotos übersprungen werden
let previous = { series: [] };
try { previous = JSON.parse(await fs.readFile(MANIFEST, 'utf8')); } catch {}
const known = new Map(previous.series.flatMap((s) => s.photos.map((p) => [`${s.slug}/${p.id}`, p])));

const manifest = { series: [] };

for (const series of config.series) {
  const files = [];
  for (const dir of series.dirs) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) if (e.isFile() && IMAGE_EXT.test(e.name)) files.push(path.join(dir, e.name));
  }
  files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  const outDir = path.join(OUT_DIR, series.slug);
  await fs.mkdir(outDir, { recursive: true });
  console.log(`\n${series.title}: ${files.length} Fotos`);

  const photos = new Array(files.length);
  let done = 0;

  // Einfache Warteschlange mit begrenzter Parallelität
  const queue = files.map((file, i) => async () => {
    const id = path.basename(file).replace(/\.[^.]+$/, '').toLowerCase();
    const key = `${series.slug}/${id}`;
    const out = (size) => path.join(outDir, `${id}-${size}.${FORMAT[size]}`);
    const smPath = out('sm');
    const has = (p) => fs.access(p).then(() => true, () => false);
    const complete = (await Promise.all(Object.keys(SIZES).map((s) => has(out(s))))).every(Boolean);

    // Dateien eines Fotos erzeugen (Drehung, ggf. Aufhellen, vier Größen)
    const render = async () => {
      const input = await fs.readFile(file); // lädt iCloud-Dateien bei Bedarf herunter

      // Helligkeit messen und ggf. Aufhell-Kurve bestimmen
      const { data: grey } = await sharp(input).rotate().resize(96, 96, { fit: 'inside' }).greyscale().raw()
        .toBuffer({ resolveWithObject: true });
      const sortedGrey = [...grey].sort((a, b) => a - b);
      const median = Math.max(sortedGrey[sortedGrey.length >> 1] / 255, 0.005);
      const skip = (series.noBrighten ?? []).includes(id);
      const lift = !skip && median < BRIGHTEN.threshold
        ? Math.max(BRIGHTEN.maxLift, Math.log(BRIGHTEN.target) / Math.log(median))
        : 1;

      const base = sharp(input).rotate(); // EXIF-Drehung anwenden, Metadaten verwerfen
      if (lift < 1) base.gamma(1, 1 / lift).modulate({ saturation: 1.08 });

      const write = (size) => {
        const img = base.clone().resize(SIZES[size], SIZES[size], { fit: 'inside', withoutEnlargement: true });
        const enc = FORMAT[size] === 'jpg' ? img.jpeg({ quality: QUALITY[size], mozjpeg: true, progressive: true })
          : FORMAT[size] === 'avif' ? img.avif({ quality: QUALITY[size], effort: 4 })
          : img.webp({ quality: QUALITY[size], effort: 5, smartSubsample: true });
        return enc.toFile(out(size));
      };
      const lg = await write('lg');
      await Promise.all([write('sm'), write('xs'), write('og')]);
      return { lg, lift };
    };

    if (!FORCE && known.has(key) && complete) {
      photos[i] = known.get(key);
      // Ältere Einträge ohne Farbanalyse nachträglich ergänzen
      if (!photos[i].palette) photos[i] = { ...photos[i], ...(await analyzeColors(smPath)) };
    } else if (!FORCE && known.has(key) && known.get(key).palette) {
      // Nur das Dateiformat fehlt: Dateien neu, Farbdaten unverändert übernehmen
      await render();
      photos[i] = known.get(key);
    } else {
      const { lg, lift } = await render();

      const { dominant } = await sharp(smPath).stats();
      const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
      photos[i] = {
        id, width: lg.width, height: lg.height, color: hex,
        brightened: +lift.toFixed(2),
        ...(await analyzeColors(smPath)),
      };
    }
    done++;
    process.stdout.write(`\r  ${done}/${files.length}`);
  });

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await queue.shift()();
  });
  await Promise.all(workers);

  manifest.series.push({ slug: series.slug, title: series.title, photos });
}

await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n\nFertig. Bildliste: ${path.relative(ROOT, MANIFEST)}`);
