/**
 * Namensgenerator. Port von generator.py.
 *
 * Die Wortlisten kommen aus src/data/*.json und werden von tools/sync-wordlists.mjs
 * aus dem Python-Repo erzeugt - hier wird nichts von Hand gepflegt.
 */
import themesData from '../data/themes.json';
import modifiersData from '../data/modifiers.json';
import { blendPairs, coinModel, coinWords } from './coinage';
import { GERMAN, inflectAttribute } from './grammar';
import { mutate } from './phonetic';
import { Rng, randomSeed, seedFromString } from './rng';
import { NO_FILTER, type NameFilter, filterActive, matches, soundScore } from './scoring';

export const RANDOM_THEME_SLUG = 'random';
export const DEFAULT_LANGUAGE = 'en';
export const NEUTRAL_LANGUAGE = 'neutral';

const MUTATION_RETRIES = 5;

export type Pattern =
  | 'adj-theme'
  | 'verb-theme'
  | 'theme-verb'
  | 'theme-agent'
  | 'theme'
  | 'adj-theme-verb'
  | 'adj-verb-theme'
  // Anker: eigenes Wort zusammen mit einem Themenwort, nie gebeugt.
  | 'anchor-theme'
  | 'theme-anchor';

/** Was beim Variieren stehen bleibt: das Themenwort oder die Zusaetze. */
export type VariantKeep = 'word' | 'modifier';

/** Wie die Namen der Themenansicht entstehen - wie Method in generator.py. */
export type Method = 'words' | 'coined' | 'blend' | 'acronym';
export const METHODS: Method[] = ['words', 'coined', 'blend', 'acronym'];

/** Toene der Zusaetze, Reihenfolge wie in wordlist.py. */
export const TONES = ['dark', 'bright', 'noble', 'swift', 'calm', 'fierce'] as const;
export type Tone = (typeof TONES)[number];

export const ACRONYM_MAX_LETTERS = 3;

// Mit Filter faellt ein Teil der Namen weg - der Vorrat wird groesser gezogen.
export const FILTER_POOL_FACTOR = 8;

/** Wo das eigene Wort im Namen steht. */
export type AnchorPosition = 'any' | 'front' | 'back';
export const ANCHOR_POSITIONS: AnchorPosition[] = ['any', 'front', 'back'];

export interface WordList {
  slug: string;
  name: string;
  description: string;
  words: string[];
  genders: string[];
  adjectives: string[];
  verbs: string[];
  patterns: string[];
  mutate: boolean;
  defaultMutation: number | null;
  language: string;
  // Nur bei Zusatzlisten: Ton -> Woerter dieses Tons.
  tones?: Record<string, string[]>;
}

export interface Suggestion {
  name: string;
  slug: string;
  pattern: Pattern;
  mutated: boolean;
  sourceWords: string[];
}

export interface Recipe {
  themeWord: string;
  adjective: string;
  verb: string;
  agent: string;
  patternIndex: number;
  mutationRoll: number;
  mutationSeed: number;
  // Eigenes Wort bei anchor-theme / theme-anchor, sonst leer.
  anchor?: string;
}

// Anzahl der Komponenten (Modifier + Theme-Wort) pro Pattern.
export const PATTERN_WORD_COUNT: Record<Pattern, number> = {
  theme: 1,
  'adj-theme': 2,
  'verb-theme': 2,
  'theme-verb': 2,
  'theme-agent': 2,
  'adj-theme-verb': 3,
  'adj-verb-theme': 3,
  'anchor-theme': 2,
  'theme-anchor': 2,
};

// Modifier vor dem Themenwort - beim eigenen Wort heisst das: das Wort steht hinten.
const PREFIX_PATTERNS: Pattern[] = ['adj-theme', 'verb-theme'];

const TWO_WORD_PATTERNS: Pattern[] = ['adj-theme', 'verb-theme', 'theme-verb', 'theme-agent'];

// Deutsch kennt kein nachgestelltes Partizip: "Falke Jagend" ist keine
// Wortstellung, "Jagender Falke" schon.
const TWO_WORD_PATTERNS_DE: Pattern[] = ['adj-theme', 'verb-theme', 'theme-agent'];

function twoWordPatterns(language: string): Pattern[] {
  return language === GERMAN ? TWO_WORD_PATTERNS_DE : TWO_WORD_PATTERNS;
}

function threeWordPattern(language: string): Pattern {
  return language === GERMAN ? 'adj-verb-theme' : 'adj-theme-verb';
}

/** Zwei-Wort-Patterns fuer das eigene Wort mit Zusaetzen, gefiltert nach Position. */
export function anchorModifierPatterns(language: string, position: AnchorPosition): Pattern[] {
  const patterns = twoWordPatterns(language);
  if (position === 'front') return patterns.filter((p) => !PREFIX_PATTERNS.includes(p));
  if (position === 'back') return patterns.filter((p) => PREFIX_PATTERNS.includes(p));
  return patterns;
}

/** Patterns fuer das eigene Wort mit einem Partner-Thema, gefiltert nach Position. */
export function anchorThemePatterns(position: AnchorPosition): Pattern[] {
  if (position === 'front') return ['anchor-theme'];
  if (position === 'back') return ['theme-anchor'];
  return ['anchor-theme', 'theme-anchor'];
}

