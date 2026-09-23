import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderFavorite, suggestSeeded } from '../src/lib/generator';
import { SCHLUESSEL, eigeneIdee, ladeMerkliste, speichereMerkliste } from '../src/lib/merkliste';

/** Minimaler localStorage, damit die Tests ohne Browser laufen. */
class Speicher {
  private daten = new Map<string, string>();
  get length(): number {
    return this.daten.size;
  }
  getItem(k: string): string | null {
    return this.daten.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.daten.set(k, v);
  }
  removeItem(k: string): void {
    this.daten.delete(k);
  }
}

const g = globalThis as unknown as { window?: { localStorage: Speicher } };

describe('eigenes Wort', () => {
  it('steckt in jedem Vorschlag und liefert verschiedene Namen', () => {
    const { suggestions } = suggestSeeded({ word: 'Sitemap', count: 20, mutationChance: 0, seed: 7 });
    expect(suggestions).toHaveLength(20);
    expect(suggestions.every((s) => s.name.includes('Sitemap'))).toBe(true);
    expect(new Set(suggestions.map((s) => s.name)).size).toBe(20);
  });

  it('hat auch in vollen Stapeln keinen Namen doppelt', () => {
    for (const language of ['en', 'de']) {
      for (const wordCount of [2, 3]) {
        for (let seed = 0; seed < 20; seed += 1) {
          const { suggestions } = suggestSeeded({ word: 'Sitemap', count: 40, mutationChance: 0, wordCount, language, seed });
          expect(suggestions).toHaveLength(40);
          expect(new Set(suggestions.map((s) => s.name)).size).toBe(40);
        }
      }
    }
  });

  it('ist mit demselben Seed stabil', () => {
    const a = suggestSeeded({ word: 'Sitemap', seed: 42 }).suggestions.map((s) => s.name);
    const b = suggestSeeded({ word: 'Sitemap', seed: 42 }).suggestions.map((s) => s.name);
    expect(a).toEqual(b);
  });

  it('beugt deutsch als Maskulinum', () => {
    const { suggestions } = suggestSeeded({
      word: 'Leuchtturm',
      language: 'de',
      wordCount: 3,
      mutationChance: 0,
      seed: 3,
    });
    expect(suggestions[0].pattern).toBe('adj-verb-theme');
    expect(suggestions[0].name).toMatch(/^\S+er \S+er Leuchtturm$/);
  });

  it('liefert bei leerem Wort nichts', () => {
    expect(suggestSeeded({ word: '   ' }).suggestions).toEqual([]);
  });
});

describe('Merkliste', () => {
  beforeEach(() => {
    g.window = { localStorage: new Speicher() };
  });
  afterEach(() => {
    delete g.window;
  });

  it('schreibt das Format der TUI und liest es zurueck', () => {
    const [s] = suggestSeeded({ word: 'Sitemap', count: 1, mutationChance: 0, seed: 1 }).suggestions;
    expect(speichereMerkliste([s])).toBe(true);
    const roh = JSON.parse(g.window!.localStorage.getItem(SCHLUESSEL)!);
    expect(Object.keys(roh[0]).sort()).toEqual(['mutated', 'name', 'pattern', 'slug', 'source_words']);
    expect(ladeMerkliste()).toEqual([s]);
  });

  it('raeumt den Speicher bei leerer Liste ganz ab', () => {
    speichereMerkliste([eigeneIdee('Sitemap Pioneer')!]);
    expect(g.window!.localStorage.length).toBe(1);
    speichereMerkliste([]);
    expect(g.window!.localStorage.length).toBe(0);
  });

  it('ueberlebt kaputte Daten und fehlenden Speicher', () => {
    g.window!.localStorage.setItem(SCHLUESSEL, '{kaputt');
    expect(ladeMerkliste()).toEqual([]);
    g.window!.localStorage.setItem(SCHLUESSEL, JSON.stringify([{ name: 'x' }, 42]));
    expect(ladeMerkliste()).toEqual([]);
    delete g.window;
    expect(ladeMerkliste()).toEqual([]);
    expect(speichereMerkliste([])).toBe(false);
  });

  it('nimmt eigene Ideen als ein Stueck', () => {
    const idee = eigeneIdee('  sitemap   pioneer ')!;
    expect(idee).toMatchObject({ name: 'sitemap pioneer', slug: 'sitemap-pioneer', pattern: 'theme' });
    expect(renderFavorite(idee, 0).name).toBe('Sitemap Pioneer');
    expect(eigeneIdee('  ')).toBeNull();
    expect(eigeneIdee('---')).toBeNull();
  });
});
