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
3. GitHub akan menyediakan persekitaran Linux, memasang Java JDK 17, Android SDK, dan membina fail APK menggunakan Gradle dalam masa 2 hingga 4 minit.

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
