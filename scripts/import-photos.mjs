/**
 * Foto-Import
 * ------------------------------------------------------------------
 * Liest deine Original-Fotos aus den Ordnern in `photos.sources.json`,
 * erzeugt daraus Web-Versionen und schreibt eine Bildliste für die Seite.
 *
 *   npm run photos            → nur neue Fotos verarbeiten
 *   npm run photos -- --force → alles neu erzeugen
 *
 * Pro Foto entstehen zwei Dateien in public/photos/<serie>/:
 *   <name>-sm.jpg  (max. 900 px)   → Galerie-Raster, 3D-Szene
 *   <name>-lg.jpg  (max. 2200 px)  → Lightbox / Vollbild
 *
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

const SIZES = { sm: 900, lg: 2200 };
const QUALITY = 80;
const CONCURRENCY = 4;
const FORCE = process.argv.includes('--force');
const IMAGE_EXT = /\.(jpe?g|png|tiff?|webp|heic)$/i;

const config = JSON.parse(await fs.readFile(SOURCES, 'utf8'));

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
    const smPath = path.join(outDir, `${id}-sm.jpg`);
    const lgPath = path.join(outDir, `${id}-lg.jpg`);

    const exists = await fs.access(lgPath).then(() => true, () => false);
    if (!FORCE && exists && known.has(key)) {
      photos[i] = known.get(key);
    } else {
      const input = await fs.readFile(file); // lädt iCloud-Dateien bei Bedarf herunter
      const base = sharp(input).rotate(); // EXIF-Drehung anwenden, Metadaten verwerfen
      const lg = await base.clone()
        .resize(SIZES.lg, SIZES.lg, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
        .toFile(lgPath);
      await base.clone()
        .resize(SIZES.sm, SIZES.sm, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
        .toFile(smPath);
      const { dominant } = await sharp(smPath).stats();
      const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
      photos[i] = { id, width: lg.width, height: lg.height, color: hex };
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
