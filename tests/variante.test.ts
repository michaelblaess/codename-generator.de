/**
 * Varianten eines Treffers - dieselben Aussagen wie test_generator.py im
 * Python-Repo (Wort halten, Zusatz halten, Beugung, Anker, Power words).
 */
import { describe, expect, it } from 'vitest';
import {
  render,
  suggest,
  suggestSeeded,
  suggestVariants,
  themeBySlug,
  type Recipe,
} from '../src/lib/generator';

describe('Wort halten', () => {
  it.each([
    ['en', 'animals', 2],
    ['en', 'animals', 3],
    ['de', 'tierwelt', 2],
    ['de', 'tierwelt', 3],
  ] as const)('%s %s, %i Woerter', (language, themeSlug, wordCount) => {
    for (let seed = 0; seed < 10; seed += 1) {
      const stapel = suggest({ themeSlug, language, wordCount, mutationChance: 0, seed });
      const base = stapel.recipes[0];
      const original = stapel.suggestions[0].name;
      const varianten = suggestVariants({
        base,
        theme: stapel.theme!,
        keep: 'word',
        count: 30,
        wordCount,
        language,
        mutationChance: 0,
        seed: seed + 100,
      });
      const names = varianten.suggestions.map((s) => s.name);
      expect(names).toHaveLength(30);
      expect(new Set(names).size).toBe(30);
      expect(names).not.toContain(original);
      expect(varianten.recipes.every((r) => r.themeWord === base.themeWord)).toBe(true);
    }
  });

  it('liefert bei Power words und bei einem Anker nichts', () => {
    const power = suggest({ themeSlug: 'power-words', seed: 1 });
    expect(suggestVariants({ base: power.recipes[0], theme: power.theme!, keep: 'word' }).suggestions).toEqual([]);
    const anker = suggestSeeded({ word: 'Sitemap', partner: 'greek-gods', seed: 1 });
    expect(suggestVariants({ base: anker.recipes[0], theme: anker.theme!, keep: 'word' }).suggestions).toEqual([]);
  });
});

describe('Zusatz halten', () => {
  it('beugt den gehaltenen Zusatz nach dem neuen Genus', () => {
    const theme = themeBySlug('tierwelt')!;
    const base: Recipe = {
      themeWord: 'Falke',
      adjective: 'still',
      verb: 'jagend',
      agent: '',
      patternIndex: 0,
      mutationRoll: 1,
      mutationSeed: 0,
    };
    expect(render(base, theme, 2, 0, 'de').name).toBe('Stiller Falke');
    const { suggestions, recipes } = suggestVariants({
      base,
      theme,
      keep: 'modifier',
      count: 40,
      language: 'de',
      mutationChance: 0,
      seed: 2,
    });
    expect(suggestions).toHaveLength(40);
    expect(recipes.some((r) => r.themeWord === 'Falke')).toBe(false);
    const endung: Record<string, string> = { m: 'Stiller', f: 'Stille', n: 'Stilles', p: 'Stille', '': 'Stiller' };
    suggestions.forEach((s, i) => {
      const wort = recipes[i].themeWord;
      const genus = theme.genders[theme.words.indexOf(wort)] ?? '';
      expect(s.name).toBe(`${endung[genus]} ${wort}`);
    });
  });

  it('behaelt bei einem Anker-Treffer das eigene Wort', () => {
    const anker = suggestSeeded({ word: 'Sitemap', partner: 'greek-gods', position: 'front', seed: 5 });
    const { suggestions } = suggestVariants({
      base: anker.recipes[0],
      theme: anker.theme!,
      keep: 'modifier',
      count: 20,
      mutationChance: 0,
      seed: 6,
    });
    expect(new Set(suggestions.map((s) => s.name)).size).toBe(20);
    expect(suggestions.every((s) => s.name.startsWith('Sitemap '))).toBe(true);
  });
});
