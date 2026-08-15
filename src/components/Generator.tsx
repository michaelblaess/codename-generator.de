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

/** Stapelnummer aus dem Seed - vierstellig, wie eine Sendenummer im Telex. */
function batchNumber(seed: number): string {
  return String(seed % 10000).padStart(4, '0');
}

interface TasteProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}

function Taste({ active, onClick, children, title }: TasteProps) {
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
  const [meldung, setMeldung] = useState<string>('');
  const listRef = useRef<HTMLOListElement>(null);
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

  // Faellt das Thema aus der Sprache, uebernimmt das erste sichtbare.
  useEffect(() => {
    if (!available.some((t) => t.slug === themeSlug)) {
      setThemeSlug(available[0]?.slug ?? 'random');
    }
  }, [available, themeSlug]);

  // Ein Thema darf seinen Mutations-Startwert vorgeben (deutsche Themen: 0).
  useEffect(() => {
    if (theme?.defaultMutation !== null && theme?.defaultMutation !== undefined) {
      setMutation(theme.defaultMutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug]);

  // Das aktive Thema muss sichtbar sein - bei 23 Eintraegen liegt es nach einem
  // Permalink sonst ausserhalb des Sichtfensters und die Liste wirkt leer.
  useEffect(() => {
    aktivesThemaRef.current?.scrollIntoView({ block: 'nearest' });
  }, [themeSlug, language]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!theme) return [];
    return suggest({ themeSlug, count, mutationChance: mutation / 100, wordCount, language, seed })
      .suggestions;
  }, [themeSlug, count, mutation, wordCount, language, seed, theme]);

  // Der Nadeldrucker legt Zeile fuer Zeile an. Das machen wir selbst statt mit
  // retro-text-effects: dessen print() setzt den Textinhalt des Zielelements neu
  // und wuerde dabei alle Schaltflaechen der Liste loeschen (gemessen: 40 -> 0).
  // Hier bleibt die Struktur unberuehrt, nur die Sichtbarkeit wandert durch.
  const [gedruckt, setGedruckt] = useState<number>(Number.POSITIVE_INFINITY);
  const laufRef = useRef<number>(0);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGedruckt(Number.POSITIVE_INFINITY);
      return;
    }
    const element = listRef.current;
    if (element) {
      element.classList.remove('vorschub');
      void element.offsetWidth;
      element.classList.add('vorschub');
    }
    setGedruckt(0);
    window.clearInterval(laufRef.current);
    laufRef.current = window.setInterval(() => {
      setGedruckt((n) => {
        if (n >= count) {
          window.clearInterval(laufRef.current);
          return Number.POSITIVE_INFINITY;
        }
        return n + 1;
      });
    }, 26);
    return () => window.clearInterval(laufRef.current);
  }, [seed, count]);

  const kopieren = async (text: string, was: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMeldung(`${was} kopiert: ${text}`);
      window.setTimeout(() => setMeldung(''), 1600);
    } catch {
      setMeldung('Zwischenablage nicht verfügbar - Text markieren und kopieren');
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
    void kopieren(`${window.location.origin}${window.location.pathname}?${p}`, 'Link');
  };

  const kopf = [
    `STAPEL ${batchNumber(seed)}`,
    language.toUpperCase(),
    `MUT ${mutation}%`,
    `${wordCount} WORT${wordCount === 1 ? '' : 'E'}`,
    `${count} ZEILEN`,
  ];

  return (
    <>
      {/* Maschinenkopf: was die Maschine gerade eingestellt hat, in einer Zeile. */}
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-dashed border-[#cfc6b6] pb-2 text-[0.72rem] tracking-[0.18em] text-durchschlag">
        <span className="flex flex-wrap gap-x-7 gap-y-1">
          {kopf.map((feld) => (
            <span key={feld}>{feld}</span>
          ))}
        </span>
        <span className="text-druck">
          {theme?.name}
          <span className="kopf-cursor" />
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_15rem]">
        {/* Die Bahn: 001, Name, Slug. Jede zweite Zeile traegt die Greenbar. */}
        <div>
          <ol ref={listRef} className="greenbar -mx-2">
            {suggestions.map((s, index) => (
              <li
                key={`${s.slug}-${index}`}
                data-gedruckt={index < gedruckt ? 'ja' : 'nein'}
                className="zeile group flex items-baseline gap-4 px-2 py-[0.42rem] data-[gedruckt=nein]:invisible"
              >
                <span className="w-8 shrink-0 text-[0.7rem] tabular-nums text-durchschlag">
                  {String(index + 1).padStart(3, '0')}
                </span>
                {index === gedruckt - 1 && (
                  <span aria-hidden="true" className="druckkopf" />
                )}
                <button
                  type="button"
                  onClick={() => kopieren(s.name, 'Name')}
                  className="text-left text-[1.32rem] font-semibold leading-tight tracking-tight text-druck decoration-farbband decoration-2 underline-offset-4 hover:underline"
                >
                  {s.name}
                </button>
                <button
                  type="button"
                  onClick={() => kopieren(s.slug, 'Slug')}
                  className="hidden text-[0.72rem] text-durchschlag hover:text-farbband sm:inline"
                  title="Slug kopieren"
                >
                  {s.slug}
                </button>
                {s.mutated && (
                  <span
                    className="ml-auto shrink-0 text-[0.62rem] tracking-[0.2em] text-farbband"
                    title="phonetisch mutiert"
                  >
                    MUT
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-[#cfc6b6] pt-4">
            <button
              type="button"
              onClick={() => setSeed(randomSeed())}
              className="bg-druck px-5 py-2 text-[0.8rem] tracking-[0.2em] text-papier hover:bg-farbband"
            >
              NEUER STAPEL
            </button>
            <button
              type="button"
              onClick={permalink}
              className="taste"
              title="Link kopieren, der genau diesen Stapel wieder erzeugt"
            >
              LINK ZU DIESEM STAPEL
            </button>
            <span aria-live="polite" className="text-[0.72rem] text-farbband">
              {meldung}
            </span>
          </div>
        </div>

        {/* Bedienfeld. Tasten rasten ein, nur die Mutation ist ein Schieber. */}
        <aside className="space-y-6 text-[0.78rem]">
          <section>
            <h2 className="mb-2 text-[0.66rem] tracking-telex text-durchschlag">THEMA</h2>
            <ul className="kanal h-[15.75rem] overflow-y-auto border border-[#d5ccbc] bg-[#e9e3d7]">
              {available.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    ref={t.slug === themeSlug ? aktivesThemaRef : undefined}
                    onClick={() => setThemeSlug(t.slug)}
                    title={t.description}
                    aria-current={t.slug === themeSlug}
                    className={`flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left ${
                      t.slug === themeSlug
                        ? 'bg-druck text-papier'
                        : 'text-durchschlag hover:bg-[#ded7c9] hover:text-druck'
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
            <h2 className="mb-2 text-[0.66rem] tracking-telex text-durchschlag">SPRACHE</h2>
            <div className="flex gap-1">
              {LANGUAGES.map((lang) => (
                <Taste key={lang} active={lang === language} onClick={() => setLanguage(lang)}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </Taste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[0.66rem] tracking-telex text-durchschlag">
              WÖRTER JE NAME
            </h2>
            <div className="flex gap-1">
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
                <span className="self-center text-[0.62rem] text-farbband">vom Thema gesetzt</span>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-[0.66rem] tracking-telex text-durchschlag">ZEILEN</h2>
            <div className="flex gap-1">
              {COUNTS.map((n) => (
                <Taste key={n} active={n === count} onClick={() => setCount(n)}>
                  {n}
                </Taste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-1 flex items-baseline justify-between text-[0.66rem] tracking-telex text-durchschlag">
              <span>MUTATION</span>
              <span className="tabular-nums text-farbband">{mutation}%</span>
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
            <p className="mt-1 text-[0.68rem] leading-snug text-durchschlag">
              Verbiegt die Wörter phonetisch. Betroffene Zeilen tragen{' '}
              <span className="text-farbband">MUT</span>.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
