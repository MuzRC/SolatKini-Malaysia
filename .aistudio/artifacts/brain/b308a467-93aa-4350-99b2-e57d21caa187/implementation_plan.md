# Pelan Pelaksanaan: Penyingkiran Lengah Masa Azan & Penghapusan Suara Azan Bertindih

Pelan ini menyelesaikan dua isu kritikal yang dilaporkan:
1. **Azan Lambat 1-2 Minit**: Memastikan laungan azan bermula tepat pada saat dan minit yang dijadualkan dengan menaik taraf mekanisme penggera kepada **`AlarmManager.setAlarmClock`** (tahap keutamaan jam penggera perkakasan tertinggi Android yang kebal mod *Doze*).
2. **Dua Azan Berbunyi Serentak (*Default vs Pilihan Pengguna*)**: Menghapuskan punca pertindihan audio dengan menyahaktifkan bunyi fail azan lalai pada saluran notifikasi sistem Android dan membenarkan enjin `MediaPlayer` memainkan satu suara azan pilihan pengguna sahaja secara eksklusif.

---

## Keputusan Semakan Pengguna & Spesifikasi Disahkan

> [!IMPORTANT]
> - **Ketepatan Masa**: Menggunakan **Mod Penggera Jam Tepat (*AlarmClockInfo*)** untuk memastikan azan bermula tepat pada saatnya tanpa lengah 1 atau 2 minit walaupun telefon berada dalam mod tidur nyenyak (*Deep Doze / Screen Off*).
> - **Pengasingan Audio**: **Senyapkan bunyi notifikasi sistem sepenuhnya** (`setSound(null, null)`), dan serahkan 100% audio kepada `MediaPlayer` di dalam perkhidmatan `AzanAudioService` untuk memainkan fail audio pilihan pengguna sahaja.

---

## 1. Analisis Punca Masalah & Penyelesaian Teknikal

### Isu 1: Mengapa Azan Lambat 1 atau 2 Minit?
- **Punca**:
  - Kod sebelum ini menggunakan kaedah `alarmManager.setExactAndAllowWhileIdle(...)`.
  - Di dalam sistem Android 6 sehingga Android 15, kaedah ini masih tertakluk kepada kekangan penjimatan bateri sistem (*Doze Mode windowing*). Sistem operasi Android dibenarkan mengumpulkan (*batch*) dan menangguhkan penggera sebanyak 1 hingga 2 minit apabila telefon dibiarkan lama dengan skrin tertutup.
- **Penyelesaian**:
  - Menggantikan kaedah tersebut kepada **`alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(timestamp, pendingIntent), pendingIntent)`**.
  - Menurut dokumentasi rasmi Google Android, `setAlarmClock` dikendalikan pada aras *Hardware RTC Wakeup* setaraf aplikasi Jam Penggera rasmi telefon (*Stock Clock App*). Ia akan mengejutkan pemproses CPU pada saat yang tepat dan tidak boleh ditangguhkan oleh sebarang mod penjimatan bateri atau *Doze mode*.

---

### Isu 2: Mengapa Ada 2 Azan Berbunyi Serentak (Default & Pilihan)?
- **Punca Sebenar**:
  - Di dalam `SolatKiniApplication.java`, saluran notifikasi `AZAN_CHANNEL_ID` (`solatkini_azan_channel`) telah ditetapkan dengan fail audio lalai sistem:
    ```java
    int rawId = getResources().getIdentifier("azan_notification", "raw", getPackageName());
    azanChannel.setSound(soundUri, audioAttributes);
    ```
  - Apabila tiba waktu solat, `AzanAudioService` memulakan notifikasi latar depan (`startForeground`). Sistem Android Notification Manager secara automatik memainkan audio saluran tersebut iaitu **azan lalai JAKIM** (`azan_notification.mp3`).
  - Pada detik yang sama, kaedah `playAzanAudio(voice)` memulakan `MediaPlayer` untuk memainkan **suara azan pilihan pengguna** (cth: Makkah, Madinah, dll.).
  - Akibatnya, telefon memainkan **kedua-dua azan serentak secara bertindih**!
