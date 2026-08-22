import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { UI, type UiSprache } from '../i18n/ui';
import Musik from './Musik';

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
      className="ftaste pixel text-[0.5rem]"
      aria-pressed={active}
      onClick={onClick}
      title={title}
    >
      {kuerzel && <span className="ftaste-kuerzel">{kuerzel} </span>}
      {children}
    </button>
  );
}

export default function Generator({ sprache }: { sprache: UiSprache }) {
  const t = UI[sprache];
  // Der Zustand aus der Adresse wird beim ERSTEN Rendern gelesen, nicht in
  // einem Effekt. Als Effekt lief er gegen den Themen-Abgleich weiter unten:
  // beide setzen im selben Durchlauf das Thema, der Abgleich gewinnt, und der
  // Permalink lieferte einen anderen Stapel.
  const [start] = useState(() => readUrlState());
  // Die Namenssprache startet in der Sprache der Oberflaeche, bleibt aber
  // getrennt umschaltbar.
  const [language, setLanguage] = useState<string>(() => {
    if (start?.language && LANGUAGES.includes(start.language)) return start.language;
    return LANGUAGES.includes(sprache) ? sprache : DEFAULT_LANGUAGE;
  });
  const [themeSlug, setThemeSlug] = useState<string>(() =>
    start?.theme && themeBySlug(start.theme) ? start.theme : 'random',
  );
  const [mutation, setMutation] = useState<number>(() =>
    start?.mutation !== null && start?.mutation !== undefined
      ? Math.max(0, Math.min(100, start.mutation))
      : 35,
  );
  const [wordCount, setWordCount] = useState<number>(() =>
    start?.words !== null && start?.words !== undefined
      ? Math.max(1, Math.min(3, start.words))
      : 2,
  );
  const [count, setCount] = useState<number>(20);
  const [seed, setSeed] = useState<number>(() => start?.seed ?? randomSeed());
  const [aktiv, setAktiv] = useState<number>(0);
  // Die Statuszeile antwortet wie ein Heimcomputer: im Ruhezustand READY.,
  // nach einer Aktion die Rueckmeldung, danach wieder READY.
  const [meldung, setMeldung] = useState<string>('');
  const [statusFeld, setStatusFeld] = useState<HTMLElement | null>(null);
  const heldRef = useRef<HTMLParagraphElement>(null);
  const aktivesThemaRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);

  const available: WordList[] = useMemo(() => visibleThemes(language), [language]);
  const theme = themeBySlug(themeSlug);

  // Das Feld in der Kopfzeile uebernehmen. Der Platzhalter muss raus, sonst
  // stuenden Platzhalter und Portal-Inhalt nebeneinander.
  useEffect(() => {
    const feld = document.getElementById('statuszeile');
    if (!feld) return;
    feld.textContent = '';
    setStatusFeld(feld);
  }, []);

  useEffect(() => {
    if (!available.some((t) => t.slug === themeSlug)) {
      setThemeSlug(available[0]?.slug ?? 'random');
    }
  }, [available, themeSlug]);

  const themaGewechselt = useRef(false);
  useEffect(() => {
    // Beim ersten Lauf hat die Adresse Vorrang, sonst traegt ein Permalink mit
    // ?mut=0 trotzdem die Vorgabe des Themas.
    const ausAdresse = !themaGewechselt.current && start?.mutation !== null;
    themaGewechselt.current = true;
    if (ausAdresse) return;
    if (theme?.defaultMutation !== null && theme?.defaultMutation !== undefined) {
      setMutation(theme.defaultMutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSlug]);

  useEffect(() => {
    const eintrag = aktivesThemaRef.current;
    const liste = eintrag?.closest('ul');
    if (!eintrag || !liste) return;
    // Bewusst kein scrollIntoView: das scrollt auch das Fenster und reisst den
    // Titelbildschirm aus dem Blick, sobald ein Thema weiter unten aktiv ist.
    liste.scrollTop = eintrag.offsetTop - liste.clientHeight / 2 + eintrag.clientHeight / 2;
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

  // Der Name laeuft Zeichen fuer Zeichen ein. Das Ziel ist reiner Text,
  // deshalb darf retro-text-effects hier arbeiten, ohne Bedienelemente zu
  // zerstoeren.
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

  const kopieren = useCallback(
    async (text: string, was: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMeldung(t.meldungKopiert(was, text));
      window.setTimeout(() => setMeldung(''), 2800);
    } catch {
      setMeldung(t.meldungGesperrt);
      }
    },
    [t],
  );

  const adresseKopieren = useCallback(() => {
    const p = new URLSearchParams({
      theme: themeSlug,
      lang: language,
      seed: String(seed),
      mut: String(mutation),
      words: String(wordCount),
    });
    void kopieren(`${window.location.origin}${window.location.pathname}?${p}`, t.wortAdresse);
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

  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null;
      if (ziel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)) return;
      const tasten: Record<string, () => void> = {
        F1: () => setSeed(randomSeed()),
        F3: () =>
          setLanguage((l) => LANGUAGES[(LANGUAGES.indexOf(l) + 1) % LANGUAGES.length] ?? l),
        F5: () => setWordCount((w) => (w % 3) + 1),
        F7: () => held && void kopieren(held.name, t.wortName),
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
      {statusFeld &&
        createPortal(
          <>
            {meldung || t.bereit}
            {meldung ? null : <span className="blinker" />}
          </>,
          statusFeld,
        )}

      {/* --- Der Name, gross und in Gold --- */}
      <section className="border-y-2 border-gold-tief bg-black/40 px-4 py-3 text-center">
        <p className="pixel mb-2 text-[0.5rem] text-magenta">
          {theme?.name.toUpperCase()} · {language.toUpperCase()} · MUT {mutation}% ·{' '}
          {String(aktiv + 1).padStart(2, '0')}/{String(suggestions.length).padStart(2, '0')}
        </p>
        <p ref={heldRef} className="gold held">
          {heldName?.toUpperCase() ?? '...'}
        </p>
        {/* Der Slug braucht eine Erklaerung - sonst steht da nur ein Wort mit
            Bindestrichen und niemand weiss, wofuer. */}
        <p className="mt-2 flex flex-wrap items-baseline justify-center gap-2 text-[0.78rem]">
          <span className="text-dunst">{t.fuerOrdner}</span>
          <button
            type="button"
            onClick={() => held && kopieren(held.slug, t.wortKurzform)}
            className="text-gruen underline decoration-dotted underline-offset-4 hover:text-gold-hell"
            title={t.kurzformKopieren}
          >
            {held?.slug}
          </button>
          {held?.mutated && <span className="pixel text-[0.5rem] text-magenta">{t.mutiert}</span>}
        </p>
      </section>

      {/* --- Bedienfeld und Bestenliste, beide in der Bildschirmhoehe.
          Das Bedienfeld steht links: dort sucht die Hand zuerst, und die
          Liste rechts daneben bleibt beim Blaettern ruhig stehen. --- */}
      <div className="waechst grid gap-4 px-4 py-3 lg:grid-cols-[15rem_1fr]">
        <div className="flex min-h-0 flex-col lg:order-2">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="pixel text-[0.5rem] text-gold">{t.top(suggestions.length)}</h2>
            <span className="pixel text-[0.5rem] text-magenta">
              {t.runde(String(seed % 10000).padStart(4, '0'))}
            </span>
          </div>
          <ol className="kanal panel min-h-0 flex-1 overflow-y-auto">
            {suggestions.map((s, index) => (
              <li key={`${s.slug}-${index}`}>
                <button
                  type="button"
                  className="rang text-[0.88rem] tracking-wide"
                  aria-current={index === aktiv}
                  onClick={() => setAktiv(index)}
                >
                  <span className="rang-nummer tabular-nums">
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <span className="truncate">{s.name.toUpperCase()}</span>
                  <span className="rang-marke pixel hidden text-[0.44rem] sm:inline">
                    {s.mutated ? 'MUT' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FTaste
              kuerzel="F1"
              onClick={() => {
                setSeed(randomSeed());
                setMeldung(t.meldungNeueRunde);
                window.setTimeout(() => setMeldung(''), 900);
              }}
              title={t.titelNeueRunde}
            >
              {t.neueRunde}
            </FTaste>
            <FTaste
              kuerzel="F7"
              onClick={() => held && kopieren(held.name, t.wortName)}
              title={t.titelNameKopieren}
            >
              {t.nameKopieren}
            </FTaste>
            <Musik sprache={sprache} />
            <FTaste
              onClick={adresseKopieren}
              title={t.titelAdresseKopieren}
            >
              {t.adresseKopieren}
            </FTaste>
          </div>
        </div>

        {/* --- Bedienfeld --- */}
        {/* Die Themenliste traegt dieselbe Groesse wie die Bestenliste
            (0.88rem) - zwei Listen nebeneinander in verschiedenen Groessen
            sehen nach Versehen aus. */}
        <aside className="flex min-h-0 flex-col gap-3 text-[0.88rem] lg:order-1">
          <section className="flex min-h-0 flex-1 flex-col">
            <h2 className="pixel mb-1 text-[0.5rem] text-gold">{t.thema}</h2>
            <ul className="kanal panel min-h-0 flex-1 overflow-y-auto">
              {available.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    ref={t.slug === themeSlug ? aktivesThemaRef : undefined}
                    onClick={() => setThemeSlug(t.slug)}
                    title={t.description}
                    aria-current={t.slug === themeSlug}
                    className={`flex w-full items-baseline justify-between gap-2 px-2 py-[0.1rem] text-left ${
                      t.slug === themeSlug
                        ? 'bg-gold text-schwarz'
                        : 'text-creme hover:bg-lila'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[0.62rem] tabular-nums opacity-60">{t.words.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="pixel mb-1 text-[0.5rem] text-gold">{t.sprache}</h2>
            <div className="flex flex-wrap gap-1">
              {LANGUAGES.map((lang) => (
                <FTaste key={lang} active={lang === language} onClick={() => setLanguage(lang)}>
                  {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                </FTaste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-1 text-[0.5rem] text-gold">{t.woerter}</h2>
            <div className="flex flex-wrap items-center gap-1">
              {WORDS.map((n) => (
                <FTaste
                  key={n}
                  active={n === wordCount}
                  onClick={() => setWordCount(n)}
                  title={theme?.patterns.length ? t.titelWortzahlFest : undefined}
                >
                  {n}
                </FTaste>
              ))}
              {Boolean(theme?.patterns.length) && (
                <span className="text-[0.62rem] text-magenta">{t.fest}</span>
              )}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-1 text-[0.5rem] text-gold">{t.zeilen}</h2>
            <div className="flex flex-wrap gap-1">
              {COUNTS.map((n) => (
                <FTaste key={n} active={n === count} onClick={() => setCount(n)}>
                  {n}
                </FTaste>
              ))}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-1 flex items-baseline justify-between text-[0.5rem] text-gold">
              <span>{t.mutation}</span>
              <span className="tabular-nums text-magenta">{mutation}%</span>
            </h2>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={mutation}
              onChange={(e) => setMutation(Number(e.target.value))}
              aria-label={t.mutation}
              title={t.titelMutation}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
