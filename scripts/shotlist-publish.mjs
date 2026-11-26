#!/usr/bin/env node
/**
 * Legt eine Shotlist aus dem Storyboard-Skill auf der versteckten Seite /Shotlist/ ab.
 *
 *   SHOTLIST_PASSWORT=… node scripts/shotlist-publish.mjs <pfad>/shotlist.json
 *   node scripts/shotlist-publish.mjs <pfad>/shotlist.json --ohne-passwort
 *   node scripts/shotlist-publish.mjs --entfernen <projekt>
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

const quelle = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--aufgaben') || fail('Pfad zur shotlist.json fehlt');
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

const SHOT_FELDER = ['id', 'akt', 'prioritaet', 'einmalig', 'medium', 'was', 'einstellung', 'bewegung', 'fps', 'dauer_s', 'ton_wichtig', 'hinweis', 'status', 'anleitung'];

// Skizzen: SVG-Datei (Pfad relativ zur shotlist.json) wird eingebettet und entschärft.
const planDir = path.dirname(quelle);
function skizze(rel) {
  if (!rel) return undefined;
  const datei = path.resolve(planDir, rel);
  if (!fs.existsSync(datei)) { console.warn('Skizze fehlt: ' + rel); return undefined; }
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
const daten = {
  projekt: d.projekt,
  titel: d.titel,
  datum: d.datum,
  ort: d.ort,
  aufnahme: { standard: d.aufnahme?.standard },
  akte: d.akte.map(({ id, name, uhrzeit }) => ({ id, name, uhrzeit })),
  shots: d.shots.map((s) => ({ ...Object.fromEntries(SHOT_FELDER.filter((k) => k in s).map((k) => [k, s[k]])), skizze: skizze(s.skizze) })),
  location: d.location ? { notizen: d.location.notizen, skizze: skizze(d.location.skizze) } : undefined,
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
