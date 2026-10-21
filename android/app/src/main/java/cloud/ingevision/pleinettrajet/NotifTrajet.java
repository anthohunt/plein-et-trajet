package cloud.ingevision.pleinettrajet;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Notification du trajet en cours (jalon 6) : elle remplace le texte fixe de la notification du service GPS (même canal,
// même numéro) par la vitesse, les km et le coût, avec Pause / Reprendre et Arrêter. Pause et Reprendre agissent sans ouvrir
// l'appli ; Arrêter (et « C'est fini » après 10 min immobile) ouvre l'appli sur la fin de trajet.
@CapacitorPlugin(name = "NotifTrajet")
public class NotifTrajet extends Plugin {

    static final String CANAL = "com.capgo.capacitor_background_geolocation";
    static final int NUMERO = 28351;
    static final String ACTION = "cloud.ingevision.pleinettrajet.ACTION";
    static final String EXTRA = "pt_action";

    private BroadcastReceiver recepteur;

    @Override
    public void load() {
        recepteur = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                transmettre(i.getStringExtra(EXTRA));
            }
        };
        ContextCompat.registerReceiver(getContext(), recepteur, new IntentFilter(ACTION), ContextCompat.RECEIVER_NOT_EXPORTED);
        Intent i = getActivity() != null ? getActivity().getIntent() : null;
        if (i != null && i.hasExtra(EXTRA)) {
            transmettre(i.getStringExtra(EXTRA));
            i.removeExtra(EXTRA);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent i) {
        super.handleOnNewIntent(i);
        if (i != null && i.hasExtra(EXTRA)) {
            transmettre(i.getStringExtra(EXTRA));
            i.removeExtra(EXTRA);
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(recepteur);
        } catch (Exception ignore) {}
    }

    private void transmettre(String action) {
        if (action == null) return;
        JSObject o = new JSObject();
        o.put("action", action);
        notifyListeners("action", o, true);
    }

    private PendingIntent diffusion(String action, int code) {
        Intent i = new Intent(ACTION).setPackage(getContext().getPackageName()).putExtra(EXTRA, action);
        return PendingIntent.getBroadcast(getContext(), code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent ouvrir(String action, int code) {
        Intent i = new Intent(getContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (action != null) i.putExtra(EXTRA, action);
        return PendingIntent.getActivity(getContext(), code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @PluginMethod
    public void maj(PluginCall call) {
        String titre = call.getString("titre", "Plein & Trajet");
        String texte = call.getString("texte", "");
        boolean enPause = Boolean.TRUE.equals(call.getBoolean("enPause", false));
        boolean immobile = Boolean.TRUE.equals(call.getBoolean("immobile", false));
        NotificationCompat.Builder b = new NotificationCompat.Builder(getContext(), CANAL)
            .setSmallIcon(getContext().getApplicationInfo().icon)
            .setContentTitle(titre)
            .setContentText(texte)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texte))
            .setOngoing(true)
            .setOnlyAlertOnce(!immobile)
            .setSilent(!immobile)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(immobile ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(ouvrir(null, 1));
        if (immobile) {
            b.addAction(0, "Reprendre", diffusion("reprendre-immobile", 2));
            b.addAction(0, "C'est fini", ouvrir("arreter", 3));
        } else {
            b.addAction(0, enPause ? "Reprendre" : "Pause", diffusion(enPause ? "reprendre" : "pause", 4));
            b.addAction(0, "Arrêter", ouvrir("arreter", 5));
        }
        Notification n = b.build();
        n.flags |= Notification.FLAG_ONGOING_EVENT | Notification.FLAG_NO_CLEAR;
        NotificationManager m = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (m != null) m.notify(NUMERO, n);
        call.resolve();
    }

    @PluginMethod
    public void effacer(PluginCall call) {
        NotificationManager m = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (m != null) m.cancel(NUMERO);
        call.resolve();
    }
}
