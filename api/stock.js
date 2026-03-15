// api/stock.js — Vercel Serverless Function
// Sumber data: Yahoo Finance (gratis, tanpa API key, tanpa limit harian)

const RATE_LIMIT = new Map();

async function fetchYahoo(symbol, days) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(period2 - days * 24 * 60 * 60 * 1.6);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}&includeAdjustedClose=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TradingAnalyzer/1.0)",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Simbol tidak ditemukan: ${symbol}`);
    if (res.status === 429) throw new Error("Yahoo Finance sedang sibuk. Coba lagi sebentar.");
    throw new Error(`Yahoo error: HTTP ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    const msg = json?.chart?.error?.description || "Data tidak tersedia";
    throw new Error(msg);
  }

  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};

  if (timestamps.length === 0) throw new Error(`Tidak ada data untuk: ${symbol}`);

  return timestamps
    .map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split("T")[0],
      open:   q.open?.[i]   != null ? parseFloat(q.open[i].toFixed(2))   : null,
      high:   q.high?.[i]   != null ? parseFloat(q.high[i].toFixed(2))   : null,
      low:    q.low?.[i]    != null ? parseFloat(q.low[i].toFixed(2))    : null,
      close:  q.close?.[i]  != null ? parseFloat(q.close[i].toFixed(2))  : null,
      volume: q.volume?.[i] != null ? Math.round(q.volume[i])             : null,
    }))
    .filter(d => d.close != null && d.volume != null && d.volume > 0);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: max 15 req/menit per IP
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const prev = (RATE_LIMIT.get(ip) || []).filter(ts => now - ts < 60_000);
  if (prev.length >= 15) return res.status(429).json({ error: "Terlalu banyak request. Tunggu 1 menit." });
  RATE_LIMIT.set(ip, [...prev, now]);

  // Validasi input
  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const cleanSymbol = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!cleanSymbol || cleanSymbol.length > 16) return res.status(400).json({ error: "Simbol tidak valid" });

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);

  // Auto append .JK untuk saham IDX
  const finalSymbol = cleanSymbol.includes(".") ? cleanSymbol : cleanSymbol + ".JK";

  try {
    const data = await fetchYahoo(finalSymbol, days);
    if (data.length < 2) {
      return res.status(404).json({
        error: `Data tidak cukup untuk ${finalSymbol}. Periksa kode emiten atau tambah periode.`,
      });
    }

    const sliced = data.slice(-days);

    // Cache 20 menit — aman setelah market tutup
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=120");
    res.setHeader("X-Data-Source", "Yahoo Finance");

    return res.status(200).json({
      symbol: finalSymbol,
      source: "Yahoo Finance",
      points: sliced.length,
      data:   sliced,
    });

  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ error: "Timeout menghubungi Yahoo Finance. Coba lagi." });
    }
    if (err.message.includes("tidak ditemukan") && finalSymbol.endsWith(".JK")) {
      return res.status(404).json({
        error: `${finalSymbol} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM, BBRI).`,
      });
    }
    return res.status(500).json({ error: err.message });
  }
}
