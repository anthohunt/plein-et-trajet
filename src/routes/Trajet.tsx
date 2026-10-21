// T1 Trajet (accueil, jalon 5, T5.2) : la voiture au centre et le gros bouton rond « Démarrer ».
// Sans voiture : invitation, et « Démarrer » ouvre Ma voiture. Localisation refusée : message, aucun trajet créé.
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Navigate, useNavigate } from "react-router-dom";
import { CarteVoiture } from "../components/CarteVoiture";
import { enregistreur, type ErreurDemarrage } from "../lib/plateforme";
import { useEnregistrement, useVoitureV1 } from "../lib/useEnregistrement";
import { T } from "../lib/textes";
import { TrajetEnRoute } from "../lib/trajetEnRoute";

// Appli Android (jalon 6, round 2) : au premier Démarrer, on propose une fois de sortir l'appli de l'optimisation de batterie
// (les surcouches comme OxygenOS tuent les services en fond) ; la réponse, quelle qu'elle soit, n'est plus redemandée.
const CLE_BATTERIE = "pt-batterie-proposee";
async function proposerBatterieUneFois(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    if (localStorage.getItem(CLE_BATTERIE)) return false;
    localStorage.setItem(CLE_BATTERIE, "1");
    return !(await TrajetEnRoute.batterie()).horsOptimisation;
  } catch {
    return false;
  }
}

export default function Trajet() {
  const nav = useNavigate();
  const voiture = useVoitureV1();
  const { etat } = useEnregistrement();
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<ErreurDemarrage | null>(null);
  const [batterie, setBatterie] = useState(false);
  const message = useRef<HTMLDivElement>(null);
  const dialogue = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (erreur) message.current?.focus();
  }, [erreur]);
  useEffect(() => {
    if (batterie) dialogue.current?.focus();
  }, [batterie]);
  if (etat) return <Navigate to="/en-route" replace />;

  const demarrer = async () => {
    if (!voiture) return nav("/voiture");
    if (await proposerBatterieUneFois()) return setBatterie(true);
    lancer();
  };
  const repondreBatterie = async (autoriser: boolean) => {
    setBatterie(false);
    if (autoriser) await TrajetEnRoute.proposerBatterie().catch(() => undefined);
    lancer();
  };
  const lancer = async () => {
    if (!voiture) return;
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
        <button type="button" className="btn gobig" data-el="bouton-demarrer" onClick={demarrer} disabled={attente || batterie} aria-busy={attente}>
          {attente ? <span className="gobig-attente">{T.demarrageAttente}</span> : T.demarrer}
        </button>
        {batterie && (
          <div className="alert" role="alertdialog" aria-labelledby="titre-batterie" aria-describedby="texte-batterie" tabIndex={-1} ref={dialogue} data-el="proposer-batterie">
            <b id="titre-batterie">{T.batterieTitre}</b>
            <span id="texte-batterie">{T.batterieTexte}</span>
            <div className="r">
              <button className="btn ghost" type="button" data-el="batterie-plus-tard" onClick={() => repondreBatterie(false)}>
                {T.batteriePlusTard}
              </button>
              <button className="btn" type="button" data-el="batterie-autoriser" onClick={() => repondreBatterie(true)}>
                {T.batterieAutoriser}
              </button>
            </div>
          </div>
        )}
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
