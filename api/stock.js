// api/stock.js — Vercel Serverless Function
// Rotasi otomatis 6 API key Alpha Vantage = 150 request/hari
// API key disimpan di Vercel Environment Variables — AMAN

const RATE_LIMIT = new Map();

// ── Ambil semua API key dari environment ─────────────────
// 6 key = 150 request/hari, rotasi otomatis per 4 jam
function getApiKeys() {
  const keys = [
    process.env.AV_KEY_1,
    process.env.AV_KEY_2,
    process.env.AV_KEY_3,
    process.env.AV_KEY_4,
    process.env.AV_KEY_5,
    process.env.AV_KEY_6,
  ].filter(Boolean);
  return keys;
}

// ── Fetch dari Alpha Vantage ──────────────────────────────
async function fetchAlphaVantage(symbol, days, apiKey) {
  const outputsize = days > 90 ? "full" : "compact";
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();

  if (json["Note"])        throw new Error("RATE_LIMIT");
  if (json["Information"]) throw new Error("DAILY_LIMIT");
  if (!json["Time Series (Daily)"]) {
    const msg = json["Error Message"] || "";
    throw new Error(msg.includes("Invalid") ? "NOT_FOUND" : "DATA_ERROR");
  }

  const ts = json["Time Series (Daily)"];

  // Alpha Vantage menyimpan saham IDX dalam satuan 1/100 IDR (sen)
  // Perlu dikali 100 untuk mendapat harga IDR yang benar
  // Contoh: BBCA close 96.45 di AV = 9645 IDR
  const isIDX = symbol.includes(".JK") || symbol.includes(".JKT");
  const multiplier = isIDX ? 100 : 1;

  return Object.entries(ts)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, v]) => ({
      date,
      open:   Math.round(parseFloat(v["1. open"])  * multiplier),
      high:   Math.round(parseFloat(v["2. high"])  * multiplier),
      low:    Math.round(parseFloat(v["3. low"])   * multiplier),
      close:  Math.round(parseFloat(v["4. close"]) * multiplier),
      volume: parseInt(v["5. volume"]),
    }))
    .slice(-days);
}

// ── Coba semua key sampai ada yang berhasil ───────────────
async function fetchWithRotation(symbol, days) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("NO_KEYS");

  // Mulai dari key yang dipilih berdasarkan jam
  const startIdx = Math.floor(new Date().getUTCHours() / (24 / keys.length)) % keys.length;
  const ordered  = [...keys.slice(startIdx), ...keys.slice(0, startIdx)];

  // Coba format simbol: BBCA.JKT → BBCA.JK → BBCA
  const base = symbol.replace(/\.(JK|JKT)$/, "");
  const symbols = symbol.includes(".") ? [symbol] : [`${base}.JKT`, `${base}.JK`, base];

  let lastError = null;

  for (const sym of symbols) {
    for (const key of ordered) {
      try {
        const data = await fetchAlphaVantage(sym, days, key);
        if (data && data.length >= 2) {
          console.log(`[stock] ${sym} OK via key ...${key.slice(-4)}`);
          return { data, symbol: sym };
        }
      } catch (e) {
        if (e.message === "NOT_FOUND") break; // simbol salah, coba format lain
        if (e.message === "RATE_LIMIT" || e.message === "DAILY_LIMIT") {
          console.log(`[stock] Key ...${key.slice(-4)} limit, coba key berikutnya`);
          lastError = e;
          continue; // coba key berikutnya
        }
        lastError = e;
      }
    }
  }

  throw lastError || new Error("Semua key gagal");
}

// ── Handler utama ─────────────────────────────────────────
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

  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const clean = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!clean || clean.length > 16) return res.status(400).json({ error: "Kode saham tidak valid" });

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);

  try {
    const { data, symbol: finalSymbol } = await fetchWithRotation(clean, days);

    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=120");
    return res.status(200).json({
      symbol: finalSymbol,
      source: "Alpha Vantage",
      points: data.length,
      data,
    });

  } catch (err) {
    if (err.message === "NO_KEYS") {
      return res.status(500).json({ error: "Server belum dikonfigurasi. Hubungi admin." });
    }
    if (err.message === "RATE_LIMIT" || err.message === "DAILY_LIMIT") {
      return res.status(429).json({ error: "Semua API key sudah mencapai limit hari ini. Coba lagi besok atau hubungi admin." });
    }
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: `${clean} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM, BBRI).` });
    }
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Timeout. Coba lagi." });
    }
    console.error(`[stock] Error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
