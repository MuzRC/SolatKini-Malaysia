package com.solatkini.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class AzanHistoryLogger {
    private static final String TAG = "AzanHistoryLogger";
    private static final String LOG_PREFS_NAME = "SolatKiniLogs";
    private static final String KEY_AZAN_LOGS = "azan_logs_json";
    private static final long RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000L; // Had 24 Jam

    public static final String STATUS_SUCCESS = "BERJAYA";
    public static final String STATUS_TRIGGERED = "DICETUSKAN";
    public static final String STATUS_FAILED = "GAGAL";

    public static synchronized void record(Context context, String prayerName, String prayerKey, String status, String details) {
        boolean forceSync = STATUS_FAILED.equals(status);
        writeLogInternal(context, prayerName, prayerKey, status, details, forceSync);
    }

    public static synchronized void recordSync(Context context, String prayerName, String prayerKey, String status, String details) {
        writeLogInternal(context, prayerName, prayerKey, status, details, true);
    }

    private static void writeLogInternal(Context context, String prayerName, String prayerKey, String status, String details, boolean useCommit) {
        if (context == null) return;

        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString(KEY_AZAN_LOGS, "[]");
            JSONArray oldList = new JSONArray(existingJson);

            long now = System.currentTimeMillis();
            SimpleDateFormat timeFmt = new SimpleDateFormat("h:mm:ss a", Locale.getDefault());
            SimpleDateFormat dateFmt = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
            Date currentDate = new Date(now);

            JSONObject newEntry = new JSONObject();
            newEntry.put("prayerName", prayerName != null ? prayerName : "Solat");
            newEntry.put("prayerKey", prayerKey != null ? prayerKey : "solat");
            newEntry.put("timestamp", now);
            newEntry.put("timeFormatted", timeFmt.format(currentDate));
            newEntry.put("dateFormatted", dateFmt.format(currentDate));
            newEntry.put("status", status);
            newEntry.put("details", details != null ? details : "");

            JSONArray filteredList = new JSONArray();
            filteredList.put(newEntry);

            for (int i = 0; i < oldList.length(); i++) {
                JSONObject item = oldList.getJSONObject(i);
                long itemTime = item.optLong("timestamp", 0);

                if ((now - itemTime) < RETENTION_PERIOD_MS) {
                    filteredList.put(item);
                }
            }

            SharedPreferences.Editor editor = prefs.edit().putString(KEY_AZAN_LOGS, filteredList.toString());
            if (useCommit) {
                editor.commit();
            } else {
                editor.apply();
            }

            Log.i(TAG, "Log azan dicatat: [" + status + "] " + prayerName + " - " + details);
        } catch (Throwable t) {
            Log.w(TAG, "Gagal mencatat log azan: " + t.getMessage());
        }
    }

    public static String getLogsJson(Context context) {
        if (context == null) return "[]";
        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_AZAN_LOGS, "[]");

            JSONArray currentList = new JSONArray(rawJson);
            JSONArray validList = new JSONArray();
            long now = System.currentTimeMillis();

            for (int i = 0; i < currentList.length(); i++) {
                JSONObject item = currentList.getJSONObject(i);
                long itemTime = item.optLong("timestamp", 0);
                if ((now - itemTime) < RETENTION_PERIOD_MS) {
                    validList.put(item);
                }
            }

            return validList.toString();
        } catch (Throwable t) {
            return "[]";
        }
    }

    public static void clearLogs(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(KEY_AZAN_LOGS).commit();
            Log.i(TAG, "Semua rekod log azan berjaya dipadam.");
        } catch (Throwable ignored) {}
    }
}
