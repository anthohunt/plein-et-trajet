// Barrière d'erreur racine (durcissement r1, D3) : une exception de rendu n'efface plus toute l'appli ; on propose de recharger,
// ou d'effacer les données locales (IndexedDB + localStorage) si c'est elles qui font planter l'appli à chaque lancement.
import { Component, type ReactNode } from "react";

/** Vide la base IndexedDB de l'appli et le localStorage, puis recharge. Chaque étape est tolérante : on recharge quoi qu'il arrive. */
export async function effacerDonneesLocales(): Promise<void> {
  try {
    const noms = new Set<string>(["plein-et-trajet"]);
    const liste = await (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }).databases?.().catch(() => []);
    for (const d of liste ?? []) if (d.name) noms.add(d.name);
    await Promise.all(
      [...noms].map(
        (n) =>
          new Promise<void>((ok) => {
            const r = indexedDB.deleteDatabase(n);
            r.onsuccess = r.onerror = r.onblocked = () => ok();
          }),
      ),
    );
  } catch {
    /* IndexedDB indisponible */
  }
  try {
    localStorage.clear();
  } catch {
    /* stockage indisponible */
  }
  window.location.replace("/");
}

interface Etat {
  erreur: Error | null;
}

export default class BarriereErreur extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { erreur: null };
  static getDerivedStateFromError(erreur: Error): Etat {
    return { erreur };
  }
  componentDidCatch(erreur: Error) {
    console.error("[Plein & Trajet] erreur d'affichage", erreur);
  }
  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div role="alert" data-el="barriere-erreur" style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px", font: "16px/1.45 system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Un problème est survenu</h1>
        <p style={{ margin: "0 0 20px" }}>L'écran n'a pas pu s'afficher. Recharger suffit souvent. Si le problème revient à chaque lancement, effacez les données locales de l'appli (trajets gardés sur ce téléphone, voiture enregistrée).</p>
        <div style={{ display: "grid", gap: 12 }}>
          <button type="button" data-el="barriere-recharger" onClick={() => window.location.reload()} style={{ padding: "14px 16px", fontWeight: 700, fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent" }}>
            Recharger
          </button>
          <button type="button" data-el="barriere-effacer" onClick={() => void effacerDonneesLocales()} style={{ padding: "14px 16px", fontWeight: 700, fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent" }}>
            Effacer les données locales de l'appli
          </button>
        </div>
      </div>
    );
  }
}
