/*
 * Oberflaechentexte in zwei Sprachen.
 *
 * Wichtig: das hier ist NICHT dieselbe Sprache wie die der erzeugten Namen.
 * Die Oberflaeche haengt an der Adresse (/ ist Deutsch, /en/ ist Englisch),
 * die Namenssprache bleibt im Bedienfeld umschaltbar - sonst koennte man
 * keine deutschen Namen mit englischer Oberflaeche ziehen. Beim Einstieg
 * folgt die Namenssprache der Oberflaeche.
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
  laufschrift: string[];
}

const de: UiTexte = {
  htmlLang: 'de',
  seitentitel: 'Codename Generator - Projekt-Codenamen aus kuratierten Themen',
  seitenbeschreibung:
    'Erzeugt Projekt-Codenamen aus kuratierten Wortlisten, auf Deutsch oder Englisch, mit phonetischer Mutation. Laeuft vollstaendig im Browser.',
  bestand: (themen, woerter) => `${themen} THEMEN, ${woerter} WÖRTER FREI`,
  bereit: 'READY.',
  fuerOrdner: 'für Ordner und Adressen:',
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
  titelEigenesWort: 'Dein eigenes Wort mit Zusätzen kombinieren (Taste I)',
  titelEigeneIdee: 'Einen eigenen Namen direkt auf die Merkliste setzen (Taste +)',
  leerMerkliste: 'NOCH NICHTS GEMERKT. F MERKT DEN AKTIVEN NAMEN.',
  leerWort: 'OBEN EIN WORT EINTIPPEN.',
  meldungGemerkt: (name) => `GEMERKT: ${name}`,
  meldungEntfernt: (name) => `ENTFERNT: ${name}`,
  meldungSchonDa: 'STEHT SCHON AUF DER MERKLISTE',
  meldungSpeicherGesperrt: 'SPEICHER GESPERRT - MERKLISTE GILT NUR BIS ZUM SCHLIESSEN',
  meldungKeineRunde: 'DIE MERKLISTE HAT KEINE RUNDEN',
  wortListe: 'LISTE',
  laufschrift: [
    'CODENAME GENERATOR',
    'ALLES LÄUFT IM BROWSER, NICHTS WIRD GESENDET',
    'F MERKT EINEN NAMEN, I NIMMT DEIN EIGENES WORT - DIE MERKLISTE BLEIBT IN DEINEM BROWSER',
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
  fuerOrdner: 'for folders and URLs:',
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
  titelEigenesWort: 'Combine your own word with modifiers (key I)',
  titelEigeneIdee: 'Put a name of your own straight on the shortlist (key +)',
  leerMerkliste: 'NOTHING KEPT YET. F KEEPS THE ACTIVE NAME.',
  leerWort: 'TYPE A WORD ABOVE.',
  meldungGemerkt: (name) => `KEPT: ${name}`,
  meldungEntfernt: (name) => `REMOVED: ${name}`,
  meldungSchonDa: 'ALREADY ON THE SHORTLIST',
  meldungSpeicherGesperrt: 'STORAGE BLOCKED - SHORTLIST LASTS UNTIL YOU CLOSE THE TAB',
  meldungKeineRunde: 'THE SHORTLIST HAS NO ROUNDS',
  wortListe: 'LIST',
  laufschrift: [
    'CODENAME GENERATOR',
    'EVERYTHING RUNS IN YOUR BROWSER, NOTHING IS SENT ANYWHERE',
    'F KEEPS A NAME, I TAKES YOUR OWN WORD - THE SHORTLIST STAYS IN YOUR BROWSER',
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
