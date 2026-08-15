/**
 * Zieht die Wortlisten aus dem Python-Repo und schreibt sie als JSON nach
 * src/data/. Das YAML im Python-Repo bleibt die einzige Quelle - hier wird
 * nichts von Hand gepflegt.
 *
 * Aufruf:  npm run daten [-- <pfad-zum-python-repo>]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = resolve(HIER, '..', 'src', 'data');

// Fallback: das Python-Repo liegt als Geschwister-Ordner daneben.
const QUELLE = resolve(
  process.argv[2] ?? join(HIER, '..', '..', 'codename-generator'),
  'src',
  'codename_generator',
  'data',
);

const GENUS = new Set(['m', 'f', 'n', 'p']);

/** Zerlegt "Falke|m" in Wort und Genus. Ohne Marker bleibt das Genus leer. */
function splitGender(eintrag) {
  const index = String(eintrag).indexOf('|');
  if (index < 0) return [String(eintrag).trim(), ''];
  const wort = String(eintrag).slice(0, index).trim();
  const marker = String(eintrag).slice(index + 1).trim().toLowerCase();
  return [wort, GENUS.has(marker) ? marker : ''];
}

/** Liest eine Wortlisten-YAML und bringt sie in die Form, die der Generator erwartet. */
function leseListe(pfad, sprache) {
  const daten = parse(readFileSync(pfad, 'utf8'));
  const paare = (daten.words ?? []).map(splitGender);
  const genders = paare.map(([, g]) => g);
  return {
    slug: basename(pfad, '.yaml'),
    name: String(daten.name ?? basename(pfad, '.yaml')),
    description: String(daten.description ?? ''),
    words: paare.map(([w]) => w),
    genders: genders.some(Boolean) ? genders : [],
    adjectives: daten.adjectives ?? [],
    verbs: daten.verbs ?? [],
    patterns: daten.patterns ?? [],
    mutate: daten.mutate ?? true,
    defaultMutation: typeof daten.default_mutation === 'number' ? daten.default_mutation : null,
    language: String(daten.language ?? sprache ?? 'en'),
  };
}

function yamlDateien(ordner) {
  return readdirSync(ordner)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => join(ordner, f));
}

if (!existsSync(QUELLE)) {
  console.error(`Quelle nicht gefunden: ${QUELLE}`);
  console.error('Aufruf: npm run daten -- <pfad-zum-python-repo>');
  process.exit(1);
}

const themes = yamlDateien(join(QUELLE, 'themes')).map((p) => leseListe(p));

const modifiers = {};
for (const sprache of readdirSync(join(QUELLE, 'modifiers')).sort()) {
  const ordner = join(QUELLE, 'modifiers', sprache);
  modifiers[sprache] = Object.fromEntries(
    yamlDateien(ordner).map((p) => [basename(p, '.yaml'), leseListe(p, sprache)]),
  );
}

mkdirSync(ZIEL, { recursive: true });
writeFileSync(join(ZIEL, 'themes.json'), `${JSON.stringify(themes, null, 2)}\n`, 'utf8');
writeFileSync(join(ZIEL, 'modifiers.json'), `${JSON.stringify(modifiers, null, 2)}\n`, 'utf8');

const woerter = themes.reduce((summe, t) => summe + t.words.length, 0);
console.log(`${themes.length} Themes (${woerter} Woerter), Sprachen: ${Object.keys(modifiers).join(', ')}`);
