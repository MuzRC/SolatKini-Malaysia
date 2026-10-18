# Pelan Pelaksanaan: Sistem Penggera Azan Asli Android (AlarmManager) & Kebenaran Notifikasi TargetSDK 33+

Pelan ini menggariskan penaiktarafan menyeluruh dan pembinaan semula sistem penggera azan aplikasi SolatKini ke tahap **Android Native Alarm System** bagi memastikan laungan azan berbunyi secara tepat waktu pada telefon pintar pengguna melepasi mod senyap, disokong oleh kebenaran notifikasi Android 13+ (`POST_NOTIFICATIONS`), pengurusan skrin visual azan penuh automatik, serta persediaan binaan sedia-tolak ke GitHub.

---

## Keputusan Kritikal & Maklum Balas Pengguna

> [!IMPORTANT]
> Berdasarkan pilihan yang telah disahkan oleh pengguna pada fasa temubual:
> 1. **Saluran Audio Penggera Maksima**: Audio azan dikonfigurasi melalui saluran penggera (`STREAM_ALARM` / `AudioAttributes.USAGE_ALARM`) yang berupaya melepasi mod senyap/getar telefon dan mengekalkan kelantangan azan yang optimum.
> 2. **Paparan Skrin Penuh Automatik**: Apabila masuk waktu solat, sistem mengaktifkan paparan visual skrin penuh azan secara serta-merta walaupun telefon dalam keadaan berkunci (`showWhenLocked` dan `turnScreenOn`).
> 3. **Masa Permintaan Kebenaran Runtime**: Kebenaran notifikasi (`POST_NOTIFICATIONS` bagi Android 13 / TargetSDK 33+) dan status penggera tepat diminta sebaik sahaja aplikasi dibuka kali pertama, serta semasa pengguna mengaktifkan suis azan.

---

## 1. Gambaran Keseluruhan & Konsep Teras

- **Masalah Pengguna**: Sebelum ini, pemasaan azan hanya bergantung kepada kod pelayar (JavaScript Web `setInterval`) di dalam Capacitor WebView. Apabila skrin telefon dipadamkan atau aplikasi berada di latar belakang, sistem operasi Android (Doze Mode / App Standby) membekukan pemprosesan web, menyebabkan azan gagal berbunyi atau berbunyi lewat. Selain itu, ketiadaan kebenaran `POST_NOTIFICATIONS` pada TargetSDK 33+ menyebabkan sebarang notifikasi disekat tanpa disedari.
- **Penyelesaian Asli (Android Native)**:
  - Membina **Plugin Asli Capacitor** (`AzanAlarmPlugin.java`) bersama **BroadcastReceiver** (`AzanAlarmReceiver.java`) dan **Perkhidmatan Latar Depan** (`AzanForegroundService.java`) yang memanfaatkan `AlarmManager.setExactAndAllowWhileIdle()`.
  - Mengemaskini `AndroidManifest.xml` dengan kebenaran rasmi Android 13/14+ bagi notifikasi dan penggera tepat.
  - Mengemaskini lapisan runtime TypeScript/React untuk menyegerakkan jadual 5 waktu solat harian terus ke dalam perkakasan `AlarmManager` telefon.

---

## 2. Pengalaman Pengguna & Reka Bentuk Visual (UX/UI)

### Aliran Pengguna (User Flow)
1. **Langkah 1 (Pelancaran Pertama)**:
   - Aplikasi memaparkan dialog kebenaran notifikasi Android 13+ (`POST_NOTIFICATIONS`) secara teratur bersama penerangan ringkas manfaat waktu solat.
   - Pengesanan kebenaran penggera tepat (`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`) bagi memastikan telefon tidak menyekat penggera.
2. **Langkah 2 (Tetapan & Suis Azan)**:
   - Pengguna memilih pilihan vokal azan rasmi (cth. Makkah, Madinah, JAKIM) dan menukar status suis notifikasi/azan.
   - Kod runtime menghantar senarai cap waktu (epoch timestamp) bagi 5 waktu solat (Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak) ke plugin `AzanAlarm`.
3. **Langkah 3 (Penggera Berbunyi & Skrin Penuh)**:
   - Tepat pada saat masuk waktu, `AlarmManager` membangunkan CPU telefon melalui `WakeLock`.
   - Audio azan berkumandang pada aras penggera sistem (`STREAM_ALARM`).
   - Skrin visual azan penuh (*Full-screen Intent*) dipaparkan dengan animasi alun gelombang suara, butang henti, dan paparan Doa Selepas Azan (Sunnah).

### Identiti Visual & Ergonomik Sentuhan (Touch Ergonomics)
- **Tema & Suasana**: Palet gelap kehijauan zaitun dan emas (`#0a120f` ke `#13221c`), berlatarkan aksen zamrud (`emerald-400`/`emerald-500`) dan ambar (`amber-300`).
- **Skrin Visual Azan Penuh**:
  - Zon sentuhan selesa minimum $48\text{px}$ bagi butang kawalan penggera ("Hentikan Azan" & "Tutup").
  - Tipografi solat yang jelas dengan teks seimbang (`text-wrap: balance`).
  - Tiada sebarang pill berlebihan atau kod mekanikal palsu, berpandukan piawaian reka bentuk antaramuka moden.

---

## 3. Keputusan Produk & Seni Bina Teknikal

