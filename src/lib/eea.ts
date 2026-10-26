// Appels à la fonction voiture-eea (jalon 5, T5.3) : version par le code D.2, ou recherche par nom, année et puissance.
import type { VersionEea } from "../../supabase/functions/_shared/eea.ts";

export type CodeErreurEea = "code_inconnu" | "electrique" | "base_injoignable" | "requete_invalide";
export class ErreurEea extends Error {
  constructor(public code: CodeErreurEea) {
    super(code);
  }
}

const URL_FONCTION = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/voiture-eea`;
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function appeler(param: "d2" | "q", valeur: string, signal?: AbortSignal): Promise<VersionEea[]> {
  let r: Response;
  try {
    r = await fetch(`${URL_FONCTION}?${param}=${encodeURIComponent(valeur)}`, { signal, headers: { apikey: CLE, Authorization: `Bearer ${CLE}` } });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ErreurEea("base_injoignable");
  }
  const corps = await r.json().catch(() => null);
  if (r.ok && Array.isArray(corps?.versions)) return corps.versions as VersionEea[];
  const code = corps?.erreur;
  if (code === "code_inconnu" || code === "electrique" || code === "requete_invalide") throw new ErreurEea(code);
  throw new ErreurEea("base_injoignable");
}

/**
 * La lettre O et le chiffre 0 se confondent sur une carte grise (« 5RBUOC » pour 5RBU0C, constaté le 21/10) : dans un morceau qui
 * contient un chiffre, on essaie d'abord avec des zéros, puis tel quel.
 */
export function variantesD2(d2: string): string[] {
  const zero = d2.replace(/\S+/g, (m) => (/\d/.test(m) ? m.replace(/[oO]/g, "0") : m));
  return zero === d2 ? [d2] : [zero, d2];
}

/** GET voiture-eea?d2=… → versions du code, la plus immatriculée en tête. */
export async function versionsParCode(d2: string, signal?: AbortSignal): Promise<VersionEea[]> {
  const [premier, autre] = variantesD2(d2);
  try {
    return await appeler("d2", premier, signal);
  } catch (e) {
    if (autre == null || !(e instanceof ErreurEea) || e.code !== "code_inconnu") throw e;
    return appeler("d2", autre, signal);
  }
}
/** GET voiture-eea?q=… → 10 versions au plus. */
export const versionsParNom = (q: string, signal?: AbortSignal) => appeler("q", q, signal);
