/**
 * TEXTE DER WEBSITE
 * ------------------------------------------------------------------
 * Alle Texte, die du ändern willst, stehen hier an einem Ort.
 */
export const site = {
  name: 'noan attila',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://noanatt.github.io/noan-attila-portfolio/',
  email: 'noanatt05@gmail.com',
  instagram: 'https://www.instagram.com/noan.attila/',

  description:
    'Fotografie von noan attila. Nächte in New York, ein Roadtrip quer durch die USA und Fußball am Wochenende.',

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
   *
   * hues = Farbtonbereiche auf dem Farbkreis in Grad (0 = Rot, 30 = Orange,
   * 60 = Gelb, 120 = Grün, 210 = Blau, 300 = Magenta). Ein Kapitel ohne `hues`
   * sammelt alle fast farblosen und sehr dunklen Fotos.
   *
   * highlights = die 8 Fotos auf der Startseite, in der Reihenfolge der Formen:
   *   1 Bogen (hoch)  2 Kreis  3 breit (quer)  4 schmaler Streifen (hoch)
   *   5 abgerundet (hoch)  6 breit (quer)  7 kleiner Kreis  8 Bogen (hoch)
   * Fotos in `highlights` gehören immer zu diesem Kapitel, auch wenn ihre
   * Farbe eigentlich woanders hinpassen würde.
   */
  chapters: [
    {
      slug: 'schatten',
      title: 'Schatten',
      text: 'Wenig Farbe, viel Licht und Dunkel. Silhouetten, Linien und die Stunden, in denen die Stadt leiser wird.',
      highlights: [
        'p1046384', 'p1046508', 'p1045727', 'p1046263',
        '_a670363', 'p1046493', 'p1046479', '_a670195',
      ],
    },
    {
      slug: 'blaue-stunde',
      title: 'Blaue Stunde',
      text: 'Kurz nach Sonnenuntergang, wenn der Himmel noch leuchtet und die Fenster schon an sind.',
      hues: [[165, 270]],
      highlights: [
        '_a670156', 'p1045834', 'p1046564', '_a670198',
        '_a670138', '_a670186', 'p1046020', '_a670162',
      ],
    },
    {
      slug: 'rasengruen',
      title: 'Rasengrün',
      text: 'Fußballplätze im Herbst, Laub und Sumpfwasser. Grün in allen Tönen, dazwischen ein Spiel.',
      hues: [[62, 165]],
      highlights: [
        '_a671060', '_a671096', '_a670627', '_a670677',
        '_a671065', '_a671228', '_a671243', '_a670928',
      ],
    },
    {
      slug: 'signalrot',
      title: 'Signalrot',
      text: 'Ampeln, Neon und Leuchtreklame. Rot, das sich aus der Nacht schneidet.',
      hues: [[270, 360], [0, 18]],
      highlights: [
        '_a670322', 'p1045880', 'p1046457', '_a670283',
        '_a670285', '_a670317', 'p1045985', '_a670229',
      ],
    },
    {
      slug: 'natriumlicht',
      title: 'Natriumlicht',
      text: 'Straßenlaternen, Abendsonne, Wüstenstaub. Warmes Licht, in dem alles weicher wird.',
      hues: [[18, 62]],
      highlights: [
        '_a670215', 'p1045650', 'p1046029', '_a670260',
        '_a670247', 'p1045769', '_a670478', '_a670151',
      ],
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
    'hard-juniors':
      'Fußball am Wochenende. Zwei Spiele der Hard Juniors, gegen Lochau und gegen Schwarzach.',
  } as Record<string, string>,

  /** Kontaktbereich am Ende der Startseite */
  contactTitle: 'Für Aufträge, Kooperationen und Projekte.',

  /** About-Seite: jeder Eintrag ist ein Absatz */
  about: [
    'Ich bin noan attila, Fotograf. Mit meiner Kamera suche ich nach Augenblicken, die sich zwischen dem Offensichtlichen und dem Übersehenen verbergen: Licht, Bewegung, Stille und Blicke, die länger als einen Herzschlag bleiben.',
    'Fotografie ist für mich keine laute Inszenierung, sondern eine Art, näher hinzusehen. Ich arbeite reduziert, aufmerksam und mit Gespür für Momente, die nicht wiederholbar sind.',
  ],
};
