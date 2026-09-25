// Smoketest gegen den laufenden Server. Der Build beweist nur Syntax - ob die
// React-Insel haengt, die Schrift still auf einen Fallback faellt, der
// Druckeffekt gar nicht laeuft oder der Permalink den Stapel nicht
// reproduziert, zeigt erst der echte Browser.
//
// Voraussetzung, einmalig, ohne erneuten Browser-Download:
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core
//
// Aufruf bei laufendem Server (Port aus dessen Startlog nehmen, Astro weicht
// bei belegtem Port aus):
//   SMOKE_URL=http://localhost:4400/codename-generator.de/ node pruefe-seite.mjs
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync } from 'node:fs';

const CACHE = `${process.env.LOCALAPPDATA}/ms-playwright`;
const shell = readdirSync(CACHE)
  .filter((n) => n.startsWith('chromium_headless_shell-'))
  .sort()
  .at(-1);
const EXE = `${CACHE}/${shell}/chrome-headless-shell-win64/chrome-headless-shell.exe`.replaceAll(
  '\\',
  '/',
);
const URL_BASIS = process.env.SMOKE_URL ?? 'http://localhost:4321/';

const browser = await chromium.launch({ executablePath: EXE });
// Ohne diese Rechte liefert die Zwischenablage headless nichts und die
// Permalink-Pruefung wuerde stillschweigend entfallen.
const kontext = await browser.newContext({
  viewport: { width: 1400, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const seite = await kontext.newPage();

const fehler = [];
seite.on('pageerror', (e) => fehler.push(`pageerror: ${e.message}`));
seite.on('console', (m) => {
  if ('error' === m.type()) fehler.push(`console: ${m.text()}`);
});
seite.on('response', (r) => {
  if (r.status() >= 400) fehler.push(`HTTP ${r.status()}: ${r.url()}`);
});
// Jede Anfrage der Seite - fuer die Pruefung, dass Export und Import nichts senden.
const anfragen = [];
seite.on('request', (r) => anfragen.push(r.url()));

const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK  ' : 'FAIL'} ${text}`);
  if (!bedingung) fehler.push(text);
};

await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });

// 0. Auf der richtigen Seite gelandet? Ein belegter Port schickt den Test sonst
//    klaglos gegen ein fremdes Projekt.
pruefe((await seite.title()).includes('Codename'), 'richtige Seite geladen');

// 0b. Die Version im Titel kommt aus der package.json. Der Test liest sie
//     dort und vergleicht - eine handgepflegte Zahl im Markup faellt damit
//     sofort auf.
const paketVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const kurzVersion = paketVersion.split('.').slice(0, 2).join('.');
const titelzeile = (await seite.locator('h1').first().innerText()).trim();
pruefe(
  titelzeile.includes(`V${kurzVersion}`),
  `Version im Titel: "${titelzeile}" (package.json ${paketVersion})`,
);

// 1. Plakette und Karten stehen.
const held = seite.locator('.held');
await held.waitFor({ timeout: 10000 });
const ersterHeld = (await held.innerText()).trim();
pruefe(ersterHeld.length > 2, `Plakette zeigt einen Namen: "${ersterHeld}"`);

const karten = seite.locator('ol li button');
pruefe((await karten.count()) === 20, `20 Raenge in der Bestenliste (${await karten.count()})`);
pruefe(
  (await seite.locator('ol li button[aria-current="true"]').count()) === 1,
  'genau ein Rang ist als aktiv markiert',
);

// 2. Die Schrift liegt wirklich an. Faellt sie auf einen Fallback zurueck,
//    zerfaellt der Entwurf - und im Build sieht man es nicht.
pruefe(
  await seite.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px PlexMono');
  }),
  'PlexMono geladen',
);
// Die Pixelschrift traegt den ganzen Entwurf. Beim ersten Versuch lag das
// kyrillische Subset im Repo - fonts.check meldete "geladen", die Buchstaben
// kamen trotzdem aus der Ersatzschrift. Deshalb wird hier die Glyphenbreite
// gemessen: eine 8-Bit-Schrift ist deutlich breiter als Plex Mono.
pruefe(
  await seite.evaluate(async () => {
    await document.fonts.ready;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;font-size:32px;white-space:pre';
    document.body.append(probe);
    const breite = (familie) => {
      probe.style.fontFamily = familie;
      probe.textContent = 'CODENAME';
      return probe.getBoundingClientRect().width;
    };
    const pixel = breite('PressStart');
    const plex = breite('PlexMono');
    probe.remove();
    return pixel > plex * 1.15;
  }),
  'Pixelschrift liegt wirklich an (nicht die Ersatzschrift)',
);

// 3. Der Druckeffekt laeuft wirklich. Genau das schlug vorher still fehl:
//    dist/ ist ein IIFE-Bundle, ein import() bekommt daraus keine Funktionen.
await seite.keyboard.press('ArrowRight');
await seite.waitForTimeout(120);
const waehrend = (await held.innerText()).trim();
await seite.waitForTimeout(1500);
const fertig = (await held.innerText()).trim();
pruefe(fertig !== ersterHeld, `Pfeiltaste blaettert weiter: "${fertig}"`);
pruefe(
  waehrend.length < fertig.length,
  `Name wird Zeichen fuer Zeichen gedruckt ("${waehrend}" -> "${fertig}")`,
);
pruefe(
  (await seite.locator('ol li button').count()) === 20,
  'die Karten ueberleben den Druckeffekt',
);

// 4. Eine Karte waehlen setzt die Plakette.
// Verglichen wird der Slug: er ist eindeutig und steht auf beiden Seiten
// unveraendert. Ein Vergleich ueber zerlegten Text lieferte einen Leerstring -
// und damit eine Pruefung, die gar nicht scheitern konnte.
const dritterName = (await karten.nth(2).innerText()).replace(/^\d+\.\s*/, '').replace(/\s*MUT$/, '').trim();
pruefe(dritterName.length > 2, `dritter Rang hat einen Namen: "${dritterName}"`);
await karten.nth(2).click();
await seite.waitForTimeout(1500);
pruefe(
  (await seite.locator('.held').innerText()).trim() === dritterName,
  `Rang setzt den Titel auf "${dritterName}"`,
);

// 5. Sprachwechsel filtert die Themen.
await seite.getByRole('button', { name: 'DEUTSCH' }).click();
await seite.waitForTimeout(500);
const themen = (await seite.locator('aside ul li').allInnerTexts()).join(' | ');
pruefe(themen.includes('Tierwelt'), 'Tierwelt im deutschen Modus sichtbar');
pruefe(!themen.includes('Dangerous Animals'), 'englisches Thema ausgeblendet');
pruefe(themen.includes('Racehorses'), 'neutrales Thema bleibt in beiden Sprachen');

