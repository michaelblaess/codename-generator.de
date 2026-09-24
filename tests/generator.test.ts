import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  PATTERN_WORD_COUNT,
  effectiveLanguage,
  slugify,
  suggest,
  themeBySlug,
  themes,
  visibleThemes,
} from '../src/lib/generator';
import { inflectAttribute } from '../src/lib/grammar';
import { Rng, seedFromString } from '../src/lib/rng';
import { mutate } from '../src/lib/phonetic';

const GERMAN_THEME = 'tierwelt';

describe('slug', () => {
  it('schreibt Umlaute aus statt sie zu verlieren', () => {
    expect(slugify('Grüner Blitz')).toBe('gruener-blitz');
    expect(slugify('Wüstenfuchs')).toBe('wuestenfuchs');
    expect(slugify('Weiße Möwe')).toBe('weisse-moewe');
  });

  it('entfernt Akzente', () => {
    expect(slugify('Volupté')).toBe('volupte');
  });

  it('laesst keine Bindestriche am Rand', () => {
    expect(slugify('  Man o\' War  ')).toBe('man-o-war');
  });
});

describe('deutsche Flexion', () => {
  const cases: Array<[string, string, string]> = [
    ['still', 'm', 'stiller'],
    ['still', 'f', 'stille'],
    ['still', 'n', 'stilles'],
    ['still', 'p', 'stille'],
    ['dunkel', 'm', 'dunkler'],
    ['edel', 'n', 'edles'],
    ['leise', 'm', 'leiser'],
    ['leise', 'f', 'leise'],
    ['leise', 'n', 'leises'],
    ['jagend', '', 'jagender'],
  ];
  it.each(cases)('%s (%s) -> %s', (word, gender, expected) => {
    expect(inflectAttribute(word, gender, 'de')).toBe(expected);
  });

  it('laesst Englisch unangetastet', () => {
    expect(inflectAttribute('swift', 'm', 'en')).toBe('swift');
  });
});

