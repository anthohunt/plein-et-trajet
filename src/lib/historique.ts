import { euros } from "./calcul";
import { T } from "./textes";

export function coutHistorique(cout: number | null): string {
  return cout == null ? T.coutHistInconnu : T.coutHist(euros(cout));
}
