/**
 * Gemeinsame Testvektoren mit dem Python-Repo.
 *
 * tests/vectors/core.json stammt aus codename-generator und wird per
 * `npm run daten` kopiert - nie von Hand anfassen. pytest laeuft gegen dieselbe
 * Datei, eine Abweichung zwischen den Implementierungen macht eine Seite rot.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blend, coinModel, coinTokens, coinWord } from '../src/lib/coinage';
import {
  acronymTheme,
  anchorModifierPatterns,
  anchorThemePatterns,
  modifierPool,
  normalizeLetters,
  render,
  themeBySlug,
  renderFavorite,
  slugify,
  titleCase,
  type AnchorPosition,
  type Pattern,
  type Recipe,
  type WordList,
} from '../src/lib/generator';
import { inflectAttribute } from '../src/lib/grammar';
import { mutate } from '../src/lib/phonetic';
import type { RandomSource } from '../src/lib/rng';
import { matches, nameSyllables, soundScore } from '../src/lib/scoring';

interface RenderCase {
  _note: string;
  theme: { words: string[]; genders?: string[]; patterns?: string[]; mutate?: boolean; language: string };
  recipe: {
    theme_word: string;
    adjective: string;
    verb: string;
    agent: string;
    pattern_index: number;
    anchor?: string;
  };
  word_count: number;
  language: string;
  expected: { name: string; slug: string; pattern: string; sources: string[] };
}

interface Vectors {
  slugify: Array<{ input: string; expected: string }>;
  title: Array<{ input: string; expected: string }>;
  inflect: Array<{ word: string; gender: string; language: string; expected: string }>;
  mutate: Array<{ word: string; script: number[]; intensity?: number; expected: string }>;
  render: RenderCase[];
  favorite: Array<{ _note: string; pattern: string; sources: string[]; expected: { name: string; slug: string } }>;
  anchor_patterns: Array<{
    _note: string;
    kind: 'modifier' | 'theme';
    language: string;
    position: AnchorPosition;
    expected: string[];
  }>;
  coin: Array<{ _note: string; words: string[]; script: number[]; expected: string | null }>;
  coin_tokens: Array<{ _note: string; words: string[]; expected: string[] }>;
  blend: Array<{ first: string; second: string; expected: string | null }>;
  syllables: Array<{ name: string; language: string; expected: number }>;
  score: Array<{ name: string; language: string; expected: number }>;
  filter: Array<{
    name: string;
    filter: { initial?: string; max_syllables?: number; alliteration?: boolean };
    language: string;
    expected: boolean;
  }>;
  letters: Array<{ input: string; expected: string }>;
  tone_pool: Array<{ language: string; role: string; tone: string; expected: string[] }>;
  acronym_patterns: Array<{ theme: string; letters: string; language: string; tone: string; expected: string[] }>;
}

const vectors = JSON.parse(
  readFileSync(new URL('./vectors/core.json', import.meta.url), 'utf8'),
) as Vectors;

/**
 * Zufall nach Drehbuch. Dieselbe Semantik wie ScriptedRandom in
 * tests/test_vectors.py, sonst waeren die Vektoren nicht vergleichbar.
 */
class ScriptedRandom implements RandomSource {
  private position = 0;

  constructor(private readonly script: number[]) {}

  private nextIndex(): number {
    if (this.position >= this.script.length) throw new Error('Drehbuch zu kurz fuer diesen Vektor');
    const value = this.script[this.position];
    this.position += 1;
    return value;
  }

  choice<T>(items: readonly T[]): T {
    return items[this.nextIndex() % items.length];
  }

  sample<T>(items: readonly T[], k: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    for (let i = 0; i < k; i += 1) out.push(pool.splice(this.nextIndex() % pool.length, 1)[0]);
    return out;
  }
}

function theme(raw: RenderCase['theme']): WordList {
  return {
    slug: 'vector',
    name: 'vector',
    description: '',
    words: raw.words,
    genders: raw.genders ?? [],
    adjectives: [],
    verbs: [],
    patterns: raw.patterns ?? [],
    mutate: raw.mutate ?? true,
    defaultMutation: null,
    language: raw.language,
  };
}

