#!/usr/bin/env node
/**
 * Legt eine Shotlist aus dem Storyboard-Skill auf der versteckten Seite /Shotlist/ ab.
 *
 *   SHOTLIST_PASSWORT=… node scripts/shotlist-publish.mjs <pfad>/shotlist.json
 *   node scripts/shotlist-publish.mjs <pfad>/shotlist.json --ohne-passwort
 *   node scripts/shotlist-publish.mjs --entfernen <projekt>
 *   … --tipps <datei.md>      (eigene Tipps, z. B. Kamera-Guide; ersetzt die Tipps aus shotlist_dreh.md)
 *   … --aufgaben <datei.md>   (sonst wird aufgaben.md neben der shotlist.json genommen, falls vorhanden)
 *
 * - Liest shotlist.json und (falls vorhanden) die Tipps unten aus shotlist_dreh.md daneben.
 * - Liest optional die To-dos für Noan (aufgaben.md: „## Gruppe“ und darunter „- [ ] Schritt“).
 * - Übernimmt nur, was beim Dreh gebraucht wird (keine Treffer, Schnitt-Ideen usw.).
 * - Verschlüsselt mit AES-GCM 256, Schlüssel per PBKDF2-SHA256 aus dem Passwort.
 *   Das Repo ist öffentlich, deshalb liegt ohne Passwort alles lesbar auf GitHub.
 * - Schreibt public/Shotlist/daten/<kennung>.json und aktualisiert daten/index.json.
 *   Eine erneute Veröffentlichung desselben Projekts ersetzt die alte Datei.
 * Abgehakte Shots liegen nur im Browser des Handys und bleiben beim Aktualisieren erhalten
 * (sie hängen an Projekt + Shot-ID).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = path.resolve('public/Shotlist/daten');
const INDEX = path.join(DIR, 'index.json');
const ITER = 300_000;

const args = process.argv.slice(2);
const fail = (m) => { console.error('Fehler: ' + m); process.exit(1); };
const kennung = (projekt) => crypto.createHash('sha256').update('shotlist:' + projekt).digest('hex').slice(0, 16);

fs.mkdirSync(DIR, { recursive: true });
const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : { listen: [] };
const schreibeIndex = () => fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');

if (args[0] === '--entfernen') {
  const projekt = args[1] || fail('Projektname fehlt');
  const datei = kennung(projekt) + '.json';
  index.listen = index.listen.filter((e) => e.datei !== datei);
  fs.rmSync(path.join(DIR, datei), { force: true });
  schreibeIndex();
  console.log(`entfernt: ${projekt}`);
  process.exit(0);
}

const quelle = args.find((a, i) => !a.startsWith('--') && !['--aufgaben', '--tipps'].includes(args[i - 1])) || fail('Pfad zur shotlist.json fehlt');
const ohnePw = args.includes('--ohne-passwort');
const passwort = process.env.SHOTLIST_PASSWORT;
if (!ohnePw && !passwort) fail('SHOTLIST_PASSWORT setzen oder --ohne-passwort angeben');

const d = JSON.parse(fs.readFileSync(quelle, 'utf8'));
if (!d.projekt || !Array.isArray(d.shots) || !Array.isArray(d.akte)) fail('keine gültige shotlist.json');

// Tipps: alle Abschnitte aus shotlist_dreh.md, die kein Akt sind (z. B. „Kamera vorher einstellen“).
let tipps = '';
const drehMd = path.join(path.dirname(quelle), 'shotlist_dreh.md');
if (fs.existsSync(drehMd)) {
  const aktNamen = d.akte.map((a) => a.name);
  tipps = fs.readFileSync(drehMd, 'utf8').split(/^(?=## )/m)
    .filter((t) => t.startsWith('## ') && !aktNamen.some((n) => t.slice(3).startsWith(n)))
    .join('\n').trim();
}

// To-dos: Markdown mit „## Gruppe“ und Listenpunkten. Die ID hängt am Text, damit Haken
// beim erneuten Veröffentlichen erhalten bleiben, solange der Schritt gleich formuliert ist.
const aIdx = args.indexOf('--aufgaben');
const aufgabenMd = aIdx >= 0 ? args[aIdx + 1] : path.join(path.dirname(quelle), 'aufgaben.md');
let aufgaben;
if (aIdx >= 0 && !fs.existsSync(aufgabenMd)) fail('Aufgaben-Datei nicht gefunden: ' + aufgabenMd);
if (fs.existsSync(aufgabenMd)) {
  aufgaben = [];
  for (const zeile of fs.readFileSync(aufgabenMd, 'utf8').split('\n')) {
    const kopf = zeile.match(/^##\s+(.+)/);
    const punkt = zeile.match(/^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+)/);
    if (kopf) aufgaben.push({ gruppe: kopf[1].trim(), punkte: [] });
    else if (punkt) {
      if (!aufgaben.length) aufgaben.push({ gruppe: 'To-dos', punkte: [] });
      const text = punkt[1].trim();
      aufgaben.at(-1).punkte.push({ id: 't' + crypto.createHash('sha256').update(text).digest('hex').slice(0, 8), text });
    }
  }
  aufgaben = aufgaben.filter((g) => g.punkte.length);
}

const tIdx = args.indexOf('--tipps');
if (tIdx >= 0) {
  const tDatei = args[tIdx + 1];
  if (!tDatei || !fs.existsSync(tDatei)) fail('Tipps-Datei nicht gefunden: ' + tDatei);
  tipps = fs.readFileSync(tDatei, 'utf8').trim(); // ersetzt die Tipps aus shotlist_dreh.md
}

const SHOT_FELDER = ['id', 'akt', 'prioritaet', 'einmalig', 'medium', 'was', 'einstellung', 'bewegung', 'fps', 'dauer_s', 'ton_wichtig', 'hinweis', 'status', 'anleitung'];

// Skizzen: SVG-Datei (Pfad relativ zur shotlist.json) wird eingebettet und entschärft.
const planDir = path.dirname(quelle);
// PNG/JPG/WebP werden (falls `sharp` installiert ist: npm ci) auf 1400 px Breite als WebP
// verkleinert und als data-URI eingebettet, damit alles in der verschlüsselten Datei bleibt.
let sharp;
try { sharp = (await import('sharp')).default; } catch { sharp = null; }
const RASTER = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
async function skizze(rel) {
  if (!rel) return undefined;
  const datei = path.resolve(planDir, rel);
  if (!fs.existsSync(datei)) { console.warn('Skizze fehlt: ' + rel); return undefined; }
  const ext = path.extname(datei).toLowerCase();
  if (RASTER[ext]) {
    let buf = fs.readFileSync(datei), mime = RASTER[ext];
    if (sharp) { buf = await sharp(buf).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(); mime = 'image/webp'; }
    else console.warn('sharp nicht installiert, Bild wird unverkleinert eingebettet: ' + rel);
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  let svg = fs.readFileSync(datei, 'utf8')
    .replace(/<\?xml[^>]*>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
    .replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, 'none')
    .replace(/@import[^;]*;/gi, '')
    .trim();
  if (!/^<svg[\s>]/i.test(svg)) { console.warn('Keine gültige SVG: ' + rel); return undefined; }
  return svg;
}
// Kameraeinstellungen pro Shot (Sony a6700). Ein Shot kann sie mit "kamera_einstellungen"
// ({ "Schalter": "...", ... }) selbst vorgeben, sonst werden sie aus fps, Einstellung,
// Bewegung, Ton und dem Kamera-Text der Anleitung abgeleitet.
const KARTE = (d.aufnahme?.speicherkarte || 'V30').toUpperCase(); // V30: max. ca. 100 Mbit/s
function kamera(s) {
  if (s.kamera_einstellungen && typeof s.kamera_einstellungen === 'object') {
    const e = Object.entries(s.kamera_einstellungen).map(([k, v]) => [k, String(v)]);
    return { liste: e, kurz: e.slice(0, 4).map(([, v]) => v).join(' · ') };
  }
  const text = `${s.anleitung?.kamera || ''} ${s.anleitung?.ablauf || ''}`;
  const sz = s.skizze_daten || {};
  const fps = s.fps || (/\b25p\b/.test(text) ? 25 : /\b100p\b/.test(text) ? 100 : /\b50p\b/.test(text) ? 50 : 25);
  const sq = fps >= 90;
  const langsam = KARTE === 'V30' && sq;
  const aufnahme = sq ? (langsam ? 'Full HD 100p (S&Q)' : '4K 100p (S&Q)') : `4K ${fps}p`;
  const mm = text.match(/(\d{2})\s*(?:bis|–|-)\s*(\d{2})\s*mm/) || text.match(/(\d{2})\s*mm/);
  const start = text.match(/Start\s*(\d{2})\s*mm/);
  const brenn0 = mm ? (mm[2] ? `${mm[1]}–${mm[2]} mm` : `${mm[1]} mm`)
    : ({ totale: '17 mm', halbtotale: '24 mm', halbnah: '35 mm', nah: '50 mm', detail: '70 mm', pov: '17 mm' }[s.einstellung] || '17–35 mm');
  const brenn = /Brennweite egal/i.test(text) ? 'egal' : start && !brenn0.startsWith(start[1]) ? `${start[1]} → ${brenn0}` : brenn0;
  const bl = text.match(/f\/\d(?:[.,]\d)?(?:\s*bis\s*f\/\d(?:[.,]\d)?)?/);
  const blende = bl ? bl[0].replace(/\s*bis\s*/, '–') : 'f/2.8';
  const draussen = sz.szene === 'aussen';
  const b = `${s.bewegung || ''} ${sz.bewegung || ''}`.toLowerCase();
  const bewegt = /geh|mit|durch|vor|zurueck|raus|hinein/.test(b);
  const fokus = s.einstellung === 'detail' ? 'AF-C, aufs Objekt tippen'
    : /mit/.test(b) ? 'AF-C, Person antippen (Tracking)' : 'AF-C, Gesicht/Auge';
  const verschluss = fps >= 50 ? '1/100' : '1/50';
  const liste = [
    ['Schalter', sq ? 'S&Q, Bildrate 100' : 'Video'],
    ['Aufnahme', aufnahme + (KARTE === 'V30' ? ' · max. 100M' : '')],
    ['Verschluss', verschluss],
    ['Blende', blende],
    ['ISO', 'Auto (max. 12800)'],
    ['Brennweite', brenn],
    ['Fokus', fokus],
    ['Weißabgleich', draussen ? 'Auto (draußen)' : '3200–4000 K fest'],
    ['SteadyShot', bewegt ? 'Aktiv' : 'Standard'],
    ['Ton', sq ? 'kein Ton (S&Q)' : s.ton_wichtig ? 'Mikro an, nah ran!' : 'Mikro an'],
  ];
  if (/Sony:\s*Fotos/i.test(text)) liste.unshift(['Hinweis', 'Sony fotografiert, das Handy filmt. Werte gelten fürs Video direkt danach.']);
  return { liste, kurz: [sq ? 'S&Q' : 'Video', aufnahme.replace(' (S&Q)', ''), verschluss, blende, brenn].join(' · ') };
}

