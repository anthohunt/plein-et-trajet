package cloud.ingevision.pleinettrajet;

// Règles du journal des relevés (jalon 6, round 3 ; audit r2, problème 1 « deux horloges »), sans dépendance Android : testées
// sur la JVM (app/src/test/…/JournalTrajetTest.java).
// Les relevés sont datés par l'heure du GNSS, que l'horloge du téléphone peut suivre à 2 s près sans être corrigée (heure
// automatique d'AOSP : config_timeDetectorAutoUpdateDiffMillis = 2000). Deux règles en découlent :
//  1. l'ORDRE des lignes ne dépend d'aucune horloge : c'est leur numéro dans le journal (1 = première ligne écrite) ; la page et
//     le service ne rejouent une ligne qu'une fois, par ce numéro ;
//  2. un bouton est daté sur l'horloge des relevés : heure du téléphone + écart (heure GNSS − heure du téléphone) du dernier
//     relevé, et jamais avant ce relevé — une pause commence après le dernier point compté.
final class JournalTrajet {

    private JournalTrajet() {}

    /** Heure d'un bouton sur l'horloge des relevés : `maintenant` (téléphone) + `ecart` du dernier relevé, après ce relevé. */
    static long heureBouton(long maintenant, long ecart, long dernierReleve) {
        return Math.max(maintenant + ecart, dernierReleve + 1);
    }

    /** Distance (m) entre deux points, haversine. */
    static double distanceM(double la1, double lo1, double la2, double lo2) {
        double r = Math.PI / 180;
        double x = Math.pow(Math.sin((la2 - la1) * r / 2), 2) + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.pow(Math.sin((lo2 - lo1) * r / 2), 2);
        return 2 * 6371000 * Math.asin(Math.sqrt(x));
    }

    /** Litres d'un pas de `d` m à `kmh` (table L/100 km par km/h, calculée par roule.ts) ; 0 sans table. */
    static double litresPas(double[] table, double d, double kmh) {
        if (table == null || table.length == 0) return 0;
        int k = (int) Math.min(table.length - 1, Math.max(0, Math.floor(kmh)));
        return table[k] * d / 1000 / 100;
    }

    /** Ce que le service retrouve en relisant le journal après la dernière mise à jour de la page. */
    static final class Rattrapage {
        double km; // km de la page + distance des relevés qu'elle n'a pas vus
        double litres; // litres de ces pas
        boolean enPause;
        double[] precedent; // lat, lon, instant du dernier relevé
        long lignes; // nombre de lignes du journal
        long dernierReleve = Long.MIN_VALUE; // instant du dernier relevé
    }

    /**
     * Relit le journal : les lignes de numéro > `ligneVue` (dernière ligne appliquée par la page) sont rejouées dans leur ordre
     * d'écriture — un bouton, quelle que soit son heure ; un relevé compte s'il n'est pas en pause et plus récent que le précédent.
     */
    static Rattrapage rattraper(String journal, long ligneVue, double kmPage, boolean enPausePage, double[] table) {
        Rattrapage r = new Rattrapage();
        r.km = kmPage;
        r.enPause = enPausePage;
        String[] lignes = journal.split("\n", -1);
        long n = 0;
        for (String l : lignes) {
            if (l.isEmpty()) continue;
            n++;
            String[] c = l.split(";", -1);
            if (c.length < 3) continue;
            long t;
            try {
                t = Long.parseLong(c[1]);
            } catch (NumberFormatException e) {
                continue;
            }
            boolean nouvelle = n > ligneVue;
            if ("A".equals(c[0])) {
                if (nouvelle) {
                    if ("pause".equals(c[2])) r.enPause = true;
                    else if ("reprendre".equals(c[2]) || "reprendre-immobile".equals(c[2])) r.enPause = false;
                }
                continue;
            }
            if (!"P".equals(c[0]) || c.length < 4) continue;
            double la, lo;
            try {
                la = Double.parseDouble(c[2]);
                lo = Double.parseDouble(c[3]);
            } catch (NumberFormatException e) {
                continue;
            }
            if (nouvelle && !r.enPause && r.precedent != null && t > r.precedent[2]) {
                double d = distanceM(r.precedent[0], r.precedent[1], la, lo);
                r.km += d / 1000;
                r.litres += litresPas(table, d, d / ((t - r.precedent[2]) / 1000.0) * 3.6);
            }
            if (r.precedent == null || t > r.precedent[2]) r.precedent = new double[] { la, lo, t };
            r.dernierReleve = Math.max(r.dernierReleve, t);
        }
        r.lignes = n;
        return r;
    }
}
