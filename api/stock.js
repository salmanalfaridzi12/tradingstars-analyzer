// api/stock.js — Vercel Serverless Function
// Data: Alpha Vantage (reliable, tidak blokir Vercel server)
// API key disimpan di environment variable Vercel — AMAN, tidak terekspos ke browser

const RATE_LIMIT = new Map();

async function fetchAlphaVantage(symbol, days) {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) throw new Error("SERVER_NO_KEY");

  const outputsize = days > 90 ? "full" : "compact";
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

  const json = await res.json();

  if (json["Note"])        throw new Error("RATE_LIMIT");
  if (json["Information"]) throw new Error("DAILY_LIMIT");
  if (!json["Time Series (Daily)"]) {
    const msg = json["Error Message"] || "Data tidak ditemukan";
    throw new Error(msg.includes("Invalid") ? "NOT_FOUND" : msg);
  }

  const ts = json["Time Series (Daily)"];
  const parsed = Object.entries(ts)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, v]) => ({
      date,
      open:   parseFloat(v["1. open"]),
      high:   parseFloat(v["2. high"]),
      low:    parseFloat(v["3. low"]),
      close:  parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"]),
    }));

  return parsed.slice(-days);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")     return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 10 req/menit per IP
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const prev = (RATE_LIMIT.get(ip) || []).filter(ts => now - ts < 60_000);
  if (prev.length >= 10) return res.status(429).json({ error: "Terlalu banyak request. Tunggu 1 menit." });
  RATE_LIMIT.set(ip, [...prev, now]);

  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const cleanSymbol = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!cleanSymbol || cleanSymbol.length > 16) return res.status(400).json({ error: "Kode saham tidak valid" });

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);
  const finalSymbol = cleanSymbol.includes(".") ? cleanSymbol : cleanSymbol + ".JK";

  try {
    const data = await fetchAlphaVantage(finalSymbol, days);
    if (!data || data.length < 2) {
      return res.status(404).json({ error: `Data tidak cukup untuk ${finalSymbol}.` });
    }

    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=120");
    return res.status(200).json({ symbol: finalSymbol, source: "Alpha Vantage", points: data.length, data });

  } catch (err) {
    if (err.message === "SERVER_NO_KEY") {
      return res.status(500).json({ error: "Server belum dikonfigurasi. Hubungi admin untuk setup API key." });
    }
    if (err.message === "RATE_LIMIT") {
      return res.status(429).json({ error: "Limit per menit tercapai. Tunggu 1 menit lalu coba lagi." });
    }
    if (err.message === "DAILY_LIMIT") {
      return res.status(429).json({ error: "Limit harian (25/hari) habis. Coba lagi besok atau minta admin tambah API key." });
    }
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: `${finalSymbol} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM).` });
    }
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Timeout. Coba lagi." });
    }
    return res.status(500).json({ error: err.message });
  }
}