// Zeichen, die im Slug ausgeschrieben gehoeren statt zerlegt zu werden.
const TRANSLITERATIONS: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', œ: 'oe', ø: 'oe',
};

/**
 * ASCII-Slug. Umlaute werden ausgeschrieben, nicht entfernt - sonst wird aus
 * "Gruener Blitz" (mit Umlaut) ein "gr-ner-blitz".
 */
export function slugify(text: string): string {
  const lowered = text.toLowerCase().replace(/[äöüßæœø]/g, (ch) => TRANSLITERATIONS[ch] ?? ch);
  // Was die Tabelle nicht kennt (Akzente aller Art), wird zerlegt und die
  // kombinierenden Zeichen fallen weg.
  const asciiOnly = lowered.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return asciiOnly.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Grosse Anfangsbuchstaben wie Pythons str.title(). Jeder Buchstabe, dem kein
 * Buchstabe vorausgeht, wird gross - auch jenseits von Latin-1 (Œ, Ł, Griechisch),
 * sonst weicht ein eigenes Wort wie "œuvre" von der TUI ab.
 */
export function titleCase(text: string): string {
  return text.replace(/\p{L}+/gu, (w) => {
    const [first, ...rest] = [...w];
    return first.toUpperCase() + rest.join('').toLowerCase();
  });
}

const THEMES = themesData as WordList[];
const MODIFIERS = modifiersData as Record<string, Record<string, WordList>>;

export const LANGUAGES: string[] = Object.keys(MODIFIERS).sort((a, b) =>
  a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b),
);

/**
 * Sprache, in der ein Theme benannt wird. Ein sprachgebundenes Theme bestimmt
 * sie selbst, nur neutrale Themes (Eigennamen) folgen der Auswahl.
 */
export function effectiveLanguage(theme: WordList, language?: string): string {
  if (theme.language !== NEUTRAL_LANGUAGE) return theme.language;
  return language || DEFAULT_LANGUAGE;
}

function randomSlug(language: string): string {
  return language === DEFAULT_LANGUAGE ? RANDOM_THEME_SLUG : `${RANDOM_THEME_SLUG}-${language}`;
}

/** Virtuelles Random-Theme: die Woerter EINER Sprache plus die neutralen. */
function buildRandomTheme(language: string): WordList {
  const pooled = new Map<string, string>();
  for (const theme of THEMES) {
    if (theme.language !== language && theme.language !== NEUTRAL_LANGUAGE) continue;
    theme.words.forEach((word, index) => {
      if (!pooled.has(word)) pooled.set(word, theme.genders[index] ?? '');
    });
  }
  const words = [...pooled.keys()].sort();
  const genders = words.map((w) => pooled.get(w) ?? '');
  return {
    slug: randomSlug(language),
    name: `Random (${language.toUpperCase()})`,
    description: `Pooled from every ${language.toUpperCase()} theme`,
    words,
    genders: genders.some(Boolean) ? genders : [],
    adjectives: [],
    verbs: [],
    patterns: [],
    mutate: true,
    // Die Mutation ist auf englische Wortformen zugeschnitten.
    defaultMutation: language === DEFAULT_LANGUAGE ? null : 0,
    language,
  };
}

const ALL_THEMES: WordList[] = [
  ...LANGUAGES.map(buildRandomTheme),
  ...THEMES,
];

export function themes(): WordList[] {
  return ALL_THEMES;
}

/** Themes der gewaehlten Sprache plus die neutralen (Eigennamen). */
export function visibleThemes(language: string): WordList[] {
  return ALL_THEMES.filter(
    (t) => t.language === language || t.language === NEUTRAL_LANGUAGE,
  ).filter((t) => !t.slug.startsWith(RANDOM_THEME_SLUG) || t.slug === randomSlug(language));
}

export function themeBySlug(slug: string): WordList | undefined {
  return ALL_THEMES.find((t) => t.slug === slug);
}

/** Woerter einer Liste mit diesem Ton, in der Reihenfolge von `words`. */
function wordsForTone(list: WordList, tone: string): string[] {
  const tagged = list.tones?.[tone];
  if (!tagged || tagged.length === 0) return [];
  const wanted = new Set(tagged);
  return list.words.filter((w) => wanted.has(w));
}

/**
 * Woerter eines Zusatz-Pools. Ein Ton schraenkt ihn ein - traegt kein Wort
 * den Ton, gilt der ganze Pool.
 */
export function modifierPool(language: string, role: string, tone = ''): string[] {
  const pools = MODIFIERS[language] ?? MODIFIERS[DEFAULT_LANGUAGE] ?? {};
  const list = pools[role];
  if (!list) return [];
  const toned = tone ? wordsForTone(list, tone) : [];
  return toned.length > 0 ? toned : list.words;
}

/**
 * Zusaetze fuer ein Thema: eigene Liste des Themas oder der Pool der Sprache.
 * Eigene Listen tragen keine Toene, ein Ton filtert sie ueber den Sprach-Pool.
 */
