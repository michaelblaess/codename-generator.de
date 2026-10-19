/**
 * Eigene Themes aus einer YAML-Datei, Gegenstueck zu ~/.codename-generator/themes/ der TUI.
 *
 * Die Datei hat dasselbe Format wie dort, sie verlaesst den Browser nicht und wird nicht
 * gespeichert - ein eigenes Thema gilt bis zum Schliessen der Seite.
 */
import { parse } from 'yaml';
import type { WordList } from './generator';

const GENUS = new Set(['m', 'f', 'n', 'p']);

export type EigenesThemaFehler = 'kaputt' | 'leer' | 'belegt';

export type EigenesThemaErgebnis =
  | { ok: true; theme: WordList }
  | { ok: false; fehler: EigenesThemaFehler };

function splitGender(eintrag: string): [string, string] {
  const index = eintrag.indexOf('|');
  if (index < 0) return [eintrag.trim(), ''];
  const marker = eintrag.slice(index + 1).trim().toLowerCase();
  return [eintrag.slice(0, index).trim(), GENUS.has(marker) ? marker : ''];
}

function textListe(roh: unknown): string[] {
  return Array.isArray(roh) ? roh.map(String) : [];
}

/** Dateiname ohne Endung als Kennung, wie bei der TUI (`rivers.yaml` -> `rivers`). */
export function slugAusDateiname(dateiname: string): string {
  return dateiname.replace(/\.ya?ml$/i, '');
}

/**
 * Liest eine Theme-Datei. `belegt` sind die Kennungen der mitgelieferten Themes -
 * die werden nicht ueberschrieben, wie in der TUI.
 */
export function leseEigenesThema(
  text: string,
  dateiname: string,
  belegt: ReadonlySet<string>,
): EigenesThemaErgebnis {
  const slug = slugAusDateiname(dateiname);
  if (belegt.has(slug)) return { ok: false, fehler: 'belegt' };
  let daten: unknown;
  try {
    daten = parse(text);
  } catch {
    return { ok: false, fehler: 'kaputt' };
  }
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return { ok: false, fehler: 'kaputt' };
  }
  const roh = daten as Record<string, unknown>;
  if (roh.words !== undefined && !Array.isArray(roh.words)) return { ok: false, fehler: 'kaputt' };
  const paare = textListe(roh.words).map(splitGender).filter(([wort]) => wort !== '');
  if (paare.length === 0) return { ok: false, fehler: 'leer' };
  const genders = paare.map(([, g]) => g);
  return {
    ok: true,
    theme: {
      slug,
      name: String(roh.name ?? slug),
      description: String(roh.description ?? ''),
      words: paare.map(([w]) => w),
      genders: genders.some(Boolean) ? genders : [],
      adjectives: textListe(roh.adjectives),
      verbs: textListe(roh.verbs),
      patterns: textListe(roh.patterns),
      mutate: roh.mutate === undefined ? true : Boolean(roh.mutate),
      defaultMutation: typeof roh.default_mutation === 'number' ? roh.default_mutation : null,
      language: String(roh.language ?? 'en'),
      custom: true,
    },
  };
}
