// api/stock.js — Vercel Serverless Function
// Data: Yahoo Finance (gratis, tanpa API key)

const RATE_LIMIT = new Map();

// ── Coba beberapa URL Yahoo Finance secara bergantian ─────
async function fetchYahoo(symbol, days) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(period2 - days * 24 * 60 * 60 * 1.8);

  // Yahoo punya beberapa endpoint, coba satu per satu kalau gagal
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Cache-Control": "no-cache",
  };

  let lastError = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(12000),
      });

      const contentType = res.headers.get("content-type") || "";

      // Kalau Yahoo kirim HTML bukan JSON — berarti diblokir
      if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
        const text = await res.text();
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          lastError = new Error("Yahoo Finance memblokir request. Coba beberapa menit lagi.");
          continue; // coba endpoint berikutnya
        }
      }

      if (res.status === 429) {
        lastError = new Error("Yahoo Finance terlalu sibuk (rate limit). Tunggu 1–2 menit lalu coba lagi.");
        continue;
      }

      if (res.status === 404) {
        throw new Error(`Kode saham tidak ditemukan: ${symbol}. Pastikan kode benar (contoh: BBCA, TLKM).`);
      }

      if (!res.ok) {
        lastError = new Error(`Yahoo Finance error: HTTP ${res.status}`);
        continue;
      }

      let json;
      try {
        json = await res.json();
      } catch {
        lastError = new Error("Yahoo Finance mengembalikan data tidak valid. Coba lagi sebentar.");
        continue;
      }

      const result = json?.chart?.result?.[0];
      if (!result) {
        const msg = json?.chart?.error?.description;
        if (msg && msg.includes("No data")) {
          throw new Error(`Tidak ada data untuk ${symbol}. Pastikan kode emiten benar.`);
        }
        lastError = new Error(msg || "Data tidak tersedia dari Yahoo Finance.");
        continue;
      }

      const timestamps = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};

      if (timestamps.length === 0) {
        throw new Error(`Tidak ada data historis untuk: ${symbol}`);
      }

      const parsed = timestamps
        .map((ts, i) => ({
          date:   new Date(ts * 1000).toISOString().split("T")[0],
          open:   q.open?.[i]   != null ? parseFloat(q.open[i].toFixed(4))   : null,
          high:   q.high?.[i]   != null ? parseFloat(q.high[i].toFixed(4))   : null,
          low:    q.low?.[i]    != null ? parseFloat(q.low[i].toFixed(4))    : null,
          close:  q.close?.[i]  != null ? parseFloat(q.close[i].toFixed(4))  : null,
          volume: q.volume?.[i] != null ? Math.round(q.volume[i])             : null,
        }))
        .filter(d => d.close != null && d.volume != null && d.volume > 0);

      return parsed; // berhasil!

    } catch (err) {
      // Kalau error bukan network (misalnya kode tidak ditemukan), langsung throw
      if (err.message.includes("tidak ditemukan") || err.message.includes("Tidak ada data")) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error("Tidak bisa terhubung ke Yahoo Finance. Coba lagi.");
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")     return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 15 req/menit per IP
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const prev = (RATE_LIMIT.get(ip) || []).filter(ts => now - ts < 60_000);
  if (prev.length >= 15) {
    return res.status(429).json({ error: "Terlalu banyak request. Tunggu 1 menit." });
  }
  RATE_LIMIT.set(ip, [...prev, now]);

  // Validasi input
  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const cleanSymbol = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!cleanSymbol || cleanSymbol.length > 16) {
    return res.status(400).json({ error: "Kode saham tidak valid" });
  }

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);

  // Auto append .JK untuk saham IDX
  const finalSymbol = cleanSymbol.includes(".") ? cleanSymbol : cleanSymbol + ".JK";

  try {
    const data = await fetchYahoo(finalSymbol, days);

    if (data.length < 2) {
      return res.status(404).json({
        error: `Data tidak cukup untuk ${finalSymbol}. Coba tambah periode atau cek kode emiten.`,
      });
    }

    const sliced = data.slice(-days);

    // Cache 20 menit di Vercel Edge
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=120");
    res.setHeader("X-Data-Source", "Yahoo Finance");
    res.setHeader("X-Symbol", finalSymbol);

    return res.status(200).json({
      symbol: finalSymbol,
      source: "Yahoo Finance",
      points: sliced.length,
      data:   sliced,
    });

  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({
        error: "Timeout menghubungi Yahoo Finance. Coba lagi dalam beberapa detik.",
      });
    }

    // Error kode tidak ditemukan
    if (err.message.includes("tidak ditemukan") && finalSymbol.endsWith(".JK")) {
      return res.status(404).json({
        error: `${finalSymbol} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM, BBRI, GOTO).`,
      });
    }

    console.error(`[stock.js] ${finalSymbol}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
