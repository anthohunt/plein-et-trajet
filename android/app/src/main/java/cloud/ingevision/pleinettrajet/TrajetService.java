package cloud.ingevision.pleinettrajet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.json.JSONObject;

// Service de premier plan du trajet en cours (jalon 6, round 2 ; plan : stack-decisions.md § 2, « TrajetEnRoute »).
// Il lit le GPS lui-même (1 relevé par seconde), écrit CHAQUE relevé dans un journal de l'appli (files/trajet-en-cours.txt), daté
// par l'heure du relevé, et tient la notification. La page lit ce journal à sa réouverture : si Android tue l'appli en route, le
// service est relancé par le système (START_STICKY) et continue d'écrire sans la page ; rien ne dépend de la WebView.
// Journal, une ligne par événement :  P;instant;lat;lon;altitude;vitesse km/h;précision   (relevé GPS)
//                                     A;instant;action                                   (bouton de la notification)
//                                     R;instant;redemarrage                              (relancé par le système)
// Quand la page n'est pas là (processus relancé sans elle), le service calcule lui-même la ligne de chiffres de la notification :
// km = km de la page à sa dernière mise à jour + distance des relevés suivants ; € = € de la page + litres de ces pas, chacun à la
// consommation de la voiture à sa vitesse (table L/100 km par km/h, calculée par roule.ts et envoyée par la page) ×
// prix. La page recalcule tout par roule.ts à sa réouverture.
public class TrajetService extends Service implements LocationListener {

    static final String TAG = "TrajetService";
    static final String CANAL = "trajet-en-cours";
    static final int NUMERO = 28351;
    static final String DEMARRER = "cloud.ingevision.pleinettrajet.DEMARRER";
    static final String BOUTON = "cloud.ingevision.pleinettrajet.BOUTON";
    static final String EXTRA = "pt_action";
    private static final String PREFS = "trajet_en_cours";

    /** La page, quand elle est là (TrajetEnRoute la branche) : chaque ligne du journal lui est remise aussi. */
    interface Ecouteur {
        void ligne(String l);
    }

    static volatile Ecouteur ecouteur;
    static volatile TrajetService enCours;

    private LocationManager gps;
    private PowerManager.WakeLock verrou;
    // direct natif (page absente)
    private double[] precedent; // lat, lon, instant du dernier relevé compté
    private double kmNatif;
    private double litresNatif; // litres des pas comptés par le service depuis la dernière mise à jour de la page
    private boolean natifPret; // km du direct natif repris du journal depuis la dernière mise à jour de la page
    private long derniereNotif;

