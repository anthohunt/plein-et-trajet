package cloud.ingevision.pleinettrajet;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrajetEnRoute.class);
        super.onCreate(savedInstanceState);
        // Tests sur émulateur de l'APK de release : `am start … --ez pt_inspecter true` rend la WebView inspectable tant que le
        // processus vit (rien n'est gardé). Round 3 (audit r2, LOW 2) : sans effet sur un téléphone du commerce (système
        // « user ») — seul un système de développement (« userdebug », « eng » : l'émulateur de la CI) l'accepte. Le réglage gardé
        // du round 2 est effacé.
        deleteSharedPreferences("tests");
        Intent i = getIntent();
        if (!"user".equals(Build.TYPE) && i != null && i.getBooleanExtra("pt_inspecter", false)) WebView.setWebContentsDebuggingEnabled(true);
    }
}
