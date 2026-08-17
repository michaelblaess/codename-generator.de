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

// 9. Die Datenschutzerklaerung behauptet: keine Cookies, kein Speicher. Das
//    muss messbar sein, sonst steht dort eine unwahre Aussage.
await seite.setViewportSize({ width: 1400, height: 1000 });
await seite.goto(URL_BASIS, { waitUntil: 'networkidle' });
await held.waitFor({ timeout: 10000 });
await seite.getByRole('button', { name: 'NEUE RUNDE' }).click();
await seite.waitForTimeout(400);
const spuren = await seite.evaluate(() => ({
  cookies: document.cookie,
  lokal: window.localStorage.length,
  sitzung: window.sessionStorage.length,
}));
pruefe(
  spuren.cookies === '' && spuren.lokal === 0 && spuren.sitzung === 0,
  `keine Cookies, kein Speicher (cookie "${spuren.cookies}", local ${spuren.lokal}, session ${spuren.sitzung})`,
);

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
const wacheBis = Date.now() + 25000;
while (Date.now() < wacheBis) {
  const kaesten = await seite.evaluate(() =>
    [...document.querySelectorAll('.schiff')].map((el) => {
      const k = el.getBoundingClientRect();
      return { x: k.x, y: k.y, w: k.width, h: k.height };
    }),
  );
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

// 11c. Der Cursor hinter READY. ist eine volle Zeichenzelle, wie auf dem C64 -
//      er war schon einmal schmaler als die Schrift daneben.
// Gemessen wird gegen die TINTE der Glyphen, nicht gegen die Zeilenhoehe.
// Genau daran ist die erste Fassung gescheitert: Zeilenhoehe und Cursor
// waren beide 8px, trotzdem sass der Block sichtbar zu tief, weil die
// Grossbuchstaben von Press Start 2P 1px ueber der Grundlinie enden.
const zelle = await seite.evaluate(() => {
  const feld = document.getElementById('statuszeile');
  const stil = getComputedStyle(feld);
  const bild = document.createElement('canvas').getContext('2d');
  bild.font = `${stil.fontSize} ${stil.fontFamily}`;
  const m = bild.measureText('READY.');
  const nach = getComputedStyle(feld.querySelector('.blinker'), '::after');
  return {
    tinteHoehe: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    unterkante: -m.actualBoundingBoxDescent,
    zeichen: bild.measureText('M').width,
    breite: parseFloat(nach.width),
    hoehe: parseFloat(nach.height),
    versatz: parseFloat(nach.verticalAlign),
  };
});
pruefe(
  Math.abs(zelle.breite - zelle.zeichen) < 0.6 &&
    Math.abs(zelle.hoehe - zelle.tinteHoehe) < 0.6 &&
    Math.abs(zelle.versatz - zelle.unterkante) < 0.6,
  `Cursor deckt die Buchstabenhoehe (${zelle.breite}x${zelle.hoehe}px bei ${zelle.versatz}px ueber der Grundlinie, Tinte ${zelle.tinteHoehe}px ab ${zelle.unterkante}px)`,
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
