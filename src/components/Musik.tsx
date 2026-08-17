import { useCallback, useEffect, useRef, useState } from 'react';
import { UI, type UiSprache } from '../i18n/ui';

/*
 * Musikknopf.
 *
 * Drei Dinge, die aus Michaels Blogbeitrag zu geo-finder kommen:
 *
 *   1. Fehlende Musik ist kein Fehler. Die Dateien liegen nicht im
 *      Repository, sondern werden beim Build geholt. Ist nichts da, rendert
 *      diese Komponente NICHTS - kein Knopf, keine Meldung, keine rote
 *      Konsole. Geprueft wird das mit einer HEAD-Anfrage.
 *   2. Musik startet nie von allein, Browser blockieren das. Es braucht
 *      diesen Knopf, und play() gibt ein Promise zurueck, das abgewiesen
 *      werden kann - ohne catch sucht man den Fehler lange im eigenen Code.
 *   3. Geladen wird erst beim Klick. preload="none" plus zwei Quellen: der
 *      Browser nimmt das kleinere OGG (1,8 MB), altes Safari das MP3
 *      (5,7 MB). Gestreamt statt vorher komplett geladen.
 */

export default function Musik({ sprache }: { sprache: UiSprache }) {
  const t = UI[sprache];
  const [vorhanden, setVorhanden] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const tonRef = useRef<HTMLAudioElement>(null);

  const basis = import.meta.env.BASE_URL.replace(/\/$/, '');
  const ogg = `${basis}/musik/bit-space.ogg`;
  const mp3 = `${basis}/musik/bit-space.mp3`;

  useEffect(() => {
    let abgebrochen = false;
    // HEAD statt GET: das kostet keine 1,8 MB, nur um zu wissen, ob es die
    // Datei gibt.
    fetch(ogg, { method: 'HEAD' })
      .then((antwort) => {
        if (!abgebrochen && antwort.ok) setVorhanden(true);
      })
      .catch(() => {
        /* Keine Musik ausgeliefert - dann eben kein Knopf. */
      });
    return () => {
      abgebrochen = true;
    };
  }, [ogg]);

  const umschalten = useCallback(() => {
    const ton = tonRef.current;
    if (!ton) return;
    if (laeuft) {
      ton.pause();
      setLaeuft(false);
      return;
    }
    void ton
      .play()
      .then(() => setLaeuft(true))
      .catch(() => setLaeuft(false));
  }, [laeuft]);

  if (!vorhanden) return null;

  return (
    <>
      <button
        type="button"
        className="ftaste pixel text-[0.5rem]"
        aria-pressed={laeuft}
        onClick={umschalten}
        title={t.titelMusik}
      >
        <span className="ftaste-kuerzel">{laeuft ? '■' : '▶'} </span>
        {laeuft ? t.musikAus : t.musikAn}
      </button>
      <audio ref={tonRef} loop preload="none" onEnded={() => setLaeuft(false)}>
        <source src={ogg} type="audio/ogg" />
        <source src={mp3} type="audio/mpeg" />
      </audio>
    </>
  );
}
