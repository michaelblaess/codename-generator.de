/**
 * Methoden, Ton, Filter und Sortierung im Web-Generator - Gegenstueck zu
 * tests/test_methods.py und tests/test_stack.py im Python-Repo.
 */
import { describe, expect, it } from 'vitest';
import { coinTokens } from '../src/lib/coinage';
import { modifierPool, render, suggest, suggestSeeded, themeBySlug } from '../src/lib/generator';
import { exportDokument, fuehreZusammen, leseImport } from '../src/lib/merkliste';
import { isAlliteration, nameSyllables } from '../src/lib/scoring';

const initialen = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0].toLowerCase())
    .join('');

describe('Methoden', () => {
  it('Kunstwoerter sind neu und nehmen Zusaetze an', () => {
    const stapel = suggest({ themeSlug: 'constellations', method: 'coined', seed: 3, wordCount: 2 });
    const tokens = coinTokens(themeBySlug('constellations')?.words ?? []);
    expect(stapel.suggestions).toHaveLength(20);
    expect(stapel.theme?.mutate).toBe(false);
    for (const recipe of stapel.recipes) {
      expect(tokens.some((token) => token.includes(recipe.themeWord.toLowerCase()))).toBe(false);
    }
    expect(stapel.suggestions.every((s) => s.name.split(' ').length === 2)).toBe(true);
  });

  it('Kofferwoerter kreuzen mit dem Mix-Partner zwei Themen', () => {
    const stapel = suggest({ themeSlug: 'mountains', mix: 'constellations', method: 'blend', seed: 5, wordCount: 1 });
    expect(stapel.theme?.slug).toBe('blend-mountains-constellations');
    expect(stapel.suggestions.length).toBeGreaterThan(10);
  });

  it('Akronym: jedes Wort beginnt mit seinem Buchstaben', () => {
    for (const [slug, letters, language] of [
      ['animals', 'sm', 'en'],
      ['tierwelt', 'gft', 'de'],
    ] as const) {
      const stapel = suggest({ themeSlug: slug, method: 'acronym', letters, language, seed: 9 });
      expect(stapel.suggestions.length).toBeGreaterThan(0);
      for (const s of stapel.suggestions) expect(initialen(s.name)).toBe(letters);
    }
  });

  it('Akronym ohne passende Woerter bleibt leer', () => {
    const stapel = suggest({ themeSlug: 'animals', method: 'acronym', letters: 'xq', seed: 1 });
    expect(stapel.suggestions).toEqual([]);
    expect(stapel.theme?.patterns).toEqual([]);
  });

  it('Ton schraenkt die Zusaetze ein', () => {
    const ruhig = new Set(modifierPool('en', 'adjectives', 'calm'));
    const stapel = suggest({ themeSlug: 'animals', tone: 'calm', seed: 11 });
    expect(stapel.recipes.every((r) => ruhig.has(r.adjective))).toBe(true);
    const ohne = suggest({ themeSlug: 'animals', seed: 11 });
    expect(ohne.recipes.some((r) => !ruhig.has(r.adjective))).toBe(true);
  });

  it('Mix geht ueber die Sprachgrenze', () => {
    const stapel = suggest({ themeSlug: 'mountains', mix: 'tierwelt', language: 'en', seed: 2 });
    const tiere = new Set((themeBySlug('tierwelt')?.words ?? []).map((w) => w.toLowerCase()));
    expect(stapel.recipes.length).toBe(20);
    expect(stapel.recipes.every((r) => tiere.has(r.themeWord.toLowerCase()))).toBe(true);
  });
});

describe('Filter und Sortierung', () => {
  it('Filter lassen nur passende Namen durch, der Vorrat fuellt die Liste', () => {
    const stapel = suggest({
      themeSlug: 'animals',
      seed: 4,
      mutationChance: 0,
      filter: { initial: 's', maxSyllables: 3, alliteration: false },
    });
    expect(stapel.suggestions.length).toBeGreaterThan(5);
    for (const s of stapel.suggestions) {
      expect(s.name.toLowerCase().startsWith('s')).toBe(true);
      expect(nameSyllables(s.name, 'en')).toBeLessThanOrEqual(3);
    }
  });

  it('Alliteration wird schon beim Ziehen beruecksichtigt', () => {
    const stapel = suggest({
      themeSlug: 'animals',
      seed: 6,
      filter: { initial: '', maxSyllables: 0, alliteration: true },
    });
    expect(stapel.suggestions.length).toBe(20);
    expect(stapel.suggestions.every((s) => isAlliteration(s.name))).toBe(true);
  });

  it('Sortierung nach Klang, Rezept und Name bleiben zusammen', () => {
    const stapel = suggest({ themeSlug: 'greek-gods', seed: 8, mutationChance: 0, sortByScore: true });
    expect(stapel.scores).toEqual([...stapel.scores].sort((a, b) => b - a));
    stapel.recipes.forEach((recipe, i) => {
      const theme = stapel.theme;
      if (!theme) throw new Error('Thema fehlt');
      expect(render(recipe, theme, 2, 0, 'en').name).toBe(stapel.suggestions[i].name);
    });
  });

  it('Eigenes Wort mit Ton und Stabreim', () => {
    const stapel = suggestSeeded({
      word: 'Sitemap',
      seed: 3,
      tone: 'swift',
      filter: { initial: '', maxSyllables: 0, alliteration: true },
    });
    expect(stapel.suggestions.length).toBeGreaterThan(3);
    expect(stapel.suggestions.every((s) => isAlliteration(s.name))).toBe(true);
  });
});

describe('Merkliste tauschen', () => {
  const eintrag = {
    name: 'Silent Falcon',
    slug: 'silent-falcon',
    pattern: 'adj-theme',
    mutated: false,
    source_words: ['Falcon', 'silent'],
  };

  it('liest Liste, Dokument und settings.json der TUI', () => {
    expect(leseImport(JSON.stringify([eintrag]))[0].slug).toBe('silent-falcon');
    expect(leseImport(JSON.stringify({ favorites: [eintrag] }))[0].sourceWords).toEqual(['Falcon', 'silent']);
    const settings = { theme: 'gruvbox', mutation_percent: 35, favorites: [eintrag, { name: 'kaputt' }] };
    expect(leseImport(JSON.stringify(settings))).toHaveLength(1);
    expect(leseImport(JSON.stringify({ theme: 'x' }))).toEqual([]);
  });

  it('kaputtes JSON ist ein Fehler, kein leerer Import', () => {
    expect(() => leseImport('{')).toThrow();
  });

  it('Export und Import ergeben dieselbe Liste, bekannte Slugs bleiben einmal', () => {
    const liste = leseImport(JSON.stringify([eintrag]));
    const zurueck = leseImport(exportDokument(liste));
    expect(zurueck).toEqual(liste);
    const orion = { name: 'Orion', slug: 'orion', pattern: 'theme' as const, mutated: false, sourceWords: ['Orion'] };
    const { liste: neu, hinzu } = fuehreZusammen(liste, [...zurueck, orion, orion]);
    expect(neu.map((s) => s.slug)).toEqual(['silent-falcon', 'orion']);
    expect(hinzu).toBe(1);
  });
});
