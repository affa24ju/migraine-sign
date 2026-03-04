'use client';

// --- Uppslag: gest → meddelande ---
// Ett Record<string, string> är ett TypeScript-objekt där både nyckel och värde är strängar.
// Varje nyckel är ett klassnamn från modellen, värdet är det svenska meddelandet som visas.
// 'Ingen gest' mappas till tom sträng — då visar vi ingenting.
const GESTURE_MESSAGES: Record<string, string> = {
  'Huvudvärk':   'Jag har kraftig huvudvärk',
  'Medicin':     'Jag behöver medicin',
  'Vatten':      'Jag behöver vatten',
  'Vila':        'Jag behöver vila',
  'Släck ljuset':'Släck ljuset, tack!',
  'Illamående':  'Jag mår illa',
  'Ambulans':    'Ring ambulans',
  'Tystnad':     'Jag behöver tystnad',
  'Bra':         'Det är bra nu',
  'Toalett':     'Jag behöver gå på toaletten',
  'Ingen gest':  '',
};

// --- Props ---
// Komponenten tar emot det detekterade klassnamnet från PoseDetector (via page.tsx).
interface MessageDisplayProps {
  detectedClass: string;
}

export default function MessageDisplay({ detectedClass }: MessageDisplayProps) {
  // Slå upp meddelandet i tabellen.
  // Om klassnamnet inte finns i tabellen (borde inte hända, men säkert är säkert)
  // faller vi tillbaka på en tom sträng via nullish coalescing (?? '').
  const meddelande = GESTURE_MESSAGES[detectedClass] ?? '';

  // Om meddelandet är tomt (dvs. "Ingen gest") renderar vi ingenting alls.
  // Detta håller skärmen ren och lugn, vilket är viktigt för migrän-anpassad design.
  if (!meddelande) return null;

  return (
    // Centrera meddelandet på skärmen med stor, tydlig text.
    // text-4xl = 36px, läsbart på avstånd utan att anstränga ögonen.
    // text-zinc-100 = nästan vit text mot mörk bakgrund = hög kontrast, låg bländning.
    // tracking-wide = lite extra teckenavstånd för bättre läsbarhet.
    <div className="flex items-center justify-center p-8">
      <p className="text-4xl font-light text-zinc-100 tracking-wide text-center">
        {meddelande}
      </p>
    </div>
  );
}
