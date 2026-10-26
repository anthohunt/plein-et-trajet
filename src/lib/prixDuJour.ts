// Prix du direct et de la fin de trajet (jalon 5) : moyenne du jour du pays de départ pour chaque carburant ;
// carburant sans moyenne dans ce pays → moyenne France, et le libellé le dit.
import { CARBURANTS, type Carburant } from "./format";
import { moyennesParPays } from "./donnees";
import type { PrixMoyen } from "./historique";

export async function moyennesDuPays(pays: string): Promise<Partial<Record<Carburant, PrixMoyen>>> {
  const out: Partial<Record<Carburant, PrixMoyen>> = {};
  const res = await Promise.allSettled(CARBURANTS.map((c) => moyennesParPays(c)));
  res.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const ici = r.value.get(pays);
    const fr = r.value.get("FR");
    const m = ici ?? fr;
    if (m && m.prix_moyen > 0) out[CARBURANTS[i]] = { prix: m.prix_moyen, pays: ici ? pays : "FR" };
  });
  return out;
}
