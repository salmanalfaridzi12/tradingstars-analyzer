# PANDUAN DEPLOY KE RENDER + UPTIMEROBOT
## Gratis selamanya, tanpa limit fetch, tanpa API key

---

## LANGKAH 1 — Upload ke GitHub (repo baru)

1. Buka github.com → Login
2. Klik + → New repository
3. Nama: tradingstars-render → Public → Create
4. Klik "uploading an existing file"
5. Pilih semua file dari folder tradingstars-render → Upload
6. Klik Commit changes

---

## LANGKAH 2 — Daftar & Deploy ke Render

1. Buka render.com → Sign Up with GitHub
2. Klik "New +" → "Web Service"
3. Pilih repository: tradingstars-render → Connect
4. Isi konfigurasi:
   - Name: tradingstars-analyzer
   - Region: Singapore (paling dekat Indonesia)
   - Branch: main
   - Build Command: npm install && npm run build
   - Start Command: node server.js
   - Instance Type: Free
5. Klik "Create Web Service"
6. Tunggu 3-5 menit sampai deploy selesai
7. URL akan muncul seperti: tradingstars-analyzer.onrender.com

---

## LANGKAH 3 — Setup UptimeRobot (agar server tidak tidur)

1. Buka uptimerobot.com → Sign Up (gratis)
2. Klik "Add New Monitor"
3. Isi:
   - Monitor Type: HTTP(s)
   - Friendly Name: TradingStars Server
   - URL: https://tradingstars-analyzer.onrender.com/api/stock?symbol=BBCA&days=5
   - Monitoring Interval: Every 5 minutes
4. Klik "Create Monitor"

Setelah ini server tidak akan pernah tidur!

---

## HASIL AKHIR

- Website: https://tradingstars-analyzer.onrender.com
- Data: Yahoo Finance (gratis, tanpa limit, tanpa API key)
- Server: Selalu aktif 24/7 berkat UptimeRobot
- Biaya: Rp 0 selamanya

---

## CATATAN PENTING

- Pertama kali deploy butuh 3-5 menit
- Kalau belum setup UptimeRobot, pertama buka agak lambat ~30 detik
  tapi ada animasi loading yang menjelaskan ke member
- Setelah UptimeRobot aktif, langsung cepat
