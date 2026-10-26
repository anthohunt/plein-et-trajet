// État du choix de voiture (marque → modèle → motorisation), restauré depuis `preferences` et mémorisé à chaque choix.
import { useCallback, useEffect, useRef, useState } from "react";
import { marques as lireMarques, memoriserPreference, lirePreference, modeles as lireModeles, motorisations as lireMotorisations, vehiculeParId, type Vehicule } from "./vehicules";
import { ordreMotorisations } from "./calcul";

export interface EtatVoiture {
  marques: string[];
  modeles: string[];
  motorisations: Vehicule[];
  proposee: string | null;
  marque: string | null;
  modele: string | null;
  vehicule: Vehicule | null;
  chargement: boolean; // lecture initiale (marques + préférence)
  erreur: boolean;
  choisirMarque: (m: string) => void;
  choisirModele: (m: string) => void;
  choisirVehicule: (id: string) => void;
}

export function useVoiture(): EtatVoiture {
  const [marques, setMarques] = useState<string[]>([]);
  const [modeles, setModeles] = useState<string[]>([]);
  const [motorisations, setMotorisations] = useState<Vehicule[]>([]);
  const [proposee, setProposee] = useState<string | null>(null);
  const [marque, setMarque] = useState<string | null>(null);
  const [modele, setModele] = useState<string | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const actif = useRef(true);
  const choixFait = useRef(false); // un choix de l'utilisateur prime sur la préférence qui arrive en retard

  const chargerMotorisations = useCallback(async (ma: string, mo: string) => {
    const liste = await lireMotorisations(ma, mo);
    const { proposee: p, ordre } = ordreMotorisations(liste);
    if (!actif.current) return [] as Vehicule[];
    setMotorisations(ordre);
    setProposee(p?.id ?? null);
    return ordre;
  }, []);

  useEffect(() => {
    actif.current = true;
    (async () => {
      try {
        const [ms, pref] = await Promise.all([lireMarques(), lirePreference()]);
        if (!actif.current) return;
        setMarques(ms);
        if (pref && !choixFait.current) {
          if (pref.marque) {
            setMarque(pref.marque);
            setModeles(await lireModeles(pref.marque));
          }
          if (pref.marque && pref.modele) {
            setModele(pref.modele);
            await chargerMotorisations(pref.marque, pref.modele);
          }
          if (pref.vehicule_id) {
            const v = await vehiculeParId(pref.vehicule_id);
            if (actif.current && v) setVehicule(v);
          }
        }
      } catch {
        if (actif.current) setErreur(true);
      } finally {
        if (actif.current) setChargement(false);
      }
    })();
    return () => {
      actif.current = false;
    };
  }, [chargerMotorisations]);

  const memoriser = (p: { marque: string | null; modele: string | null; vehicule_id: string | null; carburant: Vehicule["carburant"] | null }) => {
    memoriserPreference(p).catch(() => {
      /* la voiture reste choisie pour cette session ; elle ne sera pas pré-remplie au prochain lancement */
    });
  };

  const choisirMarque = (m: string) => {
    choixFait.current = true;
    setMarque(m);
    setModele(null);
    setVehicule(null);
    setModeles([]);
    setMotorisations([]);
    setProposee(null);
    memoriser({ marque: m, modele: null, vehicule_id: null, carburant: null });
    lireModeles(m)
      .then((l) => actif.current && setModeles(l))
      .catch(() => actif.current && setErreur(true));
  };
  const choisirModele = (mo: string) => {
    if (!marque) return;
    choixFait.current = true;
    setModele(mo);
    setVehicule(null);
    setMotorisations([]);
    setProposee(null);
    memoriser({ marque, modele: mo, vehicule_id: null, carburant: null });
    chargerMotorisations(marque, mo).catch(() => actif.current && setErreur(true));
  };
  const choisirVehicule = (id: string) => {
    const v = motorisations.find((x) => x.id === id);
    if (!v) return;
    choixFait.current = true;
    setVehicule(v);
    memoriser({ marque: v.marque, modele: v.modele, vehicule_id: v.id, carburant: v.carburant });
  };

  return { marques, modeles, motorisations, proposee, marque, modele, vehicule, chargement, erreur, choisirMarque, choisirModele, choisirVehicule };
}
