# TradingStars — Trading Analyzer Pro
## Panduan Deploy ke Vercel

### Sumber Data: Yahoo Finance
- Gratis sepenuhnya — tanpa API key, tanpa limit harian
- Cocok untuk komunitas berapapun jumlah membernya
- Data end-of-day tersedia ~15-30 menit setelah market tutup (15:30-16:00 WIB)

---

## Struktur Project
```
trading-app/
├── api/
│   └── stock.js     <- Proxy ke Yahoo Finance (tanpa API key)
├── src/
│   └── App.jsx      <- React frontend
├── public/
│   └── index.html
├── package.json
└── vercel.json
```

---

## LANGKAH 1 — Upload ke GitHub
1. Buat akun GitHub di https://github.com
2. Klik "New repository" beri nama tradingstars-analyzer
3. Upload semua file ini ke repository

---

## LANGKAH 2 — Deploy ke Vercel
1. Buka https://vercel.com daftar/login dengan GitHub
2. Klik "Add New Project" dan Import repo tradingstars-analyzer
3. Framework Preset: Create React App
4. Klik Deploy tunggu 2-3 menit
5. Dapat URL gratis: https://tradingstars-analyzer.vercel.app

TIDAK PERLU environment variable apapun karena Yahoo Finance tidak butuh API key!

---

## LANGKAH 3 — Bagikan ke Member
Bagikan URL Vercel. Selesai!

Member tinggal:
1. Buka web
2. Klik tab Bandar Tracker
3. Ketik kode emiten (contoh: BBCA, TLKM, BBRI)
4. Pilih periode (20/30/60 hari)
5. Klik Fetch Data Otomatis
6. Klik Analisa Tekanan Bandar

---

## Kode Saham IDX
Ketik tanpa .JK — sistem otomatis menambahkan:
- BBCA  menjadi  BBCA.JK
- TLKM  menjadi  TLKM.JK
- GOTO  menjadi  GOTO.JK

Untuk saham US ketik langsung: AAPL, TSLA, NVDA

---

## Jadwal Analisa yang Disarankan
- Market IDX tutup: 15:00-15:15 WIB
- Data tersedia di Yahoo: sekitar 15:30-16:00 WIB
- Waktu analisa terbaik: malam hari 16:00-22:00 WIB
- Untuk persiapan trading besok pagi
