import { CARBURANTS, type Carburant } from "../lib/format";
import { T } from "../lib/textes";

export function SelecteurCarburant({ valeur, onChange }: { valeur: Carburant; onChange: (c: Carburant) => void }) {
  return (
    <div className="fuels" role="group" aria-label={T.carburant} data-el="selecteur-carburant">
      {CARBURANTS.map((c) => (
        <button key={c} type="button" className="fuel" aria-pressed={c === valeur} onClick={() => onChange(c)}>
          {c}
        </button>
      ))}
    </div>
  );
}