- **Penyelesaian**:
  - Mendaftarkan saluran penggera azan baharu: **`solatkini_azan_channel_v3`** dengan tetapan **`channel.setSound(null, null)`**.
  - Memadamkan saluran lama `solatkini_azan_channel` agar tetapan bunyi lama tidak lagi disimpan dalam memori sistem telefon.
  - Menetapkan `NotificationCompat.Builder` dengan `.setSilent(true)`.
  - Dengan ini, notifikasi visual tidak mengeluarkan sebarang bunyi, dan alunan azan dikendalikan sepenuhnya oleh `MediaPlayer` menggunakan **satu suara azan pilihan pengguna sahaja**.

---

## 2. Rajah Aliran Audio & Penggera Tepat

```
Waktu Solat Tiba (Tepat pada saat)
       │
       ▼
[AlarmManager.setAlarmClock (0ms Delay)]
       │
       ▼ (Membangunkan CPU melalui RTC_WAKEUP)
[AzanAlarmReceiver]
       │
       ▼
[AzanAudioService (Foreground Service)]
       ├── Saluran Notifikasi (solatkini_azan_channel_v3):
       │   └── [setSound(null) -> TIADA BUNYI NOTIFIKASI DEFAULT]
       │
       └── MediaPlayer:
           └── [Mainkan TEPAT 1 ALUNAN AZAN PILIHAN PENGGUNA SAHAJA]
```

---

## 3. Langkah-Langkah Pelaksanaan Kod

### A. Saluran Notifikasi Azan Senyap (`SolatKiniApplication.java`)
1. Tukar ID saluran kepada `AZAN_CHANNEL_ID = "solatkini_azan_channel_v3"`.
2. Padamkan saluran lama: `manager.deleteNotificationChannel("solatkini_azan_channel")`.
3. Tetapkan `azanChannel.setSound(null, null)` dan jangan daftarkan fail `azan_notification` pada saluran notifikasi.

### B. Enjin Penggera Jam Tepat (`AzanAlarmPlugin.java` & `AzanBootReceiver.java`)
1. Di dalam `AzanAlarmPlugin.java`:
   - Gantikan panggilan `setExactAndAllowWhileIdle` kepada:
     ```java
     AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(timestamp, pendingIntent);
     alarmManager.setAlarmClock(clockInfo, pendingIntent);
     ```
2. Di dalam `AzanBootReceiver.java`:
   - Gunakan kaedah `setAlarmClock` yang sama untuk penjadualan semula waktu solat selepas telefon dihidupkan (*reboot*).

### C. Pengukuhan Perkhidmatan Audio (`AzanAudioService.java`)
1. Kemas kini `CHANNEL_ID` kepada `solatkini_azan_channel_v3`.
2. Tetapkan pembina notifikasi dengan `.setSilent(true)` dan `.setSound(null)`.
3. Di dalam `playAzanAudio(voice)`:
   - Pastikan `stopAzan()` dipanggil terlebih dahulu untuk membersihkan sebarang pemain audio aktif.
   - Mainkan fail suara pengguna yang dipilih (`mappedVoice`) melalui `MediaPlayer` pada saluran `STREAM_ALARM`.

### D. Penyelarasan Masa JavaScript (`nativeAlarmService.ts`)
1. Pastikan pengiraan `timestamp` dijana tepat pada minit ke-0 dan saat ke-0 (`targetDate.setHours(h, m, 0, 0)`).
2. Jika `targetDate.getTime() <= now.getTime()`, anjakkan penjadualan penggera solat tersebut terus ke keesokan harinya agar tiada penggera tertinggal atau terlengah.

---

## 4. Pelan Pengesahan & Pengujian
- **Semakan Kompilasi**: Menjalankan `npm run build && npx cap sync android` dan `compile_applet`.
- **Pengesahan Ketepatan Masa**: Menguji penjadualan penggera dengan kelewatan beberapa saat/minit dan mengesahkan penggera berdering tepat pada saatnya.
- **Pengesahan Suara Tunggal**: Menguji laungan azan dan mengesahkan tiada azan lalai yang berbunyi di latar belakang, hanya satu suara pilihan pengguna yang berkumandang.
