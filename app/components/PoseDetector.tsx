'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';

// --- Typdeklarationer ---
// Vi laddar tmPose från CDN (via layout.tsx) istället för via webpack/npm.
// Det betyder att biblioteket inte importeras här uppe — det lever på window.tmPose.
// Dessa interface-deklarationer berättar för TypeScript vad window.tmPose innehåller
// så att vi får typkontroll och autocompletion trots att det är ett globalt objekt.

interface Prediction {
  className: string;
  probability: number;
}

// Representerar den laddade modellen och dess metoder.
// estimatePose accepterar både video- och canvas-element.
interface TmPoseModel {
  estimatePose: (
    input: HTMLVideoElement | HTMLCanvasElement
  ) => Promise<{ posenetOutput: number[] }>;
  predict: (
    posenetOutput: number[]
  ) => Promise<Prediction[]>;
}

// Utökar den globala Window-typen med tmPose-objektet.
// "declare global" är ett TypeScript-mönster för att lägga till egenskaper
// på globala objekt (som window) utan att ändra befintliga definitioner.
declare global {
  interface Window {
    tmPose: {
      load: (modelURL: string, metadataURL: string) => Promise<TmPoseModel>;
    };
  }
}

// --- Props ---
interface PoseDetectorProps {
  onGestureDetected: (className: string) => void;
  // showCamera styr om kameravyn är synlig.
  // OBS: videoelement måste ALLTID finnas i DOM:en för att inferensen ska fungera.
  // Vi döljer den med CSS (display:none) — inte genom att avmontera komponenten.
  showCamera?: boolean;
}

// --- Konstanter ---
const MODEL_URL = '/model/model.json';
const METADATA_URL = '/model/metadata.json';

// Konfidensgräns: modellen måste vara minst 80% säker för att rapportera en gest.
// Justera detta under testning — lägre värde = mer känslig, fler falska positiver.
const CONFIDENCE_THRESHOLD = 0.8;

// Dröjsmålstid: gesten måste hållas stabilt i minst 600ms innan den rapporteras.
// Detta förhindrar att kortvariga felklassificeringar visas i gränssnittet.
// Öka värdet för striktare krav (t.ex. 1000ms), minska för snabbare respons.
const DEBOUNCE_MS = 600;