// 6. Deutsche Flexion im echten DOM.
await seite.getByRole('button', { name: /Tierwelt/ }).click();
await seite.waitForTimeout(1400);
// Gegen die echten Wortlisten pruefen, nicht gegen ein Endungsmuster: "Otter
// Finder" endet auch auf -er, ist aber ein Themenwort mit Rollennomen und sagt
// ueber die Flexion nichts aus.
const pools = JSON.parse(readFileSync('src/data/modifiers.json', 'utf8')).de;
const staemme = [...pools.adjectives.words, ...pools.verbs.words].map((w) =>
  w
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss'),
);
const slugs = await seite.locator('ol li button').allInnerTexts();
const ersteWoerter = slugs.map((zeile) =>
  zeile
    .replace(/^\d+\.\s*/, '')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss'),
);
const gebeugt = ersteWoerter.filter((wort) =>
  staemme.some(
    (stamm) =>
      // Stamm plus Flexionsendung - der blosse Stamm zaehlt nicht als gebeugt.
      wort !== stamm && wort.startsWith(stamm) && ['e', 'er', 'es'].includes(wort.slice(stamm.length)),
  ),
);
pruefe(
  gebeugt.length >= 3,
  `gebeugte Modifier aus dem deutschen Pool: ${gebeugt.length}/${slugs.length} (${gebeugt.slice(0, 3).join(', ')})`,
);

// 7. Permalink reproduziert denselben Stapel.
const vorher = await seite.locator('ol li').allInnerTexts();
await seite.getByRole('button', { name: 'ADRESSE KOPIEREN' }).click();
await seite.waitForTimeout(250);
const link = await seite.evaluate(() => navigator.clipboard.readText().catch(() => ''));
if (link) {
  await seite.goto(link, { waitUntil: 'networkidle' });
  await held.waitFor({ timeout: 10000 });
  await seite.waitForTimeout(500);
  pruefe(
    JSON.stringify(await seite.locator('ol li').allInnerTexts()) === JSON.stringify(vorher),
    'Permalink liefert denselben Stapel',
  );
} else {
  pruefe(false, 'Permalink liess sich nicht aus der Zwischenablage lesen');
}

// 7b. Die Statuszeile haengt per Portal in der Kopfzeile. Zwei Dinge koennen
//     schiefgehen: der Platzhalter bleibt stehen (dann steht READY. doppelt),
//     oder das Portal findet sein Feld nicht (dann meldet die Seite nichts).
const status = seite.locator('#statuszeile');
const statusText = (await status.innerText()).trim();
pruefe(statusText === 'READY.', `Statuszeile im Ruhezustand: "${statusText}"`);

const kastenStatus = await status.boundingBox();
const kastenHeld = await held.boundingBox();
pruefe(
  kastenStatus !== null && kastenHeld !== null && kastenStatus.y < kastenHeld.y,
  `Statuszeile steht oben (y=${Math.round(kastenStatus?.y ?? -1)} vor Name y=${Math.round(kastenHeld?.y ?? -1)})`,
);

await seite.getByRole('button', { name: 'NEUE RUNDE' }).click();
await seite.waitForTimeout(120);
pruefe(
  (await status.innerText()).trim().includes('NEUE RUNDE'),
  'Statuszeile meldet die Aktion oben in der Kopfzeile',
);

// 7c. Das Bedienfeld steht links von der Bestenliste.
const kastenListe = await seite.locator('ol.panel').boundingBox();
const kastenThema = await seite.locator('aside ul.panel').boundingBox();
pruefe(
  kastenThema !== null && kastenListe !== null && kastenThema.x < kastenListe.x,
  `Bedienfeld links (x=${Math.round(kastenThema?.x ?? -1)}) vor Bestenliste (x=${Math.round(kastenListe?.x ?? -1)})`,
);

// 8. Die Seite muss ohne Scrollen in den Bildschirm passen - auch mit 40
//    Zeilen und auf einem flachen Fenster. Die Listen rollen in ihrem Kasten.
for (const groesse of [
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 700 },
]) {
  await seite.setViewportSize(groesse);
  await seite.getByRole('button', { name: '40', exact: true }).click();
  await seite.waitForTimeout(600);
  const ueberstand = await seite.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  pruefe(
    ueberstand <= 2,
    `kein Seitenscroll bei ${groesse.width}x${groesse.height} und 40 Zeilen (Ueberstand ${ueberstand}px)`,
  );
}

await seite.screenshot({ path: 'smoke.png', fullPage: true });

// 8b. Handy: dort darf die Seite rollen, aber keine Liste darf zusammenfallen.
//     Mit Methoden- und Filterzeile hatte die Namensliste 0 Pixel Hoehe.
await seite.setViewportSize({ width: 390, height: 844 });
await seite.waitForTimeout(400);
const handy = await seite.evaluate(() => ({
  namen: document.querySelector('ol.panel')?.getBoundingClientRect().height ?? 0,
  themen: document.querySelector('aside ul.panel')?.getBoundingClientRect().height ?? 0,
  quer: document.documentElement.scrollWidth - window.innerWidth,
}));
pruefe(
  handy.namen >= 200 && handy.themen >= 200 && handy.quer <= 0,
  `Handy 390x844: Namensliste ${Math.round(handy.namen)}px, Themenliste ${Math.round(handy.themen)}px, quer ${handy.quer}px`,
);

// 9. Die Datenschutzerklaerung behauptet: keine Cookies, localStorage nur fuer
//    die Merkliste und erst nach dem ersten Merken, kein sessionStorage. Das
//    muss messbar sein, sonst steht dort eine unwahre Aussage.
await seite.setViewportSize({ width: 1400, height: 1000 });
await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
await seite.getByRole('button', { name: 'NEUE RUNDE' }).click();
await seite.waitForTimeout(400);
const messeSpuren = () =>
  seite.evaluate(() => ({
    cookies: document.cookie,
    schluessel: Object.keys(window.localStorage),
    sitzung: window.sessionStorage.length,
  }));
const spuren = await messeSpuren();
pruefe(
  spuren.cookies === '' && spuren.schluessel.length === 0 && spuren.sitzung === 0,
  `vor dem Merken: keine Cookies, kein Speicher (cookie "${spuren.cookies}", local ${spuren.schluessel}, session ${spuren.sitzung})`,
);

