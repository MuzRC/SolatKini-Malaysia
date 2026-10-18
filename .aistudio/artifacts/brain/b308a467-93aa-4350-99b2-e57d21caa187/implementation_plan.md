# Pelan Pelaksanaan: Memperbaiki Isu Notifikasi Kelabu (Greyed Out) Dalam Tetapan Sistem Android (App Info)

Pelan ini menggariskan penyelesaian khusus bagi mengatasi masalah suis notifikasi yang dimalapkan (*greyed out*) dalam Tetapan Telefon Android (**App Info -> Notifications**) dengan mendaftarkan saluran notifikasi (*Notification Channels*) secara rasmi pada peringkat permulaan aplikasi (**Application Class**), mencetuskan dialog kebenaran `POST_NOTIFICATIONS` secara langsung, dan memastikan sistem operasi Android mengiktiraf aplikasi sebagai pengeluar notifikasi aktif.

---

## Keputusan Kritikal & Maklum Balas Pengguna

> [!IMPORTANT]
> **Punca Utama Masalah Dikenalpasti**:
> Pada sistem operasi Android 8.0 hingga 14+ (TargetSDK 33+), suis notifikasi dalam Tetapan Telefon (*App Info*) akan dimalapkan (*greyed out*) atau menyatakan *"Tiada kategori notifikasi didaftarkan"* sekiranya aplikasi belum mendaftarkan `NotificationChannel` ke dalam sistem Android sebaik sahaja aplikasi dipasang. Sebelum ini, saluran notifikasi hanya dibina di dalam `AzanAudioService` yang belum dimulakan semasa aplikasi baru dipasang.

- **Keputusan 1**: Mewujudkan kelas `SolatKiniApplication.java` (`android.app.Application`) untuk mendaftarkan semua saluran notifikasi (`solatkini_azan_channel`, `solatkini_reminder_channel`) secara serta-merta pada saat pertama aplikasi dilancarkan (`Application.onCreate()`).
- **Keputusan 2**: Menguatkuasakan pencetusan dialog kebenaran `POST_NOTIFICATIONS` secara langsung melalui `ActivityCompat.requestPermissions()` di dalam `MainActivity.onCreate()` dan melalui pemalam Capacitor `AzanAlarmPlugin`.
- **Keputusan 3**: Menyediakan butang pintas *"Buka Tetapan Notifikasi Sistem"* di dalam aplikasi yang membuka halaman `Settings.ACTION_APP_NOTIFICATION_SETTINGS` peranti secara terus sekiranya pengguna ingin memeriksa status atau mengaktifkannya secara manual.

---

## 1. Gambaran Keseluruhan & Konsep Teras

- **Masalah Pengguna**: Pengguna memasang fail APK hasil binaan GitHub, namun apabila memeriksa tetapan notifikasi telefon di *App Info*, suis notifikasi didapati kelabu (*greyed out*) dan tidak boleh dihidupkan.
- **Penyelesaian**:
  1. **Pendaftaran Awal Peringkat Aplikasi (`SolatKiniApplication`)**: Membina kelas `SolatKiniApplication` dan mendaftarkannya pada tag `<application android:name=".SolatKiniApplication">` dalam `AndroidManifest.xml`.
  2. **Penciptaan Pelbagai Saluran Notifikasi**:
     - `solatkini_azan_channel`: Saluran Prioriti Tertinggi (`IMPORTANCE_HIGH` / `IMPORTANCE_MAX`) khas untuk laungan Azan dengan bypass mod senyap.
     - `solatkini_reminder_channel`: Saluran Peringatan Masuk Waktu Solat (`IMPORTANCE_DEFAULT`).
  3. **Pencetus Dialog Kebenaran Android 13+ Asli**: Memanggil dialog sistem `POST_NOTIFICATIONS` tanpa berlengah pada kali pertama aplikasi dibuka.

---

## 2. Pengalaman Pengguna & Reka Bentuk Visual (UX/UI)

- **Semasa Pelancaran Pertama**:
  - Dialog sistem Android 13+ bertajuk *"Allow SolatKini to send you notifications?"* akan muncul serta-merta.
- **Dalam Tetapan Sistem Telefon (App Info)**:
  - Suis notifikasi tidak lagi kelabu.
  - Senarai kategori saluran notifikasi akan terpapar dengan jelas:
    - *Penggera Azan SolatKini (Audio & Skrin Penuh)*
    - *Peringatan Waktu Solat*
- **Dalam Tetapan Azan Aplikasi**:
  - Status notifikasi sistem dipaparkan secara jelas (Dibenarkan / Perlu Diaktifkan).
  - Butang *"Buka Tetapan Notifikasi Telefon"* disediakan bagi memudahkan akses pantas.

---

## 3. Seni Bina Teknikal & Perubahan Kod

### Gambar Rajah Aliran Pendaftaran Saluran Notifikasi

```
┌────────────────────────────────────────────────────────┐
│             APLIKASI DIBUKA KALI PERTAMA               │
│                                                        │
│            [SolatKiniApplication.java]                 │
│                         │                              │
│                         ▼                              │
│         Daftar Notification Channels ke OS             │
│        (solatkini_azan_channel & reminder)             │
│                         │                              │
│                         ▼                              │
│             [Tetapan Telefon Android]                  │
│       Suis AKTIF serta-merta (Tiada lagi kelabu!)      │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                 [MainActivity.java]                    │
│                         │                              │
│                         ▼                              │
│          Panggil Dialog POST_NOTIFICATIONS             │
│            (ActivityCompat.requestPermissions)         │
│                         │                              │
│                         ▼                              │
│         Pengguna Tekan "Allow / Benarkan"              │
└────────────────────────────────────────────────────────┘
```

---

## 4. Komponen Yang Akan Dihasilkan & Dikemaskini

1. **`android/app/src/main/java/com/solatkini/app/SolatKiniApplication.java` (BARU)**:
   - Kelas `Application` rasmi yang mencipta `NotificationChannel` lengkap dengan `AudioAttributes.USAGE_ALARM`, getaran, dan penglihatan skrin kunci sebaik sahaja proses aplikasi dimulakan oleh Android.
2. **`android/app/src/main/AndroidManifest.xml`**:
   - Menambah `android:name=".SolatKiniApplication"` ke dalam tag `<application>`.
3. **`android/app/src/main/java/com/solatkini/app/MainActivity.java`**:
   - Menambah logik semakan dan pencetusan kebenaran `POST_NOTIFICATIONS` secara langsung menggunakan `ActivityCompat`.
4. **`android/app/src/main/java/com/solatkini/app/AzanAlarmPlugin.java`**:
   - Menambah kaedah `openSystemNotificationSettings()` untuk melancarkan `Settings.ACTION_APP_NOTIFICATION_SETTINGS`.
5. **`src/services/nativeAlarmService.ts` & `src/components/PrayerDashboard.tsx`**:
   - Menyediakan butang interaktif untuk melancarkan tetapan notifikasi sistem telefon sekiranya diperlukan oleh pengguna.

---

## 5. Pelan Pengesahan (Verification Plan)

- [ ] Pastikan `SolatKiniApplication.java` wujud dan didaftarkan dalam `AndroidManifest.xml`.
- [ ] Sahkan bahawa saluran notifikasi `solatkini_azan_channel` didaftarkan ke `NotificationManager` pada tahap `Application.onCreate()`.
- [ ] Uji kompilasi dengan `npm run lint` dan `compile_applet`.
- [ ] Jalankan `npx cap sync android` untuk memastikan konfigurasi terkini disegerakkan ke direktori Android.
