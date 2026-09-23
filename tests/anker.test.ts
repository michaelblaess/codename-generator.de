/**
 * Eigenes Wort mit Partner-Thema und Position - dieselben Aussagen wie
 * test_generator.py im Python-Repo.
 */
import { describe, expect, it } from 'vitest';
import { ANCHOR_POSITIONS, suggestSeeded, themeBySlug } from '../src/lib/generator';

describe('eigenes Wort mit Partner-Thema', () => {
  it.each(ANCHOR_POSITIONS)('Position %s: Stellung stimmt, kein Name doppelt', (position) => {
    for (let seed = 0; seed < 10; seed += 1) {
      const { suggestions } = suggestSeeded({
        word: 'Sitemap',
        partner: 'constellations',
        position,
        count: 40,
        wordCount: 3,
        mutationChance: 0,
        seed,
      });
      const names = suggestions.map((s) => s.name);
      expect(names).toHaveLength(40);
      expect(new Set(names).size).toBe(40);
      for (const name of names) {
        expect(name.split('Sitemap')).toHaveLength(2);
        if (position === 'front') expect(name.startsWith('Sitemap ')).toBe(true);
        if (position === 'back') expect(name.endsWith(' Sitemap')).toBe(true);
      }
    }
  });

  it('nimmt das eigene Wort nie als Partner-Wort', () => {
    const orion = themeBySlug('constellations')!.words.find((w) => w === 'Orion');
    expect(orion).toBe('Orion');
    const { suggestions } = suggestSeeded({
      word: 'orion',
      partner: 'constellations',
      count: 40,
      mutationChance: 0,
      seed: 1,
    });
    expect(suggestions.some((s) => s.sourceWords[0] === 'Orion')).toBe(false);
  });

  it('mutiert nur das Partner-Wort, nie das eigene', () => {
    const { suggestions } = suggestSeeded({
      word: 'Sitemap',
      partner: 'greek-gods',
      count: 40,
      mutationChance: 1,
      seed: 4,
    });
    expect(suggestions.some((s) => s.mutated)).toBe(true);
    expect(suggestions.every((s) => s.name.includes('Sitemap'))).toBe(true);
  });
});

describe('eigenes Wort mit Zusaetzen und Position', () => {
  it.each(['en', 'de'])('%s: vorn und hinten', (language) => {
    for (const position of ['front', 'back'] as const) {
      const { suggestions } = suggestSeeded({
        word: 'Sitemap',
        position,
        language,
        count: 30,
        wordCount: 3,
        mutationChance: 0,
        seed: 3,
      });
      const names = suggestions.map((s) => s.name);
      expect(new Set(names).size).toBe(30);
      for (const name of names) {
        expect(position === 'front' ? name.startsWith('Sitemap ') : name.endsWith(' Sitemap')).toBe(
          true,
        );
      }
    }
  });
});