// 9b. Merkliste: F merkt den aktiven Namen, danach steht genau ein Schluessel
//     im localStorage, und die Liste ueberlebt das Neuladen.
// Mutation auf 0, sonst rendert die Merkliste den Namen anders als gemerkt.
const mutationRegler = seite.locator('input[type="range"]');
await mutationRegler.fill('0');
// Der Name laeuft Zeichen fuer Zeichen ein - erst nach dem Druckeffekt lesen.
await seite.waitForTimeout(1500);
const gemerkterName = (await held.innerText()).trim();
await seite.locator('body').press('f');
await seite.waitForTimeout(300);
const nachMerken = await messeSpuren();
pruefe(
  nachMerken.cookies === '' &&
    JSON.stringify(nachMerken.schluessel) === '["codename-generator.merkliste"]' &&
    nachMerken.sitzung === 0,
  `nach dem Merken: nur der Merklisten-Schluessel (local ${nachMerken.schluessel})`,
);
pruefe(
  (await seite.locator('ol li button[aria-current="true"]').innerText()).includes('★'),
  'gemerkter Name traegt den Stern in der Liste',
);
await seite.reload({ waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
const merklistenEintrag = seite.locator('ul li button').filter({ hasText: 'MERKLISTE' });
pruefe(
  (await merklistenEintrag.innerText()).includes('1'),
  'Merkliste zaehlt nach dem Neuladen einen Eintrag',
);
await merklistenEintrag.click();
await mutationRegler.fill('0');
await seite.waitForTimeout(1500);
const merklistenHeld = (await held.innerText()).trim();
pruefe(
  (await seite.locator('ol li button').count()) === 1 && merklistenHeld === gemerkterName,
  `Merkliste zeigt den gemerkten Namen ("${merklistenHeld}" = "${gemerkterName}")`,
);
pruefe(
  await seite.getByRole('button', { name: 'NEUE RUNDE' }).isDisabled(),
  'in der Merkliste ist NEUE RUNDE gesperrt',
);

// 9c. Eigene Idee per "+" und Eingabe, danach alles wieder entfernen: der
//     Schluessel muss mit dem letzten Eintrag verschwinden.
await seite.locator('body').press('+');
await seite.keyboard.type('Sitemap Pioneer');
await seite.keyboard.press('Enter');
await seite.waitForTimeout(300);
const listeMitIdee = await seite.locator('ol li button').allInnerTexts();
pruefe(
  listeMitIdee.length === 2 && listeMitIdee.some((z) => z.includes('SITEMAP PIONEER')),
  `eigene Idee steht auf der Merkliste (${listeMitIdee.length} Eintraege)`,
);
await seite.locator('#eigene-idee').blur();
await seite.locator('body').press('f');
await seite.locator('body').press('f');
await seite.waitForTimeout(300);
const nachLeeren = await messeSpuren();
pruefe(
  nachLeeren.schluessel.length === 0,
  `leere Merkliste raeumt den Speicher ab (local ${nachLeeren.schluessel})`,
);

// 9d. Eigenes Wort: "o" oeffnet das Feld, jeder Vorschlag traegt das Wort, und
//     ohne Dubletten. Die Adresse ?word= fuehrt direkt in diese Ansicht.
await seite.locator('body').press('o');
await seite.keyboard.type('Sitemap');
await seite.waitForTimeout(400);
const wortZeilen = await seite.locator('ol li button').allInnerTexts();
pruefe(
  wortZeilen.length === 20 &&
    wortZeilen.every((z) => z.includes('SITEMAP')) &&
    new Set(wortZeilen.map((z) => z.replace(/^\s*\d+\.\s*/, ''))).size === 20,
  `eigenes Wort: 20 verschiedene Vorschlaege mit SITEMAP (${wortZeilen.length})`,
);
await seite.goto(`${URL_BASIS}?word=Leuchtturm&lang=de&seed=5&mut=0&words=2`, {
  waitUntil: 'networkidle',
});
await held.waitFor({ timeout: 10000 });
pruefe(
  (await held.innerText()).includes('LEUCHTTURM'),
  `?word= oeffnet das eigene Wort (${(await held.innerText()).trim()})`,
);
// Die Themenliste zentriert den aktiven Eintrag. Frueher rechnete sie mit
// offsetTop (ab dem positionierten Vorfahren, nicht ab der Liste) und schob
// Merkliste und eigenes Wort oben aus dem Blick. EIGENES WORT ist der zweite
// Eintrag, zentriert heisst dort: die Liste steht ganz oben. Bei 1400x1000
// fiel der Fehler nicht auf, deshalb das flachere Fenster.
await seite.setViewportSize({ width: 1400, height: 860 });
await seite.reload({ waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
await seite.waitForTimeout(300);
const themenOben = await seite.locator('aside ul').evaluate((ul) => ul.scrollTop);
pruefe(themenOben === 0, `Themenliste zeigt Merkliste und eigenes Wort (scrollTop ${themenOben})`);
await seite.setViewportSize({ width: 1400, height: 1000 });

// 9e. Anker: eigenes Wort mit Partner-Thema und Position. Der Permalink traegt
//     beides, die Tasten VORN/HINTEN stellen das Wort um, die Wortzahl ist fest.
await seite.goto(
  `${URL_BASIS}?word=Sitemap&lang=en&seed=9&mut=0&partner=constellations&pos=front`,
  { waitUntil: 'networkidle' },
);
await held.waitFor({ timeout: 10000 });
const ankerVorn = await seite.locator('ol li button').allInnerTexts();
const ohneNummer = (z) => z.replace(/^\s*\d+\.\s*/, '').trim();
pruefe(
  ankerVorn.length === 20 &&
    ankerVorn.every((z) => /^SITEMAP \S/.test(ohneNummer(z))) &&
    new Set(ankerVorn.map(ohneNummer)).size === 20,
  `Anker vorn mit Sternbildern: 20 Namen, alle "SITEMAP ..." (${ohneNummer(ankerVorn[0] ?? '')})`,
);
pruefe(
  (await seite.locator('#wort-partner').inputValue()) === 'constellations',
  'Permalink setzt das Partner-Thema',
);
pruefe(
  (await seite.locator('aside').innerText()).includes('fest'),
  'Wortzahl ist mit Partner-Thema fest',
);
await seite.getByRole('button', { name: 'HINTEN', exact: true }).click();
await seite.waitForTimeout(300);
const ankerHinten = (await seite.locator('ol li button').allInnerTexts()).map(ohneNummer);
pruefe(
  ankerHinten.every((z) => / SITEMAP$/.test(z.replace(/\s+MUT$/, ''))),
  `HINTEN stellt das Wort nach hinten (${ankerHinten[0]})`,
);
await seite.getByRole('button', { name: 'ADRESSE KOPIEREN' }).click();
await seite.waitForTimeout(300);
const ankerAdresse = await seite.evaluate(() => navigator.clipboard.readText());
pruefe(
  ankerAdresse.includes('word=Sitemap') &&
    ankerAdresse.includes('partner=constellations') &&
    ankerAdresse.includes('pos=back'),
  `Adresse traegt Wort, Partner und Position (${ankerAdresse.split('?')[1]})`,
);
// 9f. Variieren: W haelt das Wort, M den Zusatz. Welches Wort das Themenwort
//     ist, sieht man von aussen nicht - deshalb: ein Wort des Ausgangsnamens
//     steht in JEDER Variante, und der Ausgangsname selbst kommt nicht vor.
const woerterVon = (name) => name.replace(/\s+MUT$/, '').split(/\s+/);
const gemeinsamMit = (ausgang, zeilen) =>
  woerterVon(ausgang).some((w) => zeilen.every((z) => woerterVon(z).includes(w)));
await seite.goto(`${URL_BASIS}?theme=animals&lang=en&seed=21&mut=0&words=2`, {
  waitUntil: 'networkidle',
});
await held.waitFor({ timeout: 10000 });
await seite.waitForTimeout(1500);
const ausgang = (await held.innerText()).trim();
await seite.locator('body').press('w');
await seite.waitForTimeout(400);
const wortVarianten = (await seite.locator('ol li button').allInnerTexts()).map(ohneNummer);
pruefe(
  (await seite.locator('section p').first().innerText()).includes('VARIANTEN VON') &&
    wortVarianten.length === 20 &&
    !wortVarianten.includes(ausgang) &&
    gemeinsamMit(ausgang, wortVarianten),
  `W haelt ein Wort von "${ausgang}" in allen 20 Varianten (${wortVarianten[0]})`,
);
await seite.waitForTimeout(1500);
const zweiterAusgang = (await held.innerText()).trim();
await seite.locator('body').press('m');
await seite.waitForTimeout(400);
const zusatzVarianten = (await seite.locator('ol li button').allInnerTexts()).map(ohneNummer);
pruefe(
  zusatzVarianten.length === 20 &&
    !zusatzVarianten.includes(zweiterAusgang) &&
    gemeinsamMit(zweiterAusgang, zusatzVarianten),
  `M von der Variante aus haelt den Zusatz von "${zweiterAusgang}" (${zusatzVarianten[0]})`,
);
pruefe(
  await seite.getByRole('button', { name: 'ADRESSE KOPIEREN' }).isDisabled(),
  'in den Varianten ist ADRESSE KOPIEREN gesperrt',
);
await seite.locator('ul li button').filter({ hasText: /^Animals/ }).click();
await seite.waitForTimeout(400);
pruefe(
  !(await seite.locator('section p').first().innerText()).includes('VARIANTEN'),
  'ein Thema in der Liste verlaesst die Varianten',
);

// 9g. Themen-Mix: Berge x Sternbilder. Jede Zeile traegt ein Sternbild (aus
//     den ausgelieferten Daten gelesen, nicht geraten), die Adresse den Mix,
//     und "kein Mix" fuehrt zu reinen Berg-Namen zurueck.
const sternbilder = JSON.parse(readFileSync('src/data/themes.json', 'utf8'))
  .find((th) => th.slug === 'constellations')
  .words.map((w) => w.toUpperCase());
const traegtStern = (zeile) => sternbilder.some((s) => ohneNummer(zeile).split(/\s+/).join(' ').includes(s));
await seite.goto(`${URL_BASIS}?theme=mountains&mix=constellations&lang=en&seed=3&mut=0&words=2`, {
  waitUntil: 'networkidle',
});
await held.waitFor({ timeout: 10000 });
const mixZeilen = await seite.locator('ol li button').allInnerTexts();
pruefe(
  (await seite.locator('#thema-mix').inputValue()) === 'constellations' &&
    (await seite.locator('section p').first().innerText()).includes('MOUNTAINS X CONSTELLATIONS') &&
    mixZeilen.length === 20 &&
    mixZeilen.every(traegtStern),
  `Mix Berge x Sternbilder: 20 Namen mit Sternbild (${ohneNummer(mixZeilen[0] ?? '')})`,
);
await seite.getByRole('button', { name: 'ADRESSE KOPIEREN' }).click();
await seite.waitForTimeout(300);
const mixAdresse = await seite.evaluate(() => navigator.clipboard.readText());
pruefe(mixAdresse.includes('mix=constellations'), `Adresse traegt den Mix (${mixAdresse.split('?')[1]})`);
await seite.locator('#thema-mix').selectOption('');
await seite.waitForTimeout(300);
const ohneMix = await seite.locator('ol li button').allInnerTexts();
pruefe(!ohneMix.every(traegtStern), 'kein Mix fuehrt zu reinen Berg-Namen zurueck');

// 9h. Methoden, Ton, Filter und Klang. Was die Knoepfe tun, wird am Ergebnis
//     gemessen: Anfangsbuchstaben, Tonwoerter aus den ausgelieferten Daten,
//     Stabreim, absteigende Klangwerte - und alles muss im Permalink stehen.
const zusatzDaten = JSON.parse(readFileSync('src/data/modifiers.json', 'utf8'));
const zeilenOhneMarke = async () =>
  (await seite.locator('ol li button').allInnerTexts()).map((z) =>
    ohneNummer(z).replace(/\s+(\d+\s*)?(MUT)?$/, '').replace(/^★\s*/, '').trim(),
  );
await seite.goto(`${URL_BASIS}?theme=animals&lang=en&seed=4&mut=0&words=2&method=acronym&letters=sm`, {
  waitUntil: 'networkidle',
});
await held.waitFor({ timeout: 10000 });
const akronym = await zeilenOhneMarke();
pruefe(
  (await seite.locator('#thema-methode').inputValue()) === 'acronym' &&
    (await seite.locator('#thema-buchstaben').inputValue()) === 'SM' &&
    akronym.length > 5 &&
    akronym.every((z) => z.split(/\s+/).map((w) => w[0]).join('') === 'SM'),
  `Akronym SM: jedes Wort mit seinem Buchstaben (${akronym.length}, ${akronym[0]})`,
);
await seite.locator('#thema-buchstaben').fill('xq');
await seite.waitForTimeout(300);
pruefe(
  (await seite.locator('ol').innerText()).includes('KEINE WÖRTER'),
  'Akronym ohne passende Woerter sagt das in der Liste',
);

await seite.locator('#thema-methode').selectOption('coined');
await seite.waitForTimeout(400);
pruefe(
  (await seite.locator('section p').first().innerText()).includes('(COINED)') &&
    (await seite.locator('ol li button').count()) === 20,
  'Kunstwoerter: 20 Namen, Kopfzeile nennt die Methode',
);
await seite.locator('#thema-methode').selectOption('words');

await seite.locator('#filter-ton').selectOption('calm');
await seite.waitForTimeout(400);
const ruhig = new Set(
  ['adjectives', 'verbs', 'agents'].flatMap((rolle) => zusatzDaten.en[rolle].tones.calm.map((w) => w.toUpperCase())),
);
const ruhigeZeilen = await zeilenOhneMarke();
pruefe(
  ruhigeZeilen.length === 20 && ruhigeZeilen.every((z) => z.split(/\s+/).some((w) => ruhig.has(w))),
  `Ton RUHIG: jeder Name traegt ein ruhiges Wort (${ruhigeZeilen[0]})`,
);

await seite.locator('#filter-anfang').fill('s');
await seite.waitForTimeout(400);
const sZeilen = await zeilenOhneMarke();
pruefe(
  sZeilen.length > 0 && sZeilen.every((z) => z.startsWith('S')) &&
    (await seite.locator('body').innerText()).includes('PASSEN'),
  `Filter ANFANG S: ${sZeilen.length} Namen, alle mit S`,
);
await seite.locator('#filter-anfang').fill('');
await seite.getByRole('button', { name: 'STABREIM', exact: true }).click();
await seite.waitForTimeout(400);
const stabreim = await zeilenOhneMarke();
pruefe(
  stabreim.length === 20 && stabreim.every((z) => new Set(z.split(/\s+/).map((w) => w[0])).size === 1),
  `STABREIM: 20 Namen, alle gleich anlautend (${stabreim[0]})`,
);
await seite.getByRole('button', { name: 'STABREIM', exact: true }).click();
await seite.getByRole('button', { name: 'NACH KLANG', exact: true }).click();
await seite.waitForTimeout(400);
const klangWerte = (await seite.locator('ol li .rang-marke').allInnerTexts()).map((z) => Number.parseInt(z, 10));
pruefe(
  klangWerte.length === 20 &&
    klangWerte.every((w) => Number.isFinite(w)) &&
    klangWerte.every((w, i) => i === 0 || klangWerte[i - 1] >= w),
  `NACH KLANG: Werte absteigend (${klangWerte.slice(0, 4).join(', ')} ...)`,
);
await seite.getByRole('button', { name: 'ADRESSE KOPIEREN' }).click();
await seite.waitForTimeout(300);
const filterAdresse = await seite.evaluate(() => navigator.clipboard.readText());
pruefe(
  filterAdresse.includes('tone=calm') && filterAdresse.includes('sort=1'),
  `Adresse traegt Ton und Sortierung (${filterAdresse.split('?')[1]})`,
);
const vorFilterLink = await seite.locator('ol li').allInnerTexts();
await seite.goto(filterAdresse, { waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
await seite.waitForTimeout(400);
pruefe(
  JSON.stringify(await seite.locator('ol li').allInnerTexts()) === JSON.stringify(vorFilterLink),
  'Permalink mit Ton und Sortierung liefert denselben Stapel',
);

// 9i. Merkliste als Datei: EXPORT laedt eine Datei im Format der TUI herunter,
//     IMPORT liest sie wieder ein. Beides ohne Netz - gemessen wird, dass
//     dabei keine Anfrage die Seite verlaesst.
await seite.goto(`${URL_BASIS}?theme=animals&lang=en&seed=4&mut=0&words=2`, { waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
await seite.waitForTimeout(1500);
await seite.locator('body').press('f');
await seite.waitForTimeout(300);
await seite.locator('ul li button').filter({ hasText: 'MERKLISTE' }).click();
const anfragenVorher = anfragen.length;
const [download] = await Promise.all([
  seite.waitForEvent('download'),
  seite.getByRole('button', { name: 'EXPORT', exact: true }).click(),
]);
const exportPfad = await download.path();
const exportDaten = JSON.parse(readFileSync(exportPfad, 'utf8'));
pruefe(
  download.suggestedFilename() === 'codename-merkliste.json' &&
    Array.isArray(exportDaten.favorites) &&
    exportDaten.favorites.length === 1 &&
    typeof exportDaten.favorites[0].source_words?.[0] === 'string',
  `EXPORT schreibt die Merkliste im TUI-Format (${download.suggestedFilename()})`,
);
await seite.locator('body').press('f');
await seite.waitForTimeout(300);
pruefe((await seite.locator('ol li button').count()) === 0, 'Merkliste nach dem Entfernen leer');
await seite.locator('input[type="file"]').setInputFiles(exportPfad);
await seite.waitForTimeout(400);
const nachImport = await messeSpuren();
pruefe(
  (await seite.locator('ol li button').count()) === 1 &&
    JSON.stringify(nachImport.schluessel) === '["codename-generator.merkliste"]',
  `IMPORT stellt die Merkliste wieder her (local ${nachImport.schluessel})`,
);
pruefe(
  anfragen.slice(anfragenVorher).every((a) => a.startsWith(new URL(URL_BASIS).origin)),
  `Export und Import schicken nichts ins Netz (${anfragen.length - anfragenVorher} Anfragen, alle lokal)`,
);
await seite.locator('body').press('f');
await seite.waitForTimeout(300);

await seite.goto(
  `${URL_BASIS}?word=Sitemap&lang=en&seed=9&mut=0&partner=constellations&pos=back`,
  { waitUntil: 'networkidle' },
);
await held.waitFor({ timeout: 10000 });

await seite.setViewportSize({ width: 1280, height: 700 });
await seite.getByRole('button', { name: '40', exact: true }).click();
await seite.waitForTimeout(500);
const ankerUeberstand = await seite.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight,
);
pruefe(
  ankerUeberstand <= 2,
  `kein Seitenscroll in der Anker-Ansicht bei 1280x700 (Ueberstand ${ankerUeberstand}px)`,
);
await seite.setViewportSize({ width: 1400, height: 1000 });

// 10. Rechtsseiten und Sprachfassungen. Die Pflichtangaben muessen von der
//     Startseite aus in einem Klick erreichbar sein - Rechtstexte, die man
//     nur ueber die Adresszeile findet, erfuellen § 5 DDG nicht.
for (const [name, muster] of [
  ['IMPRESSUM', /§ 5 DDG/],
  ['DATENSCHUTZ', /DSGVO/],
]) {
  await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });
  await seite.getByRole('link', { name, exact: true }).click();
  await seite.waitForLoadState('networkidle');
  const text = await seite.locator('body').innerText();
  pruefe(muster.test(text), `${name} erreichbar und traegt ${muster}`);
  pruefe(
    text.includes('Kurze Str. 2') || text.includes('Michael Blaess'),
    `${name} nennt den Verantwortlichen`,
  );
}

// Sprachumschalter: von der deutschen Startseite nach /en/ und zurueck.
await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });
pruefe(
  (await seite.locator('html').getAttribute('lang')) === 'de',
  'die deutsche Fassung traegt lang="de"',
);
await seite.getByRole('link', { name: 'ENGLISH', exact: true }).click();
await seite.waitForLoadState('networkidle');
await held.waitFor({ timeout: 10000 });
const enLang = await seite.locator('html').getAttribute('lang');
const enKopf = await seite.locator('#statuszeile').locator('xpath=..').innerText();
pruefe(enLang === 'en', `Umschalter fuehrt auf die englische Fassung (lang="${enLang}")`);
pruefe(/THEMES/.test(enKopf), `englische Kopfzeile: "${enKopf.replace(/\s+/g, ' ').trim()}"`);
pruefe(
  (await seite.getByRole('button', { name: 'NEW ROUND' }).count()) === 1,
  'englische Beschriftung im Bedienfeld',
);

// 10b. Der Musikknopf. Drei Aussagen stehen auf dem Spiel: er laedt nichts
//      ungefragt, er spielt nach dem Klick wirklich, und ohne ausgelieferte
//      Datei taucht er gar nicht erst auf (fail-closed wie in geo-finder).
await seite.setViewportSize({ width: 1400, height: 900 });
await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
// Ueber ein Datenattribut statt ueber die Beschriftung: die wechselt beim
// Klick auf "MUSIK AUS" und ein Namensmuster faende den Knopf danach nicht.
const musikKnopf = seite.locator('[data-rolle="musik"]');
const knopfDa = (await musikKnopf.count()) === 1;
pruefe(knopfDa, 'Musikknopf ist da (Datei wird ausgeliefert)');

if (knopfDa) {
  // Eine Anfrage gibt es vor dem Klick: die HEAD-Pruefung, ob die Datei
  // ueberhaupt ausgeliefert wird. Die uebertraegt keine Musik. Gemessen wird
  // deshalb die uebertragene Menge, nicht die Zahl der Anfragen.
  const vorher = await seite.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => /bit-space/.test(e.name))
      .reduce((summe, e) => summe + (e.transferSize || 0), 0),
  );
  pruefe(vorher < 5000, `vor dem Klick fliessen keine Musikdaten (${vorher} Bytes)`);

  // Der Knopf blinkt, bis er einmal benutzt wurde - sonst uebersieht man ihn.
  pruefe(
    ((await musikKnopf.getAttribute('class')) ?? '').includes('lockt'),
    'Musikknopf blinkt, bevor er benutzt wurde',
  );

  await musikKnopf.click();
  await seite.waitForTimeout(1500);
  pruefe(
    !((await musikKnopf.getAttribute('class')) ?? '').includes('lockt'),
    'nach dem ersten Klick blinkt er nicht mehr',
  );
  const zustand = await seite.evaluate(() => {
    const ton = document.querySelector('audio');
    return ton ? { pausiert: ton.paused, zeit: ton.currentTime, quelle: ton.currentSrc } : null;
  });
  pruefe(
    zustand !== null && !zustand.pausiert && zustand.zeit > 0,
    `nach dem Klick laeuft die Musik (Zeit ${zustand?.zeit.toFixed(2)}s, Quelle ${(zustand?.quelle ?? '').split('/').pop()})`,
  );
}

// Fail-closed: eine Seite ohne ausgelieferte Musik zeigt keinen Knopf. Statt
// die Dateien zu loeschen, werden die Anfragen darauf abgewiesen.
const ohneMusik = await kontext.newPage();
await ohneMusik.route('**/musik/*', (weg) => weg.abort());
await ohneMusik.goto(URL_BASIS, { waitUntil: 'networkidle' });
await ohneMusik.waitForTimeout(1200);
pruefe(
  (await ohneMusik.locator('[data-rolle="musik"]').count()) === 0,
  'ohne ausgelieferte Musik erscheint kein Knopf',
);
await ohneMusik.close();

// 11. Die Raumschiffe in den Raendern. Drei Dinge koennen still brechen: der
//     Astro-Scope frisst die Klassen (dann fliegt nichts), das Schiff haengt
//     ueber dem Inhalt, oder die Wende passiert ausserhalb des Bildes.
await seite.setViewportSize({ width: 1600, height: 900 });
await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });

