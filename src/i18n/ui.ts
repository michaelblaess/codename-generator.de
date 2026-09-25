import type { Method, Tone } from '../lib/generator';

/*
 * Oberflaechentexte in zwei Sprachen.
 *
 * Wichtig: das hier ist NICHT dieselbe Sprache wie die der erzeugten Namen.
 * Die Oberflaeche haengt an der Adresse (/ ist Deutsch, /en/ ist Englisch),
 * die Namenssprache bleibt im Bedienfeld umschaltbar - sonst koennte man
 * keine deutschen Namen mit englischer Oberflaeche ziehen. Beim Einstieg
 * ist die Namenssprache immer Englisch.
 */

export const SPRACHEN = ['de', 'en'] as const;
export type UiSprache = (typeof SPRACHEN)[number];

export interface UiTexte {
  htmlLang: string;
  seitentitel: string;
  seitenbeschreibung: string;
  bestand: (themen: number, woerter: number) => string;
  bereit: string;
  fuerOrdner: string;
  mutiert: string;
  top: (n: number) => string;
  runde: (n: string) => string;
  thema: string;
  sprache: string;
  woerter: string;
  zeilen: string;
  mutation: string;
  fest: string;
  neueRunde: string;
  nameKopieren: string;
  adresseKopieren: string;
  kurzformKopieren: string;
  titelNeueRunde: string;
  titelNameKopieren: string;
  titelAdresseKopieren: string;
  titelMutation: string;
  titelWortzahlFest: string;
  musikAn: string;
  musikAus: string;
  titelMusik: string;
  musikNachweis: string;
  meldungKopiert: (was: string, text: string) => string;
  meldungGesperrt: string;
  meldungNeueRunde: string;
  wortName: string;
  wortAdresse: string;
  wortKurzform: string;
  impressum: string;
  datenschutz: string;
  quellcode: string;
  andereSpracheName: string;
  zurueck: string;
  merkliste: string;
  eigenesWort: string;
  deinWort: string;
  platzhalterWort: string;
  eigeneIdee: string;
  platzhalterIdee: string;
  dazu: string;
  merken: string;
  entfernen: string;
  listeKopieren: string;
  titelMerken: string;
  titelEntfernen: string;
  titelListeKopieren: string;
  titelMerkliste: string;
  titelEigenesWort: string;
  titelEigeneIdee: string;
  leerMerkliste: string;
  leerWort: string;
  meldungGemerkt: (name: string) => string;
  meldungEntfernt: (name: string) => string;
  meldungSchonDa: string;
  meldungSpeicherGesperrt: string;
  meldungKeineRunde: string;
  wortListe: string;
  partner: string;
  zusaetze: string;
  stellung: string;
  stellungen: Record<'any' | 'front' | 'back', string>;
  titelPartner: string;
  titelStellung: string;
  varianten: string;
  wortHalten: string;
  zusatzHalten: string;
  titelWortHalten: string;
  titelZusatzHalten: string;
  meldungNichtsZuVariieren: string;
  meldungMerklisteNichtVariierbar: string;
  mix: string;
  keinMix: string;
  titelMix: string;
  methode: string;
  methoden: Record<Method, string>;
  titelMethode: string;
  buchstaben: string;
  platzhalterBuchstaben: string;
  titelBuchstaben: string;
  ton: string;
  toene: Record<Tone | '', string>;
  titelTon: string;
  filter: string;
  anfang: string;
  platzhalterAnfang: string;
  titelAnfang: string;
  silben: string;
  silbenAlle: string;
  titelSilben: string;
  alliteration: string;
  titelAlliteration: string;
  klang: string;
  titelKlang: string;
  passen: (n: number) => string;
  leerFilter: string;
  leerAkronym: string;
  leerAkronymKeine: string;
  exportieren: string;
  importieren: string;
  titelExportieren: string;
  titelImportieren: string;
  meldungExportiert: (n: number) => string;
  meldungImportiert: (neu: number, schonDa: number) => string;
  meldungImportLeer: string;
  meldungImportKaputt: string;
  laufschrift: string[];
}

