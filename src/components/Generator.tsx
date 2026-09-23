import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ANCHOR_POSITIONS,
  type AnchorPosition,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  type Suggestion,
  type WordList,
  renderFavorite,
  suggest,
  suggestSeeded,
  themeBySlug,
  visibleThemes,
} from '../lib/generator';
import { eigeneIdee, ladeMerkliste, speichereMerkliste } from '../lib/merkliste';
import { randomSeed } from '../lib/rng';
import { UI, type UiSprache } from '../i18n/ui';
import Musik from './Musik';

const LANGUAGE_LABELS: Record<string, string> = { en: 'ENGLISH', de: 'DEUTSCH' };
const COUNTS = [10, 20, 30, 40];
const WORDS = [1, 2, 3];

// Was rechts in der Liste steht: ein Thema, das eigene Wort oder die Merkliste.
// Dieselbe Aufteilung wie in der TUI (Theme-Liste mit Favorites und Custom Seed).
type Ansicht = 'thema' | 'wort' | 'merkliste';

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
    word: (p.get('word') ?? '').trim(),
    partner: p.get('partner') ?? '',
    position: p.get('pos') ?? '',
  };
}

function FTaste({
  kuerzel,
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  kuerzel?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="ftaste pixel text-[0.5rem]"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      disabled={disabled}
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
  const [ansicht, setAnsicht] = useState<Ansicht>(() => (start?.word ? 'wort' : 'thema'));
  const [wort, setWort] = useState<string>(() => start?.word ?? '');
  // Partner des eigenen Worts: leer = Zusaetze, sonst ein Themen-Slug.
  const [partner, setPartner] = useState<string>(() =>
    start?.partner && themeBySlug(start.partner) ? start.partner : '',
  );
  const [position, setPosition] = useState<AnchorPosition>(() =>
    ANCHOR_POSITIONS.includes(start?.position as AnchorPosition)
      ? (start?.position as AnchorPosition)
      : 'any',
  );
  const [idee, setIdee] = useState<string>('');
  // client:only - die Komponente laeuft nur im Browser, der Speicher ist also
  // schon beim ersten Rendern lesbar.
  const [merkliste, setMerkliste] = useState<Suggestion[]>(() => ladeMerkliste());
  const wortFeldRef = useRef<HTMLInputElement>(null);
  const ideeFeldRef = useRef<HTMLInputElement>(null);
  // Nach einem Ansichtswechsel per Taste soll das passende Eingabefeld den
  // Fokus bekommen - erst nach dem Rendern, vorher gibt es das Feld nicht.
  const fokusNach = useRef<'wort' | 'idee' | null>(null);
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
    // offsetTop zaehlt ab dem naechsten positionierten Vorfahren, nicht ab der
    // Liste - deshalb die Lage ueber die Kaesten relativ zur Liste ermitteln.
    const oben =
      eintrag.getBoundingClientRect().top - liste.getBoundingClientRect().top + liste.scrollTop;
    liste.scrollTop = oben - liste.clientHeight / 2 + eintrag.clientHeight / 2;
  }, [themeSlug, language, ansicht]);

  const suggestions: Suggestion[] = useMemo(() => {
    const mutationChance = mutation / 100;
    if (ansicht === 'merkliste') return merkliste.map((f) => renderFavorite(f, mutationChance));
    if (ansicht === 'wort') {
      return suggestSeeded({
        word: wort,
        partner,
        position,
        count,
        mutationChance,
        wordCount,
        language,
        seed,
      }).suggestions;
    }
    if (!theme) return [];
    return suggest({ themeSlug, count, mutationChance, wordCount, language, seed }).suggestions;
  }, [
    ansicht,
    merkliste,
    wort,
    partner,
    position,
    themeSlug,
    count,
    mutation,
    wordCount,
    language,
    seed,
    theme,
  ]);

  // Das Partner-Thema muss in der Namenssprache sichtbar sein, sonst zurueck
  // auf die Zusaetze - dieselbe Regel wie in der TUI.
  useEffect(() => {
    if (partner && !available.some((th) => th.slug === partner)) setPartner('');
  }, [available, partner]);

  // Partner oder feste Position legen zwei Woerter fest.
  const wortzahlFest =
    ansicht === 'merkliste' ||
    (ansicht === 'thema' && Boolean(theme?.patterns.length)) ||
    (ansicht === 'wort' && (Boolean(partner) || position !== 'any'));

  const gemerkt = useMemo(() => new Set(merkliste.map((f) => f.slug)), [merkliste]);

  const held = suggestions[Math.min(aktiv, Math.max(suggestions.length - 1, 0))];
  const heldName = held?.name;

  useEffect(() => {
    setAktiv(0);
  }, [seed, themeSlug, language, wordCount, mutation, count, ansicht, wort]);

  useEffect(() => {
    const ziel = fokusNach.current;
    fokusNach.current = null;
    if (ziel === 'wort') wortFeldRef.current?.focus();
    if (ziel === 'idee') ideeFeldRef.current?.focus();
  }, [ansicht]);

  const oeffne = useCallback((neu: Ansicht, fokus: 'wort' | 'idee' | null = null) => {
    fokusNach.current = fokus;
    setAnsicht(neu);
    // Steht die Ansicht schon, loest setAnsicht keinen Effekt aus - dann
    // direkt fokussieren.
    if (fokus === 'wort') wortFeldRef.current?.focus();
    if (fokus === 'idee') ideeFeldRef.current?.focus();
  }, []);

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

  const melde = useCallback((text: string, dauer = 2800) => {
    setMeldung(text);
    window.setTimeout(() => setMeldung(''), dauer);
  }, []);

  const adresseKopieren = useCallback(() => {
    const p = new URLSearchParams({
      theme: themeSlug,
      lang: language,
      seed: String(seed),
      mut: String(mutation),
      words: String(wordCount),
    });
    if (ansicht === 'wort' && wort.trim()) {
      p.set('word', wort.trim());
      if (partner) p.set('partner', partner);
      if (position !== 'any') p.set('pos', position);
    }
    void kopieren(`${window.location.origin}${window.location.pathname}?${p}`, t.wortAdresse);
  }, [themeSlug, language, seed, mutation, wordCount, ansicht, wort, partner, position, kopieren]);

  const listeKopieren = useCallback(() => {
    if (suggestions.length === 0) return;
    void kopieren(suggestions.map((s) => s.name).join('\n'), t.wortListe);
  }, [suggestions, kopieren, t]);

  /** Neue Merkliste uebernehmen und speichern. Ist der Speicher gesperrt, gilt sie nur fuer diesen Besuch. */
  const aendereMerkliste = useCallback(
    (neu: Suggestion[], text: string) => {
      setMerkliste(neu);
      melde(speichereMerkliste(neu) ? text : t.meldungSpeicherGesperrt);
    },
    [melde, t],
  );

  const merken = useCallback(() => {
    if (ansicht === 'merkliste') {
      // In der Merkliste steht der Name ggf. mutiert da - entfernt wird nach Position.
      if (merkliste.length === 0) return;
      const index = Math.min(aktiv, merkliste.length - 1);
      const name = suggestions[index]?.name ?? merkliste[index].name;
      aendereMerkliste(
        merkliste.filter((_, i) => i !== index),
        t.meldungEntfernt(name),
      );
      return;
    }
    if (!held) return;
    if (gemerkt.has(held.slug)) {
      aendereMerkliste(
        merkliste.filter((f) => f.slug !== held.slug),
        t.meldungEntfernt(held.name),
      );
    } else {
      aendereMerkliste([...merkliste, held], t.meldungGemerkt(held.name));
    }
  }, [ansicht, merkliste, aktiv, suggestions, held, gemerkt, aendereMerkliste, t]);

  const ideeHinzu = useCallback(() => {
    const neu = eigeneIdee(idee);
    if (!neu) return;
    if (gemerkt.has(neu.slug)) {
      melde(t.meldungSchonDa);
      return;
    }
    aendereMerkliste([...merkliste, neu], t.meldungGemerkt(neu.name));
    setIdee('');
  }, [idee, gemerkt, merkliste, aendereMerkliste, melde, t]);

  const neueRunde = useCallback(() => {
    if (ansicht === 'merkliste') {
      melde(t.meldungKeineRunde);
      return;
    }
    setSeed(randomSeed());
    melde(t.meldungNeueRunde, 900);
  }, [ansicht, melde, t]);

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
      // Nur Texteingaben schlucken die Tasten. Ein Schieberegler behaelt nach
      // dem Ziehen den Fokus - F und die F-Tasten muessen trotzdem wirken.
      const ziel = e.target as HTMLElement | null;
      const texteingabe =
        ziel instanceof HTMLInputElement
          ? !['range', 'checkbox', 'radio', 'button'].includes(ziel.type)
          : Boolean(ziel && ['TEXTAREA', 'SELECT'].includes(ziel.tagName));
      if (texteingabe) return;
      // Pfeiltasten gehoeren dem Regler selbst, sonst ist er per Tastatur tot.
      if (ziel instanceof HTMLInputElement && ziel.type === 'range' && e.key.startsWith('Arrow')) {
        return;
      }
      const tasten: Record<string, () => void> = {
        F1: neueRunde,
        F3: () =>
          setLanguage((l) => LANGUAGES[(LANGUAGES.indexOf(l) + 1) % LANGUAGES.length] ?? l),
        F5: () => setWordCount((w) => (w % 3) + 1),
        F7: () => held && void kopieren(held.name, t.wortName),
        ArrowRight: () => blaettern(1),
        ArrowLeft: () => blaettern(-1),
        ArrowDown: () => blaettern(1),
        ArrowUp: () => blaettern(-1),
        // Dieselben Buchstaben wie in der TUI.
        f: merken,
        F: merken,
        i: () => oeffne('wort', 'wort'),
        I: () => oeffne('wort', 'wort'),
        v: () => oeffne('merkliste'),
        V: () => oeffne('merkliste'),
        '+': () => oeffne('merkliste', 'idee'),
      };
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const aktion = tasten[e.key];
      if (!aktion) return;
      e.preventDefault();
      aktion();
    };
    window.addEventListener('keydown', aufTaste);
    return () => window.removeEventListener('keydown', aufTaste);
  }, [blaettern, held, kopieren, merken, neueRunde, oeffne, t]);

  const kopfzeile =
    ansicht === 'merkliste'
      ? t.merkliste
      : ansicht === 'wort'
        ? `${t.eigenesWort}: ${wort.trim() || '-'}`
        : (theme?.name ?? '');

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
          {kopfzeile.toUpperCase()} · {language.toUpperCase()} · MUT {mutation}% ·{' '}
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
            {ansicht !== 'merkliste' && (
              <span className="pixel text-[0.5rem] text-magenta">
                {t.runde(String(seed % 10000).padStart(4, '0'))}
              </span>
            )}
          </div>
          {ansicht === 'wort' && (
            <label className="eingabe mb-2">
              <span className="pixel text-[0.5rem] text-gold">{t.deinWort}</span>
              <input
                ref={wortFeldRef}
                type="text"
                value={wort}
                maxLength={40}
                placeholder={t.platzhalterWort}
                onChange={(e) => setWort(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
          )}
          {ansicht === 'wort' && (
            <div className="eingabe mb-2 flex-wrap">
              <label htmlFor="wort-partner" className="pixel text-[0.5rem] text-gold">
                {t.partner}
              </label>
              <select
                id="wort-partner"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                title={t.titelPartner}
              >
                <option value="">{t.zusaetze}</option>
                {available.map((th) => (
                  <option key={th.slug} value={th.slug}>
                    {th.name}
                  </option>
                ))}
              </select>
              {/* Beschriftung und Tasten brechen gemeinsam um - schmal stand
                  "WORT" sonst allein am Zeilenende. */}
              <span className="flex items-center gap-2">
                <span className="pixel text-[0.5rem] text-gold">{t.stellung}</span>
                {ANCHOR_POSITIONS.map((pos) => (
                  <FTaste
                    key={pos}
                    active={pos === position}
                    onClick={() => setPosition(pos)}
                    title={t.titelStellung}
                  >
                    {t.stellungen[pos]}
                  </FTaste>
                ))}
              </span>
            </div>
          )}
          {ansicht === 'merkliste' && (
            <div className="eingabe mb-2">
              <label htmlFor="eigene-idee" className="pixel text-[0.5rem] text-gold">
                {t.eigeneIdee}
              </label>
              <input
                id="eigene-idee"
                ref={ideeFeldRef}
                type="text"
                value={idee}
                maxLength={60}
                placeholder={t.platzhalterIdee}
                onChange={(e) => setIdee(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') ideeHinzu();
                  if (e.key === 'Escape') e.currentTarget.blur();
                }}
                spellCheck={false}
                autoComplete="off"
                title={t.titelEigeneIdee}
              />
              <FTaste onClick={ideeHinzu} title={t.titelEigeneIdee}>
                {t.dazu}
              </FTaste>
            </div>
          )}
          <ol className="kanal panel min-h-0 flex-1 overflow-y-auto">
            {suggestions.length === 0 && (
              <li className="px-2 py-1 text-dunst">
                {ansicht === 'merkliste' ? t.leerMerkliste : ansicht === 'wort' ? t.leerWort : ''}
              </li>
            )}
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
                  <span className="truncate">
                    {ansicht !== 'merkliste' && gemerkt.has(s.slug) ? '★ ' : ''}
                    {s.name.toUpperCase()}
                  </span>
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
              onClick={neueRunde}
              title={t.titelNeueRunde}
              disabled={ansicht === 'merkliste'}
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
            <FTaste
              onClick={merken}
              title={ansicht === 'merkliste' ? t.titelEntfernen : t.titelMerken}
              active={ansicht !== 'merkliste' && Boolean(held && gemerkt.has(held.slug))}
            >
              {ansicht === 'merkliste' ? t.entfernen : t.merken}
            </FTaste>
            <Musik sprache={sprache} />
            {ansicht === 'merkliste' ? (
              <FTaste onClick={listeKopieren} title={t.titelListeKopieren}>
                {t.listeKopieren}
              </FTaste>
            ) : (
              <FTaste onClick={adresseKopieren} title={t.titelAdresseKopieren}>
                {t.adresseKopieren}
              </FTaste>
            )}
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
              <li>
                <button
                  type="button"
                  ref={ansicht === 'merkliste' ? aktivesThemaRef : undefined}
                  onClick={() => oeffne('merkliste')}
                  title={t.titelMerkliste}
                  aria-current={ansicht === 'merkliste'}
                  className={`thema-eintrag ${ansicht === 'merkliste' ? 'bg-gold text-schwarz' : 'text-gold-hell hover:bg-lila'}`}
                >
                  <span className="truncate">★ {t.merkliste}</span>
                  <span className="text-[0.62rem] tabular-nums opacity-60">{merkliste.length}</span>
                </button>
              </li>
              <li className="border-b border-lila pb-[0.1rem]">
                <button
                  type="button"
                  ref={ansicht === 'wort' ? aktivesThemaRef : undefined}
                  onClick={() => oeffne('wort', 'wort')}
                  title={t.titelEigenesWort}
                  aria-current={ansicht === 'wort'}
                  className={`thema-eintrag ${ansicht === 'wort' ? 'bg-gold text-schwarz' : 'text-gold-hell hover:bg-lila'}`}
                >
                  <span className="truncate">
                    {t.eigenesWort}
                    {wort.trim() ? `: ${wort.trim()}` : ''}
                  </span>
                </button>
              </li>
              {available.map((th) => (
                <li key={th.slug}>
                  <button
                    type="button"
                    ref={ansicht === 'thema' && th.slug === themeSlug ? aktivesThemaRef : undefined}
                    onClick={() => {
                      setAnsicht('thema');
                      setThemeSlug(th.slug);
                    }}
                    title={th.description}
                    aria-current={ansicht === 'thema' && th.slug === themeSlug}
                    className={`thema-eintrag ${
                      ansicht === 'thema' && th.slug === themeSlug
                        ? 'bg-gold text-schwarz'
                        : 'text-creme hover:bg-lila'
                    }`}
                  >
                    <span className="truncate">{th.name}</span>
                    <span className="text-[0.62rem] tabular-nums opacity-60">{th.words.length}</span>
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
                  title={wortzahlFest ? t.titelWortzahlFest : undefined}
                  disabled={ansicht === 'merkliste'}
                >
                  {n}
                </FTaste>
              ))}
              {wortzahlFest && <span className="text-[0.62rem] text-magenta">{t.fest}</span>}
            </div>
          </section>

          <section>
            <h2 className="pixel mb-1 text-[0.5rem] text-gold">{t.zeilen}</h2>
            <div className="flex flex-wrap gap-1">
              {COUNTS.map((n) => (
                <FTaste
                  key={n}
                  active={n === count}
                  onClick={() => setCount(n)}
                  disabled={ansicht === 'merkliste'}
                >
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