const bisSchiff = Date.now() + 15000;
while (Date.now() < bisSchiff && (await seite.locator('.schiff').count()) === 0) {
  await seite.waitForTimeout(200);
}
const schiffDa = (await seite.locator('.schiff').count()) > 0;
pruefe(schiffDa, 'ein Raumschiff startet im freien Rand');

if (schiffDa) {
  const standSchiff = async () =>
    await seite.evaluate(() => {
      const el = document.querySelector('.schiff');
      if (!el) return null;
      const lauf = el.getAnimations().find((a) => a.animationName === 'flug');
      const k = el.getBoundingClientRect();
      return {
        anteil: (lauf?.currentTime ?? 0) / (lauf?.effect?.getTiming()?.duration ?? 1),
        scaleY: new DOMMatrixReadOnly(getComputedStyle(el).transform).d,
        x: k.x,
        breite: k.width,
        y: k.y,
      };
    });

  const kasten = await seite.locator('.bildschirm').boundingBox();
  const jetzt = await standSchiff();
  pruefe(
    jetzt.x + jetzt.breite <= kasten.x + 1 || jetzt.x >= kasten.x + kasten.width - 1,
    `fliegt neben dem Bildschirmkasten (Schiff ${Math.round(jetzt.x)}..${Math.round(jetzt.x + jetzt.breite)}, Kasten ${Math.round(kasten.x)}..${Math.round(kasten.x + kasten.width)})`,
  );

  // Die Wende abpassen und belegen: aufrecht, Strich, kopfueber - und das
  // alles im sichtbaren Bereich.
  let wende = await standSchiff();
  while (wende && wende.anteil < 0.465) {
    await seite.waitForTimeout(60);
    wende = await standSchiff();
  }
  pruefe(
    wende !== null && Math.abs(wende.scaleY) < 0.9 && wende.y > -10 && wende.y < 120,
    `Wende sichtbar am oberen Rand (scaleY ${wende?.scaleY.toFixed(2)}, y ${Math.round(wende?.y ?? -999)})`,
  );

  let ab = await standSchiff();
  while (ab && ab.anteil < 0.62) {
    await seite.waitForTimeout(150);
    ab = await standSchiff();
  }
  pruefe(
    ab !== null && ab.scaleY < -0.9,
    `sinkt danach kopfueber (scaleY ${ab?.scaleY.toFixed(2)}) - das Schiff ueberlebt seinen Rollflug`,
  );
}

