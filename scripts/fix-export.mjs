/**
 * Läuft automatisch nach `next build` (siehe package.json → postbuild).
 *
 * Next.js 16 legt beim statischen Export die Vorlade-Dateien für Seitenwechsel
 * verschachtelt ab (z. B. farben/__next.farben/__PAGE__.txt), fragt im Browser
 * aber den flachen Namen an (farben/__next.farben.__PAGE__.txt). Ohne diese
 * Kopien entstehen 404-Fehler in der Konsole und das Vorladen fällt weg.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('out');
let copied = 0;

function flatten(routeDir, dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = `${prefix}.${entry.name}`;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) flatten(routeDir, full, name);
    else {
      const target = path.join(routeDir, name);
      if (!fs.existsSync(target)) { fs.copyFileSync(full, target); copied++; }
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('__next.')) flatten(dir, full, entry.name);
    else if (entry.name !== '_next' && entry.name !== 'photos') walk(full);
  }
}

if (fs.existsSync(OUT)) {
  walk(OUT);
  console.log(`fix-export: ${copied} Vorlade-Dateien ergänzt`);
}
