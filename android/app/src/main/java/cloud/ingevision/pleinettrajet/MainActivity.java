package cloud.ingevision.pleinettrajet;

import android.content.Context;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrajetEnRoute.class);
        super.onCreate(savedInstanceState);
        // Tests sur émulateur de l'APK de release (jalon 6, round 2) : `am start … --ez pt_inspecter true` rend la WebView
        // inspectable, réglage gardé. Seul un ordinateur branché en adb peut s'y connecter (socket réservé à adb).
        if (getIntent() != null && getIntent().hasExtra("pt_inspecter")) {
            getSharedPreferences("tests", Context.MODE_PRIVATE).edit().putBoolean("inspecter", getIntent().getBooleanExtra("pt_inspecter", false)).apply();
        }
        if (getSharedPreferences("tests", Context.MODE_PRIVATE).getBoolean("inspecter", false)) WebView.setWebContentsDebuggingEnabled(true);
    }
}
