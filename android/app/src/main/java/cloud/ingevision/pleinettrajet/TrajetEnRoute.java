package cloud.ingevision.pleinettrajet;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

// Pont entre la page et le service du trajet (jalon 6, round 2). La page démarre et arrête le service, lit le journal des relevés
// à sa réouverture (lire), reçoit chaque nouvelle ligne en direct (événement « releve ») et envoie le contenu de la notification
// (maj). « Arrêter » et « C'est fini » de la notification ouvrent l'appli avec l'action (événement « action », gardé jusqu'à lecture).
@CapacitorPlugin(
    name = "TrajetEnRoute",
    permissions = {
        @Permission(alias = "localisation", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" }),
    }
)
public class TrajetEnRoute extends Plugin {

    private final TrajetService.Ecouteur ecouteur = (ligne, numero) -> {
        JSObject o = new JSObject();
        o.put("ligne", ligne);
        o.put("n", numero); // numéro de la ligne dans le journal (round 3) : la page n'applique une ligne qu'une fois, par ce numéro
        notifyListeners("releve", o);
    };

    @Override
    public void load() {
        TrajetService.ecouteur = ecouteur;
        Intent i = getActivity() != null ? getActivity().getIntent() : null;
        if (i != null && i.hasExtra(TrajetService.EXTRA)) {
            transmettre(i.getStringExtra(TrajetService.EXTRA));
            i.removeExtra(TrajetService.EXTRA);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent i) {
        super.handleOnNewIntent(i);
        if (i != null && i.hasExtra(TrajetService.EXTRA)) {
            transmettre(i.getStringExtra(TrajetService.EXTRA));
            i.removeExtra(TrajetService.EXTRA);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (TrajetService.ecouteur == ecouteur) TrajetService.ecouteur = null;
    }

    private void transmettre(String action) {
        if (action == null) return;
        JSObject o = new JSObject();
        o.put("action", action);
        notifyListeners("action", o, true);
    }

    @PluginMethod
    public void demanderPermissions(PluginCall call) {
        boolean notif = Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED;
        boolean loc = getPermissionState("localisation") != PermissionState.GRANTED;
        if (!notif && !loc) {
            call.resolve();
            return;
        }
        String[] alias = notif && loc ? new String[] { "localisation", "notifications" } : new String[] { loc ? "localisation" : "notifications" };
        requestPermissionForAliases(alias, call, "retourPermissions");
    }

    @PermissionCallback
    private void retourPermissions(PluginCall call) {
        JSObject o = new JSObject();
        o.put("localisation", getPermissionState("localisation") == PermissionState.GRANTED);
        call.resolve(o);
    }

    /** Démarre (ou retrouve, même id) le service du trajet. */
    @PluginMethod
    public void demarrer(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(c, TrajetService.class)
            .setAction(TrajetService.DEMARRER)
            .putExtra("id", call.getString("id"))
            .putExtra("contenu", call.getObject("contenu", new JSObject()).toString());
        try {
            ContextCompat.startForegroundService(c, i);
            call.resolve();
        } catch (Exception e) {
            call.reject("service non démarré : " + e.getMessage());
        }
    }

    @PluginMethod
    public void arreter(PluginCall call) {
        TrajetService.arreter(getContext());
        call.resolve();
    }

    /** Journal du trajet en cours : toutes les lignes écrites par le service, même quand la page n'était pas là. */
    @PluginMethod
    public void lire(PluginCall call) {
        JSObject o = new JSObject();
        o.put("texte", TrajetService.lire(getContext()));
        o.put("id", TrajetService.prefs(getContext()).getString("id", null));
        o.put("actif", TrajetService.actif(getContext()));
        o.put("contenu", TrajetService.contenu(getContext()).toString());
        call.resolve(o);
    }

    /** Contenu de la notification (textes de src/lib/textes.ts) ; gardé pour le direct natif si la page disparaît. Un bouton de la
     *  notification que la page n'a pas encore appliqué n'est pas écrasé (TrajetService.fusionnerPage). */
    @PluginMethod
    public void maj(PluginCall call) {
        TrajetService.garderContenu(getContext(), TrajetService.fusionnerPage(getContext(), call.getData()));
        TrajetService.reposer(getContext());
        call.resolve();
    }

    // ---------- optimisation de batterie (proposée une fois, au premier Démarrer) ----------
    private boolean horsOptimisation() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void batterie(PluginCall call) {
        JSObject o = new JSObject();
        o.put("horsOptimisation", horsOptimisation());
        call.resolve(o);
    }

    @PluginMethod
    public void proposerBatterie(PluginCall call) {
        if (horsOptimisation()) {
            batterie(call);
            return;
        }
        Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
        try {
            startActivityForResult(call, i, "retourBatterie");
        } catch (Exception e) {
            // repli : la liste système des applis optimisées
            try {
                startActivityForResult(call, new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), "retourBatterie");
            } catch (Exception e2) {
                batterie(call);
            }
        }
    }

    @ActivityCallback
    private void retourBatterie(PluginCall call, ActivityResult r) {
        if (call != null) batterie(call);
    }
}
