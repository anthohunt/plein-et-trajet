// Connexion administrateur par lien magique (non liée dans l'appli : l'adresse /admin n'est connue que de l'administrateur).
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { envoyerLien, useAdmin } from "../lib/admin";
import { T } from "../lib/textes";

export default function Admin() {
  const { pret, admin } = useAdmin();
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoye" | "refuse">("saisie");
  if (pret && admin) return <Navigate to="/moteurs" replace />;
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEtat((await envoyerLien(email.trim())) ? "envoye" : "refuse");
  };
  return (
    <section className="screen" data-screen="admin" role="region" aria-labelledby="titre-admin">
      <div className="scroll">
        <h2 className="route" id="titre-admin">{T.adminTitre}</h2>
        <p className="rsub">{T.adminIntro}</p>
        <form className="form" onSubmit={envoyer}>
          <div className="fld">
            <label htmlFor="admin-email">{T.adminEmail}</label>
            <input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-el="admin-email" />
          </div>
          <button className="btn" type="submit" data-el="admin-envoyer">{T.adminEnvoyer}</button>
        </form>
        {etat === "envoye" && <p className="note" role="status">{T.adminEnvoye}</p>}
        {etat === "refuse" && <p className="err-msg hist-msg" role="alert">{T.adminRefuse}</p>}
      </div>
    </section>
  );
}
