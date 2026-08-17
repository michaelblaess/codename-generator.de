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

- **23 curated themes**, 2655 words: Greek/Egyptian/Norse gods, racehorses, whisky, wines,
  mountains, landmarks, historic ships, Swatch watch models, animals, flowers, gemstones,
  mushrooms, dev verbs and more.
- **English and German.** German inflects the modifier after the noun's gender, so you get
  `Stiller Falke`, `Stille Eule`, `Stilles Wiesel` - not a word-by-word translation. Themes
  built from proper names (gods, racehorses, Swatch models) work in both languages.
- **Phonetic mutation** nudges a word off the dictionary: `Pegasus -> Pegasos`. A `*` marks
  a mutated suggestion.
- **Permalinks.** Every batch has a seed - the `Link` button copies a URL that reproduces
  exactly that batch.
- **Two interface languages.** German lives at `/`, English at `/en/`, both built from
  one dictionary (`src/i18n/ui.ts`). The interface language is separate from the language
  of the generated names, which stays switchable in the panel.
- **Legal pages** for the German requirements: imprint under § 5 DDG and a privacy policy
  that describes what the site actually does - no cookies, no storage, no analytics. The
  smoketest measures that claim instead of trusting it.
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
forgetting to pull them across.

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
src/lib/rng.ts         seedable RNG (mulberry32)
src/data/*.json        generated, do not edit
```

One deliberate difference from the terminal version: Python's `random.Random(seed)` cannot
be reproduced in JavaScript, so the same seed gives different names here than in the TUI.
Within this site seeds are stable, which is what permalinks need.

## Design

The current look follows **Goldrunner** (Atari ST, 1987): black ground, gold, magenta
and green, copper bars along the top edge. The whole page fits one screen - the lists
scroll inside their boxes, the page itself does not.

The earlier C64 look with rainbow copper bars is kept as a fallback and can be checked
out at the tag `design-c64-copperbars`.

## Deployment

Every push to `main` runs the tests, builds and deploys to GitHub Pages. `public/CNAME`
points at the production domain.

## Credits

Retro text effects by [retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js).
Built with [Astro](https://astro.build/), React and Tailwind.

## Disclaimer

No warranty. Generated names come from word lists and may coincide with existing product,
project or company names - check before using one publicly.

## License

Apache License 2.0 - see [LICENSE](LICENSE).