const daten = {
  projekt: d.projekt,
  titel: d.titel,
  datum: d.datum,
  ort: d.ort,
  aufnahme: { standard: d.aufnahme?.standard },
  akte: d.akte.map(({ id, name, uhrzeit }) => ({ id, name, uhrzeit })),
  shots: await Promise.all(d.shots.map(async (s) => ({ ...Object.fromEntries(SHOT_FELDER.filter((k) => k in s).map((k) => [k, s[k]])), skizze: await skizze(s.skizze), kamera: kamera(s) }))),
  location: d.location ? { notizen: d.location.notizen, skizze: await skizze(d.location.skizze) } : undefined,
  _tipps: tipps || undefined,
  _aufgaben: aufgaben,
};

let inhalt = daten;
if (!ohnePw) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passwort, salt, ITER, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(daten), 'utf8'), c.final(), c.getAuthTag()]);
  inhalt = { verschluesselt: true, iter: ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), daten: ct.toString('base64') };
}

const datei = kennung(d.projekt) + '.json';
fs.writeFileSync(path.join(DIR, datei), JSON.stringify(inhalt) + '\n');
if (!index.listen.some((e) => e.datei === datei)) index.listen.push({ datei });
schreibeIndex();
console.log(`veröffentlicht: ${d.titel || d.projekt} → public/Shotlist/daten/${datei} (${daten.shots.length} Shots, ${aufgaben ? aufgaben.reduce((n, g) => n + g.punkte.length, 0) + ' To-dos, ' : ''}${ohnePw ? 'unverschlüsselt' : 'verschlüsselt'})`);
