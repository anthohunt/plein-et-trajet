// Champ de lieu (départ / arrivée) avec propositions au fil de la frappe (géocodage IGN).
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { suggererLieux, type Suggestion } from "../lib/geocodage";
import type { Lieu } from "../lib/position";
import { T } from "../lib/textes";

interface Props {
  id: string;
  etiquette: string;
  placeholder: string;
  dataEl: string;
  texte: string;
  onTexte: (t: string) => void;
  onChoix: (l: Lieu) => void;
  onSortie: () => void;
  erreur: string | null;
  inputRef?: React.Ref<HTMLInputElement>;
  apres?: React.ReactNode; // bouton ⇅ du départ : posé dans la ligne, à sa jonction avec l'arrivée, même quand une erreur l'allonge
}

export function ChampLieu({ id, etiquette, placeholder, dataEl, texte, onTexte, onChoix, onSortie, erreur, inputRef, apres }: Props) {
  const [propositions, setPropositions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [indispo, setIndispo] = useState(false);
  const idListe = useId();
  const idErreur = `${id}-erreur`;
  const dernier = useRef("");
  const saisi = useRef(false); // propositions seulement après une frappe (pas pour un texte pré-rempli)
  const vientDuFocus = useRef(false);

  useEffect(() => {
    if (!saisi.current) return;
    const q = texte.trim();
    if (q.length < 2 || q === dernier.current) {
      if (q.length < 2) setPropositions([]);
      return;
    }
    const c = new AbortController();
    const t = setTimeout(() => {
      const afficher = (s: Suggestion[]) => {
        if (c.signal.aborted || !saisi.current) return; // un lieu déjà choisi n'est pas rouvert par une réponse tardive
        dernier.current = q;
        setIndispo(false);
        setPropositions(s);
        setActif(-1);
        setOuvert(s.length > 0);
      };
      suggererLieux(q, c.signal, afficher)
        .then((s) => {
          if (!saisi.current) return;
          dernier.current = q;
          setIndispo(false);
          setPropositions(s);
          setActif(-1);
          setOuvert(s.length > 0);
        })
        .catch(() => {
          // requête remplacée par la frappe suivante : rien à dire ; service injoignable : on le signale, la saisie libre reste possible
          if (!c.signal.aborted) setIndispo(true);
        });
    }, 180);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [texte]);

  const choisir = (s: Suggestion) => {
    saisi.current = false;
    dernier.current = s.label;
    setOuvert(false);
    setPropositions([]);
    onTexte(s.label);
    onChoix({ lat: s.lat, lon: s.lon, label: s.label });
  };
  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && ouvert) {
      e.preventDefault();
      e.stopPropagation();
      setOuvert(false);
    } else if (e.key === "ArrowDown" && propositions.length > 0) {
      e.preventDefault();
      setOuvert(true);
      setActif((a) => (a + 1) % propositions.length);
    } else if (e.key === "ArrowUp" && ouvert) {
      e.preventDefault();
      setActif((a) => (a <= 0 ? propositions.length - 1 : a - 1));
    } else if (e.key === "Enter" && ouvert && actif >= 0) {
      e.preventDefault();
      choisir(propositions[actif]);
    }
  };

  return (
    <div className={"fld" + (erreur ? " err" : "")} data-el={`${dataEl}-ligne`}>
      <label htmlFor={id}>{etiquette}</label>
      <input
        id={id}
        ref={inputRef}
        data-el={dataEl}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-activedescendant={ouvert && actif >= 0 ? `${idListe}-${actif}` : undefined}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        placeholder={placeholder}
        value={texte}
        onChange={(e) => {
          saisi.current = true;
          onTexte(e.target.value);
        }}
        onKeyDown={touche}
        onFocus={(e) => {
          // texte pré-rempli ou choisi : sélectionné entier, la frappe le remplace sans l'effacer d'abord
          if (saisi.current || !e.currentTarget.value) return;
          e.currentTarget.select();
          vientDuFocus.current = true;
        }}
        onMouseUp={(e) => {
          if (!vientDuFocus.current) return;
          vientDuFocus.current = false;
          e.preventDefault(); // le relâchement du doigt ne défait pas la sélection
        }}
        onBlur={() => {
          setOuvert(false);
          onSortie();
        }}
      />
      {apres}
      {ouvert && (
        <ul className="sugg" id={idListe} role="listbox" aria-label={T.propositionsLieux} data-el={`${dataEl}-propositions`}>
          {propositions.map((s, i) => (
            <li
              key={`${s.lat},${s.lon},${s.label}`}
              id={`${idListe}-${i}`}
              role="option"
              aria-selected={i === actif}
              className={"sugg-opt" + (i === actif ? " actif" : "")}
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(s);
              }}
              onMouseEnter={() => setActif(i)}
            >
              <span className="sugg-l">{s.label}</span>
              {s.contexte && <span className="sugg-c">{s.contexte}</span>}
            </li>
          ))}
        </ul>
      )}
      {indispo && !erreur && <p className="note fld-note" role="status" data-el={`${dataEl}-indispo`}>{T.propositionsIndisponibles}</p>}
      {erreur && (
        <p className="err-msg" id={idErreur} role="alert" data-el={`${dataEl}-erreur`}>
          {erreur}
        </p>
      )}
    </div>
  );
}