describe('Wortzahl', () => {
  it.each([1, 2, 3])('wordCount=%i liefert genau so viele Komponenten', (wordCount) => {
    const { suggestions } = suggest({
      themeSlug: 'flowers',
      count: 30,
      wordCount,
      mutationChance: 0.5,
      seed: 3,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(PATTERN_WORD_COUNT[s.pattern]).toBe(wordCount);
    }
  });
});

describe('Stapel', () => {
  it('gleicher Seed liefert denselben Stapel', () => {
    const a = suggest({ themeSlug: 'greek-gods', count: 10, seed: 42 });
    const b = suggest({ themeSlug: 'greek-gods', count: 10, seed: 42 });
    expect(a.suggestions.map((s) => s.name)).toEqual(b.suggestions.map((s) => s.name));
  });

  it('anderer Seed liefert einen anderen Stapel', () => {
    const a = suggest({ themeSlug: 'greek-gods', count: 10, seed: 1 });
    const b = suggest({ themeSlug: 'greek-gods', count: 10, seed: 2 });
    expect(a.suggestions.map((s) => s.name)).not.toEqual(b.suggestions.map((s) => s.name));
  });

  it('jedes Theme-Wort hoechstens einmal', () => {
    const { suggestions } = suggest({ themeSlug: 'racehorses', count: 30, seed: 7 });
    const words = suggestions.map((s) => s.sourceWords[0].toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  it('mutationChance 0 mutiert nichts', () => {
    const { suggestions } = suggest({ themeSlug: 'whisky', count: 25, mutationChance: 0, seed: 5 });
    expect(suggestions.every((s) => !s.mutated)).toBe(true);
  });

  it('unbekanntes Theme wirft', () => {
    expect(() => suggest({ themeSlug: 'gibt-es-nicht' })).toThrow();
  });

  it('erzeugt weder doppelte Leerzeichen noch Rand-Bindestriche', () => {
    for (const slug of ['racehorses', 'tierwelt', 'dev']) {
      const { suggestions } = suggest({ themeSlug: slug, count: 20, seed: 11, language: 'de' });
      for (const s of suggestions) {
        expect(s.name).not.toMatch(/\s{2}/);
        expect(s.name.trim()).toBe(s.name);
        expect(s.slug).toBe(s.slug.replace(/^-+|-+$/g, ''));
      }
    }
  });
});

describe('Sprachen', () => {
  it('kennt Englisch und Deutsch, Englisch zuerst', () => {
    expect(LANGUAGES[0]).toBe(DEFAULT_LANGUAGE);
    expect(LANGUAGES).toContain('de');
  });

  it('beugt deutsche Themes nach dem Genus', () => {
    const theme = themeBySlug(GERMAN_THEME)!;
    const endings: Record<string, string> = { m: 'er', f: 'e', n: 'es', p: 'e' };
    const { suggestions } = suggest({
      themeSlug: GERMAN_THEME,
      count: 40,
      wordCount: 2,
      mutationChance: 0,
      language: 'de',
      seed: 7,
    });
    const front = suggestions.filter((s) => s.pattern === 'adj-theme' || s.pattern === 'verb-theme');
    expect(front.length).toBeGreaterThan(0);
    for (const s of front) {
      const index = theme.words.indexOf(s.sourceWords[0]);
      const gender = theme.genders[index] || 'm';
      expect(s.name.split(' ')[0].toLowerCase().endsWith(endings[gender])).toBe(true);
    }
  });

  it('stellt im Deutschen nie ein Partizip nach', () => {
    const { suggestions } = suggest({
      themeSlug: GERMAN_THEME,
      count: 60,
      wordCount: 2,
      language: 'de',
      seed: 11,
    });
    expect(suggestions.every((s) => s.pattern !== 'theme-verb')).toBe(true);
  });

  it('neutrale Themes folgen der gewaehlten Sprache', () => {
    expect(effectiveLanguage(themeBySlug('racehorses')!, 'de')).toBe('de');
    expect(effectiveLanguage(themeBySlug('racehorses')!, 'en')).toBe('en');
    // Ein gebundenes Theme laesst sich nicht umstellen.
    expect(effectiveLanguage(themeBySlug(GERMAN_THEME)!, 'en')).toBe('de');
    expect(effectiveLanguage(themeBySlug('animals')!, 'de')).toBe('en');
  });

  it('zeigt pro Sprache die eigenen plus die neutralen Themes', () => {
    const de = visibleThemes('de').map((t) => t.slug);
    expect(de).toContain('tierwelt');
    expect(de).toContain('racehorses');
    expect(de).not.toContain('animals');
    expect(de).toContain('random-de');
    expect(de).not.toContain('random');

    const en = visibleThemes('en').map((t) => t.slug);
    expect(en).toContain('animals');
    expect(en).not.toContain('tierwelt');
    expect(en).toContain('random');
  });

  it('das Random-Theme mischt keine Sprachen', () => {
    const german = new Set(
      themes()
        .filter((t) => t.language === 'de')
        .flatMap((t) => t.words),
    );
    const randomEn = themeBySlug('random')!;
    // Nur Woerter, die es auch in einem englischen oder neutralen Theme gibt.
    const erlaubt = new Set(
      themes()
        .filter((t) => (t.language === 'en' || t.language === 'neutral') && !t.slug.startsWith('random'))
        .flatMap((t) => t.words),
    );
    expect(randomEn.words.every((w) => erlaubt.has(w))).toBe(true);
    expect(randomEn.words.some((w) => german.has(w) && !erlaubt.has(w))).toBe(false);
  });
});

describe('Daten', () => {
  it('enthaelt die erwarteten Themes und Woerter', () => {
    const list = themes().filter((t) => !t.slug.startsWith('random'));
    expect(list.length).toBe(23);
    expect(list.reduce((n, t) => n + t.words.length, 0)).toBe(2638);
  });

  it('deutsche Themes fuehren ein Genus pro Wort', () => {
    for (const theme of themes().filter((t) => t.language === 'de' && !t.slug.startsWith('random'))) {
      expect(theme.genders.length).toBe(theme.words.length);
      expect(theme.genders.every((g) => ['m', 'f', 'n', 'p'].includes(g))).toBe(true);
    }
  });
});

describe('Rng', () => {
  it('ist bei gleichem Seed reproduzierbar', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    expect([a.random(), a.random()]).toEqual([b.random(), b.random()]);
  });

  it('bleibt in [0, 1)', () => {
    const rng = new Rng(9);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('sample liefert verschiedene Elemente', () => {
    const rng = new Rng(4);
    const picked = rng.sample([1, 2, 3, 4], 4);
    expect(new Set(picked).size).toBe(4);
  });

  it('seedFromString ist stabil', () => {
    expect(seedFromString('Sitemap')).toBe(seedFromString('Sitemap'));
    expect(seedFromString('Sitemap')).not.toBe(seedFromString('sitemap'));
  });
});

describe('Mutation', () => {
  it('veraendert ein Wort, ohne es zu zerstoeren', () => {
    const rng = new Rng(3);
    const out = mutate('Pegasus', rng);
    expect(out.length).toBeGreaterThan(2);
    expect(out).toMatch(/^[A-Za-z]+$/);
  });
});
