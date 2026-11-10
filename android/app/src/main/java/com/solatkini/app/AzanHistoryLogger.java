package com.solatkini.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pengurus Rekod Diagnostik Azan Tempatan (Local Phone Only)
 * - Berdiri sendiri (Modular)
 * - Auto-padam rekod melebihi 24 jam
 * - Menggunakan SharedPreferences berasingan (SolatKiniLogs)
 */
public class AzanHistoryLogger {
    private static final String TAG = "AzanHistoryLogger";
    private static final String LOG_PREFS_NAME = "SolatKiniLogs";
    private static final String KEY_AZAN_LOGS = "azan_logs_json";
    private static final long RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000L; // Had 24 Jam

    // Status Kod
    public static final String STATUS_SUCCESS = "BERJAYA";
    public static final String STATUS_TRIGGERED = "DICETUSKAN";
    public static final String STATUS_FAILED = "GAGAL";

    /**
     * Catat peristiwa azan dan buang log lama secara automatik
     */
    public static synchronized void record(Context context, String prayerName, String prayerKey, String status, String details) {
        if (context == null) return;

        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString(KEY_AZAN_LOGS, "[]");
            JSONArray oldList = new JSONArray(existingJson);

            long now = System.currentTimeMillis();
            SimpleDateFormat timeFmt = new SimpleDateFormat("h:mm:ss a", Locale.getDefault());
            SimpleDateFormat dateFmt = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
            Date currentDate = new Date(now);

            // 1. Cipta entri log baharu
            JSONObject newEntry = new JSONObject();
            newEntry.put("prayerName", prayerName != null ? prayerName : "Solat");
            newEntry.put("prayerKey", prayerKey != null ? prayerKey : "solat");
            newEntry.put("timestamp", now);
            newEntry.put("timeFormatted", timeFmt.format(currentDate));
            newEntry.put("dateFormatted", dateFmt.format(currentDate));
            newEntry.put("status", status);
            newEntry.put("details", details != null ? details : "");

            // 2. Senarai baharu: Masukkan entri terkini di bahagian atas sekali
            JSONArray filteredList = new JSONArray();
            filteredList.put(newEntry);

            // 3. Tapis rekod lama (Hanya simpan log bawah 24 jam)
            for (int i = 0; i < oldList.length(); i++) {
                JSONObject item = oldList.getJSONObject(i);
                long itemTime = item.optLong("timestamp", 0);

                if ((now - itemTime) < RETENTION_PERIOD_MS) {
                    filteredList.put(item);
                }
            }

            // Simpan ke telefon
            prefs.edit().putString(KEY_AZAN_LOGS, filteredList.toString()).apply();
            Log.i(TAG, "Log azan berjaya dicatat: [" + status + "] " + prayerName + " - " + details);

        } catch (Exception e) {
            Log.w(TAG, "Gagal mencatat log azan: " + e.getMessage());
        }
    }

    /**
     * Dapatkan semua rekod 24 jam dalam format JSON String (untuk dibaca oleh UI React / Plugin)
     */
    public static String getLogsJson(Context context) {
        if (context == null) return "[]";
        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_AZAN_LOGS, "[]");
            
            // Tapis semula sebelum pulangkan data untuk memastikan rekod betul-betul segar (<24 jam)
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
        } catch (Exception e) {
            return "[]";
        }
    }

    /**
     * Padam semua rekod log bila-bila masa pengguna mahu kosongkan
     */
    public static void clearLogs(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(LOG_PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(KEY_AZAN_LOGS).apply();
            Log.i(TAG, "Semua rekod log azan berjaya dipadam.");
        } catch (Exception ignored) {}
    }
}
