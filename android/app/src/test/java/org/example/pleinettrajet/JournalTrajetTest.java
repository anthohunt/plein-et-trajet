package org.example.pleinettrajet;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Locale;
import org.junit.Test;

// Jalon 6, round 3 (audit r2, problème 1 reclassé HIGH) : relevés datés par l'heure GNSS, boutons de la notification par
// l'horloge du téléphone, qui peut retarder ou avancer de 2 s sans que l'heure automatique corrige
// (AOSP config_timeDetectorAutoUpdateDiffMillis = 2000). Tests JVM (./gradlew testReleaseUnitTest), sans Android.
public class JournalTrajetTest {

    static final long T0 = 1_792_600_000_000L; // heure GNSS du relevé 0

    /** Relevé k : 1 par seconde, 30 m vers le nord (108 km/h). */
    static String p(int k) {
        return String.format(Locale.ROOT, "P;%d;%.7f;2.1500000;170.0;108.00;5.0", T0 + k * 1000L, 43.9 + k * 0.00027);
    }

    static String releves(int de, int a) {
        StringBuilder s = new StringBuilder();
        for (int k = de; k <= a; k++) s.append(p(k)).append('\n');
        return s.toString();
    }

    static final double PAS_KM = JournalTrajet.distanceM(43.9, 2.15, 43.9 + 0.00027, 2.15) / 1000;

    @Test
    public void telephoneEnRetard_boutonDateApresLeDernierReleve() {
        // relevé 10 mesuré à T0+10 s (GNSS), téléphone 1,5 s en retard ; Pause touchée 0,3 s après
        long ecart = 1500;
        long t = JournalTrajet.heureBouton(T0 + 10_300 - ecart, ecart, T0 + 10_000);
        assertTrue("bouton daté après le dernier relevé : " + (t - (T0 + 10_000)) + " ms", t > T0 + 10_000);
        assertEquals(T0 + 10_300, t);
    }

    @Test
    public void telephoneEnAvance_boutonDateAvantLeReleveSuivant() {
        // téléphone 1,5 s en avance ; le relevé 11 (T0+11 s), mesuré après le bouton, doit être daté après lui
        long ecart = -1500;
        long t = JournalTrajet.heureBouton(T0 + 10_300 - ecart, ecart, T0 + 10_000);
        assertTrue("relevé suivant après le bouton : bouton à +" + (t - T0) + " ms", T0 + 11_000 > t);
        assertEquals(T0 + 10_300, t);
    }

    @Test
    public void rattraper_telephoneEnRetard_pauseDateeAvantLeDernierRelevePrend() {
        // la page a appliqué les lignes 1 à 11 (relevés 0 à 10, 10 pas) puis est morte ; Pause de la notification datée par
        // l'horloge du téléphone (en retard de 1,5 s) : 1,2 s AVANT le relevé 10 ; puis 20 relevés en pause
        String j = releves(0, 10) + "A;" + (T0 + 10_300 - 1500) + ";pause\n" + releves(11, 30);
        JournalTrajet.Rattrapage r = JournalTrajet.rattraper(j, 11, 10 * PAS_KM, false, null);
        assertTrue("pause prise", r.enPause);
        assertEquals("km figés pendant la pause", 10 * PAS_KM, r.km, 1e-9);
        assertEquals(32, r.lignes);
    }

    @Test
    public void rattraper_telephoneEnAvance_aucunReleveApresLaRepriseNePerdu() {
        // page en pause (lignes 1 à 12 appliquées), Reprendre datée sur l'horloge des relevés, puis 20 relevés comptés
        long reprise = JournalTrajet.heureBouton(T0 + 20_300 + 1500, -1500, T0 + 20_000);
        String j = releves(0, 10) + "A;" + (T0 + 10_300) + ";pause\n" + releves(11, 20) + "A;" + reprise + ";reprendre\n" + releves(21, 40);
        JournalTrajet.Rattrapage r = JournalTrajet.rattraper(j, 12, 10 * PAS_KM, true, null);
        assertFalse(r.enPause);
        // 20 pas après la reprise (du relevé 20, dernier de la pause, au relevé 40)
        assertEquals(30 * PAS_KM, r.km, 1e-6);
    }

    @Test
    public void rattraper_chaqueLigneUneFois() {
        String j = releves(0, 10) + "A;" + (T0 + 10_300) + ";pause\n" + releves(11, 20);
        JournalTrajet.Rattrapage tout = JournalTrajet.rattraper(j, 0, 0, false, null);
        assertEquals(10 * PAS_KM, tout.km, 1e-9);
        assertTrue(tout.enPause);
        JournalTrajet.Rattrapage rien = JournalTrajet.rattraper(j, 22, 10 * PAS_KM, true, null);
        assertEquals(10 * PAS_KM, rien.km, 1e-9);
        assertEquals(T0 + 20_000, rien.dernierReleve);
    }
}
