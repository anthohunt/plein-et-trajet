package org.example.pleinettrajet;

import android.Manifest;
import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

// Observatoire de l'enregistrement en fond (plan de tests de robustesse, niveau 0 ; docs/pipeline/plan-tests-robustesse-android.md).
// Journal technique à part du journal des relevés : files/diagnostic.txt, une ligne par événement « instant;TYPE;détails ».
// Il dit CE QUI S'EST PASSÉ quand l'enregistrement s'arrête : vie du service (création, relance par le système, refus du premier
// plan avec l'exception exacte, destruction), trous entre deux relevés, GPS coupé, pression mémoire, et à chaque ouverture de
// l'appli la raison de chaque mort du processus donnée par Android (getHistoricalProcessExitReasons). La page l'envoie au serveur
// (table diagnostics) puis l'acquitte : on lit un trajet raté sans câble ni accès au téléphone.
final class Diagnostic {

    private static final String PREFS = "diagnostic";
    private static final long PLAFOND = 512 * 1024; // au-delà, on ne garde que la seconde moitié

    private Diagnostic() {}

    static File fichier(Context c) {
        return new File(c.getFilesDir(), "diagnostic.txt");
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void noter(Context c, String type, String details) {
        String ligne = System.currentTimeMillis() + ";" + type + ";" + (details == null ? "" : details.replace('\n', ' ')) + "\n";
        File f = fichier(c);
        try {
            if (f.length() > PLAFOND) tronquer(c, f);
            try (FileOutputStream o = new FileOutputStream(f, true)) {
                o.write(ligne.getBytes(StandardCharsets.UTF_8));
            }
        } catch (IOException ignore) {}
    }

    private static void tronquer(Context c, File f) throws IOException {
        byte[] b = lireOctets(f);
        int debut = b.length / 2;
        while (debut < b.length && b[debut] != '\n') debut++;
        try (FileOutputStream o = new FileOutputStream(f, false)) {
            o.write(b, Math.min(debut + 1, b.length), Math.max(0, b.length - debut - 1));
        }
        prefs(c).edit().putLong("acquitte", 0).apply(); // ce qui reste n'a pas été envoyé en entier : tout repart
    }

    private static byte[] lireOctets(File f) throws IOException {
        if (!f.exists()) return new byte[0];
        byte[] b = new byte[(int) f.length()];
        try (FileInputStream i = new FileInputStream(f)) {
            int n = 0;
            while (n < b.length) {
                int r = i.read(b, n, b.length - n);
                if (r < 0) break;
                n += r;
            }
        }
        return b;
    }

    /** Ce qui n'a pas encore été envoyé : texte et position de fin, à rendre par acquitter() une fois l'envoi réussi. */
    static synchronized String[] aEnvoyer(Context c) {
        try {
            byte[] b = lireOctets(fichier(c));
            long depuis = Math.min(prefs(c).getLong("acquitte", 0), b.length);
            return new String[] { new String(b, (int) depuis, (int) (b.length - depuis), StandardCharsets.UTF_8), String.valueOf(b.length) };
        } catch (IOException e) {
            return new String[] { "", "0" };
        }
    }

    static synchronized void acquitter(Context c, long fin) {
        prefs(c).edit().putLong("acquitte", fin).apply();
    }

    private static String accorde(Context c, String p) {
        return ContextCompat.checkSelfPermission(c, p) == PackageManager.PERMISSION_GRANTED ? "oui" : "non";
    }

    static boolean localisationToujours(Context c) {
        return Build.VERSION.SDK_INT < 29 || ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** L'état du téléphone qui décide si Android laisse l'enregistrement vivre en fond. */
    static String etat(Context c) {
        StringBuilder s = new StringBuilder();
        s.append("android=").append(Build.VERSION.SDK_INT).append(" (").append(Build.VERSION.RELEASE).append(")");
        s.append(" appareil=").append(Build.MANUFACTURER).append(' ').append(Build.MODEL).append(" systeme=").append(Build.DISPLAY);
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            s.append(" appli=").append(pi.versionName);
        } catch (Exception ignore) {}
        s.append(" precise=").append(accorde(c, Manifest.permission.ACCESS_FINE_LOCATION));
        s.append(" approx=").append(accorde(c, Manifest.permission.ACCESS_COARSE_LOCATION));
        s.append(" toujours=").append(localisationToujours(c) ? "oui" : "non");
        if (Build.VERSION.SDK_INT >= 33) s.append(" notifs=").append(accorde(c, "android.permission.POST_NOTIFICATIONS"));
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            s.append(" horsOptimBatterie=").append(pm.isIgnoringBatteryOptimizations(c.getPackageName()) ? "oui" : "non");
            s.append(" economiseur=").append(pm.isPowerSaveMode() ? "oui" : "non");
        }
        ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
        if (am != null && Build.VERSION.SDK_INT >= 28) s.append(" fondRestreint=").append(am.isBackgroundRestricted() ? "oui" : "non");
        UsageStatsManager u = (UsageStatsManager) c.getSystemService(Context.USAGE_STATS_SERVICE);
        if (u != null && Build.VERSION.SDK_INT >= 28) s.append(" compartiment=").append(u.getAppStandbyBucket());
        LocationManager lm = (LocationManager) c.getSystemService(Context.LOCATION_SERVICE);
        if (lm != null) s.append(" gpsActif=").append(lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? "oui" : "non");
        return s.toString();
    }

