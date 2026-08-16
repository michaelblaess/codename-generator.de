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

const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK  ' : 'FAIL'} ${text}`);
  if (!bedingung) fehler.push(text);
};

await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });

// 0. Auf der richtigen Seite gelandet? Ein belegter Port schickt den Test sonst
//    klaglos gegen ein fremdes Projekt.
pruefe((await seite.title()).includes('Codename'), 'richtige Seite geladen');

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
pruefe(themen.includes('Swatch'), 'neutrales Thema bleibt in beiden Sprachen');

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
await browser.close();

if (fehler.length > 0) {
  console.error(`\n${fehler.length} Problem(e):`);
  for (const f of fehler) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\nalles gruen');
