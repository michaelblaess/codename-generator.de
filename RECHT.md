# Rechteprüfung codename-generator.de

Diese Datei ist Teil des Livegang-Gates. `pruefe-gate.mjs` zählt die offenen Kästchen und
fällt durch, solange eines davon leer ist. Was hier steht, kann kein Skript prüfen - deshalb
steht es hier und nicht im Code.

Jeder Haken braucht ein Datum und einen Befund. Ein Haken ohne Befund ist wertlos.

## Bilder

- [x] **Jedes Foto einzeln geöffnet und angesehen.** 25.09.2026: Die Seite enthält keine
      Fotos. Im Build liegt als einzige Bilddatei `dist/favicon.svg`, selbst gezeichnet.
- [x] **Beigaben und Verpackungen geprüft.** 25.09.2026: entfällt, keine Fotos.
- [x] **Handschriften, Namen, Unterschriften, Absender geprüft.** 25.09.2026: entfällt,
      keine Fotos.
- [x] **Entfernte Bilder sind auch aus dem Build verschwunden.** 25.09.2026: `find dist`
      nach png, jpg, gif, webp und svg liefert nur `favicon.svg`.

## Marken und Namen

- [x] **Alle im Text genannten Marken stehen im Markenhinweis**, nicht nur die
      offensichtliche. 25.09.2026: Genannt werden Atari ST, Goldrunner und Microdeal, alle
      im Abschnitt "Marken" des Impressums. Die Themen Swatch (24.09.2026) sowie Whisky und
      Weine (25.09.2026) sind entfernt, auch aus der Git-Historie. `tests/test_sperrliste.py`
      im Python-Repo verhindert die Rückkehr.
- [x] **Sonderfälle bedacht:** Olympiaschutzgesetz für die Wörter selbst, Personennamen als
      Namensrecht nach § 12 BGB statt Markenrecht. 25.09.2026: Die Wortlisten enthalten
      Götter-, Tier-, Stern- und Ortsnamen, keine lebenden Personen und keine olympischen
      Bezeichnungen. Die erzeugten Namen sind Zufallsergebnisse, der Haftungshinweis im
      Impressum verlangt vor der Verwendung eine eigene Recherche.
- [x] **Eigener Projekt- und Domainname über TMview geprüft**, mit Positivkontrolle und
      Filter auf DE/EU sowie die Klassen 9 und 42. 15.08.2026: "codename generator" 0
      Treffer weltweit, die acht DE/EU-Treffer zu "codename" sind Videospieltitel.
      17.08.2026: "goldrunner" einmal weltweit (US, Ended, Klasse 4), "gold runner" 19-mal,
      nichts in DE/EU in den Klassen 9 oder 42.
- [x] **Fremde Marken nicht im Domainnamen.** 25.09.2026: Die Seite liegt unter
      `michaelblaess.github.io/codename-generator.de/`, der Name enthält keine fremde Marke.

## Texte und Zitate

- [x] **Keine übernommenen Textpassagen** aus fremden Quellen ohne Zitatkennzeichnung.
      25.09.2026: Alle Texte sind selbst geschrieben.
- [x] **Zitate stammen aus dem gepflegten Pool** (`claude-config/templates/zitate/`) und sind
      damit gemeinfrei. 25.09.2026: Die Seite enthält keine Zitate.

## Rechtstexte

- [x] **Impressum nach § 5 DDG**, nicht nach TMG. 25.09.2026: Impressum und Legal Notice
      nennen § 5 DDG. Die Musik (Bit Space von Beam Theory, OGA-BY 3.0) ist dort mit
      Quelle nachgewiesen.
- [x] **Datenschutzerklärung nennt jeden eingebundenen Dienst** mit Rechtsgrundlage und
      Widerrufshinweis - und keinen, den es nicht gibt. 25.09.2026: Einziger Dienst ist das
      Hosting bei GitHub Pages (Art. 6 Abs. 1 lit. f DSGVO). Die Merkliste im localStorage
      ist beschrieben (§ 25 Abs. 2 Nr. 2 TDDDG). Keine Analyse, keine fremden Schriften, die
      Musik kommt vom selben Server.
- [x] **Einwilligung im Browser nachgewiesen**, nicht nur eingebaut. 25.09.2026: entfällt,
      es gibt nichts Einwilligungspflichtiges. `pruefe-seite.mjs` misst nach der Bedienung,
      dass keine Cookies gesetzt sind und außer der Merkliste nichts im Browser liegt.

## Abweichungen vom Gate

Wer eine Prüfung in `web-gate.json` unter `ausnahmen` abschaltet oder `zeichenpruefung` auf
`false` setzt, begründet das hier. Ohne Eintrag gilt die Abweichung als Verstoß.

- Abweichung: `themeToggle`, kein Hell/Dunkel-Umschalter.
- Begründung: Die Seite hat bewusst nur die eine Goldrunner-Optik (Atari ST, 1987).
- Datum: 25.09.2026

- Abweichung: `ogImage`, kein Vorschaubild für geteilte Links.
- Begründung: Michaels Entscheidung, keine erzeugten Bilder. og:title und og:description
  sind gesetzt.
- Datum: 25.09.2026
