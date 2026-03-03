'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as tmPose from '@teachablemachine/pose';

// --- Typer ---
// Props-gränssnittet beskriver vad förälderkomponenten måste skicka in.
// onGestureDetected är en callback-funktion som anropas varje gång
// modellen identifierar en gest med tillräcklig säkerhet.
interface PoseDetectorProps {
  onGestureDetected: (className: string) => void;
}

// --- Konstanter ---
// Sökvägarna pekar på filerna i public/model/ — Next.js serverar
// allt i public/ som statiska filer tillgängliga från roten (/).
const MODEL_URL = '/model/model.json';
const METADATA_URL = '/model/metadata.json';

// Konfidensgräns: modellen måste vara minst 80% säker på sin gissning.
// Om ingen klass når upp till denna gräns rapporterar vi "Ingen gest".
// Du kan justera detta värde under testning (lägre = mer känslig, högre = mer strikt).
const CONFIDENCE_THRESHOLD = 0.8;

export default function PoseDetector({ onGestureDetected }: PoseDetectorProps) {
  // Referens till webbkamerans React-komponent, används för att nå
  // det underliggande HTMLVideoElement som modellen behöver som indata.
  const webcamRef = useRef<Webcam>(null);

  // Referens till den laddade Teachable Machine-modellen.
  // Vi använder useRef istället för useState eftersom vi inte vill att
  // komponenten ritas om varje gång modellen uppdateras internt.
  const modelRef = useRef<tmPose.CustomPoseNet | null>(null);

  // Referens till det aktiva requestAnimationFrame-ID:t.
  // Vi sparar det för att kunna avbryta loopen när komponenten avmonteras,
  // annars fortsätter loopen köra i bakgrunden och orsakar minnesläckor.
  const loopRef = useRef<number>(0);

  // Referens till callback-funktionen från föräldern.
  // Föräldern kan rendera om sig utan att vi behöver starta om inferensloopen —
  // loopen läser alltid den senaste versionen av funktionen via denna ref.
  const callbackRef = useRef(onGestureDetected);
  useEffect(() => {
    callbackRef.current = onGestureDetected;
  }, [onGestureDetected]);

  // State: visas i gränssnittet (laddningsstatus och eventuella fel).
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Effekt 1: Ladda modellen en gång när komponenten monteras ---
  useEffect(() => {
    async function laddaModell() {
      try {
        // tmPose.load() hämtar model.json och weights.bin från servern,
        // samt metadata.json med klassnamnen, och bygger upp ett TensorFlow.js-nätverk.
        modelRef.current = await tmPose.load(MODEL_URL, METADATA_URL);
        setIsLoaded(true);
      } catch (err) {
        setError('Kunde inte ladda modellen. Kontrollera att filerna finns i public/model/.');
        console.error(err);
      }
    }

    laddaModell();

    // Städfunktion: körs när komponenten avmonteras.
    // Avbryter eventuell pågående animationsloop.
    return () => {
      cancelAnimationFrame(loopRef.current);
    };
  }, []); // Tom beroende-array = körs bara en gång vid montering

  // --- Effekt 2: Starta inferensloopen när modellen är laddad ---
  useEffect(() => {
    // Vänta tills modellen har laddats klart innan vi startar loopen.
    if (!isLoaded) return;

    async function predict() {
      const video = webcamRef.current?.video;

      // Videoströmmen är inte alltid redo direkt — readyState 4 (HAVE_ENOUGH_DATA)
      // betyder att det finns tillräckligt med data för att spela upp utan avbrott.
      // Vi hoppar över denna bildruta och försöker igen nästa frame om den inte är redo.
      if (!video || video.readyState !== 4 || !modelRef.current) {
        loopRef.current = requestAnimationFrame(predict);
        return;
      }

      // estimatePose() analyserar en enskild videoruta med PoseNet och returnerar:
      // - pose: kroppspunkter (keypoints) med koordinater och säkerhetsvärden
      // - posenetOutput: en numerisk vektor som vår klassificerare är tränad att tolka
      const { posenetOutput } = await modelRef.current.estimatePose(video);

      // predict() skickar posenetOutput genom det tränade neurala nätverket
      // och returnerar en array med sannolikheter för varje klass, t.ex.:
      // [{ className: 'Huvudvärk', probability: 0.95 }, { className: 'Medicin', probability: 0.02 }, ...]
      const predictions = await modelRef.current.predict(posenetOutput);

      // Hitta klassen med högst sannolikhet med hjälp av reduce().
      // reduce() går igenom hela arrayen och behåller det "bästa" objektet hittills.
      const bästa = predictions.reduce((prev, curr) =>
        curr.probability > prev.probability ? curr : prev
      );

      // Rapportera bara om vi är tillräckligt säkra — annars behandlas det som ingen gest.
      if (bästa.probability >= CONFIDENCE_THRESHOLD) {
        callbackRef.current(bästa.className);
      } else {
        callbackRef.current('Ingen gest');
      }

      // Begär nästa bildruta från webbläsaren (~60 gånger per sekund).
      // requestAnimationFrame synkroniserar med skärmens uppdateringsfrekvens
      // vilket är effektivare än t.ex. setInterval.
      loopRef.current = requestAnimationFrame(predict);
    }

    // Starta loopen.
    predict();

    // Städfunktion: avbryt loopen om isLoaded ändras (eller vid avmontering).
    return () => {
      cancelAnimationFrame(loopRef.current);
    };
  }, [isLoaded]); // Startar om bara om isLoaded ändras

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Webbkameravyn.
          mirrored={true} speglar bilden horisontellt så att användaren
          ser sig själv som i en spegel — mer intuitivt vid gestigenkänning.
          width/height sätter videorutan, inte webbläsarens renderade storlek. */}
      <Webcam
        ref={webcamRef}
        mirrored={true}
        width={400}
        height={300}
        className="rounded-lg opacity-60"
      />

      {/* Laddningsindikator — visas tills modellen är klar */}
      {!isLoaded && !error && (
        <p className="text-sm text-zinc-400">Laddar modell...</p>
      )}

      {/* Felmeddelande — visas om modellen inte kunde laddas */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