function themePool(theme: WordList, language: string, role: string, tone = ''): string[] {
  const own = role === 'adjectives' ? theme.adjectives : role === 'verbs' ? theme.verbs : [];
  if (own.length === 0) return modifierPool(language, role, tone);
  if (!tone) return own;
  const tagged = new Set(modifierPool(language, role, tone));
  const filtered = own.filter((w) => tagged.has(w));
  return filtered.length > 0 ? filtered : own;
}

/** Woerter mit dem Anfangsbuchstaben von `word` - ohne Treffer der ganze Pool. */
export function sameInitial(pool: string[], word: string): string[] {
  const initial = [...word][0]?.toLowerCase() ?? '';
  const found = pool.filter((w) => ([...w][0]?.toLowerCase() ?? '') === initial);
  return found.length > 0 ? found : pool;
}

/** Akronym-Eingabe bereinigen: nur Buchstaben, klein, hoechstens drei. */
export function normalizeLetters(raw: string): string {
  return [...raw.toLowerCase()]
    .filter((ch) => /\p{L}/u.test(ch))
    .slice(0, ACRONYM_MAX_LETTERS)
    .join('');
}

function genderOf(theme: WordList, word: string): string {
  if (theme.genders.length === 0) return '';
  const index = theme.words.indexOf(word);
  return index >= 0 ? (theme.genders[index] ?? '') : '';
}

function selectPattern(
  theme: WordList,
  recipe: Recipe,
  wordCount: number,
  language: string,
): Pattern {
  // Theme-eigene Patterns haben Vorrang - die Wortzahl ist dann festgelegt.
  if (theme.patterns.length > 0) {
    const declared = theme.patterns.filter((p): p is Pattern => p in PATTERN_WORD_COUNT);
    if (declared.length > 0) return declared[recipe.patternIndex % declared.length];
  }
  const lang = effectiveLanguage(theme, language);
  const modifiers = wordCount - recipe.themeWord.split(/\s+/).length;
  if (modifiers <= 0) return 'theme';
  if (modifiers === 1) {
    const choices = twoWordPatterns(lang);
    return choices[recipe.patternIndex % choices.length];
  }
  return threeWordPattern(lang);
}

/**
 * Erzeugt `count` Rezepte - jedes Theme-Wort hoechstens einmal. `alliterate`
 * zieht die Zusaetze bevorzugt mit dem Anfangsbuchstaben des Themenworts.
 * Ohne Ton und Alliteration bleibt die Zugfolge die alte (Permalinks).
 */