// 11b. Schiffe duerfen sich nicht durchdringen. Die Sperre laesst pro Seite
//      nur ein Schiff zu - hier wird das Ergebnis gemessen, nicht die Regel:
//      25 Sekunden lang alle Schiffe paarweise auf Ueberschneidung pruefen.
let ueberschneidungen = 0;
let meisten = 0;
let leerSeit = null;
let laengsteLeere = 0;
const wacheBis = Date.now() + 25000;
while (Date.now() < wacheBis) {
  const kaesten = await seite.evaluate(() =>
    [...document.querySelectorAll('.schiff')].map((el) => {
      const k = el.getBoundingClientRect();
      return { x: k.x, y: k.y, w: k.width, h: k.height };
    }),
  );
  const irgendeins = kaesten.length + (await seite.locator('.duell-schiff').count());
  if (irgendeins === 0) {
    leerSeit ??= Date.now();
    laengsteLeere = Math.max(laengsteLeere, Date.now() - leerSeit);
  } else {
    leerSeit = null;
  }
  meisten = Math.max(meisten, kaesten.length);
  for (let i = 0; i < kaesten.length; i++) {
    for (let j = i + 1; j < kaesten.length; j++) {
      const a = kaesten[i];
      const b = kaesten[j];
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        ueberschneidungen++;
      }
    }
  }
  await seite.waitForTimeout(250);
}
pruefe(
  ueberschneidungen === 0,
  `keine Kollision in 25 s (${ueberschneidungen} Ueberschneidungen, hoechstens ${meisten} Schiffe gleichzeitig)`,
);
// Vorher lagen bis zu 26 s zwischen zwei Starts - zehn Sekunden leerer Himmel.
pruefe(laengsteLeere <= 5000, `keine lange Pause ohne Schiff (laengste ${(laengsteLeere / 1000).toFixed(1)} s)`);

