// Smoketest gegen den laufenden Server. Der Build beweist nur Syntax - ob die
// React-Insel haengt, die Schrift still auf einen Fallback faellt oder der
// Permalink den Stapel nicht reproduziert, zeigt erst der echte Browser.
//
// Voraussetzung, einmalig, ohne erneuten Browser-Download:
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core
//
// Aufruf bei laufendem Server (Port aus dessen Startlog nehmen, Astro weicht
// bei belegtem Port aus):
//   SMOKE_URL=http://localhost:4400/codename-generator.de/ node pruefe-seite.mjs
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

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

// 1. Die Insel rendert.
const zeilen = seite.locator('ol li');
await zeilen.first().waitFor({ timeout: 10000 });
pruefe((await zeilen.count()) === 20, `20 Zeilen gedruckt (${await zeilen.count()})`);

const ersterName = (await zeilen.first().locator('button').first().innerText()).trim();
pruefe(ersterName.length > 0, `erster Name nicht leer: "${ersterName}"`);

// 2. Die Schrift liegt wirklich an. Faellt sie auf einen Fallback zurueck,
//    zerfaellt der ganze Entwurf - und man sieht es im Build nicht.
pruefe(
  await seite.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px PlexMono');
  }),
  'PlexMono geladen',
);

// 3. Der Druckkopf laeuft, ohne die Schaltflaechen zu zerstoeren. Genau daran
//    scheiterte die Bibliotheksvariante: print() setzt den Textinhalt neu.
const knoepfeVorher = await seite.locator('ol button').count();
await seite.getByRole('button', { name: 'NEUER STAPEL' }).click();
await seite.waitForTimeout(120);
const kopfSichtbar = await seite.locator('.druckkopf').count();
await seite.waitForTimeout(1200);
pruefe(kopfSichtbar === 1, 'Druckkopf steht waehrend des Laufs auf einer Zeile');
pruefe(
  (await seite.locator('ol button').count()) === knoepfeVorher,
  `Schaltflaechen ueberleben den Druck (${knoepfeVorher})`,
);
const nachRegen = (await zeilen.first().locator('button').first().innerText()).trim();
pruefe(nachRegen !== ersterName, 'Neuer Stapel erzeugt andere Namen');
pruefe((await seite.locator('ol li:visible').count()) === 20, 'am Ende sind alle Zeilen sichtbar');

// 4. Sprachwechsel filtert die Themen.
await seite.getByRole('button', { name: 'Deutsch' }).click();
await seite.waitForTimeout(400);
const themen = (await seite.locator('aside ul li').allInnerTexts()).join(' | ');
pruefe(themen.includes('Tierwelt'), 'Tierwelt im deutschen Modus sichtbar');
pruefe(!themen.includes('Dangerous Animals'), 'englisches Thema ausgeblendet');
pruefe(themen.includes('Swatch'), 'neutrales Thema bleibt in beiden Sprachen');

// 5. Deutsche Flexion im echten DOM.
await seite.getByRole('button', { name: /Tierwelt/ }).click();
await seite.waitForTimeout(1200);
const namen = await zeilen.locator('button').first().allInnerTexts();
const zweiwort = namen.filter((n) => n.split(' ').length === 2);
const gebeugt = zweiwort.filter((n) => /^\S+(er|es|e)\s/.test(n));
pruefe(gebeugt.length > 0, `Modifier gebeugt, Beispiel: "${gebeugt[0] ?? '(keins)'}"`);

// 6. Permalink reproduziert denselben Stapel.
const stapel = await seite.locator('header ~ div span, div span').first().innerText();
const seedText = await seite.locator('text=/STAPEL \\d{4}/').first().innerText();
pruefe(Boolean(seedText), `Stapelnummer sichtbar: ${seedText || stapel}`);
const vorher = await zeilen.allInnerTexts();
await seite.getByRole('button', { name: 'LINK ZU DIESEM STAPEL' }).click();
await seite.waitForTimeout(200);
const link = await seite.evaluate(() => navigator.clipboard.readText().catch(() => ''));
if (link) {
  await seite.goto(link, { waitUntil: 'networkidle' });
  await zeilen.first().waitFor({ timeout: 10000 });
  await seite.waitForTimeout(400);
  pruefe(
    JSON.stringify(await zeilen.allInnerTexts()) === JSON.stringify(vorher),
    'Permalink liefert denselben Stapel',
  );
} else {
  pruefe(false, 'Permalink liess sich nicht aus der Zwischenablage lesen');
}

await seite.screenshot({ path: 'smoke.png', fullPage: true });
await browser.close();

if (fehler.length > 0) {
  console.error(`\n${fehler.length} Problem(e):`);
  for (const f of fehler) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\nalles gruen');
