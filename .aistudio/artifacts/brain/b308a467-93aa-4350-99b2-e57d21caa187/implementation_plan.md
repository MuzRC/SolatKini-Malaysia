# Pelan Pelaksanaan: Carta Kemajuan Puasa Visual (Recharts)

Carta kemajuan visual untuk penjejakan puasa telah berjaya diintegrasikan ke dalam komponen `FastingTracker` menggunakan pustaka **Recharts**.

## 1. Pemasangan Pustaka
- [x] Pemasangan pakej rasmi `recharts` ke dalam projek (`package.json`).

## 2. Reka Bentuk & Ciri-Ciri Carta Kemajuan
- [x] **Tab Dwimod Pilihan**:
  - **Puasa Ramadan**: Analisis fasa 30 hari Ramadan (Fasa Rahmat, Maghfirah, dan Pelepasan Api Neraka).
  - **Puasa Sunat & Qadha**: Analisis kemajuan puasa sunat (Isnin/Khamis, Ayyamul Bidh/Hari Putih, Puasa Ganti Qadha, dan Sunat-sunat Lain).
- [x] **Carta Visual Recharts**:
  - **Mingguan Ramadan (BarChart)**: Perbandingan Hari Selesai vs Sasaran Hari mengikut 4 minggu Ramadan.
  - **Gelang Donut Ramadan (PieChart)**: Peratusan kadar kejayaan puasa keseluruhan dengan penunjuk baki hari.
  - **Kategori Puasa Sunat (BarChart)**: Visualisasi perbandingan Selesai vs Sasaran bagi Isnin & Khamis, Ayyamul Bidh, Qadha, dan Sunat Lain.
  - **Taburan Puasa Sunat (PieChart)**: Pembahagian pecahan jenis puasa sunat yang disempurnakan.
- [x] **Interaktiviti & Ketahanan Data**:
  - Grid interaktif 30 petak hari Ramadan (boleh klik untuk tanda/nyah-tanda).
  - Butang pantas `+` dan `-` untuk log amalan puasa sunat dengan animasi perubahan carta masa nyata.
  - Penyelarasan terus dengan rekod Puasa Ganti (Qada').
  - Penyimpanan automatik setempat (`localStorage`).

## 3. Verifikasi & Kualiti Kod
- [x] Tiada sebarang ralat sintaks atau TypeScript (`tsc --noEmit` bersih).
- [x] Kompilasi projek berjaya (`compile_applet` lulus).