function generateRecipes(
  theme: WordList,
  count: number,
  language: string,
  rng: Rng,
  tone = '',
  alliterate = false,
): Recipe[] {
  const lang = effectiveLanguage(theme, language);
  const adjectives = themePool(theme, lang, 'adjectives', tone);
  const verbs = themePool(theme, lang, 'verbs', tone);
  const agents = modifierPool(lang, 'agents', tone);
  const pick = (pool: string[], word: string) => rng.choice(alliterate ? sameInitial(pool, word) : pool);
  const patternChoices = twoWordPatterns(lang).length;

  const recipes: Recipe[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 40;
  for (let attempt = 0; attempt < maxAttempts && recipes.length < count; attempt += 1) {
    const themeWord = rng.choice(theme.words);
    const key = themeWord.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipes.push({
      themeWord,
      adjective: adjectives.length > 0 ? pick(adjectives, themeWord) : '',
      verb: verbs.length > 0 ? pick(verbs, themeWord) : '',
      agent: agents.length > 0 ? pick(agents, themeWord) : '',
      patternIndex: rng.range(patternChoices),
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
    });
  }
  return recipes;
}

export function render(
  recipe: Recipe,
  theme: WordList,
  wordCount: number,
  mutationChance: number,
  language: string,
): Suggestion {
  const pattern = selectPattern(theme, recipe, wordCount, language);

  let rendered = recipe.themeWord;
  let mutated = false;
  if (theme.mutate && recipe.mutationRoll < mutationChance) {
    const seeded = new Rng(recipe.mutationSeed);
    for (let i = 0; i < MUTATION_RETRIES; i += 1) {
      const candidate = mutate(recipe.themeWord, seeded);
      if (candidate !== recipe.themeWord) {
        rendered = candidate;
        mutated = true;
        break;
      }
    }
  }

  // Vorangestellte Modifier werden gebeugt. Das Genus haengt am Original-Wort,
  // nicht an der mutierten Form.
  const lang = effectiveLanguage(theme, language);
  const gender = genderOf(theme, recipe.themeWord);
  const adjective = inflectAttribute(recipe.adjective, gender, lang);
  const attributiveVerb = inflectAttribute(recipe.verb, gender, lang);

  let name: string;
  let sources: string[];
  switch (pattern) {
    case 'adj-theme':
      name = `${adjective} ${rendered}`;
      sources = [recipe.themeWord, adjective];
      break;
    case 'verb-theme':
      name = `${attributiveVerb} ${rendered}`;
      sources = [recipe.themeWord, attributiveVerb];
      break;
    case 'theme-verb':
      name = `${rendered} ${recipe.verb}`;
      sources = [recipe.themeWord, recipe.verb];
      break;
    case 'theme-agent':
      // Ohne Agent-Pool auf das Verb ausweichen, statt ein Leerzeichen anzuhaengen.
      if (recipe.agent) {
        name = `${rendered} ${recipe.agent}`;
        sources = [recipe.themeWord, recipe.agent];
      } else {
        name = `${rendered} ${recipe.verb}`;
        sources = [recipe.themeWord, recipe.verb];
      }
      break;
    case 'adj-theme-verb':
      name = `${adjective} ${rendered} ${recipe.verb}`;
      sources = [recipe.themeWord, adjective, recipe.verb];
      break;
    case 'adj-verb-theme':
      name = `${adjective} ${attributiveVerb} ${rendered}`;
      sources = [recipe.themeWord, adjective, attributiveVerb];
      break;
    // Der Anker bleibt ungebeugt, er ist ein Name und kein Attribut.
    case 'anchor-theme':
      name = `${recipe.anchor ?? ''} ${rendered}`;
      sources = [recipe.themeWord, recipe.anchor ?? ''];
      break;
    case 'theme-anchor':
      name = `${rendered} ${recipe.anchor ?? ''}`;
      sources = [recipe.themeWord, recipe.anchor ?? ''];
      break;
    default:
      name = rendered;
      sources = [recipe.themeWord];
  }

  return { name: titleCase(name), slug: slugify(name), pattern, mutated, sourceWords: sources };
}

/** Darstellung eines Stapels: Filter und Sortierung nach Klangwert. */
export interface Darstellung {
  filter?: NameFilter;
  sortByScore?: boolean;
}

export interface SuggestOptions extends Darstellung {
  themeSlug: string;
  // Themen-Mix: Slug eines zweiten Themas, je ein Wort aus beiden. Bei
  // Kunstwoertern lernt das Modell auch daraus, bei Kofferwoertern kommt die
  // hintere Haelfte daher.
  mix?: string;
  method?: Method;
  letters?: string;
  tone?: string;
  count?: number;
  mutationChance?: number;
  wordCount?: number;
  language?: string;
  seed?: number;
}

/** Erzeugt einen Stapel Vorschlaege. Gleicher Seed = gleicher Stapel. */
export interface Stapel {
  suggestions: Suggestion[];
  seed: number;
  // Rezepte in der angezeigten Reihenfolge und das Thema - daraus entstehen
  // die Varianten eines Treffers.
  recipes: Recipe[];
  theme: WordList | null;
  // Klangwert je angezeigtem Namen.
  scores: number[];
}

/** Vorrat fuer einen Stapel - mit Filter groesser, damit die Liste voll wird. */
function poolCount(count: number, filter: NameFilter): number {
  return filterActive(filter) ? count * FILTER_POOL_FACTOR : count;
}

/**
 * Rendert Rezepte und wendet Filter, Sortierung und Anzahl an. Jeder Name
 * behaelt sein Rezept - Variieren trifft so auch nach dem Sortieren richtig.
 */
function present(
  recipes: Recipe[],
  theme: WordList,
  wordCount: number,
  mutationChance: number,
  language: string,
  darstellung: Darstellung,
  limit: number,
  seed: number,
): Stapel {
  const filter = darstellung.filter ?? NO_FILTER;
  const lang = effectiveLanguage(theme, language);
  let items = recipes.map((recipe) => {
    const suggestion = render(recipe, theme, wordCount, mutationChance, language);
    return { recipe, suggestion, score: soundScore(suggestion.name, lang) };
  });
  if (filterActive(filter)) items = items.filter((item) => matches(item.suggestion.name, filter, lang));
  if (darstellung.sortByScore) items = [...items].sort((a, b) => b.score - a.score);
  items = items.slice(0, limit);
  return {
    suggestions: items.map((i) => i.suggestion),
    recipes: items.map((i) => i.recipe),
    scores: items.map((i) => i.score),
    theme,
    seed,
  };
}

/** Das (virtuelle) Thema und seine Rezepte fuer Methode, Mix und Ton - wie build_stack. */
function buildStack(
  base: WordList,
  partner: WordList | undefined,
  method: Method,
  letters: string,
  tone: string,
  alliterate: boolean,
  count: number,
  language: string,
  rng: Rng,
): { theme: WordList; recipes: Recipe[] } {
  if (method === 'coined') {
    const theme = coinedTheme(base, count, language, rng, partner);
    return { theme, recipes: generateRecipes(theme, count, language, rng, tone, alliterate) };
  }
  if (method === 'blend') {
    const theme = blendedTheme(base, partner ?? base, count, language, rng);
    return { theme, recipes: generateRecipes(theme, count, language, rng, tone, alliterate) };
  }
  if (method === 'acronym') {
    const theme = acronymTheme(base, letters, language, tone);
    return { theme, recipes: generateAcronymRecipes(theme, base, letters, count, tone, rng) };
  }
  if (partner) {
    return {
      theme: crossedTheme(base, partner, language),
      recipes: generateCrossedRecipes(base, partner, count, rng),
    };
  }
  return { theme: base, recipes: generateRecipes(base, count, language, rng, tone, alliterate) };
}

export function suggest(options: SuggestOptions): Stapel {
  const {
    themeSlug,
    count = 20,
    mutationChance = 0.35,
    wordCount = 2,
    language = DEFAULT_LANGUAGE,
    seed = randomSeed(),
    mix,
    method = 'words',
    letters = '',
    tone = '',
  } = options;

  const base = themeBySlug(themeSlug);
  if (!base) throw new Error(`Unknown theme: ${themeSlug}`);
  const partner = mix && mix !== themeSlug && method !== 'acronym' ? themeBySlug(mix) : undefined;
  const filter = options.filter ?? NO_FILTER;
  const stack = buildStack(
    base,
    partner,
    method,
    letters,
    tone,
    filter.alliteration,
    poolCount(count, filter),
    language,
    new Rng(seed),
  );
  return present(stack.recipes, stack.theme, wordCount, mutationChance, language, options, count, seed);
}

/** Virtuelles Thema aus Kunstwoertern im Klang von `theme` (und `partner`). */
export function coinedTheme(
  theme: WordList,
  count: number,
  language: string,
  rng: Rng,
  partner?: WordList,
): WordList {
  const words = coinWords(coinModel([...theme.words, ...(partner?.words ?? [])]), rng, count);
  const name = partner ? `${theme.name} x ${partner.name}` : theme.name;
  return {
    slug: `coined-${theme.slug}${partner ? `-${partner.slug}` : ''}`,
    name: `${name} (coined)`,
    description: `new words that sound like ${name}`,
    words,
    genders: [],
    adjectives: [],
    verbs: [],
    patterns: [],
    mutate: false,
    defaultMutation: null,
    language: effectiveLanguage(theme, language),
  };
}

/** Virtuelles Thema aus Kofferwoertern, Genus und Sprache vom hinteren Wort. */
export function blendedTheme(
  first: WordList,
  second: WordList,
  count: number,
  language: string,
  rng: Rng,
): WordList {
  const pairs = blendPairs(first.words, second.words, rng, count);
  const genders = pairs.map(([, b]) => genderOf(second, b));
  const name = first.slug === second.slug ? first.name : `${first.name} x ${second.name}`;
  return {
    slug: `blend-${first.slug}-${second.slug}`,
    name: `${name} (blends)`,
    description: `two words of ${name} melted into one`,
    words: pairs.map(([, , word]) => word),
    genders: genders.some(Boolean) ? genders : [],
    adjectives: [],
    verbs: [],
    patterns: [],
    mutate: false,
    defaultMutation: null,
    language: effectiveLanguage(second, language),
  };
}

// Welche Rolle an welcher Stelle eines Patterns steht - fuer das Akronym.
const PATTERN_ROLES: Partial<Record<Pattern, string[]>> = {
  theme: ['theme'],
  'adj-theme': ['adjective', 'theme'],
  'verb-theme': ['verb', 'theme'],
  'theme-verb': ['theme', 'verb'],
  'theme-agent': ['theme', 'agent'],
  'adj-theme-verb': ['adjective', 'theme', 'verb'],
  'adj-verb-theme': ['adjective', 'verb', 'theme'],
};

function startsWith(word: string, letter: string): boolean {
  return ([...word][0]?.toLowerCase() ?? '') === letter;
}

/** Woerter fuer eine Stelle des Akronyms - ohne Treffer im Ton der ganze Pool. */
function acronymCandidates(
  role: string,
  themeWords: string[],
  theme: WordList,
  language: string,
  tone: string,
  letter: string,
): string[] {
  let pools: string[][];
  if (role === 'theme') pools = [themeWords];
  else if (role === 'agent') pools = [modifierPool(language, 'agents', tone), modifierPool(language, 'agents')];
  else pools = [themePool(theme, language, `${role}s`, tone), themePool(theme, language, `${role}s`)];
  for (const pool of pools) {
    const found = pool.filter((w) => startsWith(w, letter));
    if (found.length > 0) return found;
  }
  return [];
}

function acronymPatterns(
  theme: WordList,
  themeWords: string[],
  letters: string,
  language: string,
  tone: string,
): Pattern[] {
  const chars = [...letters];
  if (chars.length === 0) return [];
  const candidates: Pattern[] =
    chars.length === 1 ? ['theme'] : chars.length === 2 ? twoWordPatterns(language) : [threeWordPattern(language)];
  return candidates.filter((pattern) =>
    (PATTERN_ROLES[pattern] ?? []).every(
      (role, k) => acronymCandidates(role, themeWords, theme, language, tone, chars[k]).length > 0,
    ),
  );
}

/** Virtuelles Thema fuer ein Akronym: einteilige Woerter, feste Patterns. */
export function acronymTheme(theme: WordList, rawLetters: string, language: string, tone = ''): WordList {
  const lang = effectiveLanguage(theme, language);
  const letters = normalizeLetters(rawLetters);
  const single = theme.words.filter((w) => w.split(/\s+/).length === 1);
  const genders = single.map((w) => genderOf(theme, w));
  return {
    slug: `acronym-${theme.slug}`,
    name: `${theme.name}: ${letters.toUpperCase()}`,
    description: `names whose words start with ${[...letters.toUpperCase()].join(', ')}`,
    words: single,
    genders: genders.some(Boolean) ? genders : [],
    adjectives: [],
    verbs: [],
    patterns: acronymPatterns(theme, single, letters, lang, tone),
    mutate: false,
    defaultMutation: null,
    language: lang,
  };
}

/** Rezepte fuer ein Akronym, jede Stelle mit ihrem Buchstaben, ohne doppelte Namen. */
function generateAcronymRecipes(
  acronym: WordList,
  source: WordList,
  rawLetters: string,
  count: number,
  tone: string,
  rng: Rng,
): Recipe[] {
  const chars = [...normalizeLetters(rawLetters)];
  const patterns = acronym.patterns.filter((p): p is Pattern => p in PATTERN_WORD_COUNT);
  const recipes: Recipe[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 40;
  for (let attempt = 0; patterns.length > 0 && recipes.length < count && attempt < maxAttempts; attempt += 1) {
    const index = rng.range(patterns.length);
    const roles = PATTERN_ROLES[patterns[index]] ?? [];
    const chosen: Record<string, string> = { theme: '', adjective: '', verb: '', agent: '' };
    roles.forEach((role, k) => {
      chosen[role] = rng.choice(acronymCandidates(role, acronym.words, source, acronym.language, tone, chars[k]));
    });
    const key = [patterns[index], ...roles.map((role) => chosen[role].toLowerCase())].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    recipes.push({
      themeWord: chosen.theme,
      adjective: chosen.adjective,
      verb: chosen.verb,
      agent: chosen.agent,
      patternIndex: index,
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
    });
  }
  return recipes;
}

/** Setzt einen Namen aus Pattern, Themenwort und (schon gebeugten) Modifiern zusammen. */
export function composeName(pattern: Pattern, themeWord: string, modifiers: string[]): string {
  switch (pattern) {
    case 'theme':
      return themeWord;
    case 'theme-verb':
    case 'theme-agent':
    case 'theme-anchor':
      return modifiers.length > 0 ? `${themeWord} ${modifiers[0]}` : themeWord;
    case 'adj-theme-verb':
      return modifiers.length >= 2 ? `${modifiers[0]} ${themeWord} ${modifiers[1]}` : themeWord;
    case 'adj-verb-theme':
      return modifiers.length >= 2 ? `${modifiers[0]} ${modifiers[1]} ${themeWord}` : themeWord;
    default:
      // adj-theme, verb-theme und anchor-theme: Modifier vorangestellt.
      return modifiers.length > 0 ? `${modifiers[0]} ${themeWord}` : themeWord;
  }
}

/**
 * Rendert einen gemerkten Namen mit der aktuellen Mutation neu. Pattern und
 * Modifier bleiben, nur das Themenwort (erstes Quellwort) kann mutieren. Der
 * Zufall haengt am Slug, damit der Regler nicht flackert.
 */
export function renderFavorite(favorite: Suggestion, mutationChance: number): Suggestion {
  if (favorite.sourceWords.length === 0) return favorite;
  const [themeWord, ...modifiers] = favorite.sourceWords;
  const rng = new Rng(seedFromString(favorite.slug));
  let rendered = themeWord;
  let mutated = false;
  if (rng.random() < mutationChance) {
    for (let i = 0; i < MUTATION_RETRIES; i += 1) {
      const candidate = mutate(themeWord, rng);
      if (candidate !== themeWord) {
        rendered = candidate;
        mutated = true;
        break;
      }
    }
  }
  const name = composeName(favorite.pattern, rendered, modifiers);
  return {
    name: titleCase(name),
    slug: slugify(name),
    pattern: favorite.pattern,
    mutated,
    sourceWords: favorite.sourceWords,
  };
}

/**
 * Virtuelles Thema fuer ein eigenes Wort: nur dieses Wort, Modifier der
 * gewaehlten Sprache. Eine feste Position legt die Patterns und damit zwei
 * Woerter fest.
 */
export function seededTheme(word: string, language: string, position: AnchorPosition = 'any'): WordList {
  return {
    slug: 'custom-seed',
    name: word,
    description: '',
    words: [word],
    genders: [],
    adjectives: [],
    verbs: [],
    patterns: position === 'any' ? [] : anchorModifierPatterns(language, position),
    mutate: true,
    defaultMutation: null,
    language,
  };
}

/**
 * Position und Modifier, die ein Zwei-Wort-Pattern tatsaechlich im Namen zeigt.
 * Die Position gehoert in den Schluessel, das Pattern nicht: manche Woerter
 * stehen in zwei Pools ("forge" ist Verb und Agent).
 */
function visibleModifier(pattern: Pattern, adjective: string, verb: string, agent: string): string {
  if (pattern === 'adj-theme') return `prefix|${adjective.toLowerCase()}`;
  if (pattern === 'verb-theme') return `prefix|${verb.toLowerCase()}`;
  // theme-verb und theme-agent haengen an, ohne Agent-Pool das Verb.
  const suffix = pattern === 'theme-agent' && agent ? agent : verb;
  return `suffix|${suffix.toLowerCase()}`;
}

/**
 * Rezepte mit festem Themenwort. Dedupliziert wird auf dem, was im Namen
 * sichtbar ist - bei zwei Woertern der eine Modifier, bei drei Adjektiv plus
 * Verb. So kommt kein Name doppelt vor (wie in der TUI).
 */
function generateSeededRecipes(
  word: string,
  count: number,
  language: string,
  position: AnchorPosition,
  rng: Rng,
  tone = '',
  alliterate = false,
): Recipe[] {
  const pool = (role: string) => {
    const words = modifierPool(language, role, tone);
    return alliterate ? sameInitial(words, word) : words;
  };
  return modifierRecipes(
    word,
    count,
    anchorModifierPatterns(language, position),
    pool('adjectives'),
    pool('verbs'),
    pool('agents'),
    rng,
  );
}

/**
 * Rezepte mit festem Themenwort und wechselnden Zusaetzen, ohne sichtbare
 * Dublette. `patterns` ist die Liste, in die patternIndex zeigt. `exclude`
 * ist der Treffer, von dem aus variiert wird - er kommt nicht noch einmal.
 * Die Zugfolge ist die alte aus generateSeededRecipes, daran haengen die
 * Permalinks mit ?word=.
 */
function modifierRecipes(
  word: string,
  count: number,
  patterns: Pattern[],
  adjectives: string[],
  verbs: string[],
  agents: string[],
  rng: Rng,
  exclude?: Recipe,
): Recipe[] {
  const recipes: Recipe[] = [];
  const seenTwo = new Set<string>();
  const seenThree = new Set<string>();
  if (exclude) {
    const excluded = patterns[exclude.patternIndex % patterns.length];
    seenTwo.add(visibleModifier(excluded, exclude.adjective, exclude.verb, exclude.agent));
    seenThree.add(`${exclude.adjective}|${exclude.verb}`.toLowerCase());
  }
  const maxAttempts = count * 40;
  for (let attempt = 0; attempt < maxAttempts && recipes.length < count; attempt += 1) {
    const adjective = adjectives.length > 0 ? rng.choice(adjectives) : '';
    const verb = verbs.length > 0 ? rng.choice(verbs) : '';
    const agent = agents.length > 0 ? rng.choice(agents) : '';
    const patternIndex = rng.range(patterns.length);
    const keyTwo = visibleModifier(patterns[patternIndex], adjective, verb, agent);
    const keyThree = `${adjective}|${verb}`.toLowerCase();
    if (seenTwo.has(keyTwo) || seenThree.has(keyThree)) continue;
    seenTwo.add(keyTwo);
    seenThree.add(keyThree);
    recipes.push({
      themeWord: word,
      adjective,
      verb,
      agent,
      patternIndex,
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
    });
  }
  return recipes;
}

/**
 * Virtuelles Thema: das eigene Wort mit den Woertern eines Partner-Themas.
 * Mutiert wird nur das Partner-Wort.
 */
export function anchoredTheme(
  anchor: string,
  partner: WordList,
  language: string,
  position: AnchorPosition = 'any',
): WordList {
  return {
    ...partner,
    slug: `custom-seed-${partner.slug}`,
    name: `${anchor} + ${partner.name}`,
    adjectives: [],
    verbs: [],
    patterns: anchorThemePatterns(position),
    language: effectiveLanguage(partner, language),
  };
}

/** Rezepte aus eigenem Wort und Partner-Thema, jedes Partner-Wort hoechstens einmal, nie das Wort selbst. */
function generateAnchoredRecipes(
  anchor: string,
  partner: WordList,
  count: number,
  position: AnchorPosition,
  rng: Rng,
): Recipe[] {
  const patternChoices = anchorThemePatterns(position).length;
  const kandidaten = partner.words.filter((w) => w.toLowerCase() !== anchor.toLowerCase());
  const recipes: Recipe[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 40;
  for (let attempt = 0; attempt < maxAttempts && kandidaten.length > 0 && recipes.length < count; attempt += 1) {
    const themeWord = rng.choice(kandidaten);
    const key = themeWord.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipes.push({
      themeWord,
      adjective: '',
      verb: '',
      agent: '',
      patternIndex: rng.range(patternChoices),
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
      anchor,
    });
  }
  return recipes;
}

/**
 * Varianten eines Treffers. 'word' haelt das Themenwort und wuerfelt neue
 * Zusaetze aus denselben Pools wie das Thema - das Genus kommt weiter aus dem
 * Thema. 'modifier' haelt Zusaetze, Pattern und Anker und wechselt das
 * Themenwort. Der Ausgangstreffer kommt nicht noch einmal vor.
 */
export function generateVariantRecipes(
  base: Recipe,
  theme: WordList,
  keep: VariantKeep,
  count: number,
  language: string,
  rng: Rng,
  tone = '',
): Recipe[] {
  if (keep === 'modifier') return variantThemeWords(base, theme, count, rng);
  // Bei einem Anker-Treffer wuerden neue Zusaetze den Anker verdraengen.
  if (base.anchor) return [];
  const lang = effectiveLanguage(theme, language);
  const declared = theme.patterns.filter((p): p is Pattern => p in PATTERN_WORD_COUNT);
  // Ein Thema aus einzelnen Woertern (Power words) hat nichts zu variieren.
  if (declared.length > 0 && declared.every((p) => PATTERN_WORD_COUNT[p] <= 1)) return [];
  return modifierRecipes(
    base.themeWord,
    count,
    declared.length > 0 ? declared : twoWordPatterns(lang),
    themePool(theme, lang, 'adjectives', tone),
    themePool(theme, lang, 'verbs', tone),
    modifierPool(lang, 'agents', tone),
    rng,
    base,
  );
}

function variantThemeWords(base: Recipe, theme: WordList, count: number, rng: Rng): Recipe[] {
  const gesperrt = [base.themeWord, base.anchor ?? ''].map((w) => w.toLowerCase());
  const kandidaten = theme.words.filter((w) => !gesperrt.includes(w.toLowerCase()));
  const recipes: Recipe[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 40;
  for (let attempt = 0; attempt < maxAttempts && kandidaten.length > 0 && recipes.length < count; attempt += 1) {
    const themeWord = rng.choice(kandidaten);
    const key = themeWord.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipes.push({
      themeWord,
      adjective: base.adjective,
      verb: base.verb,
      agent: base.agent,
      patternIndex: base.patternIndex,
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
      anchor: base.anchor,
    });
  }
  return recipes;
}

export interface VariantOptions extends Darstellung {
  base: Recipe;
  theme: WordList;
  keep: VariantKeep;
  tone?: string;
  count?: number;
  mutationChance?: number;
  wordCount?: number;
  language?: string;
  seed?: number;
}

/** Stapel mit Varianten eines Treffers. Gleicher Seed = gleiche Varianten. */
export function suggestVariants(options: VariantOptions): Stapel {
  const {
    base,
    theme,
    keep,
    count = 20,
    mutationChance = 0.35,
    wordCount = 2,
    language = DEFAULT_LANGUAGE,
    seed = randomSeed(),
    tone = '',
  } = options;
  const pool = poolCount(count, options.filter ?? NO_FILTER);
  const recipes = generateVariantRecipes(base, theme, keep, pool, language, new Rng(seed), tone);
  return present(recipes, theme, wordCount, mutationChance, language, options, count, seed);
}

/**
 * Virtuelles Thema: zwei Themen gekreuzt ("Taurus Orion"). Technisch ein
 * wechselnder Anker - das Wort aus `first` steht als Anker, das aus `second`
 * als Themenwort. Genus, Mutation und Sprache kommen von `second`.
 */
export function crossedTheme(first: WordList, second: WordList, language: string): WordList {
  return {
    ...second,
    slug: `mix-${first.slug}-${second.slug}`,
    name: `${first.name} x ${second.name}`,
    description: `${first.name} crossed with ${second.name}`,
    adjectives: [],
    verbs: [],
    patterns: anchorThemePatterns('any'),
    language: effectiveLanguage(second, language),
  };
}

/** Je ein Wort aus beiden Themen, jedes Wort hoechstens einmal, nie dasselbe Wort zweimal. */
function generateCrossedRecipes(first: WordList, second: WordList, count: number, rng: Rng): Recipe[] {
  const patternChoices = anchorThemePatterns('any').length;
  const recipes: Recipe[] = [];
  const seenFirst = new Set<string>();
  const seenSecond = new Set<string>();
  const maxAttempts = count * 40;
  for (
    let attempt = 0;
    attempt < maxAttempts && first.words.length > 0 && second.words.length > 0 && recipes.length < count;
    attempt += 1
  ) {
    const anchor = rng.choice(first.words);
    const themeWord = rng.choice(second.words);
    const a = anchor.toLowerCase();
    const b = themeWord.toLowerCase();
    if (a === b || seenFirst.has(a) || seenSecond.has(b)) continue;
    seenFirst.add(a);
    seenSecond.add(b);
    recipes.push({
      themeWord,
      adjective: '',
      verb: '',
      agent: '',
      patternIndex: rng.range(patternChoices),
      mutationRoll: rng.random(),
      mutationSeed: rng.range(0x7fffffff),
      anchor,
    });
  }
  return recipes;
}

export interface SeededOptions extends Darstellung {
  word: string;
  tone?: string;
  // Partner-Thema (Slug). Ohne Partner kommen Adjektive und Verben dazu.
  partner?: string;
  position?: AnchorPosition;
  count?: number;
  mutationChance?: number;
  wordCount?: number;
  language?: string;
  seed?: number;
}

/** Stapel zu einem eigenen Wort ("Sitemap" -> "Silent Sitemap", "Sitemap Runner"). */
export function suggestSeeded(options: SeededOptions): Stapel {
  const {
    word,
    count = 20,
    mutationChance = 0.35,
    wordCount = 2,
    language = DEFAULT_LANGUAGE,
    seed = randomSeed(),
    partner,
    position = 'any',
    tone = '',
  } = options;
  const trimmed = word.trim();
  if (!trimmed) return { suggestions: [], seed, recipes: [], theme: null, scores: [] };
  const filter = options.filter ?? NO_FILTER;
  const pool = poolCount(count, filter);
  const partnerTheme = partner ? themeBySlug(partner) : undefined;
  const theme = partnerTheme
    ? anchoredTheme(trimmed, partnerTheme, language, position)
    : seededTheme(trimmed, language, position);
  const rng = new Rng(seed);
  const recipes = partnerTheme
    ? generateAnchoredRecipes(trimmed, partnerTheme, pool, position, rng)
    : generateSeededRecipes(trimmed, pool, language, position, rng, tone, filter.alliteration);
  return present(recipes, theme, wordCount, mutationChance, language, options, count, seed);
}