### Keputusan 1: Penggunaan Android Native `AlarmManager` Berbanding Web Timer
- *Pendekatan Dipilih*: Menggunakan `AlarmManager.setExactAndAllowWhileIdle()` yang dijadualkan melalui kod Java asli Capacitor.
- *Rasional*: Android Doze Mode mematikan sebarang proses JavaScript/WebView apabila telefon tidur. Hanya penggera tepat sistem operasi yang dibenarkan membangunkan peranti dari mod tidur lena.
- *Ketahanan Booting*: Dilengkapi `BootReceiver` (`RECEIVE_BOOT_COMPLETED`) untuk menjadualkan semula penggera solat sekiranya telefon dihidupkan semula (restart).

### Keputusan 2: Saluran Audio `AudioAttributes.USAGE_ALARM` & Notifikasi Keutamaan Tinggi
- *Pendekatan Dipilih*: Membina `NotificationChannel` dengan aras kepentingan `IMPORTANCE_HIGH` / `IMPORTANCE_MAX` dengan penetapan `AudioAttributes.USAGE_ALARM`.
- *Rasional*: Membolehkan audio azan berbunyi pada saluran penggera jam telefon (*alarm volume stream*) dan mengabaikan sekatan mod senyap (*silent mode bypass*).

### Keputusan 3: Penyelarasan Kebenaran AndroidManifest (TargetSDK 33+)
- *Pendekatan Dipilih*: Memasukkan kebenaran deklaratif:
  - `android.permission.POST_NOTIFICATIONS` (Wajib untuk Android 13+)
  - `android.permission.SCHEDULE_EXACT_ALARM` & `android.permission.USE_EXACT_ALARM`
  - `android.permission.WAKE_LOCK` & `android.permission.RECEIVE_BOOT_COMPLETED`
  - `android.permission.FOREGROUND_SERVICE` & `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`
  - `android.permission.USE_FULL_SCREEN_INTENT`

---

## 4. Gambar Rajah Seni Bina Sistem (Architecture Diagram)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   APLIKASI SOLATKINI (REACT + TS)                      │
│                                                                        │
│   [PrayerDashboard]  ──►  [audioNotificationService]                   │
│          │                               │                             │
│          ▼                               ▼                             │
│   Semak Waktu Solat          [AzanBridge / Capacitor Native]          │
└──────────────────────────────────────────┬─────────────────────────────┘
                                           │ Permintaan Penjadualan Penggera
                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     LAPISAN ASLI ANDROID (JAVA)                        │
│                                                                        │
│   [AzanAlarmPlugin.java]                                               │
│            │ (Jadualkan 5 Waktu Solat ke OS)                           │
│            ▼                                                           │
│   [Android AlarmManager] (Exact & Allow While Idle)                    │
│            │                                                           │
│            │ (Apabila Tiba Waktu Solat)                                │
│            ▼                                                           │
│   [AzanAlarmReceiver.java] ──► Bangunkan CPU ([WakeLock])              │
│            │                                                           │
│            ├──► [AzanService.java] (Mainkan Audio STREAM_ALARM)        │
│            │                                                           │
│            └──► [NotificationManager]                                  │
│                   ├── Saluran Notifikasi Prioriti Tinggi (API 33+)     │
│                   └── Full-Screen Intent ──► [MainActivity] (Buka UI)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Komponen Yang Akan Dihasilkan & Dikemaskini

1. **Konfigurasi Android (`android/app/src/main/AndroidManifest.xml`)**:
   - Menambah semua senarai kebenaran Android 13+ (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, dsb.).
   - Mendaftarkan `AzanAlarmReceiver`, `AzanService`, dan `BootReceiver` dalam tag `<application>`.
   - Menetapkan atribut `android:showWhenLocked="true"` dan `android:turnScreenOn="true"` pada `MainActivity`.

2. **Lapisan Kod Asli Java (`android/app/src/main/java/com/solatkini/app/`)**:
   - `AzanAlarmPlugin.java`: Jambatan Capacitor untuk mendaftar penggera, memeriksa kebenaran notifikasi, dan menguji penggera serta-merta.
   - `AzanAlarmReceiver.java`: Penerima isyarat siaran penggera sistem operasi.
   - `AzanAudioService.java`: Memainkan audio vokal azan menggunakan `MediaPlayer` berasaskan saluran penggera (`STREAM_ALARM`).
   - `AzanBootReceiver.java`: Menjadualkan semula waktu solat apabila peranti dihidupkan semula.
   - `MainActivity.java`: Mendaftarkan `AzanAlarmPlugin.class` ke dalam Capacitor Bridge.

3. **Lapisan Runtime Web (`src/services/` & `src/App.tsx`)**:
   - `src/services/nativeAlarmService.ts`: Panggilan modular ke plugin asli Capacitor dengan fallback pelayar yang kemas.
   - Mengemaskini `src/App.tsx` & `src/components/PrayerDashboard.tsx` untuk memanggil semakan kebenaran `POST_NOTIFICATIONS` sebaik sahaja aplikasi dimuatkan.
   - Menyegerakkan jadual waktu solat harian secara automatik ke dalam `AlarmManager` setiap kali waktu solat dikira atau zon berubah.

---

## 6. Pelan Pengesahan (Verification Plan)

- [ ] **Semakan Sintaks & Pematuhan Kod**: Jalankan `npm run lint` dan `compile_applet` untuk memastikan tiada ralat TypeScript atau pembungkusan Vite.
- [ ] **Semakan AndroidManifest.xml**: Sahkan kehadiran `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, dan deklarasi komponen penerima siaran penggera.
- [ ] **Penyegerakan Capacitor**: Jalankan semakan konfigurasi agar kod asli Java dan pemalam terdaftar dengan betul pada fail `MainActivity.java`.
- [ ] **Ujian GitHub Actions**: Pastikan fail aliran kerja `.github/workflows/build-apk.yml` bersedia untuk membina fail APK tanpa sebarang halangan kod rahsia.
