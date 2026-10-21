// Route /en-route (jalon 5) : l'écran En route tant qu'un enregistrement tourne ; à l'arrêt, la fin de trajet,
// ou le message « trop court » (moins de 1 km : rien n'est gardé).
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { EnRoute } from "../components/EnRoute";
import { enregistreur } from "../lib/plateforme";
import { useEnregistrement } from "../lib/useEnregistrement";
import { fmt } from "../lib/calcul";
import { T } from "../lib/textes";

export default function EnRoutePage() {
  const nav = useNavigate();
  const { etat, maintenant } = useEnregistrement();
  const [tropCourt, setTropCourt] = useState<number | null>(null);
  const [arret, setArret] = useState(false);
  const message = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (tropCourt != null) message.current?.focus();
  }, [tropCourt]);

  const arreter = async () => {
    if (arret) return;
    setArret(true);
    const r = await enregistreur().arreter();
    if ("trajet" in r) return nav("/fin", { replace: true });
    setTropCourt(r.tropCourt);
    setArret(false);
  };

  if (tropCourt != null)
    return (
      <section className="screen" data-screen="T3" data-etat="trop-court" role="tabpanel" aria-labelledby="onglet-trajet">
        <div className="scroll">
          <div className="etat" data-el="trop-court" data-km={tropCourt}>
            <h2 className="t" tabIndex={-1} ref={message} role="alert">{T.tropCourtV1(fmt(tropCourt, 1))}</h2>
            <p className="d">{T.tropCourtV1Detail}</p>
            <button type="button" className="btn" onClick={() => nav("/", { replace: true })}>{T.retourAccueil}</button>
          </div>
        </div>
      </section>
    );
  if (!etat) return arret ? null : <Navigate to="/" replace />;
  return <EnRoute e={etat} maintenant={maintenant} onArreter={arreter} />;
}
