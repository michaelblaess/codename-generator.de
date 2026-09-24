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

function alsEintrag(s: Suggestion): Eintrag {
  return { name: s.name, slug: s.slug, pattern: s.pattern, mutated: s.mutated, source_words: s.sourceWords };
}

/**
 * Die Merkliste als Austauschdatei - dasselbe Dokument, das die TUI mit
 * --export-favorites schreibt: die Liste unter "favorites".
 */
export function exportDokument(liste: Suggestion[]): string {
  return `${JSON.stringify({ favorites: liste.map(alsEintrag) }, null, 2)}\n`;
}

/**
 * Liest eine Austauschdatei: ein Web-Export, ein TUI-Export oder gleich die
 * settings.json der TUI. Unbrauchbare Eintraege fallen weg. Kaputtes JSON
 * wirft - das ist ein Fehler, kein leerer Import.
 */
export function leseImport(text: string): Suggestion[] {
  const daten: unknown = JSON.parse(text);
  const roh =
    typeof daten === 'object' && daten !== null && !Array.isArray(daten)
      ? (daten as Record<string, unknown>).favorites
      : daten;
  if (!Array.isArray(roh)) return [];
  return roh.filter(istEintrag).map((e) => ({
    name: e.name,
    slug: e.slug,
    pattern: e.pattern as Pattern,
    mutated: Boolean(e.mutated),
    sourceWords: [...e.source_words],
  }));
}

/** Haengt neue Eintraege an, ein bekannter Slug bleibt einmal. Liefert die Liste und die Zahl der neuen. */
export function fuehreZusammen(
  bestehend: Suggestion[],
  neu: Suggestion[],
): { liste: Suggestion[]; hinzu: number } {
  const slugs = new Set(bestehend.map((s) => s.slug));
  const liste = [...bestehend];
  for (const eintrag of neu) {
    if (slugs.has(eintrag.slug)) continue;
    slugs.add(eintrag.slug);
    liste.push(eintrag);
  }
  return { liste, hinzu: liste.length - bestehend.length };
}

/** Eine eigene Idee als gemerkten Namen - ein Stueck, ohne Modifier (wie "+" in der TUI). */
export function eigeneIdee(text: string): Suggestion | null {
  const name = text.trim().replace(/\s+/g, ' ');
  const slug = slugify(name);
  if (!name || !slug) return null;
  return { name, slug, pattern: 'theme', mutated: false, sourceWords: [name] };
}
