import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  type Suggestion,
  type WordList,
  suggest,
  themeBySlug,
  visibleThemes,
} from '../lib/generator';
import { randomSeed } from '../lib/rng';

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch' };
const COUNTS = [10, 20, 30, 40];
const WORDS = [1, 2, 3];

function readUrlState() {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  const seed = Number(p.get('seed'));
  return {
    theme: p.get('theme') ?? '',
    language: p.get('lang') ?? '',
    seed: Number.isFinite(seed) && p.get('seed') ? seed >>> 0 : null,
    mutation: p.get('mut') ? Number(p.get('mut')) : null,
    words: p.get('words') ? Number(p.get('words')) : null,
  };
}

/** Einsatzkennung aus Seed und Position - jede Operation traegt eine. */
function kennung(seed: number, index: number): string {
  return `OP-${String(seed % 1000).padStart(3, '0')}-${String(index + 1).padStart(2, '0')}`;
}

function Taste({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button type="button" className="taste" aria-pressed={active} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export default function Generator() {
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [themeSlug, setThemeSlug] = useState<string>('random');
  const [mutation, setMutation] = useState<number>(35);
  const [wordCount, setWordCount] = useState<number>(2);
  const [count, setCount] = useState<number>(20);
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [aktiv, setAktiv] = useState<number>(0);
  const [stempel, setStempel] = useState<string>('');
  const heldRef = useRef<HTMLParagraphElement>(null);
  const aktivesThemaRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);

  const available: WordList[] = useMemo(() => visibleThemes(language), [language]);
  const theme = themeBySlug(themeSlug);

  useEffect(() => {
    const state = readUrlState();
    if (!state) return;
    if (state.language && LANGUAGES.includes(state.language)) setLanguage(state.language);
    if (state.theme && themeBySlug(state.theme)) setThemeSlug(state.theme);
    if (state.seed !== null) setSeed(state.seed);
    if (state.mutation !== null) setMutation(Math.max(0, Math.min(100, state.mutation)));
    if (state.words !== null) setWordCount(Math.max(1, Math.min(3, state.words)));
  }, []);

  useEffect(() => {
    if (!available.some((t) => t.slug === themeSlug)) {
      setThemeSlug(available[0]?.slug ?? 'random');
    }
  }, [available, themeSlug]);

  useEffect(() => {
    if (theme?.defaultMutation !== null && theme?.defaultMutation !== undefined) {
      setMutation(theme.defaultMutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug]);

  // Das aktive Thema muss sichtbar sein - bei 23 Eintraegen liegt es nach einem
  // Permalink sonst ausserhalb des Sichtfensters.
  useEffect(() => {
    aktivesThemaRef.current?.scrollIntoView({ block: 'nearest' });
  }, [themeSlug, language]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!theme) return [];
    return suggest({ themeSlug, count, mutationChance: mutation / 100, wordCount, language, seed })
      .suggestions;
  }, [themeSlug, count, mutation, wordCount, language, seed, theme]);

  const held = suggestions[Math.min(aktiv, Math.max(suggestions.length - 1, 0))];

  // Jede Aenderung an den Zutaten fuehrt zurueck auf die erste Karte.
  useEffect(() => {
    setAktiv(0);
  }, [seed, themeSlug, language, wordCount, mutation, count]);

  // Der Name wird gedruckt, Zeichen fuer Zeichen. Das Ziel ist reiner Text -
  // hier darf retro-text-effects arbeiten, ohne Bedienelemente zu zerstoeren.
  const heldName = held?.name;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const element = heldRef.current;
    if (!element || !heldName) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let lauf: { cancel?: () => void } | undefined;
    // Der ESM-Einstieg liegt in src/ - dist/ ist ein IIFE-Bundle ohne Exporte.
    import('retro-text-effects/src/index.js')
      .then(({ print }) => {
        lauf = print(element, { cps: 40, head: '_' });
      })
      .catch(() => {
        /* Ohne Effekt steht der Name trotzdem da. */
      });
    return () => lauf?.cancel?.();
  }, [heldName]);

  const kopieren = async (text: string, was: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStempel(was);
      window.setTimeout(() => setStempel(''), 1500);
    } catch {
      setStempel('GESPERRT');
    }
  };

  const permalink = () => {
    const p = new URLSearchParams({
      theme: themeSlug,
      lang: language,
      seed: String(seed),
      mut: String(mutation),
      words: String(wordCount),
    });
    void kopieren(`${window.location.origin}${window.location.pathname}?${p}`, 'LINK');
  };

  const blaettern = (schritt: number) => {
    if (suggestions.length === 0) return;
    setAktiv((n) => (n + schritt + suggestions.length) % suggestions.length);
  };

  // Pfeiltasten blaettern durch den Stapel - schneller als Klicken, und die
  // Plakette bleibt dabei im Blick.
  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null;
      if (ziel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)) return;
      if (e.key === 'ArrowRight') blaettern(1);
      else if (e.key === 'ArrowLeft') blaettern(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', aufTaste);
    return () => window.removeEventListener('keydown', aufTaste);
  });

  return (
    <>
      {/* --- Die Plakette: eine Operation, gross genug zum Anschauen --- */}
      <section className="plakette mb-12 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="kennung">{held ? kennung(seed, aktiv) : 'OP-000-00'}</span>
          <span className="text-[0.72rem] tracking-[0.22em]">
            {theme?.name} · {language.toUpperCase()}
          </span>
          {held?.mutated && (
            <span className="kennung" style={{ background: 'var(--warn)' }}>
              MUTIERT
            </span>
          )}
          <span className="ml-auto text-[0.72rem] tracking-[0.22em]">
            {String(aktiv + 1).padStart(2, '0')} / {String(suggestions.length).padStart(2, '0')}
          </span>
        </div>

        <p ref={heldRef} className="held">
          {heldName ?? '...'}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => held && kopieren(held.name, 'KOPIERT')}
            className="kennung"
            title="Namen in die Zwischenablage legen"
          >
            NAME KOPIEREN
          </button>
          <button
            type="button"
            onClick={() => held && kopieren(held.slug, 'SLUG')}
            className="text-[0.86rem] underline decoration-2 underline-offset-4"
            title="Slug kopieren"
          >
            {held?.slug}
          </button>
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              className="blaettern kennung"
              onClick={() => blaettern(-1)}
              aria-label="Vorheriger Vorschlag"
            >
              &lt;
            </button>
            <button
              type="button"
              className="blaettern kennung"
              onClick={() => blaettern(1)}
              aria-label="Nächster Vorschlag"
            >
              &gt;
            </button>
          </span>
        </div>

        {stempel && <span className="stempel">{stempel}</span>}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        {/* --- Die Alternativen als Karten im Raster --- */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[0.72rem] tracking-[0.28em]">WEITERE VORSCHLÄGE</h2>
            <span className="text-[0.72rem] tracking-[0.22em] opacity-60">
              STAPEL {String(seed % 10000).padStart(4, '0')}
            </span>
          </div>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((s, index) => (
              <li key={`${s.slug}-${index}`}>
                <button
                  type="button"
                  className="karte w-full"
                  aria-current={index === aktiv}
                  onClick={() => setAktiv(index)}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-[0.62rem] tabular-nums opacity-60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[0.98rem] font-semibold leading-tight">{s.name}</span>
                    {s.mutated && (
                      <span className="ml-auto text-[0.58rem] tracking-[0.2em] text-signal">
                        MUT
                      </span>
                    )}
                  </span>
                  <span className="karte-slug mt-0.5 block text-[0.68rem] opacity-60">{s.slug}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setSeed(randomSeed())} className="hauptschalter">
              NEUE NAMEN
            </button>
            <button type="button" onClick={permalink} className="taste">
              LINK ZU DIESEM STAPEL
            </button>
          </div>
        </div>

        {/* --- Schalttafel --- */}
        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 text-[0.68rem] tracking-[0.28em]">THEMA</h2>
            <ul className="kanal h-[16rem] overflow-y-auto border-2 border-tinte bg-blatt">
              {available.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    ref={t.slug === themeSlug ? aktivesThemaRef : undefined}
                    onClick={() => setThemeSlug(t.slug)}
                    title={t.description}
                    aria-current={t.slug === themeSlug}
                    className={`flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left text-[0.8rem] ${
                      t.slug === themeSlug ? 'bg-tinte text-blatt' : 'hover:bg-warn'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="text-[0.62rem] tabular-nums opacity-60">{t.words.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-[0.68rem] tracking-[0.28em]">SPRACHE</h2>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <Taste key={lang} active={lang === language} onClick={() => setLanguage(lang)}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </Taste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[0.68rem] tracking-[0.28em]">WÖRTER</h2>
            <div className="flex flex-wrap items-center gap-2">
              {WORDS.map((n) => (
                <Taste
                  key={n}
                  active={n === wordCount}
                  onClick={() => setWordCount(n)}
                  title={theme?.patterns.length ? 'Dieses Thema gibt die Wortzahl vor' : undefined}
                >
                  {n}
                </Taste>
              ))}
              {Boolean(theme?.patterns.length) && (
                <span className="text-[0.62rem] text-signal">vom Thema gesetzt</span>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[0.68rem] tracking-[0.28em]">ANZAHL</h2>
            <div className="flex gap-2">
              {COUNTS.map((n) => (
                <Taste key={n} active={n === count} onClick={() => setCount(n)}>
                  {n}
                </Taste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-1 flex items-baseline justify-between text-[0.68rem] tracking-[0.28em]">
              <span>MUTATION</span>
              <span className="tabular-nums text-signal">{mutation}%</span>
            </h2>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={mutation}
              onChange={(e) => setMutation(Number(e.target.value))}
              aria-label="Mutation in Prozent"
            />
            <p className="mt-1 text-[0.68rem] leading-snug opacity-70">
              Verbiegt die Wörter phonetisch. Betroffene Namen tragen{' '}
              <span className="text-signal">MUT</span>.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
