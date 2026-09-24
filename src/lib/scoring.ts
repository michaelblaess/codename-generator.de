/**
 * Filter und Klangwert fuer fertige Namen. Port von scoring.py, die
 * Testvektoren halten beide Fassungen auf denselben Zahlen.
 */

const VOWELS = new Set([...'aeiouyäöüàáâéèêíìîóòôúùû']);
const ASCII_LETTERS = new Set([...'abcdefghijklmnopqrstuvwxyz']);
// Mehrbuchstabige Laute, die beim Zaehlen von Konsonantenhaeufungen als einer gelten.
const DIGRAPHS = ['sch', 'ch', 'ck', 'sh', 'th', 'ph'];
const DIGRAPH_PLACEHOLDER = 'C';
const LETTER = /\p{L}/u;

export const SCORE_MAX = 100;

function letters(text: string): string[] {
  return [...text.toLowerCase()].filter((ch) => LETTER.test(ch));
}

/** Ein y am Wortanfang ist Konsonant, sonst Vokal. */
function isVowel(chars: string[], index: number): boolean {
  const ch = chars[index];
  return VOWELS.has(ch) && !(ch === 'y' && index === 0);
}

/** Silben eines Worts, geschaetzt ueber Vokalgruppen (Englisch ohne stummes End-e). */
export function countSyllables(word: string, language: string): number {
  const chars = letters(word);
  if (chars.length === 0) return 0;
  let groups = 0;
  let previous = false;
  for (let index = 0; index < chars.length; index += 1) {
    const vowel = isVowel(chars, index);
    if (vowel && !previous) groups += 1;
    previous = vowel;
  }
  const text = chars.join('');
  if (
    language === 'en' &&
    chars.length > 3 &&
    text.endsWith('e') &&
    !text.endsWith('le') &&
    !VOWELS.has(chars[chars.length - 2]) &&
    groups > 1
  ) {
    groups -= 1;
  }
  return Math.max(1, groups);
}

/** Silben eines ganzen Namens. */
export function nameSyllables(name: string, language: string): number {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, word) => sum + countSyllables(word, language), 0);
}

/** Beginnen alle Woerter mit demselben Buchstaben? Ein einzelnes Wort zaehlt nicht. */
export function isAlliteration(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return new Set(words.map((w) => [...w][0]?.toLowerCase())).size === 1;
}

function clusterPenalty(word: string): number {
  let simplified = word.toLowerCase();
  for (const digraph of DIGRAPHS) simplified = simplified.split(digraph).join(DIGRAPH_PLACEHOLDER);
  const chars = [...simplified];
  let penalty = 0;
  let run = 0;
  chars.forEach((ch, index) => {
    if (LETTER.test(ch) && !isVowel(chars, index)) {
      run += 1;
      if (run === 3) penalty += 8;
    } else {
      run = 0;
    }
  });
  return penalty;
}

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

/** Klangwert 0-100: kurz, gut sprechbar, leicht zu buchstabieren. */
export function soundScore(name: string, language: string): number {
  const words = name.split(/\s+/).filter(Boolean);
  const chars = letters(name);
  if (chars.length === 0) return 0;
  let score = SCORE_MAX;
  const syllables = nameSyllables(name, language);
  if (syllables <= 1 || syllables === 5) score -= 10;
  else if (syllables > 5) score -= 20 + 5 * (syllables - 6);
  const length = chars.length;
  if (length < 5) score -= 3 * (5 - length);
  else if (length > 12) score -= Math.min(25, 3 * (length - 12));
  for (const word of words) {
    score -= clusterPenalty(word);
    const lowered = word.toLowerCase();
    score -= 3 * count(lowered, 'ph');
    const w = [...lowered];
    let doubles = 0;
    for (let i = 1; i < w.length; i += 1) if (w[i] === w[i - 1] && LETTER.test(w[i])) doubles += 1;
    score -= 2 * doubles;
  }
  score -= 6 * chars.filter((ch) => !ASCII_LETTERS.has(ch)).length;
  score -= 3 * chars.filter((ch) => ch === 'q' || ch === 'x').length;
  if (words.length >= 3) score -= 5;
  if (isAlliteration(name)) score += 5;
  return Math.max(0, Math.min(SCORE_MAX, score));
}

/** Was ein Name erfuellen muss, um angezeigt zu werden. Leer = alles. */
export interface NameFilter {
  initial: string;
  maxSyllables: number;
  alliteration: boolean;
}

export const NO_FILTER: NameFilter = { initial: '', maxSyllables: 0, alliteration: false };

export function filterActive(filter: NameFilter): boolean {
  return Boolean(filter.initial || filter.maxSyllables || filter.alliteration);
}

export function matches(name: string, filter: NameFilter, language: string): boolean {
  if (filter.initial && !name.toLowerCase().startsWith(filter.initial.toLowerCase())) return false;
  if (filter.maxSyllables && nameSyllables(name, language) > filter.maxSyllables) return false;
  return !(filter.alliteration && !isAlliteration(name));
}
