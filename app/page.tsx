'use client';

// useCallback används för att memorera callback-funktionen.
// Utan useCallback skapas en ny funktionsreferens vid varje rendering,
// vilket skulle orsaka att PoseDetector startar om sin inferensloop i onödan.
import { useCallback, useState } from 'react';

import PoseDetector from './components/PoseDetector';
import MessageDisplay from './components/MessageDisplay';

export default function Home() {
  // State: det senaste detekterade klassnamnet från modellen.
  // Startvärde är 'Ingen gest' vilket gör att ingenting visas vid start.
  const [detectedClass, setDetectedClass] = useState<string>('Ingen gest');

  // useCallback memorerar funktionen så att samma referens återanvänds
  // mellan renderingar — PoseDetector behöver inte starta om sin loop
  // varje gång Home renderar om sig.
  // Den tomma beroende-arrayen [] betyder att funktionen aldrig återskapas.
  const handleGestureDetected = useCallback((className: string) => {
    // Uppdatera bara state när en faktisk gest detekteras.
    // 'Ingen gest' ignoreras — det senaste meddelandet stannar kvar
    // tills en ny gest ersätter det. Användaren behöver inte hålla
    // posen; mottagaren (anhörig/vårdare) kan läsa i lugn och ro.
    if (className !== 'Ingen gest') {
      setDetectedClass(className);
    }
  }, []);

  return (
    // Mörkgrå bakgrund (zinc-950) istället för svart — mjukare kontrast.
    // min-h-screen + flex column centrerar allt vertikalt och horisontellt.
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8 p-8">

      {/* Rubrik — liten och diskret för att inte ta fokus */}
      <h1 className="text-zinc-600 text-sm tracking-widest uppercase">
        MigraineSign
      </h1>

      {/* PoseDetector hanterar kameran och modellen.
          Varje gång en gest detekteras anropas handleGestureDetected
          med klassnamnet som argument, vilket uppdaterar state i Home. */}
      <PoseDetector onGestureDetected={handleGestureDetected} />

      {/* MessageDisplay tar emot det detekterade klassnamnet och
          visar motsvarande svenska mening. Renderar ingenting vid "Ingen gest". */}
      <MessageDisplay detectedClass={detectedClass} />

    </main>
  );
}