describe('Vektoren: slugify', () => {
  it.each(vectors.slugify)('$input', ({ input, expected }) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('Vektoren: title', () => {
  it.each(vectors.title)('$input', ({ input, expected }) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe('Vektoren: inflect', () => {
  it.each(vectors.inflect)('$word/$gender/$language', ({ word, gender, language, expected }) => {
    expect(inflectAttribute(word, gender, language)).toBe(expected);
  });
});

describe('Vektoren: mutate', () => {
  it.each(vectors.mutate)('$word $script', ({ word, script, intensity, expected }) => {
    expect(mutate(word, new ScriptedRandom(script), intensity ?? 1)).toBe(expected);
  });
});

describe('Vektoren: render', () => {
  it.each(vectors.render)('$_note', (vector) => {
    const recipe: Recipe = {
      themeWord: vector.recipe.theme_word,
      adjective: vector.recipe.adjective,
      verb: vector.recipe.verb,
      agent: vector.recipe.agent,
      patternIndex: vector.recipe.pattern_index,
      // Ohne Mutation - deren Zufall ist zwischen Python und JS verschieden.
      mutationRoll: 1,
      mutationSeed: 0,
      anchor: vector.recipe.anchor ?? '',
    };
    const suggestion = render(recipe, theme(vector.theme), vector.word_count, 0, vector.language);
    expect({
      name: suggestion.name,
      slug: suggestion.slug,
      pattern: suggestion.pattern,
      sources: suggestion.sourceWords,
    }).toEqual(vector.expected);
    expect(suggestion.mutated).toBe(false);
  });
});

describe('Vektoren: favorite', () => {
  it.each(vectors.favorite)('$_note', ({ pattern, sources, expected }) => {
    const stored = { name: '', slug: 'stored', pattern: pattern as Pattern, mutated: false, sourceWords: sources };
    const rendered = renderFavorite(stored, 0);
    expect({ name: rendered.name, slug: rendered.slug }).toEqual(expected);
    expect(rendered.mutated).toBe(false);
  });
});

describe('Vektoren: anchor_patterns', () => {
  it.each(vectors.anchor_patterns)('$_note', ({ kind, language, position, expected }) => {
    const patterns =
      kind === 'modifier' ? anchorModifierPatterns(language, position) : anchorThemePatterns(position);
    expect(patterns).toEqual(expected);
  });
});

describe('Vektoren: coin', () => {
  it.each(vectors.coin)('$_note', ({ words, script, expected }) => {
    expect(coinWord(coinModel(words), new ScriptedRandom(script))).toBe(expected);
  });
});

describe('Vektoren: coin_tokens', () => {
  it.each(vectors.coin_tokens)('$_note', ({ words, expected }) => {
    expect(coinTokens(words)).toEqual(expected);
  });
});

describe('Vektoren: blend', () => {
  it.each(vectors.blend)('$first + $second', ({ first, second, expected }) => {
    expect(blend(first, second)).toBe(expected);
  });
});

describe('Vektoren: syllables', () => {
  it.each(vectors.syllables)('$name/$language', ({ name, language, expected }) => {
    expect(nameSyllables(name, language)).toBe(expected);
  });
});

describe('Vektoren: score', () => {
  it.each(vectors.score)('$name/$language', ({ name, language, expected }) => {
    expect(soundScore(name, language)).toBe(expected);
  });
});

describe('Vektoren: filter', () => {
  it.each(vectors.filter)('$name $filter', ({ name, filter, language, expected }) => {
    const nameFilter = {
      initial: filter.initial ?? '',
      maxSyllables: filter.max_syllables ?? 0,
      alliteration: filter.alliteration ?? false,
    };
    expect(matches(name, nameFilter, language)).toBe(expected);
  });
});

describe('Vektoren: letters', () => {
  it.each(vectors.letters)('$input', ({ input, expected }) => {
    expect(normalizeLetters(input)).toBe(expected);
  });
});

describe('Vektoren: tone_pool', () => {
  it.each(vectors.tone_pool)('$language/$role/$tone', ({ language, role, tone, expected }) => {
    expect(modifierPool(language, role, tone)).toEqual(expected);
  });
});

describe('Vektoren: acronym_patterns', () => {
  it.each(vectors.acronym_patterns)('$theme $letters $tone', ({ theme: slug, letters, language, tone, expected }) => {
    const source = themeBySlug(slug);
    expect(source).toBeDefined();
    expect(acronymTheme(source as WordList, letters, language, tone).patterns).toEqual(expected);
  });
});
