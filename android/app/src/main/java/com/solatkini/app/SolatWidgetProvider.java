package com.solatkini.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class SolatWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_UPDATE_PRAYER_TIMES = "com.solatkini.app.UPDATE_PRAYER_TIMES";
    private static final String PREFS_NAME = "SolatKiniWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_solat);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String zone = prefs.getString("zone", "WLY01");
        String nextLabel = prefs.getString("next_label", "Waktu Solat");
        String nextTime = prefs.getString("next_time", "--:--");
        String subuh = prefs.getString("subuh", "05:50");
        String zohor = prefs.getString("zohor", "13:10");
        String asar = prefs.getString("asar", "16:20");
        String maghrib = prefs.getString("maghrib", "19:15");
        String isyak = prefs.getString("isyak", "20:25");

        views.setTextViewText(R.id.widget_zone, zone);
        views.setTextViewText(R.id.widget_next_label, nextLabel);
        views.setTextViewText(R.id.widget_next_time, nextTime);
        views.setTextViewText(R.id.widget_subuh, subuh);
        views.setTextViewText(R.id.widget_zohor, zohor);
        views.setTextViewText(R.id.widget_asar, asar);
        views.setTextViewText(R.id.widget_maghrib, maghrib);
        views.setTextViewText(R.id.widget_isyak, isyak);

        // Click on widget opens SolatKini app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_UPDATE_PRAYER_TIMES.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (intent.hasExtra("zone")) editor.putString("zone", intent.getStringExtra("zone"));
            if (intent.hasExtra("next_label")) editor.putString("next_label", intent.getStringExtra("next_label"));
            if (intent.hasExtra("next_time")) editor.putString("next_time", intent.getStringExtra("next_time"));
            if (intent.hasExtra("subuh")) editor.putString("subuh", intent.getStringExtra("subuh"));
            if (intent.hasExtra("zohor")) editor.putString("zohor", intent.getStringExtra("zohor"));
            if (intent.hasExtra("asar")) editor.putString("asar", intent.getStringExtra("asar"));
            if (intent.hasExtra("maghrib")) editor.putString("maghrib", intent.getStringExtra("maghrib"));
            if (intent.hasExtra("isyak")) editor.putString("isyak", intent.getStringExtra("isyak"));
            editor.apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, SolatWidgetProvider.class);
            int[] appWidgetIds = manager.getAppWidgetIds(thisWidget);
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, manager, appWidgetId);
            }
        }
    }
}
