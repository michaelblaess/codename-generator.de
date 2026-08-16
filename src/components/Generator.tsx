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

const LANGUAGE_LABELS: Record<string, string> = { en: 'ENGLISH', de: 'DEUTSCH' };
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

function FTaste({
  kuerzel,
  active,
  onClick,
  children,
  title,
}: {
  kuerzel?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="ftaste pixel text-[0.56rem]"
      aria-pressed={active}
      onClick={onClick}
      title={title}
    >
      {kuerzel && <span className="ftaste-kuerzel">{kuerzel} </span>}
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
  const [meldung, setMeldung] = useState<string>('');
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
  const heldName = held?.name;

  useEffect(() => {
    setAktiv(0);
  }, [seed, themeSlug, language, wordCount, mutation, count]);

  // Der Name laeuft Zeichen fuer Zeichen ein - wie ein Titel, der aufgebaut
  // wird. Das Ziel ist reiner Text, deshalb darf retro-text-effects hier
  // arbeiten, ohne Bedienelemente zu zerstoeren.
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
        lauf = print(element, { cps: 38, head: '_' });
      })
      .catch(() => {
        /* Ohne Effekt steht der Name trotzdem da. */
      });
    return () => lauf?.cancel?.();
  }, [heldName]);

  const kopieren = useCallback(async (text: string, was: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMeldung(`${was} IM SPEICHER: ${text}`);
      window.setTimeout(() => setMeldung(''), 2200);
    } catch {
      setMeldung('SPEICHER GESPERRT - TEXT MARKIEREN');
    }
  }, []);

  const permalink = useCallback(() => {
    const p = new URLSearchParams({
      theme: themeSlug,
      lang: language,
      seed: String(seed),
      mut: String(mutation),
      words: String(wordCount),
    });
    void kopieren(`${window.location.origin}${window.location.pathname}?${p}`, 'LINK');
  }, [themeSlug, language, seed, mutation, wordCount, kopieren]);

  const blaettern = useCallback(
    (schritt: number) => {
      setAktiv((n) => {
        const laenge = suggestions.length;
        return laenge === 0 ? 0 : (n + schritt + laenge) % laenge;
      });
    },
    [suggestions.length],
  );

  // Funktionstasten wie in den Spielen der Zeit: F1 startet, F3 wechselt die
  // Sprache, F5 die Wortzahl, F7 nimmt den Namen mit.
  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null;
      if (ziel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)) return;
      const tasten: Record<string, () => void> = {
        F1: () => setSeed(randomSeed()),
        F3: () =>
          setLanguage((l) => LANGUAGES[(LANGUAGES.indexOf(l) + 1) % LANGUAGES.length] ?? l),
        F5: () => setWordCount((w) => (w % 3) + 1),
        F7: () => held && void kopieren(held.name, 'NAME'),
        ArrowRight: () => blaettern(1),
        ArrowLeft: () => blaettern(-1),
        ArrowDown: () => blaettern(1),
        ArrowUp: () => blaettern(-1),
      };
      const aktion = tasten[e.key];
      if (!aktion) return;
      e.preventDefault();
      aktion();
    };
    window.addEventListener('keydown', aufTaste);
    return () => window.removeEventListener('keydown', aufTaste);
  }, [blaettern, held, kopieren]);

  return (
    <>
      {/* --- Der Titel: ein Name, aufgebaut wie ein Spieltitel --- */}
      <section className="border-b-4 border-schwarz bg-schirmTief px-4 py-5 text-center sm:px-8">
        <p className="pixel mb-4 text-[0.56rem] text-hellblau">
          {theme?.name.toUpperCase()} · {language.toUpperCase()} · MUT {mutation}% ·{' '}
          {String(aktiv + 1).padStart(2, '0')}/{String(suggestions.length).padStart(2, '0')}
        </p>
        <p ref={heldRef} className="pixel chrom held">
          {heldName?.toUpperCase() ?? '...'}
        </p>
        <p className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[0.8rem]">
          <button
            type="button"
            onClick={() => held && kopieren(held.slug, 'SLUG')}
            className="text-cyan underline decoration-dotted underline-offset-4 hover:text-gelb"
            title="Slug mitnehmen"
          >
            {held?.slug}
          </button>
          {held?.mutated && <span className="pixel text-[0.56rem] text-rot">MUTIERT</span>}
        </p>
        <p className="pixel mt-4 h-4 text-[0.56rem] text-gruen">{meldung}</p>
      </section>

      <div className="grid gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1fr_15rem]">
        {/* --- Highscore-Tabelle --- */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="pixel text-[0.62rem] text-gelb">TOP {suggestions.length}</h2>
            <span className="pixel text-[0.56rem] text-hellblau">
              RUNDE {String(seed % 10000).padStart(4, '0')}
            </span>
          </div>
          <ol className="border-2 border-hellblau bg-schirm">
            {suggestions.map((s, index) => (
              <li key={`${s.slug}-${index}`}>
                <button
                  type="button"
                  className="rang pixel text-[0.62rem]"
                  aria-current={index === aktiv}
                  onClick={() => setAktiv(index)}
                >
                  <span className="tabular-nums">{String(index + 1).padStart(2, '0')}.</span>
                  <span className="truncate">{s.name.toUpperCase()}</span>
                  <span className="rang-slug hidden text-[0.5rem] opacity-70 sm:inline">
                    {s.mutated ? 'MUT' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <FTaste kuerzel="F1" onClick={() => setSeed(randomSeed())} title="Neue Namen ziehen">
              NEUE RUNDE
            </FTaste>
            <FTaste kuerzel="F7" onClick={() => held && kopieren(held.name, 'NAME')}>
              NAME MITNEHMEN
            </FTaste>
            <FTaste onClick={permalink} title="Link zu genau dieser Runde">
              LINK
            </FTaste>
          </div>
        </div>

        {/* --- Bedienfeld --- */}
        <aside className="space-y-5">
          <section>
            <h2 className="pixel mb-2 text-[0.56rem] text-gelb">THEMA</h2>
            <ul className="kanal h-56 overflow-y-auto border-2 border-hellblau bg-schirmTief">
              {available.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    ref={t.slug === themeSlug ? aktivesThemaRef : undefined}
                    onClick={() => setThemeSlug(t.slug)}
                    title={t.description}
                    aria-current={t.slug === themeSlug}
                    className={`flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left text-[0.76rem] ${
                      t.slug === themeSlug
                        ? 'bg-gelb text-schwarz'
                        : 'text-cyan hover:bg-schirm hover:text-white'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[0.62rem] tabular-nums opacity-70">{t.words.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="pixel mb-2 text-[0.56rem] text-gelb">F3 SPRACHE</h2>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <FTaste key={lang} active={lang === language} onClick={() => setLanguage(lang)}>
                  {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                </FTaste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-2 text-[0.56rem] text-gelb">F5 WÖRTER</h2>
            <div className="flex flex-wrap items-center gap-2">
              {WORDS.map((n) => (
                <FTaste
                  key={n}
                  active={n === wordCount}
                  onClick={() => setWordCount(n)}
                  title={theme?.patterns.length ? 'Dieses Thema gibt die Wortzahl vor' : undefined}
                >
                  {n}
                </FTaste>
              ))}
              {Boolean(theme?.patterns.length) && (
                <span className="text-[0.66rem] text-rot">vom Thema gesetzt</span>
              )}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-2 text-[0.56rem] text-gelb">ZEILEN</h2>
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((n) => (
                <FTaste key={n} active={n === count} onClick={() => setCount(n)}>
                  {n}
                </FTaste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-2 flex items-baseline justify-between text-[0.56rem] text-gelb">
              <span>MUTATION</span>
              <span className="tabular-nums text-rot">{mutation}%</span>
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
            <p className="mt-1 text-[0.7rem] leading-snug text-cyan">
              Verbiegt die Wörter phonetisch. Betroffene Namen tragen{' '}
              <span className="text-rot">MUT</span>.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
