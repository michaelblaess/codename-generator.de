/**
 * Themen-Mix - dieselben Aussagen wie test_generator.py im Python-Repo.
 */
import { describe, expect, it } from 'vitest';
import { suggest, suggestVariants, themeBySlug } from '../src/lib/generator';

describe('Themen-Mix', () => {
  it.each([
    ['mountains', 'constellations', 'en'],
    ['tierwelt', 'greek-gods', 'de'],
  ] as const)('%s x %s: je ein Wort, keins doppelt', (first, second, language) => {
    const a = themeBySlug(first)!.words.map((w) => w.toLowerCase());
    const b = themeBySlug(second)!.words.map((w) => w.toLowerCase());
    for (let seed = 0; seed < 10; seed += 1) {
      const { suggestions, recipes, theme } = suggest({
        themeSlug: first,
        mix: second,
        count: 40,
        wordCount: 3,
        mutationChance: 0,
        language,
        seed,
      });
      expect(theme?.name).toContain(' x ');
      expect(suggestions).toHaveLength(40);
      expect(new Set(suggestions.map((s) => s.name)).size).toBe(40);
      expect(new Set(recipes.map((r) => r.anchor)).size).toBe(40);
      expect(new Set(recipes.map((r) => r.themeWord)).size).toBe(40);
      recipes.forEach((r, i) => {
        expect(a).toContain(r.anchor!.toLowerCase());
        expect(b).toContain(r.themeWord.toLowerCase());
        const beide = [`${r.anchor} ${r.themeWord}`, `${r.themeWord} ${r.anchor}`].map((x) => x.toLowerCase());
        expect(beide).toContain(suggestions[i].name.toLowerCase());
      });
    }
  });

  it('mischt nicht mit sich selbst', () => {
    const ohne = suggest({ themeSlug: 'mountains', seed: 1 });
    const selbst = suggest({ themeSlug: 'mountains', mix: 'mountains', seed: 1 });
    expect(selbst.suggestions.map((s) => s.name)).toEqual(ohne.suggestions.map((s) => s.name));
  });

  it('Zusatz halten behaelt das Wort aus dem ersten Thema', () => {
    const stapel = suggest({ themeSlug: 'mountains', mix: 'constellations', seed: 4, mutationChance: 0 });
    const base = stapel.recipes[0];
    const { recipes } = suggestVariants({ base, theme: stapel.theme!, keep: 'modifier', count: 20, seed: 5 });
    expect(recipes).toHaveLength(20);
    expect(recipes.every((r) => r.anchor === base.anchor && r.themeWord !== base.themeWord)).toBe(true);
  });
});