export default function PoseDetector({ onGestureDetected, showCamera = true }: PoseDetectorProps) {
  // Referens till webbkamerans DOM-element (HTMLVideoElement).
  const webcamRef = useRef<Webcam>(null);

  // Referens till den laddade modellen. useRef istället för useState
  // eftersom vi inte vill att ett modelupdate orsakar en omrendering.
  const modelRef = useRef<TmPoseModel | null>(null);

  // Referens till pågående requestAnimationFrame-ID — behövs för att
  // kunna avbryta loopen när komponenten avmonteras (städning).
  const loopRef = useRef<number>(0);

  // Referens till callback-funktionen. Gör att loopen alltid anropar
  // den senaste versionen av funktionen utan att behöva starta om.
  const callbackRef = useRef(onGestureDetected);

  // Debounce-ref: håller koll på vilken klass som detekteras just nu
  // och exakt när den klassen *först* dök upp i rad.
  // När en ny klass dyker upp nollställs timern.
  // Gesten rapporteras bara uppåt när samma klass hållits i DEBOUNCE_MS millisekunder.
  const debounceRef = useRef<{ className: string; since: number } | null>(null);

  // Off-screen canvas för att spegla videobilden horisontellt innan inferens.
  //
  // VARFÖR: Teachable Machine spelar in träningsdata med speglad (mirrored) bild,
  // precis som en selfie-kamera. Det gör den via ctx.scale(-1, 1) på en canvas.
  // Om vi skickar den ospeglade videon direkt till modellen är vänster och höger
  // ombytta jämfört med träningsdatan — vilket gör att t.ex. 'Släck ljuset'
  // (höger arm upp) klassificeras som en helt annan gest.
  //
  // Lösning: rita varje bildruta speglad till en dold canvas och skicka DEN
  // till estimatePose, precis som Teachable Machine gör internt.
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    callbackRef.current = onGestureDetected;
  }, [onGestureDetected]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Effekt 1: Ladda modellen en gång vid montering ---
  useEffect(() => {
    async function laddaModell() {
      try {
        // window.tmPose laddades via CDN-skripten i layout.tsx.
        // Här anropar vi .load() med sökvägarna till modellfilerna i public/model/.
        const model = await window.tmPose.load(MODEL_URL, METADATA_URL);
        modelRef.current = model;
        setIsLoaded(true);
      } catch (err) {
        setError('Kunde inte ladda modellen. Kontrollera att filerna finns i public/model/.');
        console.error(err);
      }
    }

    laddaModell();

    // Städfunktion: avbryt inferensloopen om komponenten avmonteras.
    return () => {
      cancelAnimationFrame(loopRef.current);
    };
  }, []);

  // --- Effekt 2: Starta inferensloopen när modellen är laddad ---
  useEffect(() => {
    if (!isLoaded) return;

    // Skapa en dold canvas för spegling. Vi skapar den här (inte utanför useEffect)
    // för att säkerställa att vi är i webbläsarmiljön och att canvasen inte
    // lever kvar i DOM:en när effekten rensas upp.
    const canvas = document.createElement('canvas');
    mirrorCanvasRef.current = canvas;

    async function predict() {
      const video = webcamRef.current?.video;

      // readyState 4 = HAVE_ENOUGH_DATA: videoströmmen har tillräckligt med data.
      // Hoppa över denna bildruta om kameran inte är redo ännu.
      if (!video || video.readyState !== 4 || !modelRef.current) {
        loopRef.current = requestAnimationFrame(predict);
        return;
      }

      try {
        // Synkronisera canvasens storlek med videons faktiska pixelmått.
        // videoWidth/videoHeight är kamerans verkliga upplösning (t.ex. 640x480),
        // inte den CSS-renderade storleken (400x300 som vi satt i JSX).
        const { videoWidth, videoHeight } = video;
        if (canvas.width !== videoWidth)  canvas.width  = videoWidth;
        if (canvas.height !== videoHeight) canvas.height = videoHeight;

        // Rita aktuell videobildruta speglad horisontellt till canvasen.
        // ctx.scale(-1, 1) + drawImage med negativ x-offset = horisontal spegling.
        // Det är precis vad Teachable Machine gör internt när flip=true.
        const ctx = canvas.getContext('2d')!;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -videoWidth, 0, videoWidth, videoHeight);
        ctx.restore();

        // estimatePose: analyserar den SPEGLADE bildrutan med PoseNet och returnerar
        // posenetOutput — en numerisk vektor som matchar träningsdatans orientering.
        const { posenetOutput } = await modelRef.current.estimatePose(canvas);

        // predict: skickar posenetOutput genom det tränade nätverket och
        // returnerar sannolikheter för varje klass, t.ex.:
        // [{ className: 'Huvudvärk', probability: 0.95 }, ...]
        const predictions = await modelRef.current.predict(posenetOutput);

        // Hitta klassen med högst sannolikhet.
        const bästa = predictions.reduce((prev, curr) =>
          curr.probability > prev.probability ? curr : prev
        );

        // Tillfällig loggning för felsökning — ta bort när allt fungerar.
        // Öppna webbläsarens DevTools (F12 → Console) för att se utdata.
        console.log(`${bästa.className}: ${(bästa.probability * 100).toFixed(1)}%`);

        // Avgör vilken klass som vann — eller 'Ingen gest' om vi inte är säkra nog.
        const detectedClass =
          bästa.probability >= CONFIDENCE_THRESHOLD ? bästa.className : 'Ingen gest';

        // Debounce-logik:
        // Om klassen BYTTES — nollställ timern och vänta igen.
        // Om SAMMA klass hållits i minst DEBOUNCE_MS millisekunder — rapportera den.
        if (debounceRef.current?.className !== detectedClass) {
          debounceRef.current = { className: detectedClass, since: Date.now() };
        } else if (Date.now() - debounceRef.current.since >= DEBOUNCE_MS) {
          callbackRef.current(detectedClass);
        }
      } catch (err) {
        // Om ett fel uppstår i inferensen loggas det, men loopen fortsätter.
        // Utan denna try/catch skulle ett enda fel döda hela loopen tyst.
        console.error('Inferensfel:', err);
      } finally {
        // finally körs ALLTID — oavsett om try lyckades eller catch kördes.
        // Det garanterar att nästa bildruta alltid schemaläggs.
        loopRef.current = requestAnimationFrame(predict);
      }
    }

    predict();

    return () => {
      cancelAnimationFrame(loopRef.current);
      mirrorCanvasRef.current = null;
    };
  }, [isLoaded]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* showCamera styr synligheten via Tailwind-klassen "hidden" (display:none).
          Videoelement med display:none stannar kvar i DOM och strömmar vidare —
          readyState förblir 4 och inferensloopen påverkas inte alls. */}
      <div className={showCamera ? '' : 'hidden'}>
        <Webcam
          ref={webcamRef}
          mirrored={true}
          width={400}
          height={300}
          className="rounded-lg opacity-60"
        />
      </div>

      {!isLoaded && !error && (
        <p className="text-sm text-zinc-400">Laddar modell...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
