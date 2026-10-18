# Panduan Kompilasi APK Android Menggunakan GitHub Actions

Aplikasi **SolatKini** telah dikonfigurasikan sepenuhnya dengan **Capacitor Android** dan fail aliran kerja **GitHub Actions (`.github/workflows/build-apk.yml`)**. Anda boleh mengkompil dan memuat turun fail APK Android siap pasang secara automatik dan percuma di GitHub.

---

## 1. Jaminan Keselamatan Anti-Harvesting Kunci API

Projek ini telah diperkukuh untuk keselamatan siber:
- **Seni Bina Sifar Kunci Rahsia (Zero-Secret Architecture)**: SolatKini menggunakan data terbuka JAKIM dan hisab falak tempatan tanpa memerlukan sebarang kunci API rahsia berbayar.
- **Penapisan Ketat `.gitignore`**: Semua fail `.env`, `.env.*`, sijil Android (`*.keystore`, `*.jks`, `*.key`), dan data peribadi disekat secara automatik daripada dimuat naik ke GitHub. Bot pengimbas tidak akan dapat mencuri sebarang kelayakan dari kod anda.

---

## 2. Langkah Muat Naik (Push) Kod ke GitHub

Sekiranya anda belum membuat repositori di GitHub:
1. Buka [github.com](https://github.com/) dan cipta repositori baharu (contoh: `solatkini-app`).
2. Di terminal komputer anda (dalam direktori projek ini):
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi SolatKini dengan Capacitor & GitHub Actions APK"
   git branch -M main
   git remote add origin https://github.com/<username-anda>/<nama-repo>.git
   git push -u origin main
   ```

---

## 3. Cara GitHub Membina APK Secara Automatik

Sebaik sahaja anda menolak (*push*) kod ke GitHub:
1. Buka repositori anda di GitHub dan klik pada tab **Actions**.
2. Anda akan melihat aliran kerja bernama **`Build SolatKini Android APK`** sedang berjalan secara automatik.
3. GitHub akan menyediakan persekitaran Linux, memasang Java JDK 21 LTS, Node.js 22 LTS, Android SDK, dan membina fail APK menggunakan Gradle dalam masa 2 hingga 4 minit.

> **Petua:** Anda juga boleh menjalankan binaan secara manual pada bila-bila masa:
> Klik tab **Actions** &rarr; pilih **Build SolatKini Android APK** &rarr; klik butang **"Run workflow"**.

---

## 4. Cara Memuat Turun Fail APK Siap Pasang

1. Pada tab **Actions**, klik pada binaan terkini yang bertanda hijau (**✓**).
2. Skrol ke bahagian bawah halaman ke seksyen **Artifacts**.
3. Klik pada artifak **`SolatKini-Android-APK`** untuk memuat turun fail zip.
4. Ekstrak fail zip tersebut, dan anda akan mendapati fail pemasangan Android:
   **`app-debug.apk`**
5. Pindahkan fail `.apk` ke telefon pintar anda dan pasang (*Install*) seperti biasa.

---

## 5. Penyelesaian Ralat: "Dependencies lock file is not found"

Jika anda melihat ralat:
`Dependencies lock file is not found in /home/runner/work/SolatKini-Malaysia/SolatKini-Malaysia. Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock`

Punca ralat ini berlaku kerana GitHub Actions sebelum ini mencari fail `package-lock.json` untuk pengoptimuman *cache* NPM, namun fail tersebut belum dijana/dimuat naik ke repositori.

**Tindakan pembetulan yang telah dilakukan:**
1. Fail `package-lock.json` rasmi telah dijana dan sedia di dalam folder projek.
2. Aliran kerja `.github/workflows/build-apk.yml` telah dikemas kini untuk melupuskan sekatan ketat *cache* `setup-node`, dan menggunakan fallback pintar (`if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi`).
3. Anda hanya perlu membuat *commit* dan *push* fail terkini ke GitHub:
   ```bash
   git add .
   git commit -m "Fix: Tambah package-lock.json dan kemas kini workflow APK"
   git push origin main
   ```
   Binaan di tab **Actions** akan terus lulus tanpa sebarang ralat lagi!

---

## 6. Penyelesaian Ralat: "Failed to find package 'tools' / sdkmanager exit code 1"

Punca ralat ini berlaku kerana tindakan pihak ketiga `android-actions/setup-android@v3` cuba memasang pakej lapuk `tools` yang sudah tidak disokong pada pelari moden GitHub Actions. Selain itu, pelari `ubuntu-latest` sebenarnya telah pun mempunyai Android SDK terbina yang lengkap.

**Penyelesaian yang telah dikemas kini:**
1. Aliran kerja kini menggunakan Android SDK terbina pelari GitHub secara terus tanpa memerlukan tindakan lapuk pihak ketiga.
2. Skrip pengesahan lesen automatik (`yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses || true`) dijalankan secara automatik.
3. Menggunakan Java JDK 17 Temurin yang disyorkan oleh Gradle dan Google.
4. Tolak fail terkini ke GitHub menggunakan:
   ```bash
   git add .
   git commit -m "Fix: Workflow GitHub Actions Android SDK sedia ada & auto-lesen"
   git push origin main
   ```

---

## 7. Penyelesaian Ralat: "[fatal] The Capacitor CLI requires NodeJS >=22.0.0"

Punca ralat ini berlaku kerana versi Capacitor 8.x (`@capacitor/cli: ^8.5.3`) mewajibkan persekitaran Node.js sekurang-kurangnya versi **22.0.0 (LTS)**.

**Penyelesaian yang telah dikemas kini:**
- Langkah 2 pada `.github/workflows/build-apk.yml` telah dinaik taraf kepada `node-version: 22`.
- Jalankan arahan *push* ini ke repositori anda:
  ```bash
  git add .
  git commit -m "Fix: Kemas kini Node.js kepada v22 untuk Capacitor CLI 8"
  git push origin main
  ```

---

## 8. Penyelesaian Ralat: "Execution failed for task ':capacitor-android:compileDebugJavaWithJavac' > error: invalid source release: 21"

Punca ralat ini berlaku kerana modul **Capacitor 8 Android** (`@capacitor/android: ^8.5.3`) telah dikonfigurasikan dengan piawaian kod sumber Java 21 (`sourceCompatibility = JavaVersion.VERSION_21`). Apabila GitHub Actions menggunakan Java JDK 17, pengkompil `javac` Java 17 menolak kod tersebut kerana tidak menyokong versi sasaran 21.

**Penyelesaian yang telah dikemas kini:**
- Langkah 6 dalam `.github/workflows/build-apk.yml` telah dinaik taraf daripada `java-version: '17'` kepada **`java-version: '21'`** (Temurin JDK 21 LTS).
- Tolak perubahan ini ke GitHub menggunakan arahan:
  ```bash
  git add .
  git commit -m "Fix: Naik taraf JDK kepada Java 21 LTS untuk menyokong Capacitor 8"
  git push origin main
  ```

---

## 9. Penambahbaikan Versi APK Terkini: Ikon Rasmi, Audio Tempatan & Widget

Kemaskini terbaharu merangkumi pembaikan menyeluruh:
1. **Ikon Aplikasi Native Android**: Ikon rasmi hijau zamrud bulan sabit dan kubah masjid SolatKini kini dijana secara automatik ke dalam semua resolusi Android (`mipmap-mdpi` hingga `mipmap-xxxhdpi`) serta warna latar belakang `#0a1a14`. Tiada lagi ikon templat Capacitor atau ikon robot Android.
2. **7 Koleksi Audio Azan 100% Tempatan**: Ketiga-tiga fail azan yang sebelum ini gagal dimuat turun (*failed to fetch*) iaitu **Mishary Al-Afasy**, **Azan Subuh**, dan **Takbir Hari Raya** kini telah dimuat turun dan dibundelkan terus ke dalam folder `public/audio/azan/` dan aset Android APK. Ia sedia dimainkan 100% luar talian tanpa isu sambungan atau sekatan CORS!
3. **Widget Skrin Utama Native & Mod Jam Meja (AOD)**: Disediakan `SolatWidgetProvider` rasmi Android bersama susun atur waktu solat 5 waktu, serta fungsi **Mod Jam Meja Skrin Penuh (Always-On Display)** dengan sokongan *Screen Wake Lock* untuk telefon di atas meja.
4. **Pembersihan Mod PWA**: Segala rujukan lapuk berkaitan PWA/PWABuilder telah dikeluarkan dan digantikan dengan pengalaman aplikasi Android (APK) sepenuhnya.

---

## 10. Penyelesaian Suis Notifikasi Kelabu (Greyed Out) & Kebenaran Android 13/14 (TargetSDK 33+)

### Mengapa Suis Notifikasi Pernah Menjadi Kelabu?
Pada Android 8.0 hingga Android 14+, sistem Android akan mematikan suis notifikasi atau tidak memaparkan sebarang kategori sekiranya aplikasi belum mendaftarkan **NotificationChannel** sebaik sahaja aplikasi dimulakan. 

Kini kod telah dikemaskini sepenuhnya:
1. **Pendaftaran Automatik Saluran (`SolatKiniApplication.java`)**: 
   Dua saluran rasmi iaitu **Penggera Azan SolatKini** (prioriti maksima, saluran penggera USAGE_ALARM) dan **Peringatan Waktu Solat** didaftarkan terus ke sistem operasi Android sebaik aplikasi dibuka.
2. **Permintaan Kebenaran Segera (`POST_NOTIFICATIONS`)**: 
   Dialog sistem meminta kebenaran notifikasi dipanggil secara langsung melalui `ActivityCompat` pada waktu pelancaran.
3. **Butang Pintas Tetapan Notifikasi**: 
   Di dalam aplikasi (pada panel Waktu Solat & Tetapan Muadzin), disediakan butang **"Tetapan Notifikasi Telefon"** untuk membawa anda terus ke halaman tetapan notifikasi sistem.

### Langkah Tambahan Jika Telefon Menunjukkan "Tetapan Terhad" (Restricted Settings)
Bagi telefon Android 13 dan 14 ke atas, sebarang fail APK yang dipasang di luar Google Play Store (sideload) kadang-kala disekat sementara oleh ciri keselamatan Android:
1. Buka **Tetapan Telefon (Settings) &rarr; Aplikasi (Apps) &rarr; SolatKini**.
2. Jika suis bertulis *"Restricted setting / Tetapan terhad"*, tekan **ikon 3 titik di bucu atas kanan**.
3. Pilih **"Allow restricted settings" (Benarkan tetapan terhad)** dan sahkan menggunakan cap jari atau PIN telefon anda.
4. Suis notifikasi kini aktif dan sedia dibuka sepenuhnya!
