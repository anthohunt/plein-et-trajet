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
}

export function ChampLieu({ id, etiquette, placeholder, dataEl, texte, onTexte, onChoix, onSortie, erreur, inputRef }: Props) {
  const [propositions, setPropositions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const idListe = useId();
  const idErreur = `${id}-erreur`;
  const dernier = useRef("");
  const saisi = useRef(false); // propositions seulement après une frappe (pas pour un texte pré-rempli)

  useEffect(() => {
    if (!saisi.current) return;
    const q = texte.trim();
    if (q.length < 2 || q === dernier.current) {
      if (q.length < 2) setPropositions([]);
      return;
    }
    const c = new AbortController();
    const t = setTimeout(() => {
      suggererLieux(q, c.signal)
        .then((s) => {
          dernier.current = q;
          setPropositions(s);
          setActif(-1);
          setOuvert(s.length > 0);
        })
        .catch(() => {
          /* service injoignable ou requête remplacée : pas de proposition, la saisie libre reste possible */
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
        onBlur={() => {
          setOuvert(false);
          onSortie();
        }}
      />
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
      {erreur && (
        <p className="err-msg" id={idErreur} role="alert" data-el={`${dataEl}-erreur`}>
          {erreur}
        </p>
      )}
    </div>
  );
}
