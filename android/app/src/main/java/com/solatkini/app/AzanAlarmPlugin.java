@PluginMethod
    public void schedulePrayerAlarms(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager peranti tidak tersedia");
                return;
            }

            JSArray alarmsArray = call.getArray("alarms");
            if (alarmsArray == null) {
                call.reject("Parameter 'alarms' diperlukan");
                return;
            }

            long now = System.currentTimeMillis();
            JSONArray jsonList = new JSONArray();
            int scheduledCount = 0;

            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                String prayerKey = obj.optString("prayerKey", "solat");
                String prayerName = obj.optString("prayerName", "Solat");
                String voice = obj.optString("voice", "jakim");
                long timestamp = obj.optLong("timestamp", 0);
                int requestCode = 2000 + i;

                // =========================================================================
                // DI SINI TEMPATNYA: Anjak ke hari esok jika waktu solat sudah berlalu hari ini
                // =========================================================================
                if (timestamp > 0) {
                    java.util.Calendar prayerCal = java.util.Calendar.getInstance();
                    prayerCal.setTimeInMillis(timestamp);

                    java.util.Calendar nowCal = java.util.Calendar.getInstance();
                    
                    // Jika waktu solat telah lepas berbanding waktu sekarang, tambah 1 hari (esok)
                    if (prayerCal.before(nowCal)) {
                        prayerCal.add(java.util.Calendar.DAY_OF_YEAR, 1);
                        timestamp = prayerCal.getTimeInMillis();
                    }
                }
                // =========================================================================

                // Simpan setiap rekod bersama timestamp yang telah diselaraskan
                JSONObject storedObj = new JSONObject();
                storedObj.put("prayerKey", prayerKey);
                storedObj.put("prayerName", prayerName);
                storedObj.put("voice", voice);
                storedObj.put("timestamp", timestamp);
                storedObj.put("requestCode", requestCode);
                jsonList.put(storedObj);

                if (timestamp > now) {
                    Intent intent = new Intent(context, AzanAlarmReceiver.class);
                    intent.setAction(AzanAlarmReceiver.ACTION_TRIGGER_AZAN);
                    intent.putExtra("prayer_key", prayerKey);
                    intent.putExtra("prayer_name", prayerName);
                    intent.putExtra("voice", voice);
                    intent.putExtra("scheduled_timestamp", timestamp);

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(timestamp, pendingIntent);
                        alarmManager.setAlarmClock(clockInfo, pendingIntent);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
                    }
                    scheduledCount++;
                    Log.i(TAG, "Penggera solat (" + prayerName + ") suara [" + voice + "] dijadualkan pada: " + timestamp);
                }
            }

            // Simpan keseluruhan jadual ke SharedPreferences untuk penjadualan semula bila telefon di-reboot
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_STORED_ALARMS, jsonList.toString()).apply();

            // Segerakkan dan paparkan notifikasi berterusan waktu solat secara native serta-merta
            try {
                AzanAlarmReceiver.updatePersistentNotificationNatively(context);
            } catch (Exception e) {
                Log.w(TAG, "Gagal mengemas kini notifikasi berterusan native: " + e.getMessage());
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("scheduledCount", scheduledCount);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Ralat menjadualkan penggera solat asli", e);
            call.reject("Gagal menjadualkan penggera azan: " + e.getMessage(), e);
        }
    }