// 11d. Gefecht: oben ein Schiff mit der Nase nach unten, unten eines mit der
//      Nase nach oben, Schuesse dazwischen, am Ende ein Treffer oder der
//      Rueckzug - und alles im freien Rand. Das Ereignis startet es sofort,
//      aber nur auf einer freien Seite, daher der Wiederholversuch.
// Verfolgt wird genau ein Gefecht, und zwar eines, das der Test selbst
// ausgeloest hat - ein zufaellig laufendes kann schon ein Schiff verloren haben.
const hoechsteKennung = () =>
  seite.evaluate(() =>
    Math.max(0, ...[...document.querySelectorAll('[data-gefecht]')].map((el) => Number(el.dataset.gefecht))),
  );
const kennungVorher = await hoechsteKennung();
const bisGefecht = Date.now() + 20000;
while (Date.now() < bisGefecht && (await hoechsteKennung()) <= kennungVorher) {
  await seite.evaluate(() => document.dispatchEvent(new Event('raumschiffe:gefecht')));
  await seite.waitForTimeout(400);
}
const neu = await hoechsteKennung();
const kennung = neu > kennungVorher ? String(neu) : '';
const imGefecht = `[data-gefecht="${kennung}"]`;
const gefechtDa = kennung !== '' && (await seite.locator(`.duell-schiff${imGefecht}`).count()) === 2;
pruefe(gefechtDa, `ein Gefecht startet mit zwei Schiffen (Gefecht ${kennung || '-'})`);
if (gefechtDa) {
  const kastenGefecht = await seite.locator('.bildschirm').boundingBox();
  const hoeheFenster = seite.viewportSize().height;
  let schuesseGesehen = 0;
  let splitterGesehen = 0;
  let imKasten = 0;
  let lage = null;
  let ersteLuecke = null;
  let kleinsteLuecke = Infinity;
  let beruehrt = 0;
  let beruehrtNachTreffer = 0;
  const bisEnde = Date.now() + 30000;
  while (Date.now() < bisEnde) {
    const stand = await seite.evaluate((sel) => ({
      schiffe: [...document.querySelectorAll(`.duell-schiff${sel}`)].map((el) => {
        const k = el.getBoundingClientRect();
        return { rolle: el.dataset.rolle, x: k.x, y: k.y, w: k.width, h: k.height, dreh: new DOMMatrixReadOnly(getComputedStyle(el).transform).a, getroffen: el.classList.contains('getroffen') };
      }),
      schuesse: [...document.querySelectorAll(`.schuss${sel}`)].map((el) => el.getBoundingClientRect().x),
      splitter: document.querySelectorAll(`.splitter${sel}`).length,
    }), imGefecht);
    if (stand.schiffe.length === 0 && stand.schuesse.length === 0 && stand.splitter === 0) break;
    schuesseGesehen = Math.max(schuesseGesehen, stand.schuesse.length);
    splitterGesehen = Math.max(splitterGesehen, stand.splitter);
    for (const s of stand.schiffe) {
      if (s.x + s.w > kastenGefecht.x + 1 && s.x < kastenGefecht.x + kastenGefecht.width - 1) imKasten++;
    }
    for (const x of stand.schuesse) {
      if (x > kastenGefecht.x && x < kastenGefecht.x + kastenGefecht.width) imKasten++;
    }
    if (stand.schiffe.length === 2) {
      const [a, b] = stand.schiffe;
      const o = a.rolle === 'oben' ? a : b;
      const u = a.rolle === 'oben' ? b : a;
      const luecke = u.y - (o.y + o.h);
      if (o.y > 0 && ersteLuecke === null) ersteLuecke = luecke;
      kleinsteLuecke = Math.min(kleinsteLuecke, luecke);
      if (a.x < b.x + b.w - 4 && a.x + a.w - 4 > b.x && a.y < b.y + b.h - 4 && a.y + a.h - 4 > b.y) {
        beruehrt++;
        if (a.getroffen || b.getroffen) beruehrtNachTreffer++;
      }
    }
    if (lage === null && stand.schiffe.length === 2) {
      const oben = stand.schiffe.find((s) => s.rolle === 'oben');
      const unten = stand.schiffe.find((s) => s.rolle === 'unten');
      if (oben.y > 0 && unten.y + unten.h < hoeheFenster) lage = { oben, unten };
    }
    await seite.waitForTimeout(100);
  }
  const reste = await seite.locator(`${imGefecht}`).count();
  pruefe(
    lage !== null &&
      lage.oben.y < hoeheFenster * 0.2 &&
      lage.unten.y > hoeheFenster * 0.7 &&
      lage.oben.dreh < -0.9 &&
      lage.unten.dreh > 0.9,
    `oben kopfueber, unten aufrecht (oben y ${Math.round(lage?.oben.y ?? -1)}, unten y ${Math.round(lage?.unten.y ?? -1)})`,
  );
  pruefe(schuesseGesehen > 0, `es wird geschossen (bis zu ${schuesseGesehen} Schuesse gleichzeitig)`);
  // Kein Pong: die Schiffe muessen sich naeher kommen, ohne sich zu beruehren.
  pruefe(
    // Bei Pong bliebe der Abstand gleich. Faellt der Treffer frueh, kommen
    // sich die Schiffe nicht bis zur Begegnung nahe - 150 px reichen als Beleg.
    ersteLuecke !== null && kleinsteLuecke < ersteLuecke - 150,
    `Schiffe fliegen aufeinander zu (Abstand ${Math.round(ersteLuecke ?? -1)} -> ${Math.round(kleinsteLuecke)} px)`,
  );
  pruefe(beruehrt === 0, `Schiffe beruehren sich nie (${beruehrt} Messungen, davon ${beruehrtNachTreffer} mit einem abgeschossenen Schiff)`);
  pruefe(imKasten === 0, `Gefecht bleibt im Rand (${imKasten} Messungen ueber dem Kasten)`);
  pruefe(reste === 0, `Gefecht raeumt auf (${reste} Reste), Splitter gesehen: ${splitterGesehen}`);
}

