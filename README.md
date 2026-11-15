# noan attila Portfolio

Statische Foto-Portfolio-Website mit HTML, CSS und Vanilla JavaScript. Es ist kein Build-Tool noetig.

## Lokal oeffnen

Du kannst `index.html` direkt im Browser oeffnen.

Optional mit lokalem Server:

```bash
python -m http.server 8080
```

Danach im Browser `http://localhost:8080` oeffnen.

## Bilder anpassen

Die Galerie wird in `script.js` ueber das Array `photos` gepflegt:

```js
const photos = [
  { src: 'images/P1045650.jpg', alt: 'Fotografie von noan attila 01' },
];
```

Lege neue Bilder in `images/` ab und ergaenze sie im Array. Fuer bessere Ladezeiten sollten Web-Versionen der Fotos idealerweise auf ca. 2000 px Kantenlaenge und JPG-Qualitaet 80-85 % exportiert werden.

## Texte anpassen

| Bereich | Datei |
| --- | --- |
| Startseite und Hero | `index.html` |
| About-Text | `about.html` |
| Bildliste und Alt-Texte | `script.js` |
| Impressum | `imprint.html` |
| Datenschutz | `privacy.html` |
| Layout und Design | `style.css` |

## Struktur

```text
noan-attila-portfolio/
|-- index.html
|-- about.html
|-- imprint.html
|-- privacy.html
|-- style.css
|-- script.js
|-- images/
`-- README.md
```
