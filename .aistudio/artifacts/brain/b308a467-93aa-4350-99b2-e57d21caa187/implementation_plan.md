# Pelan Pelaksanaan: Widget Notifikasi Tetap 5 Waktu Solat (Ongoing Android Notification)

Ciri ini meletakkan satu bar notifikasi kekal (*ongoing / persistent notification*) pada kawasan notifikasi (*notification tray/shade*) telefon pintar pengguna yang memaparkan kesemua 5 waktu solat fardhu (Subuh, Zohor, Asar, Maghrib, Isyak) secara langsung, menonjolkan solat seterusnya serta kiraan masa, dan menyediakan suis kawalan hidup/mati di halaman Tetapan aplikasi SolatKini.

---

## Keputusan Semakan Pengguna & Spesifikasi Disahkan

> [!IMPORTANT]
> Berdasarkan jawapan anda dalam sesi pengesahan keperluan, spesifikasi pelaksanaan adalah seperti berikut:
> - **Format Paparan**: Bar padat kesemua 5 waktu solat dalam satu baris kemas berserta penonjolan (*indicator*) solat seterusnya dan kiraan masa berbaki.
> - **Status Permulaan**: Diaktifkan secara automatik (*Enabled by default*) sebaik aplikasi dipasang, dengan suis hidup/mati disediakan di bahagian Tetapan.
> - **Tindakan Pintas (*Action Buttons*)**: 
>   1. Butang **"Buka SolatKini"** (membuka aplikasi ke paparan utama)
>   2. Butang **"Segerak Waktu"** (mengemas kini waktu solat daripada e-Solat JAKIM tanpa perlu membuka skrin penuh)

---

## 1. Gambaran Keseluruhan & Konsep Teras

### Apa Yang Dilakukan
- Memaparkan notifikasi Android berstatus `ONGOING` (tidak boleh disapu/dipadam secara tidak sengaja oleh pengguna) di *status bar* telefon.
- Notifikasi memaparkan:
  - **Tajuk / Status Semasa**: Zon semasa (cth. `WLY01 - Kuala Lumpur`), waktu solat semasa/seterusnya dan baki masa.
  - **Jadual 5 Waktu Padat**: Baris kemas: `Subuh 05:54 | Zohor 13:06 | Asar 16:18 | Maghrib 19:04 | Isyak 20:15` dengan penanda khas `[●]` atau warna pada solat seterusnya.
  - **Dua Butang Pintas**: *Buka Aplikasi* dan *Segerak Waktu*.
- Berfungsi secara luar talian (*offline-first*) menggunakan data waktu solat yang telah disimpan dalam memori aplikasi.

### Sasaran Pengguna
- Pengguna yang ingin menyemak kesemua 5 waktu solat harian mereka dengan sepintas lalu (*glanceable*) hanya dengan menurunkan tetingkap notifikasi tanpa perlu membuka aplikasi atau ke skrin utama.

---

## 2. Pengalaman Pengguna & Reka Bentuk Visual

### Aliran Pengguna (*User Flow*)
1. **Paparan Tetapan (*Settings View*)**:
   - Di bahagian tetapan notifikasi aplikasi, ditambah kad kawalan:
     - **Ikon & Tajuk**: `Notifikasi Tetap Waktu Solat (Bar Status)`
     - **Penerangan**: *Paparkan kesemua 5 waktu solat harian secara berterusan pada tetingkap notifikasi telefon anda.*
     - **Suis Toggle (*Switch*)**: Aktifkan atau nyahaktifkan ciri ini bila-bila masa.
     - **Pilihan Kemas Kini**: Butang manual *"Kemas Kini Bar Notifikasi Sekarang"*.
2. **Kawasan Notifikasi Telefon (*Android Notification Shade*)**:
   - Ikon kubah/bulan sabit SolatKini kekal di *status bar*.
   - Apabila ditarik ke bawah:
     - Baris 1: `SolatKini · Zon WLY01 (Kuala Lumpur)`
     - Baris 2 (Sorotan): `Seterusnya: Asar 04:18 PM (dalam 1j 24m)`
     - Baris 3 (Semua 5 Waktu):
       `Subuh 05:54  |  Zohor 13:06  |  ▶ Asar 16:18  |  Maghrib 19:04  |  Isyak 20:15`
     - Baris Tindakan: `[ Buka SolatKini ]` `[ ↻ Segerak Waktu ]`

---

## 3. Seni Bina Teknikal & Pelaksanaan

### Rajah Aliran Seni Bina Sistem
```
┌─────────────────────────────────────────────────────────────┐
│                    Aplikasi Web / React UI                  │
│                                                             │
│  ┌───────────────────────┐       ┌────────────────────────┐ │
│  │ Suis Tetapan Notifikasi│ ───> │ PrayerDashboard / State│ │
│  │ (persistentNotif: true)│       │  (prayerTimes, zone)   │ │
│  └───────────────────────┘       └───────────┬────────────┘ │
└──────────────────────────────────────────────┼──────────────┘
                                               │ (Capacitor Bridge)
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Pemalam Android (SolatWidgetPlugin)           │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Native Method: updatePersistentNotification(...)        │ │
│  │ Native Method: cancelPersistentNotification()          │ │
│  └───────────────────────────┬────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Android System Notification Manager           │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Saluran Khas: solatkini_persistent_channel (LOW imp.)  │ │
│  │ - Tidak membunyikan loceng berulang kali                │ │
│  │ - setOngoing(true) & setOnlyAlertOnce(true)            │ │
│  │ - BigTextStyle / Inset Bar 5 Waktu Solat               │ │
│  │ - PendingIntent Buka Aplikasi & Segerak Waktu          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Komponen Teknikal Yang Akan Dilaksanakan:
1. **Saluran Notifikasi Android Khas (`SolatKiniApplication.java`)**:
   - Didaftarkan saluran notifikasi berasingan: `solatkini_persistent_channel` dengan `IMPORTANCE_LOW` supaya tidak mengganggu atau membunyikan deringan berulang kali setiap kali waktu dikemas kini.
2. **Kaedah Native Android (`SolatWidgetPlugin.java` & `SolatWidgetProvider.java`)**:
   - Menambah fungsi penjanaan notifikasi berterusan `NotificationCompat.Builder`:
     - `setOngoing(true)` (mengelakkan daripada dipadam dengan *Clear All*).
     - Menghuraikan 5 waktu solat harian dalam format teks yang kemas dan berstruktur.
     - Menyediakan `PendingIntent` untuk butang tindakan pantas.
3. **Penyambung TypeScript (`widgetService.ts` / `nativeAlarmService.ts`)**:
   - Menyediakan fungsi `syncPersistentNotification(prayerTimes, zone, enabled)` untuk diseru apabila data waktu solat berubah atau apabila suis diubah.
4. **Antaramuka Pengguna (*UI Setting Switch*)**:
   - Menambah suis kawalan `persistentNotification` dalam `AppNotificationSettings` di `PrayerDashboard.tsx`.
   - Mengurus penyimpanan pilihan pengguna dalam `localStorage` (`solatkini_notif_settings`).

---

## 4. Pelan Pengesahan & Pengujian
- **Semakan Kompilasi**: Menjalankan binaan `npm run build && npx cap sync android` dan `compile_applet`.
- **Semakan Logik Suis**: Memastikan apabila suis dimatikan, notifikasi serta-merta dikeluarkan dari tetingkap telefon (`cancelPersistentNotification`), dan apabila dihidupkan, notifikasi muncul semula dengan waktu solat terkini.