    private static String raison(int r) {
        switch (r) {
            case ApplicationExitInfo.REASON_ANR: return "ANR";
            case ApplicationExitInfo.REASON_CRASH: return "CRASH";
            case ApplicationExitInfo.REASON_CRASH_NATIVE: return "CRASH_NATIF";
            case ApplicationExitInfo.REASON_DEPENDENCY_DIED: return "DEPENDANCE";
            case ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE: return "RESSOURCES_EXCESSIVES";
            case ApplicationExitInfo.REASON_EXIT_SELF: return "SORTIE_PROPRE";
            case ApplicationExitInfo.REASON_INITIALIZATION_FAILURE: return "ECHEC_INIT";
            case ApplicationExitInfo.REASON_LOW_MEMORY: return "MEMOIRE_BASSE";
            case ApplicationExitInfo.REASON_OTHER: return "AUTRE_SYSTEME";
            case ApplicationExitInfo.REASON_PERMISSION_CHANGE: return "PERMISSION_CHANGEE";
            case ApplicationExitInfo.REASON_SIGNALED: return "SIGNAL";
            case ApplicationExitInfo.REASON_USER_REQUESTED: return "ARRET_FORCE";
            case ApplicationExitInfo.REASON_USER_STOPPED: return "UTILISATEUR";
            case 14: return "GEL"; // REASON_FREEZER (Android 14)
            case 15: return "ETAT_PAQUET"; // REASON_PACKAGE_STATE_CHANGE (Android 14)
            case 16: return "MISE_A_JOUR"; // REASON_PACKAGE_UPDATED (Android 14)
            default: return "INCONNUE_" + r;
        }
    }

    /** Morts du processus depuis la dernière ouverture, telles qu'Android les a enregistrées. */
    static void morts(Context c) {
        redemarrage(c);
        if (Build.VERSION.SDK_INT < 30) return;
        ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
        if (am == null) return;
        long vu = prefs(c).getLong("derniereMort", 0);
        long plusRecente = vu;
        try {
            List<ApplicationExitInfo> l = am.getHistoricalProcessExitReasons(c.getPackageName(), 0, 30);
            for (int k = l.size() - 1; k >= 0; k--) {
                ApplicationExitInfo e = l.get(k);
                if (e.getTimestamp() <= vu) continue;
                noter(c, "MORT", "le=" + e.getTimestamp() + " raison=" + raison(e.getReason()) + " statut=" + e.getStatus()
                    + " importance=" + e.getImportance() + " processus=" + e.getProcessName() + " detail=" + e.getDescription());
                plusRecente = Math.max(plusRecente, e.getTimestamp());
            }
        } catch (Exception e) {
            noter(c, "ERREUR", "morts " + e);
        }
        prefs(c).edit().putLong("derniereMort", plusRecente).apply();
    }

    /** Redémarrage du téléphone depuis la dernière ouverture : Android ne l'enregistre pas comme une mort du processus
     *  (scénario reboot du banc, 24/10), on compare donc le compteur de démarrages de l'appareil. */
    private static void redemarrage(Context c) {
        int n;
        try {
            n = Settings.Global.getInt(c.getContentResolver(), Settings.Global.BOOT_COUNT);
        } catch (Exception e) {
            return;
        }
        int vu = prefs(c).getInt("demarrages", -1);
        if (vu >= 0 && n > vu) {
            long depuis = System.currentTimeMillis() - android.os.SystemClock.elapsedRealtime();
            noter(c, "MORT", "le=" + depuis + " raison=REDEMARRAGE demarrages=" + vu + "->" + n);
        }
        if (n != vu) prefs(c).edit().putInt("demarrages", n).apply();
    }
}
