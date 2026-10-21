// S5 Moteurs — réservé à l'administrateur : fournisseur actif, secours et clé de chaque service.
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdmin } from "../lib/admin";
import { enregistrerMoteur, listerMoteurs, testerMoteur, type EtatMoteur, type Moteur } from "../lib/moteurs";
import { T } from "../lib/textes";

interface Brouillon {
  actif: string;
  secours: string;
  cle: string;
  cleSecours: string;
  etat: EtatMoteur;
  message: string;
  occupe: boolean;
}

/** « ptv : cle_refusee (401) » → « PTV : clé refusée (401) » */
const lireIncident = (m: Moteur, brut: string) => {
  const [f, ...reste] = brut.split(" : ");
  const code = reste.join(" : ").replace(/^(\w+)/, (c) => T.incidentCodes[c] ?? c);
  return `${nomCourt(m)(f)} : ${code}`;
};
/** Nom court d'un fournisseur (« PTV Developer » → « PTV »), d'après la liste du moteur. */
const nomCourt = (m: Moteur) => (id: string) => (m.fournisseurs.find((x) => x.id === id)?.nom ?? id).split(/[ ·]/)[0];
const heure = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Lien « Où trouver ma clé » : adresse et consigne viennent de la table fournisseurs ; rien pour un fournisseur sans clé. */
function LienCle({ f }: { f: { nom: string; cle_requise: boolean; url_cle: string | null; consigne_cle: string | null } }) {
  if (!f.cle_requise || !f.url_cle) return null;
  return (
    <div className="d lien-cle" data-el="lien-cle">
      <a href={f.url_cle} target="_blank" rel="noopener noreferrer" aria-label={T.ouTrouverCleLabel(f.nom)}>{T.ouTrouverCle}</a>
      {f.consigne_cle && <span data-el="consigne-cle"> · {f.consigne_cle}</span>}
    </div>
  );
}

