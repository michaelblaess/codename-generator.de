/**
 * Phonetische Mutation. Port von phonetic.py.
 *
 * Die Regeln sind auf englisch-lateinische Wortformen zugeschnitten - deutsche
 * Themes starten deshalb bei 0 Prozent Mutation.
 */
import type { RandomSource } from './rng';

export const VOWELS = 'aeiouy';

const VOWEL_SWAPS: Record<string, string[]> = {
  a: ['o', 'e'],
  e: ['i', 'a'],
  i: ['e', 'y'],
  o: ['a', 'u'],
  u: ['o', 'a'],
  y: ['i'],
};

const SUFFIX_SWAPS: Array<[string, string[]]> = [
  ['us', ['os', 'as', 'yr']],
  ['os', ['us', 'as']],
  ['as', ['us', 'os']],
  ['a', ['ya', 'ah']],
  ['on', ['an', 'yn']],
  ['ar', ['or', 'ur']],
  ['er', ['ar', 'ir']],
  ['is', ['ys', 'es']],
];

const DOUBLE_CONSONANTS = 'bcdfgklmnprstvz';

function swapRandomVowel(word: string, rng: RandomSource): string {
  const indices: number[] = [];
  for (let i = 0; i < word.length; i += 1) {
    if (VOWEL_SWAPS[word[i].toLowerCase()]) indices.push(i);
  }
  if (indices.length === 0) return word;
  const idx = rng.choice(indices);
  const original = word[idx].toLowerCase();
  let replacement = rng.choice(VOWEL_SWAPS[original]);
  if (word[idx] === word[idx].toUpperCase() && word[idx] !== word[idx].toLowerCase()) {
    replacement = replacement.toUpperCase();
  }
  return word.slice(0, idx) + replacement + word.slice(idx + 1);
}

function swapSuffix(word: string, rng: RandomSource): string {
  const lower = word.toLowerCase();
  const candidates = SUFFIX_SWAPS.filter(([suffix]) => lower.endsWith(suffix));
  if (candidates.length === 0) return word;
  const [suffix, alternatives] = rng.choice(candidates);
  let replacement = rng.choice(alternatives);
  const last = word[word.length - 1];
  if (last === last.toUpperCase() && last !== last.toLowerCase()) {
    replacement = replacement.toUpperCase();
  }
  return word.slice(0, word.length - suffix.length) + replacement;
}

function doubleConsonant(word: string, rng: RandomSource): string {
  const indices: number[] = [];
  for (let i = 1; i < word.length - 1; i += 1) {
    const ch = word[i].toLowerCase();
    if (
      DOUBLE_CONSONANTS.includes(ch) &&
      ch.length === 1 &&
      VOWELS.includes(word[i - 1].toLowerCase()) &&
      VOWELS.includes(word[i + 1].toLowerCase())
    ) {
      indices.push(i);
    }
  }
  if (indices.length === 0) return word;
  const idx = rng.choice(indices);
  return word.slice(0, idx + 1) + word[idx] + word.slice(idx + 1);
}

/** Schneidet die letzte Silbe ab und behaelt einen Vokal am Wortende. */
function dropLastSyllable(word: string, _rng: RandomSource): string {
  if (word.length < 7) return word;
  const vowelPositions: number[] = [];
  for (let i = 0; i < word.length; i += 1) {
    if (VOWELS.includes(word[i].toLowerCase())) vowelPositions.push(i);
  }
  if (vowelPositions.length < 2) return word;
  const cut = vowelPositions[vowelPositions.length - 2] + 1;
  return cut < 4 ? word : word.slice(0, cut);
}

const MUTATIONS = [swapRandomVowel, swapSuffix, doubleConsonant, dropLastSyllable];

/** Wendet 1..N zufaellige phonetische Mutationen auf das Wort an. */
export function mutate(word: string, rng: RandomSource, intensity = 1): string {
  if (intensity < 1) return word;
  let current = word;
  for (const mutation of rng.sample(MUTATIONS, Math.min(intensity, MUTATIONS.length))) {
    const candidate = mutation(current, rng);
    if (candidate && candidate !== current) current = candidate;
  }
  return current;
}
