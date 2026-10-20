// S3 Trajets — jalon 1 : écran traversé ; l'arrivée peut être pré-remplie depuis la fiche station (US-2.2).
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { T } from "../lib/textes";

export default function Trajets() {
  const loc = useLocation();
  const arriveeInitiale = (loc.state as { arrivee?: string } | null)?.arrivee ?? "";
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState(arriveeInitiale);
  const champArrivee = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (arriveeInitiale) {
      setArrivee(arriveeInitiale);
      champArrivee.current?.focus();
    }
  }, [arriveeInitiale]);

  return (
    <section className="screen" data-screen="S3" aria-label="Trajets">
      <div className="scroll">
        <h2 className="sec">{T.nouveauTrajet}</h2>
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="fieldset">
            <legend className="sr-only">{T.nouveauTrajet}</legend>
            <div className="fld">
              <label htmlFor="dep">{T.depart}</label>
              <input id="dep" data-el="champ-depart" autoComplete="off" value={depart} onChange={(e) => setDepart(e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="arr">{T.arrivee}</label>
              <input id="arr" data-el="champ-arrivee" autoComplete="off" ref={champArrivee} value={arrivee} onChange={(e) => setArrivee(e.target.value)} />
            </div>
          </fieldset>
          <p className="note">{T.trajetsBientot}</p>
        </form>
      </div>
    </section>
  );
}
