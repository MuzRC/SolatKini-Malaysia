package com.solatkini.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.solatkini.app.model.DayPrayerTimes
import com.solatkini.app.model.JakimZone
import com.solatkini.app.model.PrayerKey
import org.json.JSONArray
import org.json.JSONObject

class SolatWidgetManager(private val context: Context) {
    private val prefs =
        context.getSharedPreferences("solatkini_widget_prefs", Context.MODE_PRIVATE)

    companion object {
        const val CHANNEL_ID_PERSISTENT = "solatkini_persistent_prayer_channel"
        const val PERSISTENT_NOTIFICATION_ID = 7101
        const val ACTION_SYNC_PRAYER = "com.solatkini.app.ACTION_SYNC_PRAYER"
        private const val KEY_LATEST_WIDGET_JSON = "solatkini_widget_latest"
        private const val KEY_PERSISTENT_PAYLOAD_JSON = "solatkini_persistent_notif_payload"
    }

    private fun formatZoneLabel(zone: JakimZone): String {
        val shortName = zone.shortDaerah
        return if (shortName.isNotBlank()) "${zone.code} ($shortName)" else zone.code
    }

    fun syncWidget(
        prayerTimes: DayPrayerTimes,
        zone: JakimZone,
        nextLabel: String,
        nextTime: String,
        hijriFormatted: String,
        upcomingDays: List<DayPrayerTimes> = emptyList()
    ) {
        val daysArr = JSONArray()
        for (day in upcomingDays.take(14)) {
            daysArr.put(
                JSONObject().apply {
                    put("date", day.date)
                    put("hijri", day.hijriDate)
                    put("imsak", day.timeFor(PrayerKey.IMSAK))
                    put("subuh", day.timeFor(PrayerKey.SUBUH))
                    put("syuruk", day.timeFor(PrayerKey.SYURUK))
                    put("zohor", day.timeFor(PrayerKey.ZOHOR))
                    put("asar", day.timeFor(PrayerKey.ASAR))
                    put("maghrib", day.timeFor(PrayerKey.MAGHRIB))
                    put("isyak", day.timeFor(PrayerKey.ISYAK))
                }
            )
        }

        val payload = JSONObject().apply {
            put("zone", formatZoneLabel(zone))
            put("hijri", hijriFormatted)
            put("date", prayerTimes.date)
            put("next_label", nextLabel)
            put("next_time", nextTime)
            put("imsak", prayerTimes.timeFor(PrayerKey.IMSAK))
            put("subuh", prayerTimes.timeFor(PrayerKey.SUBUH))
            put("syuruk", prayerTimes.timeFor(PrayerKey.SYURUK))
            put("zohor", prayerTimes.timeFor(PrayerKey.ZOHOR))
            put("asar", prayerTimes.timeFor(PrayerKey.ASAR))
            put("maghrib", prayerTimes.timeFor(PrayerKey.MAGHRIB))
            put("isyak", prayerTimes.timeFor(PrayerKey.ISYAK))
            put("upcoming_days_json", daysArr.toString())
        }

        prefs.edit().putString(KEY_LATEST_WIDGET_JSON, payload.toString()).apply()
        SolatWidgetProvider.updateAllWidgetsFromPrefs(context, payload)
    }

