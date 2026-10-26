package org.example.pleinettrajet;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

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
        // Plan de robustesse (scénario « rendu », 24/10) : quand Android tue le moteur de rendu de la page — ce qu'il fait en premier
        // quand la mémoire manque, appli en arrière-plan — la WebView, sans ce rappel, emportait tout le processus : le service du
        // trajet mourait avec elle et ne repartait qu'après 12 s. On ferme seulement la page ; le service continue, la page se
        // recharge à la prochaine ouverture et relit le journal.
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView vue, RenderProcessGoneDetail detail) {
                Diagnostic.noter(MainActivity.this, "APPLI", "rendu-perdu plantage=" + detail.didCrash() + " priorite=" + detail.rendererPriorityAtExit());
                // à l'écran : la page est recréée tout de suite ; en arrière-plan : elle attend la prochaine ouverture
                if (hasWindowFocus()) recreate();
                else finish();
                return true;
            }
        });
    }
}
