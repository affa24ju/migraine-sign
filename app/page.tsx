'use client';

import { useCallback, useEffect, useState } from 'react';

import PoseDetector from './components/PoseDetector';
import MessageDisplay from './components/MessageDisplay';

export default function Home() {
  const [detectedClass, setDetectedClass] = useState<string>('Ingen gest');
  const [displayMode, setDisplayMode] = useState<'camera' | 'pose' | 'none'>('camera');
  const [showModal, setShowModal] = useState<boolean>(true);

  // Dimningsnivå: 0 = ingen dimning, 0.85 = maximal dimning (85% svart overlay).
  // Startar på 0 — användaren justerar själv vid behov.
  const [dimLevel, setDimLevel] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;

      if (e.key === 'c' || e.key === 'C') {
        setDisplayMode(prev =>
          prev === 'camera' ? 'pose' : prev === 'pose' ? 'none' : 'camera'
        );
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        setDimLevel(prev => Math.min(0.85, prev + 0.05));
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        setDimLevel(prev => Math.max(0, prev - 0.05));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleGestureDetected = useCallback((className: string) => {
    if (className !== 'Ingen gest') {
      setDetectedClass(className);
    }
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-6 gap-6">

      {/* ── Välkomstmodal ──────────────────────────────────────────────────
          Visas vid första besöket. z-70 lyfter den ovanför dimnings-overlay:n (z-50).
          Bakgrunden är halvtransparent svart för att inte störa ögonen. */}
      {showModal && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-8 flex flex-col gap-6">
            <h2 id="modal-title" className="text-zinc-100 text-2xl font-semibold">
              Välkommen till MigraineSign
            </h2>

            <p className="text-zinc-300 text-base leading-relaxed">
              Detta är en AI-driven prototyp som översätter teckenspråk till text.
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Viktigt att veta</p>
              <ul className="text-zinc-300 text-base leading-relaxed list-disc list-inside flex flex-col gap-1">
                <li>Igenkänningen är inte 100% tillförlitlig</li>
                <li>Kräver god belysning och rätt avstånd</li>
                <li>Är en prototyp, inte en färdig produkt</li>
              </ul>
            </div>

            <p className="text-amber-400 text-sm leading-relaxed border border-amber-400/30 rounded-lg p-3 bg-amber-400/5">
              ⚠️ Används inte denna app som enda kommunikationsmetod i akuta nödsituationer.
              För bästa resultat: Gör tydliga tecken och justera din position om igenkänningen mislyckas.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-4 px-6 rounded-lg bg-zinc-700 text-zinc-200 text-base font-medium tracking-wide hover:bg-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
              autoFocus
            >
              Jag förstår — fortsätt till appen
              <span className="ml-2 text-zinc-500 text-xs font-normal">Esc</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mörknande overlay ──────────────────────────────────────────────
          position: fixed + inset-0 = täcker hela webbläsarfönstret.
          pointer-events: none = overlay:en fångar INGA klick/touch-händelser.
          Knappar och slider under den fungerar precis som vanligt.
          opacity styrs dynamiskt via inline style utifrån dimLevel-state.
          bg-black med opacity ger en mjuk, justerbar dimningseffekt —
          ett enkelt sätt att minska skärmens upplevda ljusstyrka
          utan att kräva åtkomst till enhetens OS-inställningar. */}
      <div
        className="fixed inset-0 bg-black pointer-events-none z-50"
        style={{ opacity: dimLevel }}
        aria-hidden="true"
      />

      {/* ── Övre zon: kamera och kontroller ───────────────────────────── */}
      {/* relative z-60 lyfter kontrollerna ovanför overlay:en (z-50)
          så att de alltid går att interagera med. */}
      <div className="relative z-60 flex flex-col items-center gap-3 w-full">

        <h1 className="text-zinc-600 text-lg tracking-widest uppercase">
          MigraineSign
        </h1>

        <PoseDetector
          onGestureDetected={handleGestureDetected}
          displayMode={displayMode}
        />

        {/* Diskret indikator i "Dölj allt"-läge — visar att detektering pågår. */}
        {displayMode === 'none' && (
          <p className="text-zinc-600 text-xs tracking-widest uppercase animate-pulse">
            Detekterar…
          </p>
        )}

        {/* Tre knappar — aktiv knapp får ljusare text och ljusare kant. */}
        <div className="flex gap-2">
          {(['camera', 'pose', 'none'] as const).map((mode) => {
            const labels = { camera: 'Visa kamera', pose: 'Visa pose', none: 'Dölj allt' };
            const active = displayMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`text-base tracking-wide py-3 px-4 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  active
                    ? 'text-zinc-100 border-zinc-400'
                    : 'text-zinc-500 border-zinc-700'
                }`}
                aria-pressed={active}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

      </div>

      {/* ── Meddelande ────────────────────────────────────────────────── */}
      <div className="relative z-60 flex flex-1 items-center justify-center w-full">
        <MessageDisplay detectedClass={detectedClass} />
      </div>

      {/* ── Dimningsreglage ───────────────────────────────────────────── */}
      {/* Placerat längst ner på sidan. z-60 håller det klickbart ovanför overlay:en.
          Reglaget ger användaren direkt kontroll över skärmens upplevda ljusstyrka
          utan att behöva lämna appen — viktigt vid migrän när varje interaktion kostar. */}
      <div className="relative z-60 w-full max-w-sm flex flex-col items-center gap-2">
        <label
          htmlFor="dim-slider"
          className="text-zinc-500 text-xs tracking-widest uppercase"
        >
          Ljusstyrka
        </label>

        {/* input[type=range]: ett inbyggt HTML-element för att välja ett värde
            längs en skala. min/max/step styr intervallet.
            Vi inverterar logiken: max slider-position = minst ljus (max dimning).
            aria-label ger skärmläsare en meningsfull beskrivning. */}
        <input
          id="dim-slider"
          type="range"
          min={0}
          max={85}
          step={1}
          value={Math.round(dimLevel * 100)}
          onChange={(e) => setDimLevel(Number(e.target.value) / 100)}
          className="dim-slider w-full"
          aria-label="Justera skärmens ljusstyrka"
        />
      </div>

      {/* ── Permanent fotnot ──────────────────────────────────────────────
          Alltid synlig längst ner. z-60 håller den klickbar ovanför dim-overlay:n. */}
      <p className="relative z-60 text-zinc-600 text-xs text-center leading-relaxed max-w-sm">
        AI-prototyp · Precision: ~85–95% · Igenkänningen kan fela ibland.
        Komplettera med andra kommunikationsmetoder vid behov.
      </p>

    </main>
  );
}
