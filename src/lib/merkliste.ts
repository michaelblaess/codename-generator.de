/**
 * Die Merkliste im localStorage des Browsers.
 *
 * Das Format ist dasselbe wie die Favoriten in der settings.json der TUI
 * (name, slug, pattern, mutated, source_words) - so laesst sich eine Liste
 * spaeter zwischen beiden Fassungen austauschen.
 *
 * Geschrieben wird erst, wenn jemand etwas merkt. Eine leere Liste loescht den
 * Schluessel wieder, dann ist der Speicher so leer wie vor dem ersten Klick.
 * Die Datenschutzerklaerung beschreibt genau dieses Verhalten, der Smoketest
 * misst es nach.
 */
import { PATTERN_WORD_COUNT, slugify, type Pattern, type Suggestion } from './generator';

export const SCHLUESSEL = 'codename-generator.merkliste';

interface Eintrag {
  name: string;
  slug: string;
  pattern: string;
  mutated: boolean;
  source_words: string[];
}

function istEintrag(wert: unknown): wert is Eintrag {
  if (typeof wert !== 'object' || wert === null) return false;
  const e = wert as Record<string, unknown>;
  return (
    typeof e.name === 'string' &&
    typeof e.slug === 'string' &&
    typeof e.pattern === 'string' &&
    e.pattern in PATTERN_WORD_COUNT &&
    Array.isArray(e.source_words) &&
    e.source_words.every((w) => typeof w === 'string')
  );
}

/** Liest die Merkliste. Fehlt sie, ist sie kaputt oder ist der Speicher gesperrt: leere Liste. */
export function ladeMerkliste(): Suggestion[] {
  try {
    const roh = window.localStorage.getItem(SCHLUESSEL);
    if (!roh) return [];
    const daten: unknown = JSON.parse(roh);
    if (!Array.isArray(daten)) return [];
    return daten.filter(istEintrag).map((e) => ({
      name: e.name,
      slug: e.slug,
      pattern: e.pattern as Pattern,
      mutated: Boolean(e.mutated),
      sourceWords: [...e.source_words],
    }));
  } catch {
    return [];
  }
}

/** Schreibt die Merkliste. Liefert false, wenn der Browser das Speichern verweigert. */
export function speichereMerkliste(liste: Suggestion[]): boolean {
  try {
    if (liste.length === 0) {
      window.localStorage.removeItem(SCHLUESSEL);
      return true;
    }
    const eintraege: Eintrag[] = liste.map((s) => ({
      name: s.name,
      slug: s.slug,
      pattern: s.pattern,
      mutated: s.mutated,
      source_words: s.sourceWords,
    }));
    window.localStorage.setItem(SCHLUESSEL, JSON.stringify(eintraege));
    return true;
  } catch {
    return false;
  }
}

/** Eine eigene Idee als gemerkten Namen - ein Stueck, ohne Modifier (wie "+" in der TUI). */
export function eigeneIdee(text: string): Suggestion | null {
  const name = text.trim().replace(/\s+/g, ' ');
  const slug = slugify(name);
  if (!name || !slug) return null;
  return { name, slug, pattern: 'theme', mutated: false, sourceWords: [name] };
}
