// T2 Ma voiture (jalon 5, T5.3) : code D.2 de la carte grise (recherche dès 6 caractères, après 400 ms sans frappe) ou
// recherche « clio 2017 120 » ; fiche de la version (base européenne EEA) ; « Enregistrer ma voiture » une fois pour toutes.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErreurEea, versionsParCode, versionsParNom, type CodeErreurEea } from "../lib/eea";
import { chevaux, enregistrerVoiture, nomVoiture, versionTexte, type VoitureV1 } from "../lib/voiture";
import { T } from "../lib/textes";

const ATTENTE_MS = 400;
const nombre = (n: number) => n.toLocaleString("fr-FR");

type EtatCode = { e: "vide" } | { e: "chargement" } | { e: "ok"; versions: VoitureV1[] } | { e: "erreur"; code: CodeErreurEea };
type EtatRecherche = { e: "vide" } | { e: "chargement" } | { e: "ok"; versions: VoitureV1[] } | { e: "erreur"; code: CodeErreurEea };

function Fiche({ v }: { v: VoitureV1 }) {
  return (
    <div className="spec" data-el="fiche-voiture" data-cle={v.cle}>
      <div className="nm">{`${nomVoiture(v)} ${versionTexte(v)}`.trim()}</div>
      <dl>
        <dt>{T.ficheAnnee}</dt>
        <dd data-el="fiche-annee">{v.annee}</dd>
        <dt>{T.fichePuissance}</dt>
        <dd data-el="fiche-puissance">{v.puissance_kw ? T.puissanceKwCh(nombre(v.puissance_kw), chevaux(v.puissance_kw)) : T.vide}</dd>
        <dt>{T.ficheCylindree}</dt>
        <dd data-el="fiche-cylindree">{v.cylindree_cm3 ? T.cm3(nombre(v.cylindree_cm3)) : T.vide}</dd>
        <dt>{T.ficheMasse}</dt>
        <dd data-el="fiche-masse">{T.kg(nombre(v.masse_kg))}</dd>
        <dt>{T.ficheCarburant}</dt>
        <dd data-el="fiche-carburant">{v.carburant}</dd>
        <dt>{T.ficheCo2}</dt>
        <dd data-el="fiche-co2">{v.co2_wltp ?? v.co2_nedc ? T.gkm(nombre((v.co2_wltp ?? v.co2_nedc) as number), v.co2_wltp ? T.procedureWltp : T.procedureNedc) : T.vide}</dd>
      </dl>
      <p className="hint" style={{ margin: 0 }}>{T.sourceEea}</p>
    </div>
  );
}

