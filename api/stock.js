// api/stock.js — Vercel Serverless Function
// Sumber data: stooq.com (reliable, tidak blokir server requests)
// Fallback: Yahoo Finance v7 (endpoint berbeda, lebih toleran)

const RATE_LIMIT = new Map();

// ── Sumber 1: Stooq.com ───────────────────────────────────
// Stooq menyediakan data CSV gratis untuk saham IDX (.JK = tidak ada di stooq)
// Untuk IDX pakai format: BBCA.ID (bukan .JK)
async function fetchStooq(symbol, days) {
  // Konversi: BBCA.JK → BBCA.ID untuk stooq
  const stooqSym = symbol.replace(".JK", ".ID").toLowerCase();
  const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/csv,text/plain,*/*",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Stooq error: ${res.status}`);

  const text = await res.text();
  if (!text || text.includes("No data") || text.trim().length < 30) {
    throw new Error("Stooq: no data");
  }

  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("Stooq: insufficient data");

  // Parse CSV: Date,Open,High,Low,Close,Volume
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const [date, open, high, low, close, volume] = cols;
    const c = parseFloat(close), v = parseInt(volume) || 0;
    if (!date || isNaN(c)) continue;
    result.push({
      date: date.trim(),
      open: parseFloat(open) || c,
      high: parseFloat(high) || c,
      low:  parseFloat(low)  || c,
      close: c,
      volume: v,
    });
  }

  if (result.length < 2) throw new Error("Stooq: parsed data too small");
  return result.slice(-days);
}

// ── Sumber 2: Yahoo Finance v7 (endpoint berbeda dari v8) ─
async function fetchYahooV7(symbol, days) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(period2 - days * 24 * 60 * 60 * 2);
  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/csv,text/plain,*/*",
      "Referer": "https://finance.yahoo.com",
    },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });

  if (res.status === 404) throw new Error(`tidak ditemukan: ${symbol}`);
  if (res.status === 429) throw new Error("rate limit Yahoo");
  if (!res.ok) throw new Error(`Yahoo v7 error: ${res.status}`);

  const text = await res.text();
  if (!text || text.includes("<!DOCTYPE") || text.includes("<html")) {
    throw new Error("Yahoo v7 mengembalikan HTML bukan CSV");
  }

  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("Yahoo v7: data kosong");

  // CSV: Date,Open,High,Low,Close,Adj Close,Volume
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 6) continue;
    const [date, open, high, low, close, , volume] = cols;
    const c = parseFloat(close), v = parseInt(volume) || 0;
    if (!date || isNaN(c) || close === "null") continue;
    result.push({
      date: date.trim(),
      open: parseFloat(open) || c,
      high: parseFloat(high) || c,
      low:  parseFloat(low)  || c,
      close: c,
      volume: v,
    });
  }

  if (result.length < 2) throw new Error("Yahoo v7: parsed data kosong");
  return result.slice(-days);
}

// ── Sumber 3: Yahoo Finance v8 JSON (fallback terakhir) ───
async function fetchYahooV8(symbol, days) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(period2 - days * 24 * 60 * 60 * 2);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://finance.yahoo.com/",
          "Origin": "https://finance.yahoo.com",
        },
        signal: AbortSignal.timeout(10000),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      if (!res.ok) continue;

      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r || !r.timestamp) continue;

      const q = r.indicators?.quote?.[0] || {};
      const result = r.timestamp
        .map((ts, i) => ({
          date:   new Date(ts * 1000).toISOString().split("T")[0],
          open:   q.open?.[i]   ?? null,
          high:   q.high?.[i]   ?? null,
          low:    q.low?.[i]    ?? null,
          close:  q.close?.[i]  ?? null,
          volume: q.volume?.[i] ?? 0,
        }))
        .filter(d => d.close != null && d.volume > 0);

      if (result.length > 1) return result.slice(-days);
    } catch { continue; }
  }
  throw new Error("Semua endpoint Yahoo v8 gagal");
}

// ── Main: coba semua sumber secara berurutan ──────────────
async function fetchData(symbol, days) {
  const errors = [];

  // Sumber 1: Stooq (paling reliable di server environment)
  try {
    const data = await fetchStooq(symbol, days);
    console.log(`[stock.js] ${symbol} berhasil dari Stooq`);
    return { data, source: "Stooq" };
  } catch (e) {
    errors.push(`Stooq: ${e.message}`);
  }

  // Sumber 2: Yahoo v7 CSV
  try {
    const data = await fetchYahooV7(symbol, days);
    console.log(`[stock.js] ${symbol} berhasil dari Yahoo v7`);
    return { data, source: "Yahoo Finance" };
  } catch (e) {
    if (e.message.includes("tidak ditemukan")) throw e;
    errors.push(`Yahoo v7: ${e.message}`);
  }

  // Sumber 3: Yahoo v8 JSON
  try {
    const data = await fetchYahooV8(symbol, days);
    console.log(`[stock.js] ${symbol} berhasil dari Yahoo v8`);
    return { data, source: "Yahoo Finance" };
  } catch (e) {
    errors.push(`Yahoo v8: ${e.message}`);
  }

  throw new Error(`Semua sumber data gagal. Detail: ${errors.join(" | ")}`);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")     return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 15 req/menit per IP
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const prev = (RATE_LIMIT.get(ip) || []).filter(ts => now - ts < 60_000);
  if (prev.length >= 15) return res.status(429).json({ error: "Terlalu banyak request. Tunggu 1 menit." });
  RATE_LIMIT.set(ip, [...prev, now]);

  // Validasi input
  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const cleanSymbol = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!cleanSymbol || cleanSymbol.length > 16) return res.status(400).json({ error: "Kode saham tidak valid" });

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);
  const finalSymbol = cleanSymbol.includes(".") ? cleanSymbol : cleanSymbol + ".JK";

  try {
    const { data, source } = await fetchData(finalSymbol, days);

    if (!data || data.length < 2) {
      return res.status(404).json({ error: `Data tidak cukup untuk ${finalSymbol}. Coba tambah periode.` });
    }

    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=120");
    res.setHeader("X-Data-Source", source);

    return res.status(200).json({
      symbol: finalSymbol,
      source,
      points: data.length,
      data,
    });

  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ error: "Koneksi timeout. Coba lagi." });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ error: `${finalSymbol} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM, BBRI).` });
    }
    console.error(`[stock.js] Error ${finalSymbol}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
