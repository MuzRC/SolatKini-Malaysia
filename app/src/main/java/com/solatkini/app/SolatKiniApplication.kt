package com.solatkini.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import com.solatkini.app.service.AzanAudioManager
import com.solatkini.app.service.SolatWidgetManager

class SolatKiniApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        registerNotificationChannels()
    }

    private fun registerNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            // 1. Saluran Penggera Azan (USAGE_ALARM, keutamaan tinggi)
            val alarmChannel = NotificationChannel(
                AzanAudioManager.CHANNEL_ID_AZAN_ALARM,
                "Penggera Azan SolatKini",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Laungan azan waktu solat fardu pada saluran penggera sistem"
                setSound(
                    null,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                enableVibration(true)
            }

            // 2. Saluran Status Waktu Solat Berterusan (Senyap)
            val persistentChannel = NotificationChannel(
                SolatWidgetManager.CHANNEL_ID_PERSISTENT,
                "Status Waktu Solat Berterusan",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Paparan jadual waktu solat dan pemasa undur pada bar notifikasi"
                setSound(null, null)
                enableVibration(false)
            }

            nm.createNotificationChannel(alarmChannel)
            nm.createNotificationChannel(persistentChannel)
        }
    }
}
