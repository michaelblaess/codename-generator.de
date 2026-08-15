/**
 * Sprachabhaengige Wortformen. Port von grammar.py.
 *
 * Englisch stellt Modifier unveraendert voran ("Swift Falcon"). Deutsch beugt
 * ein vorangestelltes Adjektiv nach dem Genus des Nomens - ohne das kommt
 * "Schnell Falke" heraus statt "Schneller Falke".
 */

export const GERMAN = 'de';

// Starke Deklination, Nominativ Singular, ohne Artikel.
const GERMAN_ENDINGS: Record<string, string> = { m: 'er', f: 'e', n: 'es', p: 'e' };

// Genus, das gilt wenn ein deutsches Theme sein Wort ohne Marker fuehrt.
const GERMAN_FALLBACK_GENDER = 'm';

/** Tilgt das e in Stammendungen auf -el (dunkel -> dunkl, edel -> edl). */
function germanStem(word: string): string {
  return word.endsWith('el') ? `${word.slice(0, -2)}l` : word;
}

/**
 * Beugt einen vorangestellten Modifier fuer die jeweilige Sprache.
 *
 * Sprachen ohne Flexionsregel geben das Wort unveraendert zurueck. Fuer Deutsch
 * entscheidet das Genus des Nomens, ein fehlender Marker gilt als Maskulinum.
 */
export function inflectAttribute(word: string, gender: string, language: string): string {
  if (language !== GERMAN || !word) return word;
  const ending = GERMAN_ENDINGS[gender || GERMAN_FALLBACK_GENDER] ?? '';
  if (!ending) return word;
  // Ein Stamm, der bereits auf e endet ("leise"), bekommt nur den Rest.
  if (word.endsWith('e')) {
    return ending.startsWith('e') ? `${word}${ending.slice(1)}` : `${word}${ending}`;
  }
  return `${germanStem(word)}${ending}`;
}
