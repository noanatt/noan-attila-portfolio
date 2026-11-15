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
  /** Bildunterschrift, wenn die Fotos am Ende des Heros zur Farbwand werden */
  heroWallCaption: 'sortiert nach Farbe.',

  /** Text, der sich beim Scrollen Wort für Wort aufhellt */
  statement:
    'Hi, ich bin noan attila. Ich erzähle Geschichten durch meine Bilder und halte Momente fest, die länger als eine Sekunde bleiben sollen.',

  /** Überschrift über dem Farbspektrum aller Fotos */
  spectrumTitle: 'Alle Fotos, nach Farbe sortiert.',

  /**
   * FARBKAPITEL auf der Startseite (in dieser Reihenfolge).
   * hues = Farbtonbereiche auf dem Farbkreis in Grad (0 = Rot, 30 = Orange,
   * 60 = Gelb, 120 = Grün, 210 = Blau, 300 = Magenta). Ein Kapitel ohne `hues`
   * sammelt alle fast farblosen und sehr dunklen Fotos.
   * highlights = optional feste Auswahl von Foto-IDs, sonst automatisch.
   */
  chapters: [
    {
      slug: 'schatten',
      title: 'Schatten',
      text: 'Wenig Farbe, viel Licht und Dunkel. Silhouetten, Linien und die Stunden, in denen die Stadt leiser wird.',
    },
    {
      slug: 'blaue-stunde',
      title: 'Blaue Stunde',
      text: 'Kurz nach Sonnenuntergang, wenn der Himmel noch leuchtet und die Fenster schon an sind.',
      hues: [[75, 270]],
    },
    {
      slug: 'signalrot',
      title: 'Signalrot',
      text: 'Ampeln, Neon und Leuchtreklame. Rot, das sich aus der Nacht schneidet.',
      hues: [[270, 360], [0, 18]],
    },
    {
      slug: 'natriumlicht',
      title: 'Natriumlicht',
      text: 'Straßenlaternen, Abendsonne, Wüstenstaub. Warmes Licht, in dem alles weicher wird.',
      hues: [[18, 75]],
    },
  ] as { slug: string; title: string; text: string; hues?: [number, number][]; highlights?: string[] }[],

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
