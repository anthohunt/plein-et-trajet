// T1 Trajet (accueil, jalon 5, T5.2) : la voiture au centre et le gros bouton rond « Démarrer ».
// Sans voiture : invitation, et « Démarrer » ouvre Ma voiture. Localisation refusée : message, aucun trajet créé.
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CarteVoiture } from "../components/CarteVoiture";
import { enregistreur, type ErreurDemarrage } from "../lib/plateforme";
import { useEnregistrement, useVoitureV1 } from "../lib/useEnregistrement";
import { T } from "../lib/textes";

export default function Trajet() {
  const nav = useNavigate();
  const voiture = useVoitureV1();
  const { etat } = useEnregistrement();
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<ErreurDemarrage | null>(null);
  const message = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (erreur) message.current?.focus();
  }, [erreur]);
  if (etat) return <Navigate to="/en-route" replace />;

  const demarrer = async () => {
    if (!voiture) return nav("/voiture");
    setErreur(null);
    setAttente(true);
    const r = await enregistreur().demarrer(voiture);
    setAttente(false);
    if (r.ok) nav("/en-route");
    else setErreur(r.erreur);
  };

  return (
    <section className="screen" data-screen="T1" role="tabpanel" aria-labelledby="onglet-trajet">
      <div className="scroll home">
        {voiture ? (
          <CarteVoiture voiture={voiture} onChanger={() => nav("/voiture", { state: { changer: true } })} />
        ) : (
          <div className="carcard" data-el="ma-voiture" data-vide="oui">
            <div className="nm">{T.sansVoiture}</div>
            <div className="sp">{T.sansVoitureDetail}</div>
          </div>
        )}
        <button type="button" className="btn gobig" data-el="bouton-demarrer" onClick={demarrer} disabled={attente} aria-busy={attente}>
          {attente ? <span className="gobig-attente">{T.demarrageAttente}</span> : T.demarrer}
        </button>
        {erreur && (
          <div className="alert" role="alert" tabIndex={-1} ref={message} data-el="message-localisation" data-erreur={erreur}>
            <b>{erreur === "refusee" ? T.localisationRefusee : T.localisationIndispo}</b>
            {erreur === "refusee" && <span>{T.localisationRefuseeDetail}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
