# Pelan Pelaksanaan: Capacitor Android, GitHub Actions APK & Perlindungan Keselamatan Anti-Harvesting Kunci API

Pelan ini menggariskan pembangunan pembungkusan **Capacitor Android**, penyediaan aliran kerja **GitHub Actions CI/CD** untuk menjana fail APK siap pasang secara automatik, dan penguatkuasaan **keselamatan siber anti-harvesting** bagi memastikan tiada sebarang kunci API atau kelayakan sulit boleh dicuri oleh bot atau penggodam apabila kod ditolak ke GitHub.

---

## 1. Strategi Keselamatan Anti-Harvesting Kunci API (Zero-Secret Architecture)

Bot penggodam (*scanners/crawlers*) di GitHub sering menyasarkan repositori awam untuk mengekstrak kunci API yang terdedah secara tidak sengaja. Bagi melindungi repositori ini 100%:

1. **Seni Bina Sifar Kunci Rahsia (Zero-Secret Architecture)**:
   - Aplikasi SolatKini direka khusus menggunakan **Data Terbuka Rasmi JAKIM** dan kaedah hisab falak matematik tempatan yang **tidak memerlukan sebarang kunci rahsia persendirian atau token berbayar**.
   - Memastikan tiada kod sumber yang memegang rentetan bernilai sulit (`AIzaSy...`, token autentikasi, atau rahsia pelayan).
2. **Pengukuhan Penapisan Ketat `.gitignore`**:
   - Menyekat secara menyeluruh sebarang fail konfigurasi persekitaran peribadi:
     - `.env*` (termasuk `.env.local`, `.env.production`)
     - Fail sijil kekunci Android: `*.keystore`, `*.jks`, `*.p12`, `*.pem`, `*.key`
     - Fail servis awan: `google-services.json`
     - Direktori cache Gradle: `android/.gradle/`, `android/app/build/`
     - Direktori IDE: `.idea/`, `*.iml`, `.vscode/`
3. **Penyelarasan Kod Selamat untuk GitHub**:
   - Pembersihan sebarang rujukan placeholder yang boleh mencetuskan amaran palsu (*false positive*) oleh pengimbas rahsia GitHub.

---

## 2. Struktur Projek Capacitor Android

1. **Pakej Rasmi Capacitor**:
   - `@capacitor/core`, `@capacitor/cli`, dan `@capacitor/android`.
2. **Konfigurasi `capacitor.config.json`**:
   - `appId: "com.solatkini.app"`
   - `appName: "SolatKini"`
   - `webDir: "dist"`
   - `server: { "androidScheme": "https" }`
3. **Projek Asli `android/`**:
   - Direktori Android lengkap dengan fail `build.gradle` dan Gradle wrapper (`gradlew`).
   - `AndroidManifest.xml` dengan kebenaran yang sah:
     - `android.permission.INTERNET`
     - `android.permission.VIBRATE`
     - `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`

---

## 3. Aliran Kerja Automatik GitHub Actions (`.github/workflows/build-apk.yml`)

1. **Pencetus (*Trigger*)**:
   - `push` ke branch utama (`main` atau `master`).
   - `workflow_dispatch` (membolehkan pengguna menekan butang *"Run workflow"* secara manual pada bila-bila masa di GitHub).
2. **Langkah-Langkah Binaan Maya**:
   - Pelayan maya: `ubuntu-latest`.
   - Memasang persekitaran **Java JDK 17** (Zulu).
   - Memasang Node.js 20 & kebergantungan aplikasi (`npm ci` / `npm install`).
   - Membina aplikasi web React + Vite (`npm run build`).
   - Melakukan sinkronisasi Capacitor (`npx cap sync android`).
   - Mengkompil fail APK menggunakan Gradle: `cd android && ./gradlew assembleDebug`.
   - Memuat naik fail APK hasil binaan sebagai artifak bernama **`SolatKini-Android-APK`** (`app-debug.apk`). Pengguna boleh memuat turun fail ini terus dari tab Actions.

---

## 4. Panduan Penggunaan Lengkap (`PANDUAN_GITHUB_APK.md`)

- Panduan langkah demi langkah:
  1. Cara membuat repositori baharu di GitHub.
  2. Cara memuat naik kod dengan git tanpa risiko kebocoran kunci.
  3. Cara memuat turun fail APK terus dari tab Actions ke telefon pintar.

---

## 5. Pelan Pengesahan (Verification Plan)
- [ ] Pemeriksaan keselamatan kod: Pastikan 0 kunci rahsia terdedah dalam kod sumber.
- [ ] Penapisan `.gitignore` diuji dan disahkan menyekat semua fail `.env`, kekunci, dan cache binaan.
- [ ] Pakej Capacitor dipasang dan `capacitor.config.json` sah.
- [ ] Folder projek asli `android/` wujud dan lengkap dengan `AndroidManifest.xml` serta Gradle scripts.
- [ ] Fail `.github/workflows/build-apk.yml` disahkan sintaksnya mengikut piawaian GitHub Actions v4.
- [ ] Pemeriksaan kod dengan `lint_applet` dan binaan dengan `compile_applet` berjaya sepenuhnya.
