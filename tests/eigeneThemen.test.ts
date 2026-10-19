import { describe, expect, it } from 'vitest';
import { leseEigenesThema } from '../src/lib/eigeneThemen';
import { addCustomTheme, builtInSlugs, suggest, themeBySlug, themes } from '../src/lib/generator';

const FLUESSE = 'name: Rivers\ndescription: Great rivers\nwords:\n  - Rhine\n  - Danube\n  - Elbe\n';

describe('eigene Themes', () => {
  it('liest eine Datei im Format der TUI', () => {
    const erg = leseEigenesThema(FLUESSE, 'rivers.yaml', new Set());
    expect(erg.ok).toBe(true);
    if (!erg.ok) return;
    expect(erg.theme.slug).toBe('rivers');
    expect(erg.theme.words).toEqual(['Rhine', 'Danube', 'Elbe']);
    expect(erg.theme.custom).toBe(true);
    expect(erg.theme.language).toBe('en');
  });

  it('versteht Genus-Marker wie die TUI', () => {
    const erg = leseEigenesThema('name: Flüsse\nlanguage: de\nwords:\n  - Rhein|m\n  - Donau|f\n', 'fluesse.yml', new Set());
    expect(erg.ok && erg.theme.genders).toEqual(['m', 'f']);
  });

  it('unterscheidet kaputt, leer und belegt', () => {
    expect(leseEigenesThema('name: [offen', 'a.yaml', new Set())).toEqual({ ok: false, fehler: 'kaputt' });
    expect(leseEigenesThema('- nur eine Liste', 'a.yaml', new Set())).toEqual({ ok: false, fehler: 'kaputt' });
    expect(leseEigenesThema('name: Leer\nwords: []\n', 'a.yaml', new Set())).toEqual({ ok: false, fehler: 'leer' });
    expect(leseEigenesThema(FLUESSE, 'mountains.yaml', builtInSlugs())).toEqual({ ok: false, fehler: 'belegt' });
  });

  it('ein geladenes Thema liefert Namen und laesst Random in Ruhe', () => {
    const random = themeBySlug('random')?.words;
    const erg = leseEigenesThema(FLUESSE, 'rivers.yaml', builtInSlugs());
    if (!erg.ok) throw new Error('erwartet ok');
    addCustomTheme(erg.theme);
    addCustomTheme(erg.theme);
    expect(themes().filter((t) => t.slug === 'rivers')).toHaveLength(1);
    expect(themeBySlug('random')?.words).toEqual(random);
    expect(builtInSlugs().has('rivers')).toBe(false);
    const stapel = suggest({ themeSlug: 'rivers', count: 3, seed: 1 });
    expect(stapel.suggestions.length).toBeGreaterThan(0);
  });
});
