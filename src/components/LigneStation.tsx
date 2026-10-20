import { anciennete, distance, ecart } from "../lib/format";
import type { Station } from "../lib/donnees";
import { TotemPrix } from "./TotemPrix";

export interface StationAffichee extends Station {
  libelle: string;
  prix: number;
  maj: string | null;
  distanceKm: number;
}

export function LigneStation({ s, moyenne, carburant, onOuvrir }: { s: StationAffichee; moyenne: number | null; carburant: string; onOuvrir: (s: StationAffichee, el: HTMLElement) => void }) {
  const age = anciennete(s.maj);
  const e = ecart(s.prix, moyenne);
  return (
    <li>
      <button type="button" className="row" data-el="ligne-station" data-station={s.id} onClick={(ev) => onOuvrir(s, ev.currentTarget)}>
        <span>
          <span className="n">{s.libelle}</span>
          <span className="m">
            {distance(s.distanceKm)} · <span className={age.ancien ? "ancien" : undefined} data-el="anciennete">{age.texte}</span>
            {e && (
              <>
                {" · "}
                <span className={"delta " + e.sens} data-el="ecart">{e.texte}</span>
              </>
            )}
          </span>
        </span>
        <TotemPrix prix={s.prix} ancien={age.ancien} cleAnim={carburant + s.id} />
      </button>
    </li>
  );
}