export default function MaVoiture() {
  const nav = useNavigate();
  const [d2, setD2] = useState("");
  const [q, setQ] = useState("");
  const [code, setCode] = useState<EtatCode>({ e: "vide" });
  const [recherche, setRecherche] = useState<EtatRecherche>({ e: "vide" });
  const [choix, setChoix] = useState<VoitureV1 | null>(null);
  const [essai, setEssai] = useState(0);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, []);

  // code D.2 : cherché à partir de 6 caractères (espaces retirés), 400 ms après la dernière frappe
  useEffect(() => {
    const brut = d2.replace(/\s/g, "");
    if (brut.length < 6) {
      setCode({ e: "vide" });
      return;
    }
    const c = new AbortController();
    const t = window.setTimeout(async () => {
      setCode({ e: "chargement" });
      try {
        const versions = await versionsParCode(d2, c.signal);
        if (c.signal.aborted) return;
        setCode({ e: "ok", versions });
        setChoix(versions[0] ?? null);
      } catch (e) {
        if (c.signal.aborted) return;
        setCode({ e: "erreur", code: e instanceof ErreurEea ? e.code : "base_injoignable" });
        setChoix(null);
      }
    }, ATTENTE_MS);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [d2, essai]);

  // recherche par nom, année, puissance
  useEffect(() => {
    if (q.trim().length < 3) {
      setRecherche({ e: "vide" });
      return;
    }
    const c = new AbortController();
    const t = window.setTimeout(async () => {
      setRecherche({ e: "chargement" });
      try {
        const versions = await versionsParNom(q, c.signal);
        if (!c.signal.aborted) setRecherche({ e: "ok", versions });
      } catch (e) {
        if (!c.signal.aborted) setRecherche({ e: "erreur", code: e instanceof ErreurEea ? e.code : "base_injoignable" });
      }
    }, ATTENTE_MS);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  const enregistrer = () => {
    if (!choix) return;
    enregistrerVoiture(choix);
    nav("/");
  };

  const messageErreur = (c: CodeErreurEea) => (c === "electrique" ? T.voitureElectrique : c === "base_injoignable" ? T.baseInjoignable : T.codeIntrouvable);

  return (
    <section className="screen" data-screen="T2" role="tabpanel" aria-labelledby="onglet-trajet">
      <div className="scroll">
        <div className="rhead">
          <button className="back" type="button" data-el="retour-trajet-voiture" aria-label={T.retourTrajetLabel} onClick={() => nav("/")}>
            {T.retourTrajet}
          </button>
        </div>
        <h2 className="route" tabIndex={-1} ref={titre}>{T.maVoiture}</h2>
        <div className="d2" data-el="champ-d2">
          <label htmlFor="d2">{T.champD2}</label>
          <input
            id="d2"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder={T.placeholderD2}
            value={d2}
            aria-describedby="aide-d2"
            aria-invalid={code.e === "erreur" && code.code !== "base_injoignable"}
            onChange={(e) => {
              setD2(e.target.value.toUpperCase());
              setChoix(null);
            }}
          />
        </div>
        <div className="cg" aria-hidden="true">
          {T.aideD2[0]}
          <br />
          {T.aideD2[1]}
          <b>{T.aideD2[2]}</b>
          <br />
          {T.aideD2[3]}
        </div>
        <p className="sr-only" id="aide-d2">{T.aideD2Label}</p>
        <div aria-live="polite" data-el="resultat-d2" data-etat={code.e}>
          {code.e === "chargement" && <p className="hint">{T.rechercheEnCours}</p>}
          {code.e === "erreur" && (
            <div className={code.code === "base_injoignable" ? "alert" : ""} data-el="erreur-d2" data-code={code.code}>
              <p className="hint err" role="alert" style={code.code === "base_injoignable" ? { margin: 0 } : undefined}>{messageErreur(code.code)}</p>
              {code.code === "base_injoignable" && (
                <button type="button" className="btn ghost" data-el="reessayer-d2" onClick={() => setEssai((x) => x + 1)}>
                  {T.reessayer}
                </button>
              )}
            </div>
          )}
          {code.e === "ok" && code.versions.length > 1 && (
            <>
              <p className="hint">{T.plusieursVersions(code.versions.length)}</p>
              <ul className="sugg-v1" data-el="versions-d2">
                {code.versions.map((v) => (
                  <li key={v.cle}>
                    <button type="button" aria-pressed={choix?.cle === v.cle} data-cle={v.cle} onClick={() => setChoix(v)}>
                      {`${nomVoiture(v)} ${versionTexte(v)}`}
                      <br />
                      <span className="m">{T.versionLigne(v.annee, v.puissance_kw ? nombre(v.puissance_kw) : T.vide, nombre(v.masse_kg), v.carburant, nombre(v.immatriculations))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {choix && <Fiche v={choix} />}
        <p className="or">{T.pasLaCarteGrise}</p>
        <div className="d2" data-el="recherche-voiture">
          <label htmlFor="q">{T.champRecherche}</label>
          <input id="q" className="q" autoComplete="off" placeholder={T.placeholderRecherche} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div aria-live="polite" data-el="resultat-recherche" data-etat={recherche.e}>
          {recherche.e === "chargement" && <p className="hint">{T.rechercheEnCours}</p>}
          {recherche.e === "erreur" && (
            <p className="hint err" role="alert" data-code={recherche.code}>
              {recherche.code === "base_injoignable" ? T.baseInjoignable : recherche.code === "electrique" ? T.voitureElectrique : T.aucuneVersion}
            </p>
          )}
          {recherche.e === "ok" && (
            <ul className="sugg-v1" data-el="suggestions-voiture">
              {recherche.versions.map((v) => (
                <li key={v.cle}>
                  <button
                    type="button"
                    data-cle={v.cle}
                    onClick={() => {
                      setChoix(v);
                      setRecherche({ e: "vide" });
                      setCode({ e: "vide" });
                    }}
                  >
                    {`${nomVoiture(v)} ${versionTexte(v)}`}
                    <br />
                    <span className="m">{T.suggestionLigne(v.annee, v.puissance_kw ? nombre(v.puissance_kw) : T.vide, nombre(v.masse_kg), v.carburant, v.ve)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ margin: "16px 16px 20px" }}>
          <button className="btn" type="button" data-el="enregistrer-voiture" disabled={!choix} aria-disabled={!choix} onClick={enregistrer}>
            {T.enregistrerVoiture}
          </button>
        </div>
      </div>
    </section>
  );
}
