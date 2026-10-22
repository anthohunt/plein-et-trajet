package cloud.ingevision.pleinettrajet;
// PORTAGE FIDÈLE DU ROUND 2 (non commité) : bouton daté par System.currentTimeMillis() ; rattraper de TrajetService.java r2
// (:268-294) : un bouton ne compte que si son heure > tPoint (instant du dernier relevé compté par la page).
final class JournalTrajet {
    static long heureBouton(long maintenant, long ecart, long dernierReleve) { return maintenant; }
    static double distanceM(double la1, double lo1, double la2, double lo2) {
        double r = Math.PI / 180;
        double x = Math.pow(Math.sin((la2 - la1) * r / 2), 2) + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.pow(Math.sin((lo2 - lo1) * r / 2), 2);
        return 2 * 6371000 * Math.asin(Math.sqrt(x));
    }
    static final class Rattrapage { double km; double litres; boolean enPause; double[] precedent; long lignes; long dernierReleve = Long.MIN_VALUE; }
    static Rattrapage rattraper(String journal, long ligneVue, double kmPage, boolean enPausePage, double[] table) {
        // tPoint du round 2 = instant du dernier relevé parmi les lignes que la page a appliquées
        long depuis = Long.MIN_VALUE; long n = 0;
        for (String l : journal.split("\n")) { if (l.isEmpty()) continue; n++; String[] c = l.split(";", -1); if (n <= ligneVue && "P".equals(c[0])) depuis = Long.parseLong(c[1]); }
        Rattrapage r = new Rattrapage(); r.km = kmPage; r.enPause = enPausePage; boolean enPause = enPausePage; double[] precedent = null; n = 0;
        for (String l : journal.split("\n")) {
            if (l.isEmpty()) continue; n++;
            String[] c = l.split(";", -1);
            if (c.length < 3) continue;
            long t; try { t = Long.parseLong(c[1]); } catch (NumberFormatException e) { continue; }
            if ("A".equals(c[0]) && t > depuis) enPause = "pause".equals(c[2]);
            if (!"P".equals(c[0]) || c.length < 4) continue;
            double la = Double.parseDouble(c[2]), lo = Double.parseDouble(c[3]);
            if (t > depuis && !enPause && precedent != null && t > precedent[2]) r.km += distanceM(precedent[0], precedent[1], la, lo) / 1000;
            precedent = new double[] { la, lo, t };
            r.dernierReleve = Math.max(r.dernierReleve, t);
        }
        r.enPause = enPause; r.precedent = precedent; r.lignes = n; return r;
    }
}
