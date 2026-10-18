package com.solatkini.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SolatWidget")
public class SolatWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, SolatWidgetProvider.class);
            intent.setAction(SolatWidgetProvider.ACTION_UPDATE_PRAYER_TIMES);

            if (call.hasOption("zone")) {
                intent.putExtra("zone", call.getString("zone"));
            }
            if (call.hasOption("next_label")) {
                intent.putExtra("next_label", call.getString("next_label"));
            }
            if (call.hasOption("next_time")) {
                intent.putExtra("next_time", call.getString("next_time"));
            }
            if (call.hasOption("subuh")) {
                intent.putExtra("subuh", call.getString("subuh"));
            }
            if (call.hasOption("zohor")) {
                intent.putExtra("zohor", call.getString("zohor"));
            }
            if (call.hasOption("asar")) {
                intent.putExtra("asar", call.getString("asar"));
            }
            if (call.hasOption("maghrib")) {
                intent.putExtra("maghrib", call.getString("maghrib"));
            }
            if (call.hasOption("isyak")) {
                intent.putExtra("isyak", call.getString("isyak"));
            }

            context.sendBroadcast(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal mengemaskini widget Android: " + e.getMessage(), e);
        }
    }
}
