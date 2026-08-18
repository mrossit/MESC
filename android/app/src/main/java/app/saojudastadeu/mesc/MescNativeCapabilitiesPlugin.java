package app.saojudastadeu.mesc;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MescNativeCapabilities")
public class MescNativeCapabilitiesPlugin extends Plugin {
    @PluginMethod
    public void get(PluginCall call) {
        int resourceId = getContext()
            .getResources()
            .getIdentifier("google_app_id", "string", getContext().getPackageName());
        boolean firebasePushConfigured = resourceId != 0;

        JSObject result = new JSObject();
        result.put("firebasePushConfigured", firebasePushConfigured);
        call.resolve(result);
    }
}