const de: UiTexte = {
  htmlLang: 'de',
  seitentitel: 'Codename Generator - Projekt-Codenamen aus kuratierten Themen',
  seitenbeschreibung:
    'Erzeugt Projekt-Codenamen aus kuratierten Wortlisten, auf Deutsch oder Englisch, mit phonetischer Mutation. Laeuft vollstaendig im Browser.',
  bestand: (themen, woerter) => `${themen} THEMEN, ${woerter} WÖRTER FREI`,
  bereit: 'READY.',
  fuerOrdner: 'für Repos und URLs:',
  mutiert: 'MUTIERT',
  top: (n) => `TOP ${n}`,
  runde: (n) => `RUNDE ${n}`,
  thema: 'THEMA',
  sprache: 'F3 SPRACHE',
  woerter: 'F5 WÖRTER',
  zeilen: 'ZEILEN',
  mutation: 'MUTATION',
  fest: 'fest',
  neueRunde: 'NEUE RUNDE',
  nameKopieren: 'NAME KOPIEREN',
  adresseKopieren: 'ADRESSE KOPIEREN',
  kurzformKopieren: 'Kurzform kopieren',
  titelNeueRunde: 'Neue Namen ziehen',
  titelNameKopieren: 'Den großen Namen in die Zwischenablage legen',
  titelAdresseKopieren: 'Adresse dieser Runde kopieren - öffnet später genau diese Namen wieder',
  titelMutation:
    'Verbiegt die Wörter phonetisch: aus Pegasus wird Pegasos. Betroffene Namen tragen MUT.',
  titelWortzahlFest: 'Dieses Thema gibt die Wortzahl vor',
  musikAn: 'MUSIK',
  musikAus: 'MUSIK AUS',
  titelMusik: 'BIT SPACE (FTL Inspired) [LOOP] von Beam Theory, OGA-BY 3.0 - laedt erst beim Klick',
  musikNachweis: 'MUSIK: BIT SPACE VON BEAM THEORY, OGA-BY 3.0, OPENGAMEART.ORG',
  meldungKopiert: (was, text) => `${was} KOPIERT: ${text}`,
  meldungGesperrt: 'ZWISCHENABLAGE GESPERRT - TEXT MARKIEREN',
  meldungNeueRunde: 'NEUE RUNDE',
  wortName: 'NAME',
  wortAdresse: 'ADRESSE',
  wortKurzform: 'KURZFORM',
  impressum: 'IMPRESSUM',
  datenschutz: 'DATENSCHUTZ',
  quellcode: 'QUELLCODE',
  andereSpracheName: 'ENGLISH',
  zurueck: 'ZURÜCK ZUM GENERATOR',
  merkliste: 'MERKLISTE',
  eigenesWort: 'EIGENES WORT',
  deinWort: 'DEIN WORT',
  platzhalterWort: 'z.B. Sitemap',
  eigeneIdee: 'EIGENE IDEE',
  platzhalterIdee: 'z.B. Sitemap Pioneer',
  dazu: '+ DAZU',
  merken: '★ MERKEN',
  entfernen: '★ ENTFERNEN',
  listeKopieren: 'LISTE KOPIEREN',
  titelMerken: 'Den Namen auf die Merkliste setzen oder wieder herunternehmen (Taste F)',
  titelEntfernen: 'Den Namen von der Merkliste nehmen (Taste F)',
  titelListeKopieren: 'Alle gemerkten Namen untereinander in die Zwischenablage legen',
  titelMerkliste: 'Deine gemerkten Namen - der Mutationsregler wirkt weiter (Taste V)',
  titelEigenesWort: 'Dein eigenes Wort mit Zusätzen kombinieren (Taste O)',
  titelEigeneIdee: 'Einen eigenen Namen direkt auf die Merkliste setzen (Taste +)',
  leerMerkliste: 'NOCH NICHTS GEMERKT. F MERKT DEN AKTIVEN NAMEN.',
  leerWort: 'OBEN EIN WORT EINTIPPEN.',
  meldungGemerkt: (name) => `GEMERKT: ${name}`,
  meldungEntfernt: (name) => `ENTFERNT: ${name}`,
  meldungSchonDa: 'STEHT SCHON AUF DER MERKLISTE',
  meldungSpeicherGesperrt: 'SPEICHER GESPERRT - MERKLISTE GILT NUR BIS ZUM SCHLIESSEN',
  meldungKeineRunde: 'DIE MERKLISTE HAT KEINE RUNDEN',
  wortListe: 'LISTE',
  partner: 'MIT',
  zusaetze: 'Zusätzen (Adjektive, Verben)',
  stellung: 'WORT',
  stellungen: { any: 'EGAL', front: 'VORN', back: 'HINTEN' },
  titelPartner: 'Womit dein Wort kombiniert wird: Zusätze oder die Wörter eines Themas',
  titelStellung: 'Wo dein Wort im Namen steht - eine feste Stelle heißt: zwei Wörter',
  varianten: 'VARIANTEN VON',
  wortHalten: 'NEUE ZUSÄTZE',
  zusatzHalten: 'NEUES WORT',
  titelWortHalten: 'Varianten: das Wort dieses Namens bleibt, die Zusätze werden neu gewürfelt (Taste W)',
  titelZusatzHalten: 'Varianten: der Zusatz dieses Namens bleibt, das Wort wechselt (Taste M)',
  meldungNichtsZuVariieren: 'HIER GIBT ES NICHTS ZU VARIIEREN',
  meldungMerklisteNichtVariierbar: 'MERKLISTE NICHT VARIIERBAR - ERST EIN THEMA WÄHLEN',
  mix: 'MIX',
  keinMix: 'kein Mix',
  titelMix: 'Das Thema mit einem zweiten kreuzen - je ein Wort aus beiden, z.B. Snowdon Lepus',
  methode: 'METHODE',
  methoden: {
    words: 'Themenwörter',
    coined: 'Kunstwörter',
    blend: 'Kofferwörter',
    acronym: 'Akronym',
  },
  titelMethode:
    'Wie die Namen entstehen: Themenwörter mit Zusätzen, neue Wörter im Klang des Themas, zwei verschmolzene Themenwörter oder ein Akronym',
  buchstaben: 'BUCHSTABEN',
  platzhalterBuchstaben: 'z.B. SMT',
  titelBuchstaben: 'Bis zu drei Buchstaben - jedes Wort des Namens beginnt mit seinem',
  ton: 'TON',
  toene: {
    '': 'alle',
    dark: 'düster',
    bright: 'hell',
    noble: 'edel',
    swift: 'schnell',
    calm: 'ruhig',
    fierce: 'wild',
  },
  titelTon: 'Nur Zusätze dieser Stimmung',
  filter: 'FILTER',
  anfang: 'ANFANG',
  platzhalterAnfang: 'z.B. S',
  titelAnfang: 'Nur Namen, die mit diesen Buchstaben beginnen',
  silben: 'MAX. SILBEN',
  silbenAlle: 'alle',
  titelSilben: 'Nur Namen mit höchstens so vielen Silben',
  alliteration: 'STABREIM',
  titelAlliteration: 'Nur Namen, deren Wörter mit demselben Buchstaben beginnen (Alliteration)',
  klang: 'NACH KLANG',
  titelKlang: 'Die am besten klingenden Namen zuerst: kurz, gut sprechbar, leicht zu buchstabieren',
  passen: (n) => `${n} PASSEN`,
  leerFilter: 'KEIN NAME PASST ZUM FILTER.',
  leerAkronym: 'OBEN BIS ZU DREI BUCHSTABEN EINTIPPEN.',
  leerAkronymKeine: 'KEINE WÖRTER FÜR DIESE BUCHSTABEN IN DIESEM THEMA.',
  exportieren: 'EXPORT',
  importieren: 'IMPORT',
  titelExportieren: 'Die Merkliste als Datei speichern - die Terminalfassung liest sie mit --import-favorites',
  titelImportieren:
    'Eine Merkliste aus einer Datei übernehmen - ein Export dieser Seite, der Terminalfassung oder deren settings.json',
  meldungExportiert: (n) => `${n} NAMEN ALS DATEI GESPEICHERT`,
  meldungImportiert: (neu, schonDa) => `${neu} NEU AUF DER MERKLISTE, ${schonDa} SCHON DA`,
  meldungImportLeer: 'IN DER DATEI STEHEN KEINE NAMEN',
  meldungImportKaputt: 'DIE DATEI IST KEINE MERKLISTE',
  laufschrift: [
    'CODENAME GENERATOR',
    'F MERKT EINEN NAMEN, O NIMMT DEIN EIGENES WORT - DIE MERKLISTE BLEIBT IN DEINEM BROWSER',
    'W HÄLT DAS WORT, M DEN ZUSATZ - SO TASTEST DU DICH AN EINEN NAMEN HERAN',
    'KUNSTWÖRTER, KOFFERWÖRTER, AKRONYME - DAZU FILTER NACH TON, SILBEN UND KLANG',
    'IM DEUTSCHEN WIRD DER ZUSATZ GEBEUGT: STILLER FALKE - STILLE EULE - STILLES WIESEL',
    'DIESELBEN WORTLISTEN TREIBEN DIE TERMINALFASSUNG AN: GITHUB.COM/MICHAELBLAESS/CODENAME-GENERATOR',
    'NAMEN KÖNNEN MIT BESTEHENDEN PRODUKTNAMEN ZUSAMMENFALLEN - VOR VERWENDUNG PRÜFEN',
    'MUSIK: BIT SPACE VON BEAM THEORY, OGA-BY 3.0, OPENGAMEART.ORG',
    'MICHAEL BLAESS 2026 - APACHE 2.0 - SCHRIFTEN PRESS START 2P UND BUNGEE (OFL)',
  ],
};

