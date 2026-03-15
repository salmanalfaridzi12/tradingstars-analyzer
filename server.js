// server.js — Express server untuk Render
// Yahoo Finance bebas tanpa limit, tanpa API key

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const RATE_LIMIT = new Map();

// ── Fetch Yahoo Finance ───────────────────────────────────
async function fetchYahoo(symbol, days) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(period2 - days * 24 * 60 * 60 * 2);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
  };

  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`,
  ];

  let lastError = null;
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) { lastError = new Error("Non-JSON response"); continue; }
      if (res.status === 404) throw new Error("SYMBOL_NOT_FOUND");
      if (res.status === 429) { lastError = new Error("Yahoo rate limit"); continue; }
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue; }

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp) { lastError = new Error("Data kosong"); continue; }

      const q = result.indicators?.quote?.[0] || {};
      const data = result.timestamp
        .map((ts, i) => ({
          date:   new Date(ts * 1000).toISOString().split("T")[0],
          open:   q.open?.[i]   != null ? parseFloat(q.open[i].toFixed(4))   : null,
          high:   q.high?.[i]   != null ? parseFloat(q.high[i].toFixed(4))   : null,
          low:    q.low?.[i]    != null ? parseFloat(q.low[i].toFixed(4))    : null,
          close:  q.close?.[i]  != null ? parseFloat(q.close[i].toFixed(4))  : null,
          volume: q.volume?.[i] != null ? Math.round(q.volume[i])             : null,
        }))
        .filter(d => d.close != null && d.volume != null && d.volume > 0);

      if (data.length >= 2) return data.slice(-days);
      lastError = new Error("Data terlalu sedikit");
    } catch (err) {
      if (err.message === "SYMBOL_NOT_FOUND") throw err;
      lastError = err;
    }
  }
  throw lastError || new Error("Semua endpoint Yahoo gagal");
}

// ── CORS ──────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ── API /api/stock ─────────────────────────────────────────
app.get("/api/stock", async (req, res) => {
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const prev = (RATE_LIMIT.get(ip) || []).filter(ts => now - ts < 60_000);
  if (prev.length >= 30) return res.status(429).json({ error: "Terlalu banyak request. Tunggu 1 menit." });
  RATE_LIMIT.set(ip, [...prev, now]);

  const { symbol, days: daysParam = "30" } = req.query;
  if (!symbol) return res.status(400).json({ error: "Parameter symbol wajib diisi" });

  const clean = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  if (!clean || clean.length > 16) return res.status(400).json({ error: "Kode saham tidak valid" });

  const days = Math.min(Math.max(parseInt(daysParam) || 30, 5), 365);
  const finalSymbol = clean.includes(".") ? clean : clean + ".JK";

  try {
    const data = await fetchYahoo(finalSymbol, days);
    res.setHeader("Cache-Control", "public, max-age=1200");
    return res.json({ symbol: finalSymbol, source: "Yahoo Finance", points: data.length, data });
  } catch (err) {
    if (err.message === "SYMBOL_NOT_FOUND") {
      return res.status(404).json({ error: `${finalSymbol} tidak ditemukan. Pastikan kode emiten benar (contoh: BBCA, TLKM, BBRI).` });
    }
    if (err.name === "AbortError") return res.status(504).json({ error: "Timeout. Coba lagi." });
    console.error(`[stock] ${finalSymbol}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Serve React build ──────────────────────────────────────
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => console.log(`TradingStars running on port ${PORT}`));
