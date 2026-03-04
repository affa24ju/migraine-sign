'use client';

import { useCallback, useEffect, useState } from 'react';

import PoseDetector from './components/PoseDetector';
import MessageDisplay from './components/MessageDisplay';

export default function Home() {
  const [detectedClass, setDetectedClass] = useState<string>('Ingen gest');
  const [showCamera, setShowCamera] = useState<boolean>(true);

  // Dimningsnivå: 0 = ingen dimning, 0.85 = maximal dimning (85% svart overlay).
  // Startar på 0 — användaren justerar själv vid behov.
  const [dimLevel, setDimLevel] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'c' || e.key === 'C') {
        setShowCamera(prev => !prev);
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
  }, []);

  const handleGestureDetected = useCallback((className: string) => {
    if (className !== 'Ingen gest') {
      setDetectedClass(className);
    }
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-6 gap-6">

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
          showCamera={showCamera}
        />

        <button
          onClick={() => setShowCamera(prev => !prev)}
          className="text-zinc-400 text-base tracking-wide py-3 px-6 rounded-md border border-zinc-700"
          aria-label={showCamera ? 'Dölj kamera' : 'Visa kamera'}
        >
          {showCamera ? 'Dölj kamera' : 'Visa kamera'}
        </button>

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

    </main>
  );
}
