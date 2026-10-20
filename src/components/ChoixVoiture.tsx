// Choix de voiture : marque → modèle → motorisation (S3), mémorisée dans `preferences`.
import type { EtatVoiture } from "../lib/useVoiture";
import { fmt } from "../lib/calcul";
import { T } from "../lib/textes";
import { ListeDeroulante } from "./ListeDeroulante";

export function ChoixVoiture({ v, erreur }: { v: EtatVoiture; erreur: string | null }) {
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
        <ListeDeroulante id="voiture-marque" nom={T.champMarque} placeholder={T.champMarque} options={optsMarques} valeur={v.marque} onChoix={v.choisirMarque} chargement={v.chargement} invalide={!!erreur} decrit={erreur ? "voiture-erreur" : undefined} />
        <ListeDeroulante id="voiture-modele" nom={T.champModele} placeholder={T.champModele} options={optsModeles} valeur={v.modele} onChoix={v.choisirModele} desactive={!v.marque} chargement={!!v.marque && v.modeles.length === 0 && !v.erreur} />
        <ListeDeroulante id="voiture-moteur" nom={T.champMotorisation} placeholder={T.champMotorisation} options={optsMoteurs} valeur={v.vehicule?.id ?? null} onChoix={v.choisirVehicule} desactive={!v.modele} chargement={!!v.modele && v.motorisations.length === 0 && !v.erreur} />
      </div>
      {v.vehicule && <p className="carlib" data-el="voiture-libelle">{v.vehicule.motorisation}</p>}
      <div className="carnote">
        <span data-el="voiture-info">{v.vehicule ? `${v.vehicule.carburant} · ${v.vehicule.masse_kg} kg` : ""}</span>
        {v.vehicule && <span data-el="voiture-memorisee">{T.voitureMemorisee}</span>}
        {!v.vehicule && v.marque && <span data-el="marque-memorisee">{T.marqueMemorisee}</span>}
      </div>
      {v.erreur && <p className="err-msg" role="alert">{T.voitureIndisponible}</p>}
      {erreur && (
        <p className="err-msg" id="voiture-erreur" role="alert" data-el="voiture-erreur">
          {erreur}
        </p>
      )}
    </div>
  );
}
