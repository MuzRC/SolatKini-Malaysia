# Pelan Pembaikan: Pengoptimuman Peranti WiFi (Tanpa SIM), Pembetulan Waktu Asar & Pertindihan Audio

Pelan ini dikemas kini khas untuk peranti telefon lama yang **tiada kad SIM dan hanya bergantung kepada sambungan WiFi**. Tanpa kad SIM, peranti tidak menerima penyelarasan masa rangkaian selular (NITZ) dan kerap beroperasi dalam keadaan luar talian (*offline*).

---

## 1. Analisis & Keperluan Utama

1. **Pembetulan Waktu Solat Asar**:
   - **Hisab Falak Luar Talian (`prayerCalculator.ts`)**: Formula hour angle sebelum ini menganggap altitud matahari Asar sebagai negatif di bawah ufuk, menghasilkan waktu Asar tidak munasabah **22:24 (10:24 malam)**. Formula perlu diperbetulkan kepada altitud positif $\text{asrAlt}$ Mazhab Syafi'i agar menghasilkan **~16:15 petang**.
   - **Kunci Zon Masa Malaysia UTC+8 (`prayerService.ts`)**: Mengelakkan waktu solat dipengaruhi oleh tetapan jam peranti atau zon masa lalai peranti tanpa SIM (seperti UTC atau waktu luar negara).
2. **Penyimpanan Cache 30 Hari Penuh Semasa Ada WiFi**:
   - Memandangkan peranti hanya menggunakan WiFi, setiap kali sambungan WiFi tersedia, sistem akan menyimpan jadual waktu solat bagi **seluruh bulan (30/31 hari)** zon aktif ke dalam memori peranti (`localStorage`).
   - Apabila WiFi dimatikan, aplikasi tetap menyajikan waktu solat rasmi JAKIM 100% tepat bagi setiap hari tanpa perlu bergantung kepada pengiraan luar talian.
3. **Pencegahan Pertindihan Audio Azan**:
   - Menghapuskan keadaan perlumbaan asinkron (*async race condition*) dalam `playAzan` menggunakan pengenalan sesi aktif (`playSessionId`).
   - Menghentikan audio sedia ada serta-merta apabila pengguna menekan kad pilihan muadzin atau butang 'Guna Untuk Azan Telefon'.

---

## 2. Pelan Tindakan & Perubahan Kod

### Bahagian A: Pembetulan Formula Asar & Kunci Zon Masa UTC+8
1. **`src/utils/prayerCalculator.ts`**:
   - Tambah formula altitud positif bagi Asar:
     $$\cos(\text{HA}) = \frac{\sin(\text{asrAlt}) - \sin(\text{lat})\sin(\text{dec})}{\cos(\text{lat})\cos(\text{dec})}$$
   - Pastikan waktu Asar yang dikira berada dalam lingkungan **16:15 - 16:25 petang**.
2. **`src/services/prayerService.ts`**:
   - Paksa penukaran timestamp e-Solat ke zon masa `Asia/Kuala_Lumpur` (UTC+8) menggunakan parameter `timeZone: 'Asia/Kuala_Lumpur'` atau anjakan UTC+8 tetap (+28,800 saat).

---

### Bahagian B: Penyimpanan Automatik 30 Hari Penuh (WiFi-First Offline Sync)
1. **`src/services/prayerService.ts`**:
   - Semasa sambungan internet/WiFi tersedia dan API mengembalikan senarai solat bulanan (`data.prayers` 30 hari):
     - Simpan data hari semasa ke paparan utama.
     - Simpan keseluruhan 30 hari ke dalam simpanan tempatan mengikut format: `solatkini_prayer_times_${zone}_${dateStr}`.
     - Tambah fungsi sandaran pintar: Jika hari semasa offline, semak cache 30 hari terlebih dahulu sebelum beralih ke hisab falak.
   - Sediakan penunjuk visual status cache 30 hari (cth: *"Jadual 30 Hari Tersimpan di Memori"*).

---

### Bahagian C: Penghapusan Pertindihan Audio Azan
1. **`src/services/audioNotificationService.ts`**:
   - Tambah pembolehubah `private currentPlaySessionId = 0`.
   - Di permulaan `playAzan(voice)`:
     - Jana `sessionId = ++this.currentPlaySessionId`.
     - Hentikan audio aktif sebelumnya serta-merta (`stopAudio()`).
   - Selepas proses `await audioStorageService.getAudioBlob(...)`:
     - Periksa sama ada `this.currentPlaySessionId === sessionId`. Jika tidak sama (kerana pengguna telah menekan pilihan lain), batalkan sesi serta-merta dan jangan mainkan audio lapuk tersebut.
2. **`src/components/PrayerDashboard.tsx`**:
   - Di dalam `handleVoiceSelect`:
     - Hentikan audio aktif serta-merta: `audioNotificationService.stopAudio()`.
     - Tetapkan `setIsPlayingPreview(false)`.
   - Di dalam `handleSetAsDeviceVoice`:
     - Hentikan audio sedia ada sebelum memulakan penetapan.

---

## 3. Pelan Pengesahan (Verification Plan)
- [ ] Pengesahan formula astronomi: Uji fungsi hisab luar talian menghasilkan Asar jam ~16:15 - 16:20 petang.
- [ ] Pengesahan zon masa UTC+8: Uji timestamp API diformat dengan tepat mengikut waktu Malaysia tanpa mengira zon masa pelayar peranti.
- [ ] Pengesahan cache 30 hari: Pastikan data bulanan daripada API disimpan untuk kegunaan luar talian berterusan walaupun WiFi ditutup.
- [ ] Pengesahan pencegahan audio bertindih: Uji penekanan pantas berulang kali pada pelbagai pilihan azan untuk memastikan hanya SATU audio sahaja berbunyi pada satu masa.
- [ ] Uji pemeriksaan kod (`lint_applet`) dan binaan aplikasi (`compile_applet`).
