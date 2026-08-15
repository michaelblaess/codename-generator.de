# codename-generator.de

<p align="center">
  <img src="docs/flags/gb.svg" height="13" alt=""> <a href="README.md">English</a> ·
  <img src="docs/flags/de.svg" height="13" alt=""> <b>Deutsch</b>
</p>

---

[![Deploy](https://github.com/michaelblaess/codename-generator.de/actions/workflows/deploy.yml/badge.svg)](https://github.com/michaelblaess/codename-generator.de/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Astro](https://img.shields.io/badge/astro-5-orange?logo=astro&logoColor=white)](https://astro.build/)
[![Themes](https://img.shields.io/badge/themes-23-brightgreen)](src/data/themes.json)

Das Webgesicht von [codename-generator](https://github.com/michaelblaess/codename-generator),
der Terminal-App. Dieselben Wortlisten, dieselben Regeln, Phosphor-Terminal-Optik. Thema
wählen, einen Stapel Projekt-Codenamen bekommen, mitnehmen was passt. Alles läuft im
Browser - kein Backend, kein Tracking, nichts verlässt die Seite.

![Screenshot](docs/screenshot.png)

## Was die Seite kann

- **23 kuratierte Themen**, 2655 Wörter: griechische/ägyptische/nordische Götter,
  Rennpferde, Whisky, Weine, Berge, Wahrzeichen, historische Schiffe, Swatch-Modelle,
  Tiere, Blumen, Edelsteine, Pilze, Dev-Verben und mehr.
- **Englisch und Deutsch.** Deutsch beugt den Modifikator nach dem Genus des Substantivs,
  deshalb steht dort `Stiller Falke`, `Stille Eule`, `Stilles Wiesel` und keine
  Wort-für-Wort-Übersetzung. Themen aus Eigennamen (Götter, Rennpferde, Swatch-Modelle)
  funktionieren in beiden Sprachen.
- **Phonetische Mutation** schiebt ein Wort aus dem Wörterbuch heraus:
  `Pegasus -> Pegasos`. Ein `*` markiert einen mutierten Vorschlag.
- **Permalinks.** Jeder Stapel hat einen Seed - der Knopf `Link` kopiert eine URL, die
  genau diesen Stapel wieder erzeugt.
- **Retro-Effekte** über [retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js),
  mit Rücksicht auf `prefers-reduced-motion`.

## Entwicklung

```
npm install
npm run daten     # Wortlisten aus dem Python-Repo nebenan holen
npm run dev
```

`npm run daten` liest die YAML-Dateien aus `../codename-generator` und schreibt
`src/data/*.json`. Das Python-Repo bleibt die einzige Quelle - die JSON-Dateien nie von
Hand bearbeiten. Liegt das Repo woanders, den Pfad mitgeben:

```
npm run daten -- C:/pfad/zu/codename-generator
```

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Entwicklungsserver auf :4321 |
| `npm test` | vitest, übernimmt die Python-Testfälle |
| `npm run build` | statischer Build nach `dist/` |
| `npm run preview` | Build ausliefern |
| `node pruefe-seite.mjs` | Browser-Smoketest gegen die laufende Preview |

Der Smoketest braucht einmalig ein Headless-Chromium:
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core`

## Aufbau

```
src/lib/generator.ts   Namensbau, Muster, Themen   (Port von generator.py)
src/lib/grammar.ts     deutsche Flexion            (Port von grammar.py)
src/lib/phonetic.ts    phonetische Mutation        (Port von phonetic.py)
src/lib/rng.ts         seedbarer Zufall (mulberry32)
src/data/*.json        erzeugt, nicht editieren
```

Ein bewusster Unterschied zur Terminal-Fassung: Pythons `random.Random(seed)` lässt sich in
JavaScript nicht nachbauen, derselbe Seed liefert hier also andere Namen als in der TUI.
Innerhalb dieser Seite sind Seeds stabil, und genau das brauchen die Permalinks.

## Auslieferung

Jeder Push auf `main` fährt die Tests, baut und deployt auf GitHub Pages. `public/CNAME`
zeigt auf die Produktivdomain.

## Danksagung

Die Retro-Texteffekte kommen von
[retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js).
Gebaut mit [Astro](https://astro.build/), React und Tailwind.

## Haftungsausschluss

Keine Gewähr. Die erzeugten Namen stammen aus Wortlisten und können mit bestehenden
Produkt-, Projekt- oder Firmennamen zusammenfallen - vor öffentlicher Verwendung prüfen.

## Lizenz

Apache License 2.0 - siehe [LICENSE](LICENSE).
