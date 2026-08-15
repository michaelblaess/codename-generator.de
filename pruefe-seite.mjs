// Smoketest gegen den Preview-Server. Der Build beweist nur Syntax - ob die
// React-Insel haengt, der Retro-Effekt den Text frisst oder der Permalink den
// Stapel nicht reproduziert, zeigt erst der echte Browser.
//
// Voraussetzung, einmalig, ohne erneuten Browser-Download:
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core
//
// Aufruf bei laufendem `npm run preview`:
//   node pruefe-seite.mjs
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const CACHE = `${process.env.LOCALAPPDATA}/ms-playwright`;
const shell = readdirSync(CACHE)
  .filter((n) => n.startsWith('chromium_headless_shell-'))
  .sort()
  .at(-1);
const EXE = `${CACHE}/${shell}/chrome-headless-shell-win64/chrome-headless-shell.exe`.replace(/\\/g, '/');
const URL_BASIS = process.env.SMOKE_URL ?? 'http://localhost:4321/';

const browser = await chromium.launch({ executablePath: EXE });
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const fehler = [];
seite.on('pageerror', (e) => fehler.push(`pageerror: ${e.message}`));
seite.on('console', (m) => {
  if ('error' === m.type()) fehler.push(`console: ${m.text()}`);
});

const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK  ' : 'FAIL'} ${text}`);
  if (!bedingung) fehler.push(text);
};

await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });

// 1. Die Insel rendert ueberhaupt.
const zeilen = seite.locator('ul >> nth=1 >> li');
await zeilen.first().waitFor({ timeout: 10000 });
pruefe((await zeilen.count()) === 20, `20 Vorschlaege gerendert (${await zeilen.count()})`);

const ersterName = (await zeilen.first().locator('button').first().innerText()).trim();
pruefe(ersterName.length > 0, `erster Name nicht leer: "${ersterName}"`);

// 2. Regenerate liefert einen anderen Stapel - und laesst den Text stehen.
await seite.getByRole('button', { name: 'Regenerate' }).click();
await seite.waitForTimeout(2500); // Effekt durchlaufen lassen
const nachRegen = (await zeilen.first().locator('button').first().innerText()).trim();
pruefe(nachRegen.length > 0, `nach Regenerate Text vorhanden: "${nachRegen}"`);
pruefe(nachRegen !== ersterName, 'Regenerate erzeugt einen neuen Stapel');
pruefe(!/[░▒▓█]/.test(nachRegen), 'kein Effekt-Glyph im Endzustand haengengeblieben');

// 3. Sprachwechsel: deutsche Themes erscheinen, englische verschwinden.
await seite.selectOption('select >> nth=0', 'de');
await seite.waitForTimeout(400);
const themenListe = await seite.locator('ul >> nth=0 >> li').allInnerTexts();
const themen = themenListe.join(' | ');
pruefe(themen.includes('Tierwelt'), 'Tierwelt im deutschen Modus sichtbar');
pruefe(!themen.includes('Dangerous Animals'), 'englisches Theme im deutschen Modus ausgeblendet');
pruefe(themen.includes('Swatch'), 'neutrales Theme bleibt in beiden Sprachen');

// 4. Deutsche Flexion im echten DOM.
await seite.getByRole('button', { name: /Tierwelt/ }).click();
await seite.waitForTimeout(2500);
const deutsch = await zeilen.allInnerTexts();
const zweiwort = deutsch.map((t) => t.split('\n')[1] ?? '').filter((n) => n.split(' ').length === 2);
pruefe(zweiwort.length > 0, `deutsche Zweiwort-Namen vorhanden (${zweiwort.length})`);
// Nur vorangestellte Modifier werden gebeugt - "Falke Bote" (theme-agent) zaehlt nicht.
const gebeugt = zweiwort.filter((n) => /^\S+(er|es|e)\s/.test(n));
pruefe(gebeugt.length > 0, `Modifier gebeugt, Beispiel: "${gebeugt[0] ?? '(keins)'}"`);

// 5. Permalink reproduziert exakt denselben Stapel.
const seedText = await seite.locator('p', { hasText: 'seed' }).first().innerText();
const seed = seedText.match(/seed (\d+)/)?.[1];
pruefe(Boolean(seed), `Seed in der Kopfzeile sichtbar: ${seed}`);
const vorher = await zeilen.allInnerTexts();
await seite.goto(`${URL_BASIS}?theme=tierwelt&lang=de&seed=${seed}&mut=0&words=2`, {
  waitUntil: 'networkidle',
});
await zeilen.first().waitFor({ timeout: 10000 });
const nachher = await zeilen.allInnerTexts();
pruefe(
  JSON.stringify(vorher) === JSON.stringify(nachher),
  'Permalink liefert denselben Stapel',
);

await seite.screenshot({ path: 'smoke.png', fullPage: true });
await browser.close();

if (fehler.length > 0) {
  console.error(`\n${fehler.length} Problem(e):`);
  for (const f of fehler) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\nalles gruen');