    static File journal(Context c) {
        return new File(c.getFilesDir(), "trajet-en-cours.txt");
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean actif(Context c) {
        return prefs(c).getBoolean("actif", false);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        enCours = this;
        NotificationManager m = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (m != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel c = new NotificationChannel(CANAL, getString(R.string.canal_trajet), NotificationManager.IMPORTANCE_LOW);
            c.setShowBadge(false);
            m.createNotificationChannel(c);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences p = prefs(this);
        if (intent != null && DEMARRER.equals(intent.getAction())) {
            String id = intent.getStringExtra("id");
            if (id == null || !id.equals(p.getString("id", null))) {
                // nouveau trajet : journal neuf (celui d'un trajet arrêté a déjà été lu par la page)
                journal(this).delete();
                p.edit().clear().apply();
            }
            p.edit().putBoolean("actif", true).putString("id", id).putString("contenu", intent.getStringExtra("contenu")).apply();
        } else if (intent != null && BOUTON.equals(intent.getAction())) {
            if (!actif(this)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            bouton(intent.getStringExtra(EXTRA));
        } else if (intent == null) {
            // relancé par le système après la mort du processus (START_STICKY)
            if (!actif(this)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            Log.i(TAG, "relancé par le système, trajet " + p.getString("id", "?"));
            ecrire("R;" + System.currentTimeMillis() + ";redemarrage");
        } else if (!actif(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!premierPlan()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        ecouterGps();
        return START_STICKY;
    }

    private boolean premierPlan() {
        try {
            ServiceCompat.startForeground(this, NUMERO, construire(this, contenu(this)), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "premier plan refusé", e);
            return false;
        }
    }

    private void ecouterGps() {
        if (gps != null) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            verrou = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PleinEtTrajet::Trajet");
            verrou.acquire(12 * 3600 * 1000L);
        }
        gps = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            gps.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this, Looper.getMainLooper());
            Log.i(TAG, "GPS écouté");
        } catch (SecurityException | IllegalArgumentException e) {
            Log.e(TAG, "GPS indisponible", e);
        }
    }

    @Override
    public void onDestroy() {
        if (gps != null) gps.removeUpdates(this);
        gps = null;
        if (verrou != null && verrou.isHeld()) verrou.release();
        if (enCours == this) enCours = null;
        super.onDestroy();
    }

    /** Fin du trajet (la page a tout lu) : le service s'arrête, le journal est effacé. */
    static void arreter(Context c) {
        prefs(c).edit().clear().apply();
        journal(c).delete();
        c.stopService(new Intent(c, TrajetService.class));
        NotificationManager m = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (m != null) m.cancel(NUMERO);
    }

    // ---------- journal ----------
    private synchronized void ecrire(String ligne) {
        try (FileOutputStream f = new FileOutputStream(journal(this), true)) {
            f.write((ligne + "\n").getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            Log.e(TAG, "journal non écrit", e);
        }
    }

    static String lire(Context c) {
        File f = journal(c);
        if (!f.exists()) return "";
        StringBuilder s = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String l;
            while ((l = r.readLine()) != null) s.append(l).append('\n');
        } catch (IOException e) {
            Log.e(TAG, "journal illisible", e);
        }
        return s.toString();
    }

    private static String nombre(boolean a, double v, String format) {
        return a && !Double.isNaN(v) ? String.format(Locale.ROOT, format, v) : "";
    }

    @Override
    public void onLocationChanged(@NonNull Location l) {
        // heure du relevé (getTime : horloge du GNSS), pas l'heure de réception ; si elle s'écarte de plus de 30 s de l'horloge du
        // téléphone (heure réglée à la main), l'âge du relevé pris sur l'horloge monotone
        long parAge = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - l.getElapsedRealtimeNanos()) / 1_000_000L;
        long t = l.getTime() > 0 && Math.abs(l.getTime() - parAge) <= 30_000L ? l.getTime() : parAge;
        String ligne = "P;" + t + ";" + String.format(Locale.ROOT, "%.7f;%.7f", l.getLatitude(), l.getLongitude()) + ";"
            + nombre(l.hasAltitude(), l.getAltitude(), "%.1f") + ";" + nombre(l.hasSpeed(), l.getSpeed() * 3.6, "%.2f") + ";"
            + nombre(l.hasAccuracy(), l.getAccuracy(), "%.1f");
        ecrire(ligne);
        Ecouteur e = ecouteur;
        if (e != null) {
            e.ligne(ligne);
            natifPret = false;
        } else {
            if (!natifPret) rattraper();
            natifPret = true;
            directNatif(l.getLatitude(), l.getLongitude(), t, l.hasSpeed() ? l.getSpeed() * 3.6 : -1);
        }
    }

    // Android 9 et avant : méthode abstraite de LocationListener
    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderDisabled(@NonNull String provider) {}

    @Override
    public void onProviderEnabled(@NonNull String provider) {}

    // ---------- boutons de la notification ----------
    private void bouton(String action) {
        if (action == null) return;
        String ligne = "A;" + System.currentTimeMillis() + ";" + action;
        ecrire(ligne);
        JSONObject o = contenu(this);
        try {
            if ("pause".equals(action)) o.put("enPause", true);
            else if ("reprendre".equals(action) || "reprendre-immobile".equals(action)) {
                o.put("enPause", false);
                o.put("immobile", false);
            }
            o.put("titre", o.optBoolean("enPause") ? o.optString("titrePause") : o.optString("titreEnCours"));
        } catch (Exception ignore) {}
        garderContenu(this, o);
        Ecouteur e = ecouteur;
        if (e != null) e.ligne(ligne);
        else reposer(this);
    }

    // ---------- direct natif (page absente) ----------
    private static double distanceM(double la1, double lo1, double la2, double lo2) {
        double r = Math.PI / 180;
        double x = Math.pow(Math.sin((la2 - la1) * r / 2), 2) + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.pow(Math.sin((lo2 - lo1) * r / 2), 2);
        return 2 * 6371000 * Math.asin(Math.sqrt(x));
    }

    /** Relit le journal depuis la dernière mise à jour de la page : km comptés depuis, dernier relevé. */
    private void rattraper() {
        JSONObject o = contenu(this);
        long depuis = o.optLong("tPoint", Long.MIN_VALUE);
        boolean enPause = o.optBoolean("enPause");
        kmNatif = o.optDouble("km", 0);
        litresNatif = 0;
        precedent = null;
        for (String l : lire(this).split("\n")) {
            String[] c = l.split(";", -1);
            if (c.length < 3) continue;
            long t;
            try {
                t = Long.parseLong(c[1]);
            } catch (NumberFormatException e) {
                continue;
            }
            if ("A".equals(c[0]) && t > depuis) enPause = "pause".equals(c[2]);
            if (!"P".equals(c[0]) || c.length < 4) continue;
            double la = Double.parseDouble(c[2]), lo = Double.parseDouble(c[3]);
            if (t > depuis && !enPause && precedent != null && t > precedent[2]) compter(o, distanceM(precedent[0], precedent[1], la, lo), (t - precedent[2]) / 1000.0, -1);
            precedent = new double[] { la, lo, t };
        }
        try {
            o.put("enPause", enPause);
        } catch (Exception ignore) {}
        garderContenu(this, o);
    }

    private void directNatif(double la, double lo, long t, double kmhGps) {
        JSONObject o = contenu(this);
        boolean enPause = o.optBoolean("enPause");
        double kmh = kmhGps;
        if (precedent != null && t > precedent[2]) {
            double d = distanceM(precedent[0], precedent[1], la, lo);
            double dt = (t - precedent[2]) / 1000.0;
            if (kmh < 0) kmh = d / dt * 3.6;
            if (!enPause) compter(o, d, dt, kmh);
        }
        if (precedent == null || t > precedent[2]) precedent = new double[] { la, lo, t };
        long maintenant = SystemClock.elapsedRealtime();
        if (maintenant - derniereNotif < 2000) return;
        derniereNotif = maintenant;
        String gabarit = o.optString("gabarit", "");
        if (gabarit.isEmpty() || enPause || o.optBoolean("immobile")) return;
        double prix = o.optDouble("prix", Double.NaN);
        double euros = o.optDouble("euros", Double.NaN) + litresNatif * prix;
        String texte = gabarit
            .replace("{v}", String.valueOf(Math.round(Math.max(0, kmh))))
            .replace("{km}", String.format(Locale.ROOT, "%.1f", kmNatif).replace('.', ','))
            .replace("{eur}", Double.isNaN(euros) ? "" : String.format(Locale.ROOT, "%.2f", euros).replace('.', ','));
        try {
            o.put("texte", texte);
            o.put("titre", o.optString("titreEnCours"));
            o.put("kmNatif", kmNatif);
            o.put("eurosNatif", Double.isNaN(euros) ? JSONObject.NULL : euros);
        } catch (Exception ignore) {}
        garderContenu(this, o);
        reposer(this);
        Log.i(TAG, "direct natif : " + texte);
    }

    /** Un pas compté sans la page : distance, et litres à la consommation de la voiture à cette vitesse. */
    private void compter(JSONObject o, double d, double dt, double kmh) {
        kmNatif += d / 1000;
        org.json.JSONArray table = o.optJSONArray("l100ParVitesse");
        if (table == null || table.length() == 0) return;
        double v = kmh >= 0 ? kmh : d / dt * 3.6;
        int k = (int) Math.min(table.length() - 1, Math.max(0, Math.floor(v)));
        litresNatif += table.optDouble(k, 0) * d / 1000 / 100;
    }

    // ---------- notification ----------
    static JSONObject contenu(Context c) {
        try {
            return new JSONObject(prefs(c).getString("contenu", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static void garderContenu(Context c, JSONObject o) {
        prefs(c).edit().putString("contenu", o.toString()).apply();
    }

    static void reposer(Context c) {
        if (!actif(c)) return;
        NotificationManager m = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (m != null) m.notify(NUMERO, construire(c, contenu(c)));
    }

    private static PendingIntent bouton(Context c, String action, int code) {
        Intent i = new Intent(c, TrajetService.class).setAction(BOUTON).putExtra(EXTRA, action);
        return PendingIntent.getService(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent ouvrir(Context c, String action, int code) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (action != null) i.putExtra(EXTRA, action);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Notification du trajet : titre, ligne de chiffres et libellés des boutons, tous envoyés par la page (src/lib/textes.ts). */
    static Notification construire(Context c, JSONObject o) {
        boolean enPause = o.optBoolean("enPause");
        boolean immobile = o.optBoolean("immobile");
        String texte = o.optString("texte");
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CANAL)
            .setSmallIcon(c.getApplicationInfo().icon)
            .setContentTitle(o.optString("titre", c.getString(R.string.app_name)))
            .setContentText(texte)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texte))
            .setOngoing(true)
            .setOnlyAlertOnce(!immobile)
            .setSilent(!immobile)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(immobile ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(ouvrir(c, null, 1));
        if (immobile) {
            b.addAction(0, o.optString("reprendre"), bouton(c, "reprendre-immobile", 2));
            b.addAction(0, o.optString("cestFini"), ouvrir(c, "arreter", 3));
        } else {
            b.addAction(0, o.optString(enPause ? "reprendre" : "pause"), bouton(c, enPause ? "reprendre" : "pause", 4));
            b.addAction(0, o.optString("arreter"), ouvrir(c, "arreter", 5));
        }
        Notification n = b.build();
        n.flags |= Notification.FLAG_ONGOING_EVENT | Notification.FLAG_NO_CLEAR;
        return n;
    }
}