// 11c. Der Cursor hinter READY. ist eine volle Zeichenzelle, wie auf dem C64 -
//      er war schon einmal schmaler als die Schrift daneben.
// Gemessen wird gegen die TINTE der Glyphen, nicht gegen die Zeilenhoehe.
// Genau daran ist die erste Fassung gescheitert: Zeilenhoehe und Cursor
// waren beide 8px, trotzdem sass der Block sichtbar zu tief, weil die
// Grossbuchstaben von Press Start 2P 1px ueber der Grundlinie enden.
// Gezaehlt werden die GEMALTEN Bildzeilen, nicht Schriftmetriken. Zwei
// Anlaeufe ueber measureText sahen rechnerisch richtig aus und wirkten im
// Browser trotzdem zu klein - Rundung beim Rastern schlaegt jede Metrik.
// Der goldene Block muss die gruene Schrift vollstaendig einschliessen.
await seite.evaluate(() => {
  const stil = document.createElement('style');
  stil.id = 'blinker-anhalten';
  stil.textContent = '.blinker::after { animation: none !important; }';
  document.head.appendChild(stil);
});
const statusKasten = await seite.locator('#statuszeile').boundingBox();
const statusBild = await seite.screenshot({
  clip: {
    x: statusKasten.x - 2,
    y: statusKasten.y - 5,
    width: statusKasten.width + 12,
    height: statusKasten.height + 10,
  },
});
const zeilen = await seite.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const gruen = [];
  const gold = [];
  for (let y = 0; y < c.height; y++) {
    let hatGruen = false;
    let hatGold = false;
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      if (g > 120 && r < 160 && b < 120) hatGruen = true;
      if (r > 180 && g > 120 && b < 110) hatGold = true;
    }
    if (hatGruen) gruen.push(y);
    if (hatGold) gold.push(y);
  }
  return { gruen, gold };
}, statusBild.toString('base64'));
await seite.evaluate(() => document.getElementById('blinker-anhalten')?.remove());
const g = zeilen.gruen;
const c = zeilen.gold;
pruefe(
  g.length > 0 && c.length > 0 && c[0] <= g[0] && c[c.length - 1] >= g[g.length - 1],
  `Cursor schliesst die Schrift ein (Schrift Zeile ${g[0]}..${g[g.length - 1]}, Cursor ${c[0]}..${c[c.length - 1]})`,
);

