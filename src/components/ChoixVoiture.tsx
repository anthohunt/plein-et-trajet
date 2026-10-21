// Choix de voiture : marque → modèle → motorisation (S3), mémorisée dans `preferences`.
import { useState } from "react";
import type { EtatVoiture } from "../lib/useVoiture";
import { fmt } from "../lib/calcul";
import { T } from "../lib/textes";
import { ListeDeroulante } from "./ListeDeroulante";

export function ChoixVoiture({ v, erreur }: { v: EtatVoiture; erreur: string | null }) {
  // chaque choix ouvre la liste suivante (marque → modèle → motorisation)
  const [ouvrirModele, setOuvrirModele] = useState(0);
  const [ouvrirMoteur, setOuvrirMoteur] = useState(0);
  const optsMarques = v.marques.map((m) => ({ valeur: m, libelle: m }));
  const optsModeles = v.modeles.map((m) => ({ valeur: m, libelle: m }));
  const optsMoteurs = v.motorisations.map((m) => ({
    valeur: m.id,
    libelle: m.motorisation,
    detail: `${T.kw(fmt(m.puissance_kw, m.puissance_kw % 1 ? 1 : 0))} · ${m.carburant}`,
    badge: m.id === v.proposee ? T.proposee : undefined,
  }));
  return (
    <div className={"voiture" + (erreur ? " err" : "")} data-el="choix-voiture" role="group" aria-label={T.voiture}>
      <div className="car">
        <ListeDeroulante id="voiture-marque" nom={T.champMarque} placeholder={T.champMarque} options={optsMarques} valeur={v.marque} onChoix={(m) => {
          v.choisirMarque(m);
          setOuvrirModele((x) => x + 1);
        }} chargement={v.chargement} invalide={!!erreur} decrit={erreur ? "voiture-erreur" : undefined} />
        <ListeDeroulante id="voiture-modele" nom={T.champModele} placeholder={T.champModele} options={optsModeles} valeur={v.modele} onChoix={(m) => {
          v.choisirModele(m);
          setOuvrirMoteur((x) => x + 1);
        }} ouvrirAuto={ouvrirModele} desactive={!v.marque} chargement={!!v.marque && v.modeles.length === 0 && !v.erreur} />
        <ListeDeroulante id="voiture-moteur" nom={T.champMotorisation} placeholder={T.champMotorisation} options={optsMoteurs} valeur={v.vehicule?.id ?? null} onChoix={v.choisirVehicule} ouvrirAuto={ouvrirMoteur} desactive={!v.modele} chargement={!!v.modele && v.motorisations.length === 0 && !v.erreur} />
      </div>
      {/* seulement ce que les menus ne disent pas déjà (maquette : « SP95-E10 · 1090 kg ») */}
      {v.vehicule && (
        <p className="carlib">
          <span data-el="voiture-info">{v.vehicule.carburant}</span> · <span data-el="voiture-masse">{v.vehicule.masse_kg} kg</span>
        </p>
      )}
      {v.erreur && <p className="err-msg" role="alert">{T.voitureIndisponible}</p>}
      {erreur && (
        <p className="err-msg" id="voiture-erreur" role="alert" data-el="voiture-erreur">
          {erreur}
        </p>
      )}
    </div>
  );
}