const en: UiTexte = {
  htmlLang: 'en',
  seitentitel: 'Codename Generator - project codenames from curated themes',
  seitenbeschreibung:
    'Generate project codenames from curated word lists, in English or German, with optional phonetic mutation. Runs entirely in the browser.',
  bestand: (themen, woerter) => `${themen} THEMES, ${woerter} WORDS FREE`,
  bereit: 'READY.',
  fuerOrdner: 'for repos and URLs:',
  mutiert: 'MUTATED',
  top: (n) => `TOP ${n}`,
  runde: (n) => `ROUND ${n}`,
  thema: 'THEME',
  sprache: 'F3 LANGUAGE',
  woerter: 'F5 WORDS',
  zeilen: 'ROWS',
  mutation: 'MUTATION',
  fest: 'fixed',
  neueRunde: 'NEW ROUND',
  nameKopieren: 'COPY NAME',
  adresseKopieren: 'COPY LINK',
  kurzformKopieren: 'Copy the slug',
  titelNeueRunde: 'Draw new names',
  titelNameKopieren: 'Put the big name on the clipboard',
  titelAdresseKopieren: 'Copy this round as a link - it reopens exactly these names',
  titelMutation:
    'Bends words phonetically: Pegasus becomes Pegasos. Affected names are marked MUT.',
  titelWortzahlFest: 'This theme sets the word count',
  musikAn: 'MUSIC',
  musikAus: 'MUSIC OFF',
  titelMusik: 'BIT SPACE (FTL Inspired) [LOOP] by Beam Theory, OGA-BY 3.0 - loads only when you click',
  musikNachweis: 'MUSIC: BIT SPACE BY BEAM THEORY, OGA-BY 3.0, OPENGAMEART.ORG',
  meldungKopiert: (was, text) => `${was} COPIED: ${text}`,
  meldungGesperrt: 'CLIPBOARD BLOCKED - SELECT THE TEXT',
  meldungNeueRunde: 'NEW ROUND',
  wortName: 'NAME',
  wortAdresse: 'LINK',
  wortKurzform: 'SLUG',
  impressum: 'LEGAL NOTICE',
  datenschutz: 'PRIVACY',
  quellcode: 'SOURCE',
  andereSpracheName: 'DEUTSCH',
  zurueck: 'BACK TO THE GENERATOR',
  merkliste: 'SHORTLIST',
  eigenesWort: 'YOUR OWN WORD',
  deinWort: 'YOUR WORD',
  platzhalterWort: 'e.g. Sitemap',
  eigeneIdee: 'YOUR OWN IDEA',
  platzhalterIdee: 'e.g. Sitemap Pioneer',
  dazu: '+ ADD',
  merken: '★ KEEP',
  entfernen: '★ REMOVE',
  listeKopieren: 'COPY LIST',
  titelMerken: 'Put the name on the shortlist or take it off again (key F)',
  titelEntfernen: 'Take the name off the shortlist (key F)',
  titelListeKopieren: 'Copy all kept names to the clipboard, one per line',
  titelMerkliste: 'Your kept names - the mutation slider still applies (key V)',
  titelEigenesWort: 'Combine your own word with modifiers (key O)',
  titelEigeneIdee: 'Put a name of your own straight on the shortlist (key +)',
  leerMerkliste: 'NOTHING KEPT YET. F KEEPS THE ACTIVE NAME.',
  leerWort: 'TYPE A WORD ABOVE.',
  meldungGemerkt: (name) => `KEPT: ${name}`,
  meldungEntfernt: (name) => `REMOVED: ${name}`,
  meldungSchonDa: 'ALREADY ON THE SHORTLIST',
  meldungSpeicherGesperrt: 'STORAGE BLOCKED - SHORTLIST LASTS UNTIL YOU CLOSE THE TAB',
  meldungKeineRunde: 'THE SHORTLIST HAS NO ROUNDS',
  wortListe: 'LIST',
  partner: 'WITH',
  zusaetze: 'modifiers (adjectives, verbs)',
  stellung: 'WORD',
  stellungen: { any: 'ANY', front: 'FRONT', back: 'BACK' },
  titelPartner: 'What your word is combined with: modifiers or the words of a theme',
  titelStellung: 'Where your word stands in the name - a fixed spot means two words',
  varianten: 'VARIANTS OF',
  wortHalten: 'NEW MODIFIERS',
  zusatzHalten: 'NEW WORD',
  titelWortHalten: 'Variants: the word of this name stays, the modifiers are rolled anew (key W)',
  titelZusatzHalten: 'Variants: the modifier of this name stays, the word changes (key M)',
  meldungNichtsZuVariieren: 'NOTHING TO VARY HERE',
  meldungMerklisteNichtVariierbar: 'SHORTLIST CANNOT BE VARIED - PICK A THEME FIRST',
  mix: 'MIX',
  keinMix: 'no mix',
  titelMix: 'Cross the theme with a second one - one word from each, e.g. Snowdon Lepus',
  methode: 'METHOD',
  methoden: {
    words: 'theme words',
    coined: 'coined words',
    blend: 'blends',
    acronym: 'acronym',
  },
  titelMethode:
    'How names are made: theme words with modifiers, new words that sound like the theme, two theme words melted into one, or an acronym',
  buchstaben: 'LETTERS',
  platzhalterBuchstaben: 'e.g. SMT',
  titelBuchstaben: 'Up to three letters - every word of the name starts with its letter',
  ton: 'TONE',
  toene: {
    '': 'any',
    dark: 'dark',
    bright: 'bright',
    noble: 'noble',
    swift: 'swift',
    calm: 'calm',
    fierce: 'fierce',
  },
  titelTon: 'Only modifiers of this mood',
  filter: 'FILTER',
  anfang: 'STARTS',
  platzhalterAnfang: 'e.g. S',
  titelAnfang: 'Only names starting with these letters',
  silben: 'MAX SYLLABLES',
  silbenAlle: 'any',
  titelSilben: 'Only names with at most this many syllables',
  alliteration: 'ALLITERATION',
  titelAlliteration: 'Only names whose words start with the same letter',
  klang: 'BY SOUND',
  titelKlang: 'Best-sounding names first: short, easy to say and to spell',
  passen: (n) => `${n} MATCH`,
  leerFilter: 'NO NAME MATCHES THE FILTER.',
  leerAkronym: 'TYPE UP TO THREE LETTERS ABOVE.',
  leerAkronymKeine: 'NO WORDS FOR THESE LETTERS IN THIS THEME.',
  exportieren: 'EXPORT',
  importieren: 'IMPORT',
  titelExportieren: 'Save the shortlist as a file - the terminal version reads it with --import-favorites',
  titelImportieren:
    'Take over a shortlist from a file - an export of this page, of the terminal version or its settings.json',
  meldungExportiert: (n) => `${n} NAMES SAVED AS A FILE`,
  meldungImportiert: (neu, schonDa) => `${neu} NEW ON THE SHORTLIST, ${schonDa} ALREADY THERE`,
  meldungImportLeer: 'THE FILE HOLDS NO NAMES',
  meldungImportKaputt: 'THE FILE IS NOT A SHORTLIST',
  laufschrift: [
    'CODENAME GENERATOR',
    'F KEEPS A NAME, O TAKES YOUR OWN WORD - THE SHORTLIST STAYS IN YOUR BROWSER',
    'W KEEPS THE WORD, M THE MODIFIER - HOME IN ON A NAME STEP BY STEP',
    'COINED WORDS, BLENDS, ACRONYMS - PLUS FILTERS FOR TONE, SYLLABLES AND SOUND',
    'GERMAN INFLECTS THE MODIFIER: STILLER FALKE - STILLE EULE - STILLES WIESEL',
    'THE SAME WORD LISTS DRIVE THE TERMINAL VERSION: GITHUB.COM/MICHAELBLAESS/CODENAME-GENERATOR',
    'NAMES MAY COLLIDE WITH EXISTING PRODUCT NAMES - CHECK BEFORE YOU USE ONE',
    'MUSIC: BIT SPACE BY BEAM THEORY, OGA-BY 3.0, OPENGAMEART.ORG',
    'MICHAEL BLAESS 2026 - APACHE 2.0 - TYPEFACES PRESS START 2P AND BUNGEE (OFL)',
  ],
};

export const UI: Record<UiSprache, UiTexte> = { de, en };

/**
 * Adresse einer Seite in der jeweiligen Sprache. Deutsch liegt in der Wurzel,
 * Englisch unter /en/ - dieselbe Aufteilung wie auf michaelblaess.de.
 */
export const PFADE = {
  start: { de: '', en: 'en/' },
  impressum: { de: 'impressum/', en: 'en/legal/' },
  datenschutz: { de: 'datenschutz/', en: 'en/privacy/' },
} as const;

export function pfad(seite: keyof typeof PFADE, sprache: UiSprache): string {
  const basis = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${basis}/${PFADE[seite][sprache]}`;
}
