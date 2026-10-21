package cloud.ingevision.pleinettrajet;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NotifTrajet.class);
        super.onCreate(savedInstanceState);
    }
}
