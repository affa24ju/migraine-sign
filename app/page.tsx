'use client';

import { useCallback, useState } from 'react';

import PoseDetector from './components/PoseDetector';
import MessageDisplay from './components/MessageDisplay';

export default function Home() {
  // Det senaste detekterade klassnamnet. Startar tomt — ingenting visas.
  const [detectedClass, setDetectedClass] = useState<string>('Ingen gest');

  // Styr om kameravyn är synlig. Startar synlig eftersom användaren
  // behöver se sig själv för att positionera sina gester.
  const [showCamera, setShowCamera] = useState<boolean>(true);

  // Memorerad callback — förhindrar att PoseDetector startar om sin loop
  // vid varje omrendering av Home (t.ex. när showCamera ändras).
  const handleGestureDetected = useCallback((className: string) => {
    // 'Ingen gest' ignoreras — meddelandet stannar kvar tills en ny gest ersätter det.
    if (className !== 'Ingen gest') {
      setDetectedClass(className);
    }
  }, []);

  return (
    // Mörk bakgrund, full höjd, allt centrerat vertikalt.
    // justify-between delar upp sidan i två zoner:
    // övre zonen (kamera + kontroller) och nedre zonen (meddelande).
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-6 gap-6">

      {/* ── Övre zon: kamera och kontroller ─────────────────────────── */}
      <div className="flex flex-col items-center gap-3 w-full">

        {/* Diskret rubrik */}
        <h1 className="text-zinc-600 text-xs tracking-widest uppercase">
          MigraineSign
        </h1>

        {/* PoseDetector — kameravyn döljs/visas via showCamera-prop.
            Inferensloopen körs alltid, oavsett om kameran är synlig. */}
        <PoseDetector
          onGestureDetected={handleGestureDetected}
          showCamera={showCamera}
        />

        {/* Knapp för att dölja/visa kameran.
            Stor nog att trycka på utan precision, men visuellt diskret.
            pointer-events-auto säkerställer att knappen går att trycka
            även om ett overlay-lager läggs ovanpå senare (steg 4). */}
        <button
          onClick={() => setShowCamera(prev => !prev)}
          className="text-zinc-400 text-base tracking-wide py-3 px-6 rounded-md border border-zinc-700 pointer-events-auto"
          aria-label={showCamera ? 'Dölj kamera' : 'Visa kamera'}
        >
          {showCamera ? 'Dölj kamera' : 'Visa kamera'}
        </button>

      </div>

      {/* ── Nedre zon: meddelande ────────────────────────────────────── */}
      {/* flex-1 gör att meddelandezonen fyller allt utrymme mellan
          kameradelen och sidans botten, vilket centrerar texten i det utrymmet. */}
      <div className="flex flex-1 items-center justify-center w-full">
        <MessageDisplay detectedClass={detectedClass} />
      </div>

    </main>
  );
}