// Das Schiff darf nach der Kippung nicht gedrungen wirken: das gezeichnete
// Verhaeltnis muss dem Entwurf von 48 zu 38 nahekommen. Gemessen wird der
// GEKIPPTE Koerper, nicht der Elternknoten - der bleibt unveraendert und
// haette den Fehler verdeckt.
const koerper = await seite.locator('.schiffkoerper').first().boundingBox();
if (koerper) {
  const verhaeltnis = koerper.width / koerper.height;
  pruefe(
    Math.abs(verhaeltnis - 48 / 38) < 0.2,
    `Schiffsverhaeltnis ${verhaeltnis.toFixed(2)} (Entwurf ${(48 / 38).toFixed(2)})`,
  );
}

// Schmaler Schirm und reduzierte Bewegung: nichts fliegt.
const eng = await kontext.newPage();
await eng.setViewportSize({ width: 1200, height: 800 });
await eng.goto(URL_BASIS, { waitUntil: 'networkidle' });
await eng.waitForTimeout(8000);
pruefe(
  (await eng.locator('.schiff').count()) === 0 && !(await eng.locator('.flugfeld').isVisible()),
  'bei 1200px bleibt das Flugfeld leer',
);
await eng.close();

const still = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  reducedMotion: 'reduce',
});
const stillSeite = await still.newPage();
await stillSeite.goto(URL_BASIS, { waitUntil: 'networkidle' });
await stillSeite.waitForTimeout(8000);
pruefe(
  (await stillSeite.locator('.schiff').count()) === 0,
  'prefers-reduced-motion: keine Raumschiffe',
);
await still.close();

await browser.close();

if (fehler.length > 0) {
  console.error(`\n${fehler.length} Problem(e):`);
  for (const f of fehler) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\nalles gruen');
