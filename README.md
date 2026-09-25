# codename-generator.de

<p align="center">
  <img src="docs/flags/gb.svg" height="13" alt=""> <b>English</b> ·
  <img src="docs/flags/de.svg" height="13" alt=""> <a href="README.de.md">Deutsch</a>
</p>

---

[![Deploy](https://github.com/michaelblaess/codename-generator.de/actions/workflows/deploy.yml/badge.svg)](https://github.com/michaelblaess/codename-generator.de/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Astro](https://img.shields.io/badge/astro-5-orange?logo=astro&logoColor=white)](https://astro.build/)
[![Themes](https://img.shields.io/badge/themes-23-brightgreen)](src/data/themes.json)

The web face of [codename-generator](https://github.com/michaelblaess/codename-generator),
the terminal app. Same word lists, same rules, phosphor-terminal look. Pick a theme, get a
batch of project codenames, copy what fits. Everything runs in the browser - no backend, no
tracking, nothing leaves the page.

![Screenshot](docs/screenshot.png)

## What it does

- **23 curated themes**, 2638 words: Greek/Egyptian/Norse gods, racehorses, whisky, wines,
  mountains, landmarks, historic ships, animals, flowers, gemstones,
  mushrooms, air traffic control, dev verbs and more.
- **English and German.** German inflects the modifier after the noun's gender, so you get
  `Stiller Falke`, `Stille Eule`, `Stilles Wiesel` - not a word-by-word translation. Themes
  built from proper names (gods, racehorses, whisky) work in both languages.
- **Phonetic mutation** nudges a word off the dictionary: `Pegasus -> Pegasos`. A `*` marks
  a mutated suggestion.
- **Your own word** (key `o`): your word is combined with the modifiers of the chosen
  language, so `Sitemap` becomes `Obsidian Sitemap` or `Sitemap Proxy`. No name appears
  twice in a batch. Instead of modifiers, the word can also be combined with the words of
  a theme (`Sitemap Selene`, `Pollux Sitemap`), and `FRONT`/`BACK` decide where it
  stands. The address `?word=Sitemap&partner=greek-gods&pos=front` opens this view
  directly.
- **Theme mix** (MIX above the list, address `?theme=whisky&mix=constellations`): the theme
  is crossed with a second one, every name takes one word from each (`Rigel
  Andromeda`). No word appears twice in a batch. Themes of the other language work too.
- **Methods** (METHOD above the list): *theme words* is the classic way. *Coined words*
  invents new words that sound like the theme, *blends* melt two theme words at a shared
  letter (`Orion` + `Taurus` = `Orisker`), with a mix the back half comes from the second
  theme. *Acronym* takes up to three letters, every word starts with its letter (`SM` ->
  `Stork Maker`). Address: `?method=acronym&letters=sm`.
- **Tone and filters** (row above the list): TONE limits the modifiers to one mood (dark,
  bright, noble, swift, calm, fierce). STARTS, MAX SYLLABLES and ALLITERATION filter the
  names, a larger pool is drawn so the list stays full. BY SOUND sorts by a score from 0 to
  100 (short, easy to say and to spell) and shows it next to each name. Everything goes
  into the permalink.
- **Varying** (keys `w` and `m`): `w` keeps the word of the big name and rolls new
  modifiers, `m` keeps the modifier and swaps the word - `Jump Pangolin` becomes
  `Magenta Pangolin`, then `Magenta Sloth`. From a variant you can go on, `F1` rolls new
  variants, picking a theme in the list goes back.
- **Shortlist** (key `f` keeps a name, `v` shows the list): kept names stay in your
  browser, and the mutation slider still applies to them. `+` adds ideas of your own,
  `Copy list` puts all names on the clipboard, one per line. The storage format is the one
  the TUI uses for its favorites: `EXPORT` saves the list as a file the TUI reads with
  `--import-favorites`, `IMPORT` takes a file from the TUI (`--export-favorites`, or its
  `settings.json` directly). Both happen in the browser, nothing is uploaded.
- **Permalinks.** Every batch has a seed - the `Link` button copies a URL that reproduces
  exactly that batch.
- **Two interface languages.** German lives at `/`, English at `/en/`, both built from
  one dictionary (`src/i18n/ui.ts`). The interface language is separate from the language
  of the generated names, which starts in English and stays switchable in the panel.
- **Legal pages** for the German requirements: imprint under § 5 DDG and a privacy policy
  that describes what the site actually does - no cookies, no analytics, localStorage only
  for the shortlist and only after you keep your first name. The smoketest measures those
  claims instead of trusting them.
- **Retro effects** via [retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js),
  respecting `prefers-reduced-motion`.

## Development

```
npm install
npm run daten     # pull word lists from the Python repo next door
npm run dev
```

**Content changes always affect both editions.** New themes, new words or a grammar rule
belong in the Python repo first, then get synced here. `npm run daten:pruefen` runs the sync
and fails as soon as the JSON files differ from the Python state - the guard against
forgetting to pull them across. CI runs the same check against a fresh checkout of the
Python repo.

**Shared test vectors.** The core exists twice, in Python and in TypeScript. To keep both
computing the same, the test cases for everything deterministic (slug, title case,
inflection, mutation, composing a name) live in `tests/vectors/core.json` in the Python
repo. `npm run daten` copies the file to `tests/vectors/`, and both pytest and vitest run
against exactly that file. New methods get their vectors first, then the implementation in
both languages.

`npm run daten` reads the YAML files from `../codename-generator` and writes
`src/data/*.json`. The Python repo stays the single source of truth - never edit the JSON
by hand. Pass a path if the repo lives elsewhere:

```
npm run daten -- C:/path/to/codename-generator
```

| Command | What it does |
|---|---|
| `npm run dev` | dev server on :4321 |
| `npm test` | vitest, ports the Python test cases |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve the build |
| `node pruefe-seite.mjs` | browser smoketest against the running preview |

The smoketest needs a headless Chromium once:
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core`

## Architecture

```
src/lib/generator.ts   name assembly, patterns, themes  (port of generator.py)
src/lib/grammar.ts     German inflection                (port of grammar.py)
src/lib/phonetic.ts    phonetic mutation                (port of phonetic.py)
src/lib/coinage.ts     coined words and blends         (port of coinage.py)
src/lib/scoring.ts     syllables, sound score, filters  (port of scoring.py)
src/lib/merkliste.ts   shortlist in localStorage, export/import
src/lib/rng.ts         seedable RNG (mulberry32)
src/data/*.json        generated, do not edit
```

One deliberate difference from the terminal version: Python's `random.Random(seed)` cannot
be reproduced in JavaScript, so the same seed gives different names here than in the TUI.
Within this site seeds are stable, which is what permalinks need.

## Design

The current look follows **Goldrunner** (Atari ST, 1987): black ground, gold, magenta
and green, copper bars along the top edge. On a desktop the whole page fits one screen -
the lists scroll inside their boxes, the page itself does not. Below 1024 px the page
scrolls instead, so the lists keep their height on a phone.

From 1400 px width small gold ships fly in the free margins, turning at the top with the
Uridium flip. Now and then two of them fight Space Invaders style instead: one at the top
nose down, one at the bottom nose up, shooting at each other until one bursts into pixels.
Nothing moves with `prefers-reduced-motion`.

The earlier C64 look with rainbow copper bars is kept as a fallback and can be checked
out at the tag `design-c64-copperbars`.

## Deployment

Every push to `main` checks the data against the Python repo, runs the tests and builds.
Deploying to GitHub Pages is started by hand (`workflow_dispatch`) until Pages is switched
on for the repository. The domain `codename-generator.de` is not registered yet, a `public/CNAME` follows with it.

## Credits

Retro text effects by [retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js).
Built with [Astro](https://astro.build/), React and Tailwind.

## Disclaimer

No warranty. Generated names come from word lists and may coincide with existing product,
project or company names - check before using one publicly.

## License

Apache License 2.0 - see [LICENSE](LICENSE).
