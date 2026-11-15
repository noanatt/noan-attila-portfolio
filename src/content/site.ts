/**
 * TEXTE DER WEBSITE
 * ------------------------------------------------------------------
 * Alle Texte, die du ändern willst, stehen hier an einem Ort.
 */
export const site = {
  name: 'noan attila',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://noanatt.github.io/noan-attila-portfolio/',
  email: 'noanatt05@gmail.com',
  instagram: 'https://instagram.com/noanattila',

  description:
    'Fotografie von noan attila. Nächte in New York und ein Roadtrip quer durch die USA.',

  /** Großer Text im Hero (3D-Szene) */
  heroKicker: 'Fotografie',
  heroHint: 'Scrollen',

  /** Text, der sich beim Scrollen Wort für Wort aufhellt */
  statement:
    'Hi, ich bin noan attila. Ich erzähle Geschichten durch meine Bilder und halte Momente fest, die länger als eine Sekunde bleiben sollen.',

  /** Zitat über dem Vollbild-Foto */
  quote: 'Das beste Bild ist das, das man noch nicht gemacht hat.',

  /** Kurze Texte zu den Serien (Schlüssel = Ordnername aus photos.sources.json) */
  seriesIntro: {
    'new-york':
      'Licht, das nicht schläft. Straßenschluchten, Spiegelungen und die Stunden, in denen die Stadt leiser wird.',
    'usa-roadtrip':
      'Tausende Kilometer Asphalt. Weite, Wüste und die kleinen Orte dazwischen.',
  } as Record<string, string>,

  /** Kontaktbereich am Ende der Startseite */
  contactTitle: 'Für Aufträge, Kooperationen und Projekte.',

  /** About-Seite: jeder Eintrag ist ein Absatz */
  about: [
    'Ich bin noan attila, Fotograf. Mit meiner Kamera suche ich nach Augenblicken, die sich zwischen dem Offensichtlichen und dem Übersehenen verbergen: Licht, Bewegung, Stille und Blicke, die länger als einen Herzschlag bleiben.',
    'Fotografie ist für mich keine laute Inszenierung, sondern eine Art, näher hinzusehen. Ich arbeite reduziert, aufmerksam und mit Gespür für Momente, die nicht wiederholbar sind.',
  ],
};
