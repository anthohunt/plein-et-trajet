// Liste déroulante accessible (motif ARIA « select-only combobox ») : le bouton garde le focus,
// les options s'affichent dans un panneau visible (et capturable), flèches / Entrée / Échap au clavier.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { T } from "../lib/textes";

export interface Option {
  valeur: string;
  libelle: string;
  detail?: string;
  badge?: string;
}

interface Props {
  id: string;
  nom: string; // « Marque », « Modèle », « Motorisation » (libellé accessible)
  placeholder: string;
  options: Option[];
  valeur: string | null;
  onChoix: (valeur: string) => void;
  desactive?: boolean;
  chargement?: boolean;
  invalide?: boolean;
  decrit?: string;
  ouvrirAuto?: number; // change à chaque choix du niveau précédent : la liste s'ouvre seule dès que ses options sont là
}

export function ListeDeroulante({ id, nom, placeholder, options, valeur, onChoix, desactive, chargement, invalide, decrit, ouvrirAuto }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const idListe = useId();
  const courante = options.find((o) => o.valeur === valeur);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  useEffect(() => {
    if (ouvert) document.getElementById(`${idListe}-${actif}`)?.scrollIntoView({ block: "nearest" });
  }, [ouvert, actif, idListe]);

  const ouvrir = () => {
    if (desactive || chargement) return;
    const i = options.findIndex((o) => o.valeur === valeur);
    setActif(i >= 0 ? i : 0);
    setOuvert(true);
  };

  // marque choisie → la liste des modèles s'ouvre seule (puis les motorisations après le modèle) : un toucher de moins à chaque niveau
  const [demandee, setDemandee] = useState(false);
  useEffect(() => {
    if (ouvrirAuto) setDemandee(true);
  }, [ouvrirAuto]);
  useEffect(() => {
    if (!demandee || desactive || chargement || options.length === 0) return;
    setDemandee(false);
    // pendant le chargement, l'utilisateur a pu ouvrir une autre liste ou aller ailleurs : on n'ouvre rien par-dessus, on ne vole pas le focus
    const ici = document.activeElement;
    const groupe = racine.current?.parentElement;
    if (document.querySelector(".dd-liste") || (ici && ici !== document.body && !groupe?.contains(ici))) return;
    bouton.current?.focus();
    ouvrir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandee, desactive, chargement, options.length]);
  const choisir = (i: number) => {
    const o = options[i];
    if (!o) return;
    setOuvert(false);
    onChoix(o.valeur);
    bouton.current?.focus();
  };
  const touche = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && ouvert) {
      e.preventDefault();
      e.stopPropagation();
      setOuvert(false);
      return;
    }
    if (!ouvert) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        ouvrir();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActif(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActif(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choisir(actif);
    } else if (e.key === "Tab") {
      setOuvert(false);
    }
  };

  return (
    <div className="dd" ref={racine}>
      <button
        ref={bouton}
        id={id}
        type="button"
        role="combobox"
        className={"dd-btn" + (courante ? "" : " vide")}
        aria-label={nom}
        title={courante?.libelle}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-activedescendant={ouvert ? `${idListe}-${actif}` : undefined}
        aria-invalid={invalide || undefined}
        aria-describedby={decrit}
        disabled={desactive}
        data-valeur={valeur ?? ""}
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        onKeyDown={touche}
      >
        <span className="dd-txt">{chargement ? T.chargementListe : (courante?.libelle ?? placeholder)}</span>
        <span className="dd-fl" aria-hidden="true">▾</span>
      </button>
      {ouvert && (
        <ul className="dd-liste" id={idListe} role="listbox" aria-label={nom} data-el={`liste-${nom.toLowerCase()}`}>
          {options.length === 0 && <li className="dd-vide" role="presentation">{T.aucuneOption}</li>}
          {options.map((o, i) => (
            <li
              key={o.valeur}
              id={`${idListe}-${i}`}
              role="option"
              aria-selected={o.valeur === valeur}
              className={"dd-opt" + (i === actif ? " actif" : "")}
              data-valeur={o.valeur}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choisir(i)}
              onMouseEnter={() => setActif(i)}
            >
              <span className="dd-o-l">
                {o.libelle}
                {o.badge && <em className="dd-badge">{o.badge}</em>}
              </span>
              {o.detail && <span className="dd-o-d">{o.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
