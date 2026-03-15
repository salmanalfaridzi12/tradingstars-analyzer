# 🚀 PANDUAN DEPLOY TRADINGSTARS KE VERCEL
## Langkah demi langkah — bisa diikuti pemula

---

## PERSIAPAN (5 menit)
Kamu butuh:
- Email aktif (untuk daftar GitHub & Vercel)
- File trading-app.zip yang sudah didownload
- Laptop/PC (lebih mudah dari HP)

---

## LANGKAH 1 — Daftar GitHub (gratis)

1. Buka https://github.com di browser
2. Klik tombol hijau "Sign up"
3. Isi: username, email, password
4. Verifikasi email → selesai

---

## LANGKAH 2 — Buat Repository Baru di GitHub

1. Login ke GitHub
2. Klik tombol "+" di pojok kanan atas → "New repository"
3. Isi:
   - Repository name: tradingstars-analyzer
   - Visibility: Public ← PENTING, pilih Public
   - Jangan centang apapun di bawah
4. Klik "Create repository"

---

## LANGKAH 3 — Upload File ke GitHub

1. Ekstrak file trading-app.zip di laptop
2. Kamu akan lihat folder: trading-app/
3. Di halaman repository GitHub yang baru dibuat, klik "uploading an existing file"
4. Drag & drop SEMUA FILE di dalam folder trading-app/ ke browser
   (bukan foldernya, tapi isinya: src/, api/, public/, package.json, vercel.json, README.md)
5. Scroll ke bawah, klik "Commit changes"
6. Tunggu upload selesai ✅

---

## LANGKAH 4 — Daftar Vercel (gratis)

1. Buka https://vercel.com
2. Klik "Sign Up"
3. Pilih "Continue with GitHub" ← PENTING, login pakai GitHub
4. Authorize Vercel untuk akses GitHub → klik "Authorize"

---

## LANGKAH 5 — Deploy ke Vercel

1. Di dashboard Vercel, klik "Add New Project"
2. Kamu akan lihat repository "tradingstars-analyzer" → klik "Import"
3. Di halaman konfigurasi:
   - Framework Preset: pilih "Create React App"
   - Root Directory: biarkan kosong (default)
   - TIDAK perlu isi Environment Variables apapun
4. Klik "Deploy" → tunggu 2-3 menit
5. Selesai! Vercel akan tampilkan URL seperti:
   https://tradingstars-analyzer-xxx.vercel.app

---

## LANGKAH 6 — Bagikan ke Member

Copy URL dari Vercel → kirim ke grup WhatsApp/Telegram komunitas.

Member langsung bisa buka dari HP tanpa install apapun!

---

## TIPS PENTING

### Kalau ada error "Build Failed":
- Pastikan semua file terupload (cek ada src/, api/, public/, package.json)
- Pastikan Framework Preset = Create React App
- Coba klik "Redeploy" di Vercel dashboard

### Custom domain (opsional):
Kalau mau pakai domain sendiri misal tradingstars.id:
1. Beli domain di Niagahoster/Domainesia
2. Di Vercel → Settings → Domains → Add
3. Ikuti instruksi DNS yang diberikan Vercel

### Update website setelah ada perubahan:
1. Upload file baru ke GitHub (timpa yang lama)
2. Vercel otomatis redeploy dalam 1-2 menit

---

## CEK APAKAH WEBSITE JALAN DI HP

Setelah deploy, test di HP dengan cara:
1. Buka URL dari HP Android/iPhone
2. Test fitur berikut:
   □ Onboarding tutorial muncul saat pertama buka
   □ Tab Bandar Tracker bisa diklik
   □ Ketik BBCA → Fetch → data masuk
   □ Klik Analisa → hasil muncul
   □ Scroll ke bawah → semua widget tampil
   □ Tombol ⭐ watchlist bisa diklik
   □ Tombol 🔔 reminder bisa diklik
   □ Dark/Light mode toggle jalan

Kalau ada yang tidak jalan, screenshot dan kirim ke developer.

---

## KONTAK BANTUAN

Kalau stuck di langkah mana pun, screenshot errornya dan minta bantuan.
