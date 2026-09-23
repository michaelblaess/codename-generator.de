/**
 * Gemeinsame Testvektoren mit dem Python-Repo.
 *
 * tests/vectors/core.json stammt aus codename-generator und wird per
 * `npm run daten` kopiert - nie von Hand anfassen. pytest laeuft gegen dieselbe
 * Datei, eine Abweichung zwischen den Implementierungen macht eine Seite rot.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  anchorModifierPatterns,
  anchorThemePatterns,
  render,
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
