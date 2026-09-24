/*
 * Impressum und Datenschutzerklaerung.
 *
 * Die Datenschutzerklaerung beschreibt NUR, was die Seite wirklich tut. Stand
 * geprueft am 23.09.2026: kein Backend, keine Cookies, keine Zaehlpixel, keine
 * externen Schriften oder Skripte - die Schriften liegen als woff2 im Bundle.
 * localStorage nur fuer die Merkliste, und erst nach dem ersten Merken
 * (src/lib/merkliste.ts). Der Smoketest misst beides nach. Kommt spaeter etwas dazu, gehoert es HIER
 * hinein, sonst beschreibt der Text eine Seite, die es nicht gibt.
 *
 * Grundlage ist § 5 DDG (nicht mehr TMG, abgeloest im Mai 2024).
 */

import type { UiSprache } from './ui';

export interface Absatz {
  titel: string;
  zeilen: string[];
}

export interface Rechtstext {
  titel: string;
  beschreibung: string;
  stand: string;
  absaetze: Absatz[];
}

const ANSCHRIFT = ['Michael Blaess', 'Kurze Str. 2', '15345 Rehfelde', 'Deutschland'];
const MAIL = 'mail@michaelblaess.de';
const STAND_DE = 'Stand: 24.09.2026';
const STAND_EN = 'Last updated: 24 September 2026';

export const IMPRESSUM: Record<UiSprache, Rechtstext> = {
  de: {
    titel: 'Impressum',
    beschreibung: 'Anbieterkennzeichnung nach § 5 DDG für codename-generator.de',
    stand: STAND_DE,
    absaetze: [
      { titel: 'Anbieter', zeilen: ['Angaben gemäß § 5 DDG:', ...ANSCHRIFT] },
      { titel: 'Kontakt', zeilen: [`E-Mail: ${MAIL}`] },
      {
        titel: 'Art des Angebots',
        zeilen: [
          'Diese Seite ist ein privates, nicht kommerzielles Projekt. Sie verkauft nichts, vermittelt nichts, enthält keine Werbung und keine Affiliate-Links. Die Nutzung ist kostenlos.',
        ],
      },
      {
        titel: 'Haftung für Inhalte',
        zeilen: [
          'Die Inhalte wurden mit Sorgfalt erstellt, für ihre Richtigkeit und Vollständigkeit wird keine Gewähr übernommen. Die erzeugten Namen entstehen aus Wortlisten nach dem Zufallsprinzip. Sie können mit bestehenden Produkt-, Projekt- oder Firmennamen und mit eingetragenen Marken zusammenfallen. Vor einer Verwendung ist eine eigene Recherche notwendig.',
        ],
      },
      {
        titel: 'Haftung für Links',
        zeilen: [
          'Diese Seite verlinkt auf externe Angebote, auf deren Inhalte ich keinen Einfluss habe. Für diese Inhalte ist immer der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Wird mir einer bekannt, entferne ich den Link.',
        ],
      },
      {
        titel: 'Urheberrecht',
        zeilen: [
          '© 2026 Michael Blaess. Der Quellcode steht unter der Apache License 2.0 und liegt öffentlich auf GitHub.',
          'Die Schriften Press Start 2P, Bungee und IBM Plex Mono stehen unter der SIL Open Font License.',
        ],
      },
      {
        titel: 'Musik',
        zeilen: [
          'Der Titel heißt "BIT SPACE (FTL Inspired) [LOOP]", er stammt von Beam Theory und steht unter der OGA-BY 3.0. Quelle: https://opengameart.org/content/bit-space-ftl-inspired-loop-0',
          'Der Titel wird unverändert und in voller Länge abgespielt. Er lädt erst, wenn du auf den Musikknopf drückst.',
        ],
      },
      {
        titel: 'Marken',
        zeilen: [
          'Genannte Marken und Produktnamen gehören ihren jeweiligen Inhabern. Sie werden hier ausschließlich beschreibend genannt, es besteht keine Verbindung zu den Rechteinhabern und keine Empfehlung durch sie.',
          'Die Gestaltung ist eine Hommage an das Atari-ST-Spiel Goldrunner (Microdeal, 1987). Auch hier besteht keine Verbindung zu den Rechteinhabern.',
        ],
      },
    ],
  },
  en: {
    titel: 'Legal notice',
    beschreibung: 'Provider identification under § 5 DDG for codename-generator.de',
    stand: STAND_EN,
    absaetze: [
      { titel: 'Provider', zeilen: ['Information under § 5 DDG (German law):', ...ANSCHRIFT] },
      { titel: 'Contact', zeilen: [`Email: ${MAIL}`] },
      {
        titel: 'Nature of this site',
        zeilen: [
          'This is a private, non-commercial project. It sells nothing, brokers nothing, and carries no advertising and no affiliate links. Using it is free.',
        ],
      },
      {
        titel: 'Liability for content',
        zeilen: [
          'The content was created with care, but no warranty is given for its accuracy or completeness. The names are drawn at random from word lists. They may collide with existing product, project or company names and with registered trademarks. Do your own research before you use one.',
        ],
      },
      {
        titel: 'Liability for links',
        zeilen: [
          'This site links to external offerings whose content I do not control. The respective provider is always responsible for that content. No infringements were apparent when the links were set. If I learn of one, I remove the link.',
        ],
      },
      {
        titel: 'Copyright',
        zeilen: [
          '© 2026 Michael Blaess. The source code is Apache License 2.0 and public on GitHub.',
          'Press Start 2P, Bungee and IBM Plex Mono are licensed under the SIL Open Font License.',
        ],
      },
      {
        titel: 'Music',
        zeilen: [
          'The track is "BIT SPACE (FTL Inspired) [LOOP]" by Beam Theory, licensed under OGA-BY 3.0. Source: https://opengameart.org/content/bit-space-ftl-inspired-loop-0',
          'It is played unchanged and in full. It only loads once you press the music button.',
        ],
      },
      {
        titel: 'Trademarks',
        zeilen: [
          'Trademarks and product names belong to their respective owners. They are named here descriptively only. There is no connection to, and no endorsement by, the rights holders.',
          'The visual design is a homage to the Atari ST game Goldrunner (Microdeal, 1987). Here, too, there is no connection to the rights holders.',
        ],
      },
    ],
  },
};

