import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Liest den Startzustand aus der URL, damit Permalinks funktionieren. */
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

export default function Generator() {
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [themeSlug, setThemeSlug] = useState<string>('random');
  const [mutation, setMutation] = useState<number>(35);
  const [wordCount, setWordCount] = useState<number>(2);
  const [count, setCount] = useState<number>(20);
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [copied, setCopied] = useState<string>('');
  const listRef = useRef<HTMLUListElement>(null);
  const firstRender = useRef(true);

  const available: WordList[] = useMemo(() => visibleThemes(language), [language]);
  const theme = themeBySlug(themeSlug);

  // Startzustand aus der URL uebernehmen (Permalink).
  useEffect(() => {
    const state = readUrlState();
    if (!state) return;
    if (state.language && LANGUAGES.includes(state.language)) setLanguage(state.language);
    if (state.theme && themeBySlug(state.theme)) setThemeSlug(state.theme);
    if (state.seed !== null) setSeed(state.seed);
    if (state.mutation !== null) setMutation(Math.max(0, Math.min(100, state.mutation)));
    if (state.words !== null) setWordCount(Math.max(1, Math.min(3, state.words)));
  }, []);

  // Faellt das Theme aus der Sprache, uebernimmt das erste sichtbare.
  useEffect(() => {
    if (!available.some((t) => t.slug === themeSlug)) {
      setThemeSlug(available[0]?.slug ?? 'random');
    }
  }, [available, themeSlug]);

  // Ein Theme darf seinen eigenen Mutations-Startwert vorgeben (z.B. 0 fuer
  // deutsche Themes, deren Woerter die Mutation zerlegen wuerde).
  useEffect(() => {
    if (theme?.defaultMutation !== null && theme?.defaultMutation !== undefined) {
      setMutation(theme.defaultMutation);
    }
    // Nur beim Theme-Wechsel, nicht bei jedem Renderdurchlauf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!theme) return [];
    return suggest({
      themeSlug,
      count,
      mutationChance: mutation / 100,
      wordCount,
      language,
      seed,
    }).suggestions;
  }, [themeSlug, count, mutation, wordCount, language, seed, theme]);

  // Retro-Effekt: nur bei einem frischen Stapel, nicht bei jedem Reglerzug.
  const runEffect = useCallback(() => {
    const element = listRef.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('retro-text-effects')
      .then(({ decrypt }) => decrypt(element, { speed: 1.6 }))
      .catch(() => {
        /* Ohne Effekt steht der Text trotzdem da. */
      });
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    runEffect();
  }, [seed, runEffect]);

  const regenerate = () => setSeed(randomSeed());

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(''), 1200);
    } catch {
      /* Ohne Clipboard-Recht bleibt der Text markierbar. */
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
    const url = `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    void copy(url);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <aside className="space-y-5">
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-phosphorDim">Theme</h2>
          <ul className="max-h-72 overflow-y-auto border border-rule bg-panel">
            {available.map((t) => (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => setThemeSlug(t.slug)}
                  title={t.description}
                  aria-current={t.slug === themeSlug}
                  className={`block w-full px-3 py-1.5 text-left text-sm ${
                    t.slug === themeSlug
                      ? 'bg-phosphorDim/40 text-phosphor glow'
                      : 'text-phosphor/70 hover:bg-phosphorDim/20'
                  }`}
                >
                  {t.name}
                  <span className="ml-2 text-[10px] text-phosphorDim">{t.words.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 border border-rule bg-panel p-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-phosphorDim">Settings</h2>

          <label className="block text-sm">
            <span className="text-phosphor/80">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full px-2 py-1 text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-phosphor/80">
              Mutation: <b className="text-amber">{mutation}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={mutation}
              onChange={(e) => setMutation(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="text-phosphor/80">
              Words: <b className="text-amber">{wordCount}</b>
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="mt-1 w-full"
              disabled={Boolean(theme?.patterns.length)}
            />
            {Boolean(theme?.patterns.length) && (
              <span className="text-[11px] text-phosphorDim">locked by theme</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="text-phosphor/80">Suggestions</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full px-2 py-1 text-sm"
            >
              {COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={regenerate}
            className="flex-1 border border-phosphorDim bg-phosphorDim/20 px-3 py-2 text-sm uppercase tracking-widest text-phosphor hover:bg-phosphorDim/40"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={permalink}
            title="Copy a link that reproduces exactly this batch"
            className="border border-rule px-3 py-2 text-sm uppercase tracking-widest text-phosphor/70 hover:text-phosphor"
          >
            Link
          </button>
        </div>
      </aside>

      <section>
        <p className="mb-2 text-xs text-phosphorDim">
          {theme?.description}
          {theme ? ` · seed ${seed}` : ''}
        </p>
        <ul ref={listRef} className="divide-y divide-rule border border-rule bg-panel">
          {suggestions.map((s, index) => (
            <li
              key={`${s.slug}-${index}`}
              className="flex flex-wrap items-baseline gap-x-3 px-3 py-2"
            >
              <span className="w-6 text-right text-xs text-phosphorDim">{index + 1}</span>
              <button
                type="button"
                onClick={() => copy(s.name)}
                title="Copy name"
                className="text-base text-phosphor glow hover:underline"
              >
                {s.name}
              </button>
              <button
                type="button"
                onClick={() => copy(s.slug)}
                title="Copy slug"
                className="text-xs text-phosphorDim hover:text-phosphor"
              >
                {s.slug}
              </button>
              {s.mutated && (
                <span title="phonetic mutation" className="text-xs text-amber">
                  *
                </span>
              )}
            </li>
          ))}
        </ul>
        <p aria-live="polite" className="mt-2 h-4 text-xs text-amber">
          {copied ? `copied: ${copied}` : ''}
        </p>
      </section>
    </div>
  );
}
