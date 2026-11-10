# Pelan Pembaikan: Penyelarasan Audio Azan pada Saluran Penggera (STREAM_ALARM)

## 1. Analisis Punca Masalah (Selesai)
- [x] Punca audio dilaungkan pada saluran media (STREAM_MUSIC) dikenal pasti daripada ketiadaan penetapan `STREAM_ALARM` dan penggunaan `CONTENT_TYPE_SONIFICATION` tanpa `FLAG_AUDIBILITY_ENFORCED`.
- [x] Pengasingan saluran audio webview HTML5 agar tidak bertindih dengan audio perkhidmatan natif Android.

## 2. Pelaksanaan Perubahan Kod (Selesai)
- [x] **`AzanAudioService.java`**:
  - Konfigurasi `AudioAttributes` rasmi dengan `.setUsage(AudioAttributes.USAGE_ALARM)`, `.setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)`, dan `.setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)`.
  - Panggilan `mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM)` dipulihkan bagi keserasian penuh pemacu audio HAL (Samsung, Xiaomi, Vivo, Oppo).
  - Peningkatan automatik aras kelantangan saluran penggera `STREAM_ALARM` ke 80% had maksimum sekiranya kelantangan semasa berada di bawah tahap tersebut.
  - Tuntutan fokus audio sistem eksklusif `AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE` pada saluran penggera.
- [x] **`audioNotificationService.ts`**:
  - Menyemak `nativeAlarmService.getIsNative()` di mana bagi peranti Android Native, audio dikendalikan sepenuhnya oleh `AzanAudioService` (saluran penggera) bagi mengelakkan audio HTML5 berbunyi pada saluran media.
- [x] **`AzanAlarmReceiver.java`**:
  - Memastikan servis berjalan di latar belakang dengan selamat tanpa memaksa pembukaan skrin aktiviti.

## 3. Ujian & Pengesahan
- [x] `compile_applet` berjaya tanpa sebarang ralat.
- [x] `lint_applet` (`tsc --noEmit`) lulus bersih.
- [x] Binaan web produksi (`npm run build`) siap dibina dengan lancar.