export const DATENSCHUTZ: Record<UiSprache, Rechtstext> = {
  de: {
    titel: 'Datenschutzerklärung',
    beschreibung: 'Was diese Seite mit Daten macht - und was nicht',
    stand: STAND_DE,
    absaetze: [
      {
        titel: 'Kurz gefasst',
        zeilen: [
          'Diese Seite setzt keine Cookies, speichert im Browser nur die Merkliste, die du selbst anlegst, und bindet keine Zählpixel, Analysedienste oder sozialen Netzwerke ein. Der Generator läuft vollständig in deinem Browser: die Wortlisten liegen in der Seite, es wird nichts an einen Server gesendet. Auch die Schriften liegen lokal im Auslieferpaket, es wird keine Schrift von einem fremden Server geladen.',
        ],
      },
      {
        titel: 'Verantwortlicher',
        zeilen: [...ANSCHRIFT, `E-Mail: ${MAIL}`],
      },
      {
        titel: 'Hosting bei GitHub Pages',
        zeilen: [
          'Die Seite wird von GitHub Pages ausgeliefert, einem Dienst der GitHub Inc., 88 Colin P Kelly Jr Street, San Francisco, CA 94107, USA (Microsoft-Konzern).',
          'Beim Abruf verarbeitet GitHub technisch notwendige Verbindungsdaten, darunter die IP-Adresse, Datum und Uhrzeit, die abgerufene Adresse, den Verweis und Angaben zu Browser und Betriebssystem. Diese Verarbeitung liegt bei GitHub, ich habe keinen Zugriff auf diese Protokolle und werte sie nicht aus.',
          'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, das berechtigte Interesse an einer sicheren und kostengünstigen Auslieferung der Seite.',
          'Die Verarbeitung kann in den USA stattfinden. Grundlage der Übermittlung sind die Standardvertragsklauseln der EU-Kommission. Einzelheiten stehen in der Datenschutzerklärung von GitHub: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
        ],
      },
      {
        titel: 'Keine Cookies, keine Statistik - nur deine Merkliste im Browser',
        zeilen: [
          'Es werden keine Cookies gesetzt, weder technisch notwendige noch andere. Es findet keine Reichweitenmessung statt: kein Google Analytics, kein Matomo, kein Zählpixel.',
          'Wenn du einen Namen merkst oder eine eigene Idee auf die Merkliste setzt, legt die Seite diese Liste im localStorage deines Browsers ab, unter dem Schlüssel codename-generator.merkliste. Gespeichert werden nur die gemerkten Namen und ihre Bestandteile. Die Liste bleibt in deinem Browser, sie wird an keinen Server übertragen, und ich kann sie nicht einsehen. Sonst legt die Seite nichts im Browser ab, auch nicht im sessionStorage.',
          'Vor dem ersten Merken wird nichts gespeichert. Entfernst du den letzten Eintrag, verschwindet auch der Schlüssel wieder. Außerdem kannst du die Liste jederzeit über die Einstellungen deines Browsers löschen (gespeicherte Websitedaten).',
          'Die Merkliste lässt sich als Datei exportieren und aus einer Datei importieren. Beides geschieht nur in deinem Browser: Die Exportdatei wird dort erzeugt und landet in deinem Download-Ordner, eine Importdatei wird dort gelesen. Keine der beiden Dateien wird an einen Server übertragen.',
          'Eine Einwilligung ist dafür nicht nötig: Die Speicherung ist unbedingt erforderlich, damit die von dir ausdrücklich gewünschte Merkliste funktioniert (§ 25 Abs. 2 Nr. 2 TDDDG). Deshalb gibt es hier auch keinen Einwilligungsbanner.',
          'Die eingestellte Sprache und ein geteilter Stapel Namen stehen in der Adresse selbst, nicht in einem Speicher deines Browsers.',
          'Die Hintergrundmusik wird erst nach einem Klick auf den Musikknopf geladen, und zwar von demselben Server wie die Seite. Es wird dabei kein fremder Dienst kontaktiert.',
        ],
      },
      {
        titel: 'Kontakt per E-Mail',
        zeilen: [
          'Wenn du mir schreibst, verarbeite ich deine Angaben zur Bearbeitung der Anfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei einem Vertragsbezug Art. 6 Abs. 1 lit. b DSGVO. Ich lösche die Nachrichten, sobald sie nicht mehr benötigt werden und keine Aufbewahrungspflicht entgegensteht.',
        ],
      },
      {
        titel: 'Deine Rechte',
        zeilen: [
          'Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen eine Verarbeitung auf Grundlage berechtigter Interessen (Art. 21).',
          'Außerdem kannst du dich bei einer Aufsichtsbehörde beschweren. Für mich zuständig ist: Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg, Stahnsdorfer Damm 77, 14532 Kleinmachnow.',
        ],
      },
    ],
  },
  en: {
    titel: 'Privacy policy',
    beschreibung: 'What this site does with data - and what it does not',
    stand: STAND_EN,
    absaetze: [
      {
        titel: 'In short',
        zeilen: [
          'This site sets no cookies, stores only the shortlist you create yourself in your browser, and embeds no tracking pixels, analytics services or social networks. The generator runs entirely in your browser: the word lists ship with the page and nothing is sent to a server. The typefaces are bundled locally as well, so no font is fetched from a third-party server.',
        ],
      },
      {
        titel: 'Controller',
        zeilen: [...ANSCHRIFT, `Email: ${MAIL}`],
      },
      {
        titel: 'Hosting on GitHub Pages',
        zeilen: [
          'The site is served by GitHub Pages, a service of GitHub Inc., 88 Colin P Kelly Jr Street, San Francisco, CA 94107, USA (Microsoft group).',
          'When you open the page, GitHub processes technically necessary connection data, including your IP address, date and time, the requested address, the referrer, and browser and operating system details. That processing sits with GitHub. I have no access to those logs and do not evaluate them.',
          'The legal basis is Art. 6(1)(f) GDPR, the legitimate interest in serving the site securely and cheaply.',
          'Processing may take place in the USA, based on the EU Commission standard contractual clauses. Details are in the GitHub privacy statement: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
        ],
      },
      {
        titel: 'No cookies, no analytics - only your shortlist in the browser',
        zeilen: [
          'No cookies are set, neither strictly necessary ones nor any others. There is no audience measurement: no Google Analytics, no Matomo, no tracking pixel.',
          'When you keep a name or put an idea of your own on the shortlist, the page stores that list in the localStorage of your browser, under the key codename-generator.merkliste. Only the kept names and their parts are stored. The list stays in your browser, it is not sent to any server, and I cannot see it. Apart from that the page stores nothing in your browser, not in sessionStorage either.',
          'Nothing is stored before you keep your first name. When you remove the last entry, the key disappears again. You can also delete the list at any time in your browser settings (stored site data).',
          'The shortlist can be exported to a file and imported from a file. Both happen in your browser only: the export file is created there and goes to your download folder, an import file is read there. Neither file is sent to any server.',
          'No consent is needed for this: the storage is strictly necessary to provide the shortlist you explicitly asked for (Section 25(2) no. 2 of the German Telecommunications Digital Services Data Protection Act, TDDDG). That is also why there is no consent banner here.',
          'The chosen language and a shared batch of names live in the address itself, not in the storage of your browser.',
          'The background music is only fetched after you press the music button, and it comes from the same server as the page. No third-party service is contacted.',
        ],
      },
      {
        titel: 'Contact by email',
        zeilen: [
          'If you write to me, I process your details to handle the request. The legal basis is Art. 6(1)(f) GDPR, or Art. 6(1)(b) GDPR where a contract is involved. I delete messages once they are no longer needed and no retention duty applies.',
        ],
      },
      {
        titel: 'Your rights',
        zeilen: [
          'You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20), and to object to processing based on legitimate interests (Art. 21).',
          'You may also lodge a complaint with a supervisory authority. The one responsible for me is: Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg, Stahnsdorfer Damm 77, 14532 Kleinmachnow, Germany.',
        ],
      },
    ],
  },
};