    fun syncPersistentNotification(
        prayerTimes: DayPrayerTimes,
        zone: JakimZone,
        nextLabel: String,
        nextTime: String,
        countdownText: String,
        nextTimestampMs: Long,
        hijriFormatted: String,
        enabled: Boolean
    ) {
        if (!enabled) {
            cancelPersistentNotification()
            return
        }

        ensurePersistentChannel()
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        val payload = JSONObject().apply {
            put("zone", formatZoneLabel(zone))
            put("hijri", hijriFormatted)
            put("date", prayerTimes.date)
            put("next_label", nextLabel)
            put("next_time", nextTime)
            put("countdown", countdownText)
            put("next_timestamp", nextTimestampMs)
            put("target_timestamp", nextTimestampMs)
            put("subuh", prayerTimes.timeFor(PrayerKey.SUBUH))
            put("zohor", prayerTimes.timeFor(PrayerKey.ZOHOR))
            put("asar", prayerTimes.timeFor(PrayerKey.ASAR))
            put("maghrib", prayerTimes.timeFor(PrayerKey.MAGHRIB))
            put("isyak", prayerTimes.timeFor(PrayerKey.ISYAK))
        }
        prefs.edit().putString(KEY_PERSISTENT_PAYLOAD_JSON, payload.toString()).apply()

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val openAppPi = launchIntent?.let {
            PendingIntent.getActivity(
                context,
                4001,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val syncIntent = Intent(ACTION_SYNC_PRAYER).apply { setPackage(context.packageName) }
        val syncPi = PendingIntent.getBroadcast(
            context,
            4002,
            syncIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val summaryLine =
            "Subuh ${prayerTimes.timeFor(PrayerKey.SUBUH)} · Zohor ${prayerTimes.timeFor(PrayerKey.ZOHOR)} · " +
                "Asar ${prayerTimes.timeFor(PrayerKey.ASAR)} · Maghrib ${prayerTimes.timeFor(PrayerKey.MAGHRIB)} · " +
                "Isyak ${prayerTimes.timeFor(PrayerKey.ISYAK)}"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_PERSISTENT)
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .setContentTitle("$nextLabel · $nextTime (${formatZoneLabel(zone)})")
            .setContentText(if (countdownText.isNotBlank()) "$countdownText · $hijriFormatted" else hijriFormatted)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$summaryLine
$hijriFormatted"))
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .apply { if (openAppPi != null) setContentIntent(openAppPi) }
            .addAction(0, "Segerak", syncPi)

        if (nextTimestampMs > System.currentTimeMillis()) {
            builder.setWhen(nextTimestampMs)
            builder.setUsesChronometer(true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(true)
            }
        }

        nm.notify(PERSISTENT_NOTIFICATION_ID, builder.build())
    }

    fun cancelPersistentNotification() {
        prefs.edit().remove(KEY_PERSISTENT_PAYLOAD_JSON).apply()
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(PERSISTENT_NOTIFICATION_ID)
    }

    private fun ensurePersistentChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val channel = NotificationChannel(
                CHANNEL_ID_PERSISTENT,
                "Status Waktu Solat Berterusan",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Paparan jadual waktu solat dan pemasa undur pada panel notifikasi"
                setSound(null, null)
                enableVibration(false)
            }
            nm.createNotificationChannel(channel)
        }
    }
}

class SolatWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val raw = context.getSharedPreferences("solatkini_widget_prefs", Context.MODE_PRIVATE)
            .getString("solatkini_widget_latest", null)
        val payload = try {
            if (raw != null) JSONObject(raw) else JSONObject()
        } catch (_: Exception) {
            JSONObject()
        }
        updateWidgetIds(context, appWidgetManager, appWidgetIds, payload)
    }

    companion object {
        fun updateAllWidgetsFromPrefs(context: Context, payload: JSONObject) {
            val mgr = AppWidgetManager.getInstance(context) ?: return
            val ids = mgr.getAppWidgetIds(ComponentName(context, SolatWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                updateWidgetIds(context, mgr, ids, payload)
            }
        }

        private fun updateWidgetIds(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray,
            payload: JSONObject
        ) {
            val layoutId = context.resources.getIdentifier("widget_solat_card", "layout", context.packageName)
            if (layoutId == 0) return

            val zoneText = payload.optString("zone", "WLY01 (Kuala Lumpur)")
            val nextLabel = payload.optString("next_label", "Waktu Solat")
            val nextTime = payload.optString("next_time", "--:--")
            val subuh = payload.optString("subuh", "--:--")
            val zohor = payload.optString("zohor", "--:--")
            val asar = payload.optString("asar", "--:--")
            val maghrib = payload.optString("maghrib", "--:--")
            val isyak = payload.optString("isyak", "--:--")

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val openPi = launchIntent?.let {
                PendingIntent.getActivity(
                    context,
                    5001,
                    it,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            fun viewId(name: String): Int =
                context.resources.getIdentifier(name, "id", context.packageName)

            for (id in appWidgetIds) {
                val views = RemoteViews(context.packageName, layoutId)
                val zoneId = viewId("tv_widget_zone")
                val nextLabelId = viewId("tv_widget_next_label")
                val nextTimeId = viewId("tv_widget_next_time")
                val subuhId = viewId("tv_widget_subuh")
                val zohorId = viewId("tv_widget_zohor")
                val asarId = viewId("tv_widget_asar")
                val maghribId = viewId("tv_widget_maghrib")
                val isyakId = viewId("tv_widget_isyak")
                val rootId = viewId("widget_root")

                if (zoneId != 0) views.setTextViewText(zoneId, zoneText)
                if (nextLabelId != 0) views.setTextViewText(nextLabelId, nextLabel)
                if (nextTimeId != 0) views.setTextViewText(nextTimeId, nextTime)
                if (subuhId != 0) views.setTextViewText(subuhId, subuh)
                if (zohorId != 0) views.setTextViewText(zohorId, zohor)
                if (asarId != 0) views.setTextViewText(asarId, asar)
                if (maghribId != 0) views.setTextViewText(maghribId, maghrib)
                if (isyakId != 0) views.setTextViewText(isyakId, isyak)
                if (rootId != 0 && openPi != null) {
                    views.setOnClickPendingIntent(rootId, openPi)
                }

                appWidgetManager.updateAppWidget(id, views)
            }
        }
    }
}
