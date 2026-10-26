// Voiture enregistrée (T1, jalon 5) : marque et modèle, version, année, carburant ; « Changer » ouvre Ma voiture.
import { T } from "../lib/textes";
import { detailVoiture, nomVoiture, type VoitureV1 } from "../lib/voiture";

export function CarteVoiture({ voiture, onChanger }: { voiture: VoitureV1; onChanger: () => void }) {
  return (
    <div className="carcard" data-el="ma-voiture" data-cle={voiture.cle}>
      <div className="nm" data-el="nom-voiture">{nomVoiture(voiture)}</div>
      <div className="sp" data-el="detail-voiture">{detailVoiture(voiture)}</div>
      <button type="button" className="chg" data-el="changer-voiture" aria-label={T.changerVoitureLabel} onClick={onChanger}>
        {T.changerVoiture}
      </button>
    </div>
  );
}
