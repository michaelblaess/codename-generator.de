# Credits

Nachweise für alles, was nicht selbst geschrieben wurde. Die Angaben stehen zusätzlich im
[Impressum](https://codename-generator.de/impressum/) der Seite, damit sie auch findet, wer
nur die Webseite benutzt und nicht ins Repository schaut.

## Musik

| | |
|---|---|
| Titel | BIT SPACE (FTL Inspired) [LOOP] |
| Urheber | Beam Theory |
| Lizenz | [OGA-BY 3.0](https://static.opengameart.org/OGA-BY-3.0.txt) |
| Quelle | https://opengameart.org/content/bit-space-ftl-inspired-loop-0 |
| Dateien | `bit-space.ogg` (1,84 MB), `bit-space.mp3` (5,73 MB) |

OGA-BY 3.0 ist eine Namensnennungs-Lizenz. Der Titel bleibt unverändert, es wird nichts
daran geschnitten oder abgewandelt.

Die Dateien liegen **nicht im Repository**. `npm run musik` (bzw. `node tools/hole-musik.mjs`)
holt sie nach `public/musik/`, der Deploy-Workflow ruft das Skript vor dem Build auf. Fehlt
die Musik, zeigt die Seite keinen Musikknopf - kein Fehler, keine Meldung.

## Schriften

| Schrift | Verwendung | Lizenz |
|---|---|---|
| [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) | Überschriften, Beschriftungen | SIL Open Font License 1.1 |
| [Bungee](https://fonts.google.com/specimen/Bungee) | der große Name | SIL Open Font License 1.1 |
| [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | Fließtext, Listen | SIL Open Font License 1.1 |

Alle drei Schriften liegen als woff2 im Auslieferpaket. Es wird keine Schrift von einem
fremden Server geladen.

## Code

| Bibliothek | Verwendung | Lizenz |
|---|---|---|
| [Astro](https://astro.build/) | Seitengerüst | MIT |
| [React](https://react.dev/) | der Generator als Insel | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | Gestaltung | MIT |
| [retro-text-effects](https://github.com/michaelblaess/retro-text-effects.js) | Druckeffekt beim Namen | Apache 2.0 |

Die Wortlisten stammen aus [codename-generator](https://github.com/michaelblaess/codename-generator)
(Apache 2.0), dem Terminal-Werkzeug hinter dieser Seite.

## Gestaltung

Die Optik ist eine Hommage an das Atari-ST-Spiel **Goldrunner** (Microdeal, 1987), die
Raumschiffe an die Drahtgitter-Schiffe aus **Elite**. Es besteht keine Verbindung zu den
Rechteinhabern, es wurde kein Material aus diesen Spielen übernommen - weder Grafik noch
Musik.
