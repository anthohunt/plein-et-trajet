// Textes de l'interface (français), centralisés.
export const T = {
  marque: "Plein",
  marqueEt: "&",
  marqueFin: "Trajet",
  ongletPrix: "Prix",
  ongletTrajets: "Trajets",
  carburant: "Carburant",
  carteStations: "Carte des stations",
  recentrer: "Recentrer sur ma position",
  vousEtesIci: "Vous êtes ici",
  autourDeMoi: "Autour de moi",
  legendeBas: "moins cher",
  legendeHaut: "plus cher",
  stations: (c: string) => `Stations · ${c}`,
  trier: "Trier",
  moinsCher: "Moins cher",
  plusProche: "Plus proche",
  chargement: "Chargement des prix…",
  prixIndisponibles: "Prix indisponibles pour l'instant",
  prixIndisponiblesDetail: "La lecture des prix officiels a échoué. Vérifiez la connexion puis réessayez.",
  reessayer: "Réessayer",
  aucuneStation: "Aucune station ne vend ce carburant autour de vous.",
  positionRefusee: (ville: string) =>
    `Localisation désactivée : carte centrée sur ${ville}. Activez la localisation pour voir les stations autour de vous.`,
  positionIndisponible: (ville: string) => `Position introuvable : carte centrée sur ${ville}.`,
  fermerFiche: "Fermer la fiche",
  nonVendu: "non vendu",
  rupture: "rupture",
  majPrix: (age: string) => `Prix mis à jour ${age}`,
  majPrixAncienne: (jjmm: string) => `Derniers prix déclarés le ${jjmm}`,
  trajetJusquIci: "Coût d'un trajet jusqu'ici",
  ficheErreur: "Impossible de charger les prix de cette station.",
  vsFrance: "vs France",
  metres: (m: number) => `${m} m`,
  kilometres: (k: string) => `${k} km`,
  dateInconnue: "date inconnue",
  prixDu: (jj: string, mm: string) => `prix du ${jj}/${mm}`,
  alInstant: "à l'instant",
  ilYaMin: (n: number) => `il y a ${n} min`,
  ilYaH: (n: number) => `il y a ${n} h`,
  hier: "hier",
  egalFrance: "= France",
  eurosLitre: (p: string) => `${p} euros le litre`,
  annoncePastille: (nom: string, p: string, bas: boolean) => `${nom}, ${p} euros le litre, ${bas ? "moins cher" : "plus cher"}`,
  credits: "© IGN – Géoplateforme · prix : data.economie.gouv.fr",
  creditsBouton: "Afficher ou masquer les crédits",
  signalerCarte: "Signaler une erreur de carte",
  marqueurStation: "Station",
  automate: "Automate 24/24",
  sections: "Sections",
  maPosition: "Ma position",
  chargementPrixStation: "chargement",
  chargementFiche: "Chargement des prix de la station…",
  prixUnite: "€/L",
  nouveauTrajet: "Nouveau trajet",
  depart: "Départ",
  arrivee: "Arrivée",
  // --- Trajets (jalon 2)
  departPlaceholder: "Ville ou adresse",
  arriveePlaceholder: "Ville ou adresse",
  propositionsLieux: "Propositions de lieux",
  propositionsIndisponibles: "Propositions indisponibles pour l'instant : tu peux saisir le lieu en entier.",
  lieuIntrouvable: "Lieu introuvable",
  lieuManquant: "Saisis un lieu",
  lieuVerifIndispo: "Impossible de vérifier ce lieu pour l'instant",
  inverser: "Inverser les deux lieux",
  voiture: "Voiture",
  champMarque: "Marque",
  champModele: "Modèle",
  champMotorisation: "Motorisation",
  chargementListe: "Chargement…",
  aucuneOption: "Aucun choix disponible",
  voitureIndisponible: "La liste des voitures est indisponible pour l'instant.",
  choisisVoiture: "Choisis ta voiture",
  voitureMemorisee: "Voiture mémorisée",
  proposee: "proposée",
  kw: (n: string) => `${n} kW`,
  calculer: "Calculer le coût",
  verification: "Vérification…",
  calculEnCours: "Calcul de l'itinéraire…",
  calculEnCoursDetail: "Itinéraire, altitudes puis consommation de la voiture, tronçon par tronçon.",
  annuler: "Annuler",
  derniersTrajets: "Derniers trajets",
  histChargement: "Chargement de l'historique…",
  histVide: "Aucun trajet pour l'instant",
  histVideInvite: "Choisis un départ, une arrivée et ta voiture, puis touche « Calculer le coût » : ton premier trajet apparaîtra ici.",
  histErreur: "Historique indisponible pour l'instant.",
  histSuppressionErreur: "Suppression impossible pour l'instant.",
  supprimerTrajet: (t: string) => `Supprimer le trajet ${t}`,
  rejouerTrajet: (t: string) => `Recalculer le trajet ${t} au prix du jour`,
  coutHist: (c: string) => `${c} €`,
  coutHistInconnu: "—",
  retourTrajets: "← Trajets",
  retourTrajetsLabel: "Retour aux trajets",
  fleche: "→",
  litres: "litres",
  km: "km",
  l100: "L/100 km",
  coutEstime: (c: string) => `Coût estimé ${c} euros`,
  euro: "€",
  detailCout: (l: string, p: string) => `${l} L × ${p} €/L`,
  moyenneFrance: (c: string) => `Moyenne France du jour · ${c}`,
  moyenneIndisponible: "Prix moyen du jour indisponible : saisis ton prix pour obtenir un coût.",
  monPrix: "Mon prix",
  mettreMonPrix: "Mettre mon prix",
  revenirMoyenne: "Revenir à la moyenne",
  prixPersoLabel: "€/L",
  prixPersoPlaceholder: "1,699",
  prixPersoErreur: "Entre un prix entre 0,50 et 4,00 €/L",
  pasItineraire: "Pas d'itinéraire routier entre ces deux lieux",
  pasItineraireDetail: "Aucun itinéraire en voiture n'existe entre ces deux lieux (une île sans liaison routière, par exemple). Modifie le départ ou l'arrivée.",
  pasItineraireMemeLieu: "Le départ et l'arrivée sont le même lieu : il n'y a pas de trajet à calculer. Choisis une autre arrivée ou un autre départ.",
  rejeuSansVoiture: "La voiture de ce trajet n'est plus dans la base : choisis une voiture dans le formulaire, puis relance le calcul.",
  marqueMemorisee: "Marque mémorisée",
  calculImpossible: "Calcul impossible pour l'instant",
  calculImpossibleDetail: "Le service d'itinéraire ne répond pas. Réessaie dans un instant.",
  rejoue: "Trajet recalculé au prix moyen du jour",
  consommationTitre: "D'où vient la consommation",
  typeAutoroute: "Autoroute",
  typeVoieRapide: "Voie rapide",
  typeRoute: "Route",
  typeVille: "Ville",
  typeMontee: "Montée",
  detailVitesse: (v: number) => `${v} km/h en moyenne`,
  detailArrets: (n: number) => (n === 0 ? "0 arrêt" : n === 1 ? "1 arrêt" : `${n} arrêts`),
  detailDenivele: (m: number) => `+${m} m de dénivelé`,
  detailL100: (x: string) => `${x} L/100 km sur ce tronçon`,
  tronconLabel: (nom: string, km: string, l: string) => `${nom}, ${km} km, ${l} litres`,
  noteEstimation:
    "Estimation : itinéraire découpé en tronçons (IGN en France, Valhalla à l'étranger) ; consommation WLTP de la voiture selon la vitesse, arrêts et dénivelé de chaque tronçon ; prix moyen du jour dans chaque pays traversé ; péages voiture TTC, vignettes non incluses.",
  altiIndispo: "Dénivelé indisponible : l'altimétrie IGN n'a pas répondu, le calcul n'en tient pas compte.",
  sauvegardeHistErreur: "Le trajet n'a pas pu être ajouté à l'historique.",
  // --- Jalon 3 : péages, pays traversés, Europe
  peagesTitre: "Péages",
  paysTitre: "Pays traversés",
  peagesTotal: "Total péages",
  peageGratuit: "gratuit",
  aucunPeage: "Aucun péage sur cet itinéraire",
  peagesIndisponibles: "Péages non disponibles pour l'instant",
  peagesIndisponiblesDetail: "Le calcul des péages a échoué : le coût ci-dessus ne comprend que le carburant.",
  peagesLimiteAtteinte: "Péages non calculés : limite du jour atteinte",
  peagesLimiteAtteinteDetail: "Le nombre de calculs de péages est limité chaque jour ; cette limite est atteinte. Le coût ci-dessus ne comprend que le carburant ; les péages seront de nouveau calculés demain.",
  peagesFournisseur: (nom: string) => `Péages calculés par ${nom}`,
  /** Quota du jour du fournisseur de péages dépassé (PTV : « Daily Quota Exceeded ») : la clé n'est pas en cause. */
  peagesQuotaFournisseur: (nom: string, heure: string) => `${nom} : quota du jour atteint — péages indisponibles jusqu'à ${heure}`,
  peagesQuotaFournisseurDetail: "Le fournisseur des péages limite le nombre de calculs par jour et cette limite est atteinte. Le coût ci-dessus ne comprend que le carburant.",
  nomsFournisseursPeages: { ptv: "PTV", here: "HERE" } as Record<string, string>,
  /** Heure locale d'une date ISO (« 02:00 »). */
  heureCourte: (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  peageSansNom: "Péage",
  peageFourchette: " (estimation : maximum de la fourchette)",
  peagesLigne: (pays: string, libelle: string, montant: string) => `${pays} ${libelle}, ${montant}`,
  carburantPeages: (c: string, p: string) => `Carburant ${c} € · Péages ${p} €`,
  carburantSeul: (c: string) => `Carburant ${c} €`,
  moyennePaysParPays: (c: string) => `Moyenne du jour, pays par pays · ${c}`,
  monPrixTousPays: "Mon prix (tous pays)",
  detailCoutPays: (l: string, n: number) => `${l} L · prix du jour de chacun des ${n} pays`,
  paysLigne2: (l: string, p: string) => `${l} L × ${p}`,
  moyennePaysSeul: (pays: string, c: string) => `Moyenne du jour · ${pays} · ${c}`,
  prixNonPublie: "prix non publié — moyenne européenne appliquée",
  prixEstime: "prix estimé d'après le SP95 du pays",
  prixAbsent: "prix du pays indisponible",
  tropLong: "Trajet trop long pour le moteur d'itinéraire actuel",
  tropLongDetail: "Le fournisseur d'itinéraire refuse les trajets de plus de quelques milliers de kilomètres. Choisis une arrivée plus proche.",
  horsCouverture: "Ce fournisseur d'itinéraire ne couvre que la France",
  horsCouvertureDetail: "Le moteur d'itinéraire actif ne sait pas calculer un trajet à l'étranger.",
  vsPays: (nom: string) => `vs ${nom}`,
  egalPays: (nom: string) => `= ${nom}`,
  litresCourt: "L",
  paysNonBranche: "Prix station par station pas encore disponibles pour ce pays",
  paysNonBrancheDetail: "Le pays publie des prix, l'appli ne les a pas encore branchés.",
  paysSansFlux: "Ce pays ne publie pas les prix station par station",
  paysSansFluxMoyenne: (pays: string, c: string, p: string) => `Prix moyen national · ${pays} · ${c} : ${p} €/L`,
  paysSansFluxAucuneMoyenne: "Aucun prix moyen national n'est disponible pour ce pays.",
  // --- Moteurs (S5, administrateur)
  moteursTitre: "Moteurs",
  moteursBouton: "Moteurs (administration)",
  moteursReserve: "Réservé à l'administrateur",
  moteursIntro: "Chaque service de l'appli passe par un fournisseur branché ici. Changer de fournisseur ou de clé ne demande aucune mise à jour du code.",
  moteursNote: "Les clés sont stockées chiffrées sur le serveur et ne sont jamais réaffichées : seuls leurs 4 derniers caractères le sont.",
  moteursRetour: "← Retour",
  moteursChargement: "Chargement des moteurs…",
  moteursErreur: "Les moteurs sont indisponibles pour l'instant.",
  fournisseur: "Fournisseur",
  secours: "Secours",
  aucunSecours: "Aucun secours",
  cleAColler: "Coller la clé d'API",
  cleEnregistree: (fin: string) => `Clé ••••${fin} · coller pour changer`, // tient dans le champ à 360 px (audit round 3, LOW 4)
  ouTrouverCle: "Où trouver ma clé",
  ouTrouverCleLabel: (nom: string) => `Où trouver ma clé ${nom} (s'ouvre dans un nouvel onglet)`,
  cleDe: (nom: string) => `Clé ${nom}`,
  aucuneCleNecessaire: "Aucune clé nécessaire.",
  tester: "Tester la connexion",
  enregistrer: "Enregistrer",
  testEnCours: "Test en cours…",
  etatCleAColler: "Clé à coller",
  etatPretSansCle: "Prêt · sans clé",
  etatCleRangee: "Clé enregistrée · à tester",
  /** État d'un moteur : la fonction `moteurs` renvoie un code et ses paramètres, la phrase est composée ici. `nom(id)` = nom court du fournisseur. */
  etatMoteur: (e: { code: string; params?: Record<string, string | number> }, nom: (id: string) => string): string => {
    const p = e.params ?? {};
    const n = (x: unknown) => Number(x).toLocaleString("fr-FR");
    const f = p.fournisseur ? nom(String(p.fournisseur)) : "Le fournisseur";
    const http = p.http ? ` (${p.http})` : "";
    switch (e.code) {
      case "ok_peages":
        return `Connecté · test Albi → Barcelone OK${p.sections != null ? ` (${p.sections} section${Number(p.sections) > 1 ? "s" : ""})` : p.peages != null ? ` (${p.peages} péage${Number(p.peages) > 1 ? "s" : ""})` : ""}`;
      case "ok_itineraire":
        return `Connecté · test Albi → Toulouse OK${p.km != null ? ` (${p.km} km)` : ""}`;
      case "ok_stations":
        return `Connecté · ${n(p.fr)} stations en France, ${n(p.es)} en Espagne`;
      case "ok_moyennes": {
        const [a, m, j] = String(p.jour).split("-");
        return `Connecté · semaine du ${j}/${m}/${a}`;
      }
      case "ok_berlin":
        return `Connecté · test Berlin OK (${p.stations} stations)`;
      case "ok_voitures":
        return `Connecté · ${n(p.versions)} versions`;
      case "ok_lieux":
        return "Connecté · test « Albi » OK";
      case "aucune_moyenne":
        return "Aucune moyenne importée pour l'instant";
      case "cle_manquante":
        return "Aucune clé : colle-la d'abord";
      case "cle_refusee":
        return `Clé refusée par ${f}${http || " (401)"}`;
      case "quota":
        return `Quota ${f} atteint${http || " (429)"}`;
      case "quota_fournisseur":
        return T.peagesQuotaFournisseur(f, p.jusqua ? T.heureCourte(String(p.jusqua)) : "demain");
      case "reponse_illisible":
        return `Réponse de ${f} illisible`;
      case "injoignable":
        return `${f} ne répond pas${http}`;
      case "fournisseur_inconnu":
        return "Fournisseur inconnu";
      case "enregistre":
        return "Enregistré · utilisé dès le prochain calcul";
      case "cle_a_coller":
        return "Clé à coller";
      case "pret_sans_cle":
        return "Prêt · sans clé";
      default:
        return "Test non disponible pour ce fournisseur";
    }
  },
  /** Résultat d'« Enregistrer » : l'état principal, puis chaque note une seule fois (jamais l'état répété). */
  resultatEnregistrement: (r: { code: string; params?: Record<string, string | number>; notes?: { code: string; params?: Record<string, string | number> }[] }, nom: (id: string) => string): string => {
    const notes = (r.notes ?? []).map((x) => {
      const p = x.params ?? {};
      if (x.code === "cle_non_enregistree") return "clé non enregistrée, ancienne clé conservée";
      if (x.code === "secours_cle_refusee") return `Secours ${nom(String(p.secours))} : ${T.etatMoteur({ code: String(p.test), params: { ...p, fournisseur: String(p.secours) } }, nom)} · clé non enregistrée`;
      if (x.code === "secours_sans_cle") return `Secours ${nom(String(p.secours))} non enregistré : aucune clé valide`;
      if (x.code === "actif_inchange") return "fournisseur actif inchangé";
      return "";
    });
    return [T.etatMoteur(r, nom), ...notes].filter(Boolean).join(" · ");
  },
  basculeNotee: (de: string, vers: string, quand: string) => `Bascule ${de} → ${vers} le ${quand}`,
  incidentNote: (msg: string, quand: string) => `Dernier incident · ${msg} · ${quand}`,
  incidentResolu: (msg: string, quand: string) => `Incident résolu · ${msg} · ${quand}`,
  basculeResolue: (de: string, vers: string, quand: string) => `Bascule ${de} → ${vers} le ${quand} · ${de} rétabli depuis`,
  incidentCodes: { cle_manquante: "clé manquante", cle_refusee: "clé refusée", quota: "quota atteint", quota_fournisseur: "quota du jour atteint", indisponible: "service injoignable", reponse_invalide: "réponse illisible", trop_long: "trajet trop long", pas_itineraire: "aucun itinéraire", aucun_fournisseur: "fournisseur inconnu" } as Record<string, string>,
  // --- Connexion administrateur
  adminTitre: "Connexion administrateur",
  adminIntro: "Entre l'adresse de l'administrateur : un lien de connexion y est envoyé.",
  adminEmail: "Adresse e-mail",
  adminEnvoyer: "Recevoir le lien",
  adminEnvoye: "Lien envoyé : ouvre-le depuis cet appareil.",
  adminRefuse: "Impossible d'envoyer le lien pour cette adresse.",
  adminDeconnexion: "Se déconnecter",
  // --- Enregistrer en roulant (jalon 4, S6 En route)
  enregistrerEnRoulant: "Enregistrer en roulant",
  enregistrerAttente: "Recherche de ta position…",
  enregistrerSansVoiture: "Choisis ta voiture avant d'enregistrer : le calcul utilise sa consommation.",
  enregistrerEnAttente: "Un enregistrement attend déjà ci-dessus : reprends-le ou arrête-le avant d'en commencer un autre.",
  localisationRefusee: "L'enregistrement a besoin de ta localisation",
  localisationRefuseeDetail:
    "Aucun trajet n'a été créé. Pour l'autoriser : touche le cadenas à gauche de l'adresse du site, ouvre « Autorisations » (ou « Paramètres du site »), mets « Position » sur « Autoriser », puis appuie de nouveau sur « Enregistrer en roulant ». Sur téléphone, la localisation doit aussi être activée dans les réglages.",
  localisationIndispo: "Position introuvable : l'enregistrement n'a pas démarré. Vérifie que la localisation de l'appareil est activée, puis réessaie.",
  enregistrement: "Enregistrement",
  enPause: "En pause",
  vitesse: "Vitesse",
  courbeDirect: "Vitesse des 3 dernières minutes",
  kmh: "km/h",
  eurosCarburant: "€ carburant",
  duree: "durée",
  arretsCourt: "arrêts",
  pause: "Pause",
  reprendre: "Reprendre",
  arreter: "Arrêter et voir le coût",
  ecranAllume: "L'écran reste allumé pendant l'enregistrement : laisse l'appli ouverte sur le support. Les points GPS restent sur le téléphone jusqu'à l'arrêt.",
  ecranVerrouAttente: "Demande au navigateur de garder l'écran allumé… Les points GPS restent sur le téléphone jusqu'à l'arrêt.",
  directSansMontees: "Litres et € en direct sans les montées : le dénivelé du tracé s'ajoute au calcul final, à l'arrêt.",
  ecranVerrouIndispo:
    "Ce navigateur ne peut pas garder l'écran allumé : désactive la mise en veille automatique de l'écran pendant le trajet. Les points GPS restent sur le téléphone jusqu'à l'arrêt.",
  gpsPerdu: "GPS perdu",
  gpsPerduDetail: (s: number) => `Aucune position depuis ${s} s : la distance est figée jusqu'au retour du signal.`,
  prixDuJourPays: (pays: string, prix: string) => `Coût au prix moyen du jour (${pays}) : ${prix} €/L`,
  prixDuJourAbsent: "Prix moyen du jour indisponible : le coût s'affichera à l'arrêt.",
  calculRoule: "Calcul sur ta vitesse réelle…",
  calculRouleDetail: "Recalage du tracé sur la carte, routes, péages réellement franchis et pays traversés.",
  tropCourt: "Trajet trop court pour être calculé",
  tropCourtDetail: (km: string) => `${km} km enregistrés : il en faut au moins 1. Rien n'a été ajouté à l'historique.`,
  repriseTitre: "Un enregistrement est en cours",
  repriseDetail: (km: string, duree: string) => `${km} km déjà enregistrés en ${duree}, gardés sur ce téléphone.`,
  repriseReprendre: "Reprendre l'enregistrement",
  rouleErreur: "Le calcul du trajet enregistré a échoué",
  rouleErreurDetail: "Les points restent gardés sur ce téléphone : réessaie dans un instant.",
  retourTrajetsSimple: "Retour aux trajets",
  enregistreSuffixe: "· enregistré",
  lieuDepartInconnu: "Départ",
  lieuArriveeInconnu: "Arrivée",
  maVitesse: "Ma vitesse enregistrée",
  vitesseInfo: (moy: number, acc: number) => `${moy} km/h moy. · ${acc} accélération${acc > 1 ? "s" : ""}`,
  courbeTrajet: "Courbe de vitesse du trajet enregistré",
  noteRoule:
    "Calcul sur ta vitesse réelle, seconde par seconde : à chaque seconde, ta vitesse mesurée choisit la consommation officielle (WLTP) de ta voiture ; chaque accélération ajoute l'énergie du gain de vitesse et chaque montée celle du dénivelé. Les routes (autoroute, route, ville), les pays et les péages réellement franchis viennent du tracé GPS recalé sur la carte. Prix moyen du jour de chaque pays traversé.",
  histEnregistre: "enregistré",
  // --- Royaume-Uni (jalon 4)
  mancheNonComptee: "Traversée de la Manche (tunnel ou ferry) non comptée : ni son prix, ni ses kilomètres.",
  prixFluxPays: (n: string) => `moyenne du jour de ${n} stations (prix publiés en pence/L, convertis en €)`,
  prixOrigine: (p: string, u: string) => `${p} ${u}`,
  coursDuJour: (taux: string, date: string) => `Prix publiés en pence par litre, convertis au cours BCE du ${date} : 1 € = ${taux} £.`,
};
