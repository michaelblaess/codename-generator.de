/*
 * Impressum und Datenschutzerklaerung.
 *
 * Die Datenschutzerklaerung beschreibt NUR, was die Seite wirklich tut. Stand
 * geprueft am 17.08.2026: kein Backend, keine Cookies, kein localStorage,
 * keine Zaehlpixel, keine externen Schriften oder Skripte - die Schriften
 * liegen als woff2 im Bundle. Kommt spaeter etwas dazu, gehoert es HIER
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
const STAND_DE = 'Stand: 17.08.2026';
const STAND_EN = 'Last updated: 17 August 2026';

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
        titel: 'Marken',
        zeilen: [
          'Genannte Marken und Produktnamen gehören ihren jeweiligen Inhabern. Sie werden hier ausschließlich beschreibend genannt, es besteht keine Verbindung zu den Rechteinhabern und keine Empfehlung durch sie.',
          'Das gilt besonders für das Thema "Swatch Watches", das historische Modellnamen als Wortmaterial verwendet: Swatch ist eine eingetragene Marke der Swatch AG.',
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
        titel: 'Trademarks',
        zeilen: [
          'Trademarks and product names belong to their respective owners. They are named here descriptively only. There is no connection to, and no endorsement by, the rights holders.',
          'This applies in particular to the "Swatch Watches" theme, which uses historic model names as raw word material: Swatch is a registered trademark of Swatch AG.',
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
          'Diese Seite setzt keine Cookies, speichert nichts im Browser und bindet keine Zählpixel, Analysedienste oder sozialen Netzwerke ein. Der Generator läuft vollständig in deinem Browser: die Wortlisten liegen in der Seite, es wird nichts an einen Server gesendet. Auch die Schriften liegen lokal im Auslieferpaket, es wird keine Schrift von einem fremden Server geladen.',
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
        titel: 'Keine Cookies, kein Speicher, keine Statistik',
        zeilen: [
          'Es werden keine Cookies gesetzt, weder technisch notwendige noch andere. Es wird nichts in localStorage oder sessionStorage abgelegt. Deshalb gibt es hier auch keinen Einwilligungsbanner - es gibt nichts einzuwilligen.',
          'Es findet keine Reichweitenmessung statt: kein Google Analytics, kein Matomo, kein Zählpixel.',
          'Die eingestellte Sprache und ein geteilter Stapel Namen stehen in der Adresse selbst, nicht in einem Speicher deines Browsers.',
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
          'This site sets no cookies, stores nothing in your browser, and embeds no tracking pixels, analytics services or social networks. The generator runs entirely in your browser: the word lists ship with the page and nothing is sent to a server. The typefaces are bundled locally as well, so no font is fetched from a third-party server.',
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
        titel: 'No cookies, no storage, no analytics',
        zeilen: [
          'No cookies are set, neither strictly necessary ones nor any others. Nothing is written to localStorage or sessionStorage. That is also why there is no consent banner here - there is nothing to consent to.',
          'There is no audience measurement: no Google Analytics, no Matomo, no tracking pixel.',
          'The chosen language and a shared batch of names live in the address itself, not in the storage of your browser.',
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
