/**
 * Neue Woerter aus einem Thema: Kunstwoerter (Buchstabenmodell) und Kofferwoerter.
 * Port von coinage.py - die Testvektoren pruefen, dass beide dasselbe liefern.
 *
 * Das Kunstwort fragt den Zufall nur ueber `choice`, dort greift das Drehbuch
 * der Vektoren. Das Kofferwort braucht gar keinen Zufall.
 */
import type { RandomSource } from './rng';

// Markierungen fuer Wortanfang und -ende. Beide sortieren vor jedem
// Buchstaben - die Reihenfolge der Uebergaenge ist so in Python und JS gleich.
const START = '^';
const END = '$';
const ORDER = 2;

export const COIN_MIN_LENGTH = 4;
export const COIN_MAX_LENGTH = 10;
// Ein Quellwort ab dieser Laenge darf nicht als Ganzes im Kunstwort stecken.
const EMBEDDED_MIN_LENGTH = 4;

const BLEND_VOWELS = new Set([...'aeiouyäöü']);
const BLEND_MIN_LENGTH = 4;
// Kofferwoerter zielen auf hoechstens acht Buchstaben.
const BLEND_TARGET_MAX = 8;

const LETTERS_ONLY = /^\p{L}+$/u;

function isAlpha(text: string): boolean {
  return LETTERS_ONLY.test(text);
}

/** Einzelwoerter eines Themas als Trainingsmaterial: klein, nur Buchstaben, ab 3 Zeichen. */
export function coinTokens(words: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const word of words) {
    for (const token of word.replace(/-/g, ' ').split(/\s+/)) {
      const lowered = token.toLowerCase();
      if ([...lowered].length >= 3 && isAlpha(lowered)) seen.add(lowered);
    }
  }
  return [...seen];
}

export interface CoinModel {
  tokens: string[];
  // Folgebuchstaben je Buchstabenpaar, sortiert und mit Wiederholung.
  transitions: Map<string, string[]>;
}

export function coinModel(words: readonly string[]): CoinModel {
  const tokens = coinTokens(words);
  const followers = new Map<string, string[]>();
  for (const token of tokens) {
    const padded = [...START.repeat(ORDER), ...token, END];
    for (let index = ORDER; index < padded.length; index += 1) {
      const key = padded.slice(index - ORDER, index).join('');
      const list = followers.get(key) ?? [];
      list.push(padded[index]);
      followers.set(key, list);
    }
  }
  const transitions = new Map<string, string[]>();
  for (const [key, list] of followers) transitions.set(key, [...list].sort());
  return { tokens, transitions };
}

function capitalize(word: string): string {
  const [first, ...rest] = [...word];
  return first ? first.toUpperCase() + rest.join('') : word;
}

/** Ein Versuch fuer ein Kunstwort - null, wenn er nichts Brauchbares ergibt. */
export function coinWord(model: CoinModel, rng: RandomSource): string | null {
  let state = START.repeat(ORDER);
  const letters: string[] = [];
  for (;;) {
    const options = model.transitions.get(state);
    if (!options || options.length === 0) return null;
    const letter = rng.choice(options);
    if (letter === END) break;
    letters.push(letter);
    if (letters.length > COIN_MAX_LENGTH) return null;
    state = [...state].slice(1).join('') + letter;
  }
  const word = letters.join('');
  if (letters.length < COIN_MIN_LENGTH) return null;
  for (const token of model.tokens) {
    if (token.includes(word)) return null;
    if ([...token].length >= EMBEDDED_MIN_LENGTH && word.includes(token)) return null;
  }
  return capitalize(word);
}

/** Bis zu `count` verschiedene Kunstwoerter. */
export function coinWords(model: CoinModel, rng: RandomSource, count: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 60;
  for (
    let attempt = 0;
    model.tokens.length > 0 && result.length < count && attempt < maxAttempts;
    attempt += 1
  ) {
    const word = coinWord(model, rng);
    if (word === null || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    result.push(word);
  }
  return result;
}

/** Taugt ein Wort fuer ein Kofferwort? Nur einteilige Woerter aus Buchstaben. */
export function blendable(word: string): boolean {
  return [...word].length >= 3 && isAlpha(word);
}

/** Levenshtein-Abstand. */
function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let previous = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= y.length; j += 1) {
      current.push(
        Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (x[i - 1] !== y[j - 1] ? 1 : 0)),
      );
    }
    previous = current;
  }
  return previous[y.length];
}

/**
 * Verschmilzt zwei Woerter an einem gemeinsamen Buchstaben ("Orion" + "Andromeda"
 * = "Oromeda"). Gewinnt die Naht, deren Laenge am naechsten am Mittel liegt
 * (hoechstens acht), dann eine Vokalnaht, dann mehr vom ersten Wort. Beinahe-Kopien
 * (ein Buchstabe Unterschied) zaehlen nicht.
 */
export function blend(first: string, second: string): string | null {
  const a = first.toLowerCase();
  const b = second.toLowerCase();
  if (!(blendable(a) && blendable(b)) || a === b) return null;
  const x = [...a];
  const y = [...b];
  const target = Math.max(5, Math.min(BLEND_TARGET_MAX, Math.floor((x.length + y.length + 1) / 2)));
  let best: { key: number[]; word: string } | null = null;
  for (let i = 2; i < x.length; i += 1) {
    for (let j = 1; j < y.length - 1; j += 1) {
      if (x[i - 1] !== y[j - 1]) continue;
      const letters = [...x.slice(0, i), ...y.slice(j)];
      const word = letters.join('');
      if (letters.length < BLEND_MIN_LENGTH || letters.length > COIN_MAX_LENGTH) continue;
      if (word.includes(a) || word.includes(b)) continue;
      if (editDistance(word, a) <= 1 || editDistance(word, b) <= 1) continue;
      const key = [Math.abs(letters.length - target), BLEND_VOWELS.has(x[i - 1]) ? 0 : 1, -i, j];
      if (best === null || compareKeys(key, best.key) < 0) best = { key, word };
    }
  }
  return best ? capitalize(best.word) : null;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Zufaellige Paare samt Kofferwort, jedes Kofferwort hoechstens einmal. */
export function blendPairs(
  firsts: readonly string[],
  seconds: readonly string[],
  rng: RandomSource,
  count: number,
): Array<[string, string, string]> {
  const left = firsts.filter(blendable);
  const right = seconds.filter(blendable);
  const result: Array<[string, string, string]> = [];
  const seen = new Set<string>();
  const maxAttempts = count * 60;
  for (
    let attempt = 0;
    left.length > 0 && right.length > 0 && result.length < count && attempt < maxAttempts;
    attempt += 1
  ) {
    const a = rng.choice(left);
    const b = rng.choice(right);
    if (a.toLowerCase() === b.toLowerCase()) continue;
    const word = blend(a, b);
    if (word === null || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    result.push([a, b, word]);
  }
  return result;
}
