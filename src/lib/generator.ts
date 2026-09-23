/**
 * Namensgenerator. Port von generator.py.
 *
 * Die Wortlisten kommen aus src/data/*.json und werden von tools/sync-wordlists.mjs
 * aus dem Python-Repo erzeugt - hier wird nichts von Hand gepflegt.
 */
import themesData from '../data/themes.json';
import modifiersData from '../data/modifiers.json';
import { GERMAN, inflectAttribute } from './grammar';
import { mutate } from './phonetic';
import { Rng, randomSeed, seedFromString } from './rng';

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
  | 'adj-verb-theme';

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
};

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

function modifierPool(language: string, role: string): string[] {
  const pools = MODIFIERS[language] ?? MODIFIERS[DEFAULT_LANGUAGE] ?? {};
  return pools[role]?.words ?? [];
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

/** Erzeugt `count` Rezepte - jedes Theme-Wort hoechstens einmal. */
function generateRecipes(theme: WordList, count: number, language: string, rng: Rng): Recipe[] {
  const lang = effectiveLanguage(theme, language);
  const adjectives = theme.adjectives.length > 0 ? theme.adjectives : modifierPool(lang, 'adjectives');
  const verbs = theme.verbs.length > 0 ? theme.verbs : modifierPool(lang, 'verbs');
  const agents = modifierPool(lang, 'agents');
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
      adjective: adjectives.length > 0 ? rng.choice(adjectives) : '',
      verb: verbs.length > 0 ? rng.choice(verbs) : '',
      agent: agents.length > 0 ? rng.choice(agents) : '',
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
    default:
      name = rendered;
      sources = [recipe.themeWord];
  }

  return { name: titleCase(name), slug: slugify(name), pattern, mutated, sourceWords: sources };
}

export interface SuggestOptions {
  themeSlug: string;
  count?: number;
  mutationChance?: number;
  wordCount?: number;
  language?: string;
  seed?: number;
}

/** Erzeugt einen Stapel Vorschlaege. Gleicher Seed = gleicher Stapel. */
export function suggest(options: SuggestOptions): { suggestions: Suggestion[]; seed: number } {
  const {
    themeSlug,
    count = 20,
    mutationChance = 0.35,
    wordCount = 2,
    language = DEFAULT_LANGUAGE,
    seed = randomSeed(),
  } = options;

  const theme = themeBySlug(themeSlug);
  if (!theme) throw new Error(`Unknown theme: ${themeSlug}`);

  const rng = new Rng(seed);
  const recipes = generateRecipes(theme, count, language, rng);
  return {
    suggestions: recipes.map((r) => render(r, theme, wordCount, mutationChance, language)),
    seed,
  };
}

/** Setzt einen Namen aus Pattern, Themenwort und (schon gebeugten) Modifiern zusammen. */
export function composeName(pattern: Pattern, themeWord: string, modifiers: string[]): string {
  switch (pattern) {
    case 'theme':
      return themeWord;
    case 'theme-verb':
    case 'theme-agent':
      return modifiers.length > 0 ? `${themeWord} ${modifiers[0]}` : themeWord;
    case 'adj-theme-verb':
      return modifiers.length >= 2 ? `${modifiers[0]} ${themeWord} ${modifiers[1]}` : themeWord;
    case 'adj-verb-theme':
      return modifiers.length >= 2 ? `${modifiers[0]} ${modifiers[1]} ${themeWord}` : themeWord;
    default:
      // adj-theme und verb-theme: Modifier vorangestellt.
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

/** Virtuelles Thema fuer ein eigenes Wort: nur dieses Wort, Modifier der gewaehlten Sprache. */
export function seededTheme(word: string, language: string): WordList {
  return {
    slug: 'custom-seed',
    name: word,
    description: '',
    words: [word],
    genders: [],
    adjectives: [],
    verbs: [],
    patterns: [],
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
function generateSeededRecipes(word: string, count: number, language: string, rng: Rng): Recipe[] {
  const adjectives = modifierPool(language, 'adjectives');
  const verbs = modifierPool(language, 'verbs');
  const agents = modifierPool(language, 'agents');
  const patterns = twoWordPatterns(language);
  const recipes: Recipe[] = [];
  const seenTwo = new Set<string>();
  const seenThree = new Set<string>();
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

export interface SeededOptions {
  word: string;
  count?: number;
  mutationChance?: number;
  wordCount?: number;
  language?: string;
  seed?: number;
}

/** Stapel zu einem eigenen Wort ("Sitemap" -> "Silent Sitemap", "Sitemap Runner"). */
export function suggestSeeded(options: SeededOptions): { suggestions: Suggestion[]; seed: number } {
  const {
    word,
    count = 20,
    mutationChance = 0.35,
    wordCount = 2,
    language = DEFAULT_LANGUAGE,
    seed = randomSeed(),
  } = options;
  const trimmed = word.trim();
  if (!trimmed) return { suggestions: [], seed };
  const theme = seededTheme(trimmed, language);
  const recipes = generateSeededRecipes(trimmed, count, language, new Rng(seed));
  return {
    suggestions: recipes.map((r) => render(r, theme, wordCount, mutationChance, language)),
    seed,
  };
}
