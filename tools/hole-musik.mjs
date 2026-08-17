/*
 * Holt die Hintergrundmusik zur Build-Zeit nach public/musik/.
 *
 * Warum nicht ins Repo legen: fremde Musik gehoert nicht mit ausgeliefert.
 * Wer den Quellcode klont, bekommt keine Musikdateien. Aendert sich die
 * Rechtelage, trifft das die Bezugsquelle und nicht jeden Klon. Dasselbe
 * Vorgehen wie in geo-finder.
 *
 * Fehlt die Datei, ist das KEIN Fehler: die Seite zeigt dann einfach keinen
 * Musikknopf. Deshalb endet dieses Skript auch bei einem Netzfehler mit
 * Rueckgabewert 0 - ein Deploy soll daran nicht scheitern.
 *
 * Aufruf:  node tools/hole-musik.mjs
 */

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, '..', 'public', 'musik');

/*
 * BIT SPACE (FTL Inspired) [LOOP] von Beam Theory, OGA-BY 3.0.
 * Quelle: https://opengameart.org/content/bit-space-ftl-inspired-loop-0
 * Der Nachweis steht in CREDITS.md und im Impressum der Seite - die Lizenz
 * verlangt die Namensnennung.
 */
const DATEIEN = [
  {
    name: 'bit-space.ogg',
    url: 'https://opengameart.org/sites/default/files/audio_preview/Bit%20Space%20%28loopable%29_2.mp3.ogg',
    mindestens: 1_000_000,
  },
  {
    name: 'bit-space.mp3',
    url: 'https://opengameart.org/sites/default/files/Bit%20Space%20%28loopable%29_2.mp3',
    mindestens: 3_000_000,
  },
];

mkdirSync(ZIEL, { recursive: true });

for (const datei of DATEIEN) {
  const pfad = join(ZIEL, datei.name);
  if (existsSync(pfad) && statSync(pfad).size >= datei.mindestens) {
    console.log(`${datei.name}: schon da (${statSync(pfad).size} Bytes)`);
    continue;
  }
  try {
    const antwort = await fetch(datei.url, {
      headers: { 'User-Agent': 'codename-generator.de build script' },
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const daten = Buffer.from(await antwort.arrayBuffer());
    // Groessenpruefung, damit eine Fehlerseite nicht als Musik durchgeht.
    if (daten.length < datei.mindestens) {
      throw new Error(`nur ${daten.length} Bytes, erwartet mindestens ${datei.mindestens}`);
    }
    writeFileSync(pfad, daten);
    console.log(`${datei.name}: ${daten.length} Bytes geholt`);
  } catch (fehler) {
    console.warn(`${datei.name}: nicht geholt (${fehler.message}) - die Seite laeuft ohne Musik`);
  }
}