export default function Moteurs() {
  const { pret, admin } = useAdmin();
  const nav = useNavigate();
  const [moteurs, setMoteurs] = useState<Moteur[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [b, setB] = useState<Record<string, Brouillon>>({});

  const charger = useCallback(async () => {
    try {
      const l = await listerMoteurs();
      setMoteurs(l);
      setB((prec) => Object.fromEntries(l.map((m) => [m.service, { actif: m.actif, secours: m.secours ?? "", cle: "", cleSecours: "", etat: m.etat, message: T.etatMoteur(m, nomCourt(m)), occupe: false, ...(prec[m.service]?.occupe ? prec[m.service] : {}) }])));
      setErreur(false);
    } catch {
      setErreur(true);
    }
  }, []);
  useEffect(() => {
    if (admin) void charger();
  }, [admin, charger]);

  if (!pret) return null;
  if (!admin) return <Navigate to="/" replace />;

  const maj = (service: string, p: Partial<Brouillon>) => setB((x) => ({ ...x, [service]: { ...x[service], ...p } }));
  const nomF = (m: Moteur, id: string) => m.fournisseurs.find((f) => f.id === id)?.nom ?? id;

  const choisir = (m: Moteur, id: string) => {
    const f = m.fournisseurs.find((x) => x.id === id)!;
    const sansCle = f.cle_requise && !f.cle_fin;
    // la pastille dit l'ÉTAT (audit round 3, LOW 10) : celui du moteur si on revient à l'actif, sinon « à tester » ; jamais la phrase du champ
    const etat = id === m.actif ? { etat: m.etat, message: T.etatMoteur(m, nomCourt(m)) } : sansCle ? { etat: "wait" as EtatMoteur, message: T.etatCleAColler } : { etat: "ok" as EtatMoteur, message: f.cle_requise ? T.etatCleRangee : T.etatPretSansCle };
    maj(m.service, { actif: id, secours: b[m.service].secours === id ? "" : b[m.service].secours, cle: "", ...etat });
  };
  const tester = async (m: Moteur) => {
    maj(m.service, { occupe: true, etat: "wait", message: T.testEnCours });
    try {
      const r = await testerMoteur(m.service, b[m.service].actif, b[m.service].cle);
      maj(m.service, { occupe: false, etat: r.etat, message: T.etatMoteur(r, nomCourt(m)) });
    } catch {
      maj(m.service, { occupe: false, etat: "ko", message: T.moteursErreur });
    }
  };
  const enregistrer = async (m: Moteur) => {
    const d = b[m.service];
    maj(m.service, { occupe: true, etat: "wait", message: T.testEnCours });
    try {
      const r = await enregistrerMoteur(m.service, d.actif, d.secours || null, d.cle, d.cleSecours);
      setMoteurs(r.moteurs);
      setB((x) => ({
        ...x,
        ...Object.fromEntries(r.moteurs.filter((y) => y.service !== m.service).map((y) => [y.service, x[y.service] ?? { actif: y.actif, secours: y.secours ?? "", cle: "", cleSecours: "", etat: y.etat, message: T.etatMoteur(y, nomCourt(y)), occupe: false }])),
        [m.service]: { actif: r.enregistre ? d.actif : r.moteurs.find((y) => y.service === m.service)!.actif, secours: r.enregistre ? d.secours : r.moteurs.find((y) => y.service === m.service)!.secours ?? "", cle: "", cleSecours: "", etat: r.etat, message: T.resultatEnregistrement(r, nomCourt(m)), occupe: false },
      }));
    } catch {
      maj(m.service, { occupe: false, etat: "ko", message: T.moteursErreur });
    }
  };

  return (
    <section className="screen" data-screen="S5" role="region" aria-labelledby="titre-moteurs">
      <div className="scroll">
        <div className="rhead">
          <button className="back" type="button" data-el="retour-moteurs" onClick={() => nav("/")}>
            <span>{T.moteursRetour}</span>
          </button>
        </div>
        <h2 className="route" id="titre-moteurs">{T.moteursTitre}</h2>
        {erreur && <p className="err-msg hist-msg" role="alert" data-el="moteurs-erreur">{T.moteursErreur}</p>}
        {!moteurs && !erreur && <p className="empty hist-msg" role="status">{T.moteursChargement}</p>}
        <ul className="mots" data-el="liste-moteurs">
          {moteurs?.map((m) => {
            const d = b[m.service];
            if (!d) return null;
            const f = m.fournisseurs.find((x) => x.id === d.actif)!;
            const fs = d.secours ? m.fournisseurs.find((x) => x.id === d.secours) : undefined;
            const peages = m.service === "peages";
            const id = `mot-${m.service}`;
            const seul = m.fournisseurs.length === 1;
            return (
              <li className="mot" key={m.service} data-service={m.service} data-el="moteur">
                <h3>
                  {m.nom}
                  <span className={"stt " + d.etat} role="status" data-el="etat-moteur" data-etat={d.etat}>{d.message}</span>
                </h3>
                {/* un seul fournisseur : rien à choisir, son nom suffit */}
                {seul ? (
                  <div className="d" data-el={"fournisseur-" + m.service}>{f.nom}</div>
                ) : (
                  <div className="r">
                    <label className="sr-only" htmlFor={`${id}-f`}>{T.fournisseur} · {m.nom}</label>
                    <select id={`${id}-f`} data-el={peages ? "choix-fournisseur" : "choix-fournisseur-" + m.service} value={d.actif} onChange={(e) => choisir(m, e.target.value)}>
                      {m.fournisseurs.map((x) => (
                        <option key={x.id} value={x.id}>{x.nom}</option>
                      ))}
                    </select>
                  </div>
                )}
                {m.fournisseurs.length > 1 && (
                  <div className="r">
                    <label className="sr-only" htmlFor={`${id}-s`}>{T.secours} · {m.nom}</label>
                    <select id={`${id}-s`} data-el={"choix-secours-" + m.service} value={d.secours} onChange={(e) => maj(m.service, { secours: e.target.value })}>
                      <option value="">{T.aucunSecours}</option>
                      {m.fournisseurs.filter((x) => x.id !== d.actif).map((x) => (
                        <option key={x.id} value={x.id}>{T.secours} · {x.nom}</option>
                      ))}
                    </select>
                  </div>
                )}
                {f.cle_requise && (
                  <>
                    <div className="r">
                      <label className="sr-only" htmlFor={`${id}-k`}>{T.cleDe(f.nom)}</label>
                      <input id={`${id}-k`} type="password" autoComplete="off" data-el={peages ? "champ-cle" : "champ-cle-" + m.service} value={d.cle} placeholder={f.cle_fin ? T.cleEnregistree(f.cle_fin) : T.cleAColler} onChange={(e) => maj(m.service, { cle: e.target.value })} />
                    </div>
                    <LienCle f={f} />
                  </>
                )}
                {fs?.cle_requise && (
                  <>
                    <div className="r">
                      <label className="sr-only" htmlFor={`${id}-ks`}>{T.cleDe(fs.nom)}</label>
                      <input id={`${id}-ks`} type="password" autoComplete="off" data-el={"champ-cle-secours-" + m.service} value={d.cleSecours} placeholder={fs.cle_fin ? T.cleEnregistree(fs.cle_fin) : `${T.cleAColler} · ${fs.nom}`} onChange={(e) => maj(m.service, { cleSecours: e.target.value })} />
                    </div>
                    <LienCle f={fs} />
                  </>
                )}
                <div className="r">
                  <button type="button" disabled={d.occupe} data-el={peages ? "tester-connexion" : "tester-connexion-" + m.service} onClick={() => tester(m)}>{T.tester}</button>
                  {(!seul || f.cle_requise) && <button type="button" className="save" disabled={d.occupe} data-el={peages ? "enregistrer-moteur" : "enregistrer-moteur-" + m.service} onClick={() => enregistrer(m)}>{T.enregistrer}</button>}
                </div>
                {m.bascule && <div className="d" data-el="bascule" data-resolu={m.bascule.resolu ? "oui" : "non"}>{(m.bascule.resolu ? T.basculeResolue : T.basculeNotee)(nomF(m, m.bascule.de), nomF(m, m.bascule.vers), heure(m.bascule.le))}</div>}
                {m.incident && <div className="d" data-el="incident" data-resolu={m.incident.resolu ? "oui" : "non"}>{(m.incident.resolu ? T.incidentResolu : T.incidentNote)(lireIncident(m, m.incident.message), heure(m.incident.le))}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
