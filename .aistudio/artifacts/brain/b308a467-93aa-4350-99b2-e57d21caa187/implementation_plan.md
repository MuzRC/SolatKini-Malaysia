# Pelan Pelaksanaan: Kedudukan Teratas Notifikasi 5 Waktu Solat & Jaminan Sifar Pertindihan Azan (Zero Audio Overlap)

Pelan ini dikemas kini untuk memenuhi dua keperluan utama anda:
1. **Memindahkan Widget Notifikasi 5 Waktu Solat ke kedudukan teratas sekali** pada tetingkap telefon (Priority High / Alerting), bebas daripada kategori *Silent Notifications*, kekal senyap tanpa sebarang bunyi/getaran yang mengganggu.
2. **Jaminan Azan Berkumandang Lancar & Sifar Pertindihan Audio (*Single-Authoritative Azan*)**: Memastikan azan tetap berkumandang seperti biasa pada setiap waktu solat dan **hanya 1 alunan azan sahaja yang berbunyi** tanpa sebarang suara bertindih (tiada *double echo*).

---

## Keputusan Semakan & Spesifikasi Yang Disahkan

> [!IMPORTANT]
> - **Kedudukan Bar Notifikasi**: Teratas sekali (*Priority High / Max*), berasingan daripada *Silent Notifications*.
> - **Bunyi Bar Notifikasi**: Kekal senyap sepenuhnya semasa kemas kini waktu solat harian (`setSound(null)` & `enableVibration(false)`).
> - **Laungan Azan Waktu Solat**: Tetap berkumandang dengan lantang dan syahdu mengikut suara pilihan anda melalui saluran `STREAM_ALARM`.
> - **Penghalang Pertindihan Azan (*Strict Anti-Overlap Lock*)**: Pengasingan kuasa mutlak antara penggera Android Native (`AzanAudioService.java`) dan pemain Web Audio (`audioNotificationService.ts`) supaya hanya satu alunan azan sahaja yang bersuara pada satu-satu masa.

---

## 1. Mekanisme Penghalang Pertindihan Azan (*Anti-Overlap Engine*)

### Mengapa Pertindihan Boleh Berlaku Sebelum Ini?
- Pada telefon Android, terdapat 2 laluan yang berpotensi mencetuskan azan:
  1. **Laluan Native Hardware**: `AlarmManager` mengejutkan sistem dan memulakan perkhidmatan latar belakang `AzanAudioService.java` (menggunakan `MediaPlayer` Android).
  2. **Laluan Web View**: Apabila skrin aplikasi terbuka, JavaScript dalam WebView menerima acara `azanAlarmTriggered` dan mungkin turut mencuba memulakan `HTMLAudioElement` atau `AudioContext`.
- Jika kedua-duanya bersuara serentak, pengguna akan mendengar dua azan berkumandang secara bertindih (*echo/double audio*).

### Strategi Perlindungan Sifar Pertindihan (*Zero Overlap Protection*):
1. **Kuasa Tunggal (*Single Authoritative Audio Stream*) pada Android**:
   - Pada aplikasi Android APK, tugas memainkan fail audio azan diserahkan **100% dan mutlak kepada `AzanAudioService.java`** (`STREAM_ALARM`).
   - Apabila peristiwa `azanAlarmTriggered` dihantar ke WebView React, React **hanya membuka tetingkap visual (*Full-Screen Azan Modal*)** tanpa memainkan audio Web Audio pendua.
2. **Penghentian Paksa Sesi Terdahulu (*Atomic MediaPlayer Reset*)**:
   - Di dalam `AzanAudioService.java`, setiap kali arahan azan baharu diterima, kaedah `stopAzan()` akan dipanggil serta-merta terlebih dahulu untuk memadamkan sebarang sesi audio yang sedang aktif.
3. **Kunci Penyah-lantunan Waktu Solat (*Prayer Trigger Debounce Lock*)**:
   - Sistem menetapkan kunci masa (cth: 3 minit) bagi setiap waktu solat yang telah dilaungkan. Sebarang isyarat berulang bagi waktu solat yang sama dalam tempoh berkenaan akan disekat serta-merta.

---

## 2. Struktur Kedudukan Bar Notifikasi Teratas

```
┌────────────────────────────────────────────────────────┐
│             Notification Shade (Tetingkap Telefon)     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ★ KEDUDUKAN TERATAS (Top Priority / Ongoing)     │  │  <── SolatKini Widget 5 Waktu
│  │   - SolatKini · Zon WLY01 (Kuala Lumpur)         │  │      (Channel: IMPORTANCE_HIGH)
│  │   - Subuh | Zohor | ▶ Asar | Maghrib | Isyak     │  │      (Priority: PRIORITY_MAX)
│  │   - [ Buka SolatKini ]   [ ↻ Segerak Waktu ]     │  │      (Sound: None, Silent)
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Notifikasi Aplikasi Lain (WhatsApp, Telegram dll)│  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ════════════════════════════════════════════════════  │
│  [v] Silent Notifications (Bahagian Bawah Sekali)     │
│      (Notifikasi SolatKini TIDAK LAGI BERADA DI SINI)  │
└────────────────────────────────────────────────────────┘
```

### Langkah Pelaksanaan:
1. **Saluran Notifikasi Teratas Baharu (`SolatKiniApplication.java`)**:
   - Saluran baharu: `solatkini_top_widget_channel_v2`.
   - Tahap kepentingan: `NotificationManager.IMPORTANCE_HIGH`.
   - `channel.setSound(null, null)` dan `channel.enableVibration(false)` untuk sifar bunyi.
   - Saluran lama yang berstatus senyap (`solatkini_persistent_channel`) dipadamkan dari sistem.
2. **Pembina Notifikasi (`SolatWidgetPlugin.java`)**:
   - Menggunakan `PERSISTENT_CHANNEL_ID_V2`.
   - `builder.setPriority(NotificationCompat.PRIORITY_MAX)`.
   - `builder.setOngoing(true)` & `builder.setOnlyAlertOnce(true)`.
3. **Penyelarasan Penggera Azan Bebas Pertindihan (`PrayerDashboard.tsx` & `AzanAlarmModal.tsx`)**:
   - Memastikan apabila aplikasi berada di peranti Android asli (`Capacitor.isNativePlatform()`), hanya `AzanAudioService` yang membunyikan azan.
   - Modal azan di skrin hanya memaparkan visual, doa selepas azan, dan butang hentikan azan tanpa menghasilkan suara kedua.

---

## 3. Pelan Pengesahan & Pengujian
- **Semakan Kompilasi**: Menjalankan `npm run build && npx cap sync android` serta `compile_applet`.
- **Ujian Audio Bersendirian**: Menguji simulasi penggera azan dan memastikan hanya **1 fail audio** yang aktif pada `MediaPlayer` Android.
- **Ujian Posisi Notifikasi**: Memastikan widget 5 waktu solat muncul di seksyen aktif paling atas dan tidak jatuh ke dalam senarai *Silent Notifications*.
