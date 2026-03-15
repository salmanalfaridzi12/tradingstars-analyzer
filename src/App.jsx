import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function useAnimatedNumber(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) { setVal(0); return; }
    const start = Date.now(), from = 0;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.round(from + (target - from) * easeOutCubic(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return val;
}

function AnimNum({ value, fmt }) {
  const animated = useAnimatedNumber(value);
  return <>{fmt(animated)}</>;
}

function fmtNum(n, dec = 0) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString("id-ID", { maximumFractionDigits: dec });
}

function fmtDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function FadeIn({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity = "0"; el.style.transform = "translateY(10px)";
    const timer = setTimeout(() => {
      el.style.transition = `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`;
      el.style.opacity = "1"; el.style.transform = "translateY(0)";
    }, 30);
    return () => clearTimeout(timer);
  }, [delay]);
  return <div ref={ref} style={style}>{children}</div>;
}

function SlideIn({ children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity = "0"; el.style.transform = "translateX(-10px)";
    const t = setTimeout(() => {
      el.style.transition = `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`;
      el.style.opacity = "1"; el.style.transform = "translateX(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay, children]);
  return <div ref={ref}>{children}</div>;
}

// ── Shared Particles ──────────────────────────────────────
function Particles({ dark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const obs = new ResizeObserver(resize); obs.observe(canvas);
    const pts = Array.from({ length: 32 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3, dx: (Math.random() - 0.5) * 0.2, dy: (Math.random() - 0.5) * 0.2,
      o: Math.random() * 0.28 + 0.05,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark ? `rgba(139,92,246,${p.o})` : `rgba(37,99,235,${p.o * 0.45})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 75) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = dark ? `rgba(139,92,246,${0.05 * (1 - d / 75)})` : `rgba(37,99,235,${0.03 * (1 - d / 75)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [dark]);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

// ═══════════════════════════════════════════════════════════
// PIVOT ANALYZER COMPONENTS
// ═══════════════════════════════════════════════════════════

function HeatmapBg({ levels, currentPrice, dark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !levels.length) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const cp = parseFloat(currentPrice);
    const max = levels[0].value, min = levels[levels.length - 1].value, range = max - min || 1;
    levels.forEach(({ value, color }) => {
      const yPct = 1 - (value - min) / range, y = yPct * canvas.height;
      const grad = ctx.createLinearGradient(0, y - 18, 0, y + 18);
      grad.addColorStop(0, "transparent"); grad.addColorStop(0.5, `${color}18`); grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad; ctx.fillRect(0, y - 18, canvas.width, 36);
    });
    if (!isNaN(cp)) {
      const yPct = 1 - (cp - min) / range, y = Math.max(1, Math.min(canvas.height - 1, yPct * canvas.height));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      ctx.strokeStyle = "rgba(245,158,11,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }, [levels, currentPrice, dark]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "16px" }} />;
}

function getSession() {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 7) return { name: "Tokyo", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", dot: "#f59e0b", open: true };
  if (h >= 7 && h < 8) return { name: "TK-LN Overlap", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", dot: "#8b5cf6", open: true };
  if (h >= 8 && h < 16) return { name: "London", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", dot: "#3b82f6", open: true };
  if (h >= 13 && h < 16) return { name: "LN-NY Overlap", color: "#ec4899", bg: "rgba(236,72,153,0.1)", dot: "#ec4899", open: true };
  if (h >= 16 && h < 21) return { name: "New York", color: "#22c55e", bg: "rgba(34,197,94,0.1)", dot: "#22c55e", open: true };
  return { name: "Market Closed", color: "#64748b", bg: "rgba(100,116,139,0.07)", dot: "#64748b", open: false };
}

function getBreakoutProb(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const range = result.r1 - result.s1 || 1;
  const clamp = Math.min(Math.max((cp - result.s1) / range, 0), 1);
  const bullPct = Math.round(clamp * 100);
  return { bullPct, bearPct: 100 - bullPct, momentum: (result.r1 - cp) < (cp - result.s1) ? "Dekat Resistance" : "Dekat Support" };
}

function getPivotStrength(result) {
  if (!result) return null;
  const rangeTotal = result.r3 - result.s3 || 1;
  const pivotZone = result.r1 - result.s1;
  const r1r2Gap = result.r2 - result.r1;
  const strength = Math.min(100, Math.round((pivotZone / rangeTotal) * 300));
  const label = strength >= 70 ? "Kuat 💪" : strength >= 40 ? "Sedang ⚡" : "Lemah 📉";
  const color = strength >= 70 ? "#16a34a" : strength >= 40 ? "#f59e0b" : "#dc2626";
  return { strength, label, color, r1r2Gap, pivotZone };
}

function getAutoBias(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [result.r3, result.r2, result.r1, result.pivot, result.s1, result.s2, result.s3];
  const above = levels.filter(l => l > cp).length;
  const below = levels.filter(l => l < cp).length;
  const bullScore = Math.round((below / 6) * 100);
  const distFromPP = ((cp - result.pivot) / result.pivot * 100).toFixed(2);
  let bias, biasColor, biasIcon;
  if (cp > result.r1) { bias = "STRONG BUY"; biasColor = "#15803d"; biasIcon = "🟢🟢🟢"; }
  else if (cp > result.pivot) { bias = "BUY"; biasColor = "#22c55e"; biasIcon = "🟢🟢⚪"; }
  else if (cp > result.s1) { bias = "NEUTRAL"; biasColor = "#f59e0b"; biasIcon = "🟡🟡⚪"; }
  else if (cp > result.s2) { bias = "SELL"; biasColor = "#f97316"; biasIcon = "🔴🔴⚪"; }
  else { bias = "STRONG SELL"; biasColor = "#dc2626"; biasIcon = "🔴🔴🔴"; }
  return { bias, biasColor, biasIcon, bullScore, above, below, distFromPP };
}

function getSmartEntryZone(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const buffer = (result.r1 - result.s1) * 0.04;
  const zones = [];
  if (cp >= result.pivot - buffer && cp <= result.pivot + buffer)
    zones.push({ type: "LONG", label: "Bounce PP", entryLow: result.pivot - buffer, entryHigh: result.pivot + buffer, sl: result.s1, tp: result.r1, quality: "A+", color: "#16a34a" });
  if (cp >= result.s1 - buffer && cp <= result.s1 + buffer)
    zones.push({ type: "LONG", label: "Bounce S1", entryLow: result.s1 - buffer, entryHigh: result.s1 + buffer, sl: result.s2, tp: result.pivot, quality: "A", color: "#22c55e" });
  if (cp >= result.s2 - buffer && cp <= result.s2 + buffer)
    zones.push({ type: "LONG", label: "Bounce S2", entryLow: result.s2 - buffer, entryHigh: result.s2 + buffer, sl: result.s3, tp: result.s1, quality: "B", color: "#84cc16" });
  if (cp >= result.r1 - buffer && cp <= result.r1 + buffer)
    zones.push({ type: "SHORT", label: "Rejection R1", entryLow: result.r1 - buffer, entryHigh: result.r1 + buffer, sl: result.r2, tp: result.pivot, quality: "A", color: "#ef4444" });
  if (cp >= result.r2 - buffer && cp <= result.r2 + buffer)
    zones.push({ type: "SHORT", label: "Rejection R2", entryLow: result.r2 - buffer, entryHigh: result.r2 + buffer, sl: result.r3, tp: result.r1, quality: "A+", color: "#dc2626" });
  return zones.length > 0 ? zones : null;
}

function TrendArrow({ result, currentPrice, t, dark }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const pctFromPP = ((cp - result.pivot) / result.pivot * 100).toFixed(2);
  let arrows, trendLabel, trendColor, trendBg, trendBorder, desc;
  if (cp > result.r2) { arrows = "↑↑↑"; trendLabel = "UPTREND KUAT"; trendColor = "#15803d"; trendBg = dark ? "#14532d" : "#dcfce7"; trendBorder = "#86efac"; desc = "Momentum bullish sangat kuat, harga jauh di atas pivot"; }
  else if (cp > result.r1) { arrows = "↑↑"; trendLabel = "UPTREND"; trendColor = "#22c55e"; trendBg = dark ? "#166534" : "#f0fdf4"; trendBorder = "#bbf7d0"; desc = "Harga di atas R1, trend naik masih berlanjut"; }
  else if (cp > result.pivot) { arrows = "↗"; trendLabel = "CENDERUNG NAIK"; trendColor = "#84cc16"; trendBg = dark ? "#365314" : "#f7fee7"; trendBorder = "#bef264"; desc = "Harga di atas pivot, bias bullish lemah"; }
  else if (cp > result.s1) { arrows = "↘"; trendLabel = "CENDERUNG TURUN"; trendColor = "#f59e0b"; trendBg = dark ? "#78350f" : "#fffbeb"; trendBorder = "#fde68a"; desc = "Harga di bawah pivot, tekanan jual mulai muncul"; }
  else if (cp > result.s2) { arrows = "↓↓"; trendLabel = "DOWNTREND"; trendColor = "#f97316"; trendBg = dark ? "#7c2d12" : "#fff7ed"; trendBorder = "#fed7aa"; desc = "Harga di bawah S1, trend turun berlanjut"; }
  else { arrows = "↓↓↓"; trendLabel = "DOWNTREND KUAT"; trendColor = "#dc2626"; trendBg = dark ? "#7f1d1d" : "#fef2f2"; trendBorder = "#fecaca"; desc = "Tekanan jual sangat kuat, harga jauh di bawah pivot"; }
  const barPct = Math.min(100, Math.max(0, Math.round(((cp - result.s3) / (result.r3 - result.s3)) * 100)));
  return (
    <div style={{ background: trendBg, border: `1px solid ${trendBorder}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ fontSize: "10px", color: trendColor, fontWeight: 700, letterSpacing: "1px", marginBottom: "3px" }}>TREND DIRECTION</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: 900, color: trendColor }}>{arrows}</span>
            <span style={{ fontSize: "15px", fontWeight: 900, color: trendColor }}>{trendLabel}</span>
          </div>
          <div style={{ fontSize: "10px", color: t.sub, marginTop: "3px" }}>{desc}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: t.sub }}>dari PP</div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: trendColor }}>{pctFromPP > 0 ? "+" : ""}{pctFromPP}%</div>
        </div>
      </div>
      <div>
        <div style={{ height: "8px", background: dark ? "#1e293b" : "#e2e8f0", borderRadius: "99px", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#7c3aed,#3b82f6,#22c55e,#f59e0b,#dc2626)", opacity: 0.3 }} />
          <div style={{ position: "absolute", top: "50%", left: `${barPct}%`, transform: "translate(-50%,-50%)", width: "14px", height: "14px", background: trendColor, borderRadius: "50%", border: "2px solid #fff", boxShadow: `0 0 8px ${trendColor}`, transition: "left 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
          <span style={{ fontSize: "8px", color: t.sub }}>Bear Zone</span>
          <span style={{ fontSize: "8px", color: t.sub }}>Bull Zone</span>
        </div>
      </div>
    </div>
  );
}

function PriceDistanceMeter({ result, currentPrice, fmt, t }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [
    { label: "R3", value: result.r3, color: "#9f1239" }, { label: "R2", value: result.r2, color: "#dc2626" },
    { label: "R1", value: result.r1, color: "#ea580c" }, { label: "PP", value: result.pivot, color: "#2563eb" },
    { label: "S1", value: result.s1, color: "#16a34a" }, { label: "S2", value: result.s2, color: "#0891b2" },
    { label: "S3", value: result.s3, color: "#7c3aed" },
  ];
  const dists = levels.map(l => ({ ...l, dist: l.value - cp, absDist: Math.abs(l.value - cp), pct: (((l.value - cp) / cp) * 100).toFixed(2) }));
  const maxAbs = Math.max(...dists.map(d => d.absDist)) || 1;
  return (
    <div style={{ padding: "14px 16px", borderTop: `1px solid ${t.border}` }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "10px" }}>📏 PRICE DISTANCE METER</div>
      {dists.map(({ label, color, dist, absDist, pct }) => {
        const barW = (absDist / maxAbs) * 100, isUp = dist > 0;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <div style={{ width: "22px", fontSize: "9px", fontWeight: 700, color, textAlign: "right" }}>{label}</div>
            <div style={{ flex: 1, position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: "50%", top: "50%", width: "1px", height: "14px", background: t.border, transform: "translateY(-50%)" }} />
              {isUp ? <div style={{ position: "absolute", left: "50%", height: "6px", width: `${barW / 2}%`, background: `linear-gradient(90deg,${color}40,${color})`, borderRadius: "0 3px 3px 0", top: "50%", transform: "translateY(-50%)" }} />
                : <div style={{ position: "absolute", right: "50%", height: "6px", width: `${barW / 2}%`, background: `linear-gradient(270deg,${color}40,${color})`, borderRadius: "3px 0 0 3px", top: "50%", transform: "translateY(-50%)" }} />}
            </div>
            <div style={{ width: "52px", textAlign: "right" }}><span style={{ fontSize: "11px", fontWeight: 700, color: isUp ? "#16a34a" : "#dc2626" }}>{isUp ? "+" : ""}{pct}%</span></div>
            <div style={{ width: "44px", textAlign: "right" }}><span style={{ fontSize: "9px", color: t.sub }}>{isUp ? "+" : ""}{fmt(Math.round(dist))}</span></div>
          </div>
        );
      })}
      <div style={{ textAlign: "center", marginTop: "5px", fontSize: "9px", color: t.sub }}>◀ bearish | bullish ▶</div>
    </div>
  );
}

function AutoRiskCalc({ result, currentPrice, fmt, t, dark }) {
  const [capital, setCapital] = useState("10000000");
  const [riskPct, setRiskPct] = useState("2");
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const cap = parseFloat(capital.replace(/\D/g, "")), rPct = parseFloat(riskPct);
  if (isNaN(cap) || isNaN(rPct)) return null;
  const riskAmount = cap * (rPct / 100);
  const rpShareLong = Math.abs(cp - result.s1), rpShareShort = Math.abs(cp - result.r1);
  const lotLong = rpShareLong > 0 ? Math.floor(riskAmount / rpShareLong) : 0;
  const lotShort = rpShareShort > 0 ? Math.floor(riskAmount / rpShareShort) : 0;
  const fmtRp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
  const inpS = { width: "100%", padding: "9px 10px", background: t.input, border: `1.5px solid ${t.border}`, borderRadius: "8px", color: t.text, fontSize: "13px", fontWeight: 600, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px" }}>🧮</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>AUTO RISK CALCULATOR</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", display: "block", marginBottom: "4px" }}>MODAL (Rp)</label>
            <input type="number" value={capital} onChange={e => setCapital(e.target.value)} style={inpS} />
          </div>
          <div>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "#8b5cf6", display: "block", marginBottom: "4px" }}>RISK (%)</label>
            <div style={{ display: "flex", gap: "4px" }}>
              {["1", "2", "3"].map(v => (
                <button key={v} onClick={() => setRiskPct(v)} style={{ flex: 1, padding: "9px 4px", background: riskPct === v ? (dark ? "#4c1d95" : "#8b5cf6") : t.input, color: riskPct === v ? "#fff" : t.sub, border: `1.5px solid ${riskPct === v ? "#8b5cf6" : t.border}`, borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{v}%</button>
              ))}
            </div>
          </div>
        </div>
        {[
          { dir: "📈 LONG", sl: result.s1, lot: lotLong, color: "#16a34a", bg: dark ? "rgba(22,163,74,0.08)" : "#f0fdf4", border: "#bbf7d0" },
          { dir: "📉 SHORT", sl: result.r1, lot: lotShort, color: "#dc2626", bg: dark ? "rgba(220,38,38,0.08)" : "#fef2f2", border: "#fecaca" },
        ].map(({ dir, sl, lot, color, bg, border }) => (
          <div key={dir} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "10px 12px", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color }}>{dir} (SL: {fmt(sl)})</span>
              <span style={{ fontSize: "10px", color: t.sub }}>risk/share: {fmt(Math.round(Math.abs(cp - sl)))}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "6px" }}>
              {[["Max Lot", lot + " lot", color], ["Risk", fmtRp(riskAmount), "#f59e0b"], ["Nilai", fmtRp(lot * cp), "#2563eb"]].map(([l, v, c]) => (
                <div key={l} style={{ background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.8)", borderRadius: "6px", padding: "6px 8px" }}>
                  <div style={{ fontSize: "8px", color: t.sub, marginBottom: "2px" }}>{l}</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeSetup({ result, currentPrice, fmt, t, dark }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const setups = [];
  if (Math.abs(cp - result.pivot) / result.pivot < 0.015)
    setups.push({ name: "Bounce dari Pivot", type: cp > result.pivot ? "LONG" : "SHORT", entry: cp, sl: cp > result.pivot ? result.s1 : result.r1, tp: cp > result.pivot ? result.r1 : result.s1, confidence: 72, reason: "Harga mendekati Pivot Point, area konsolidasi kuat", color: cp > result.pivot ? "#16a34a" : "#dc2626" });
  if (cp > result.r1 * 0.995 && cp < result.r1 * 1.005)
    setups.push({ name: "Breakout R1", type: "LONG", entry: result.r1, sl: result.pivot, tp: result.r2, tp2: result.r3, confidence: 65, reason: "Harga menguji R1, potensi breakout menuju R2", color: "#ea580c" });
  if (cp > result.s1 * 0.995 && cp < result.s1 * 1.008)
    setups.push({ name: "Bounce dari S1", type: "LONG", entry: result.s1, sl: result.s2, tp: result.pivot, tp2: result.r1, confidence: 68, reason: "S1 support kuat, ideal untuk buy on dip", color: "#16a34a" });
  if (cp > result.r2 * 0.997 && cp < result.r2 * 1.01)
    setups.push({ name: "Rejection R2", type: "SHORT", entry: result.r2, sl: result.r3, tp: result.r1, tp2: result.pivot, confidence: 62, reason: "R2 resistance kuat, potensi reversal bearish", color: "#dc2626" });
  if (setups.length === 0) {
    const up = cp > result.pivot;
    setups.push({ name: up ? "Trend Following Long" : "Trend Following Short", type: up ? "LONG" : "SHORT", entry: cp, sl: up ? result.s1 : result.r1, tp: up ? result.r1 : result.s1, tp2: up ? result.r2 : result.s2, confidence: 55, reason: up ? "Harga di atas PP, bias bullish" : "Harga di bawah PP, bias bearish", color: up ? "#16a34a" : "#dc2626" });
  }
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "8px" }}>⚡ TRADE SETUP GENERATOR</div>
      {setups.map((s, i) => {
        const rr = s.tp && s.sl ? Math.abs(s.tp - s.entry) / Math.abs(s.sl - s.entry) : 0;
        return (
          <div key={i} style={{ background: s.type === "LONG" ? (dark ? "rgba(22,163,74,0.07)" : "#f0fdf4") : (dark ? "rgba(220,38,38,0.07)" : "#fef2f2"), border: `1px solid ${s.type === "LONG" ? "#bbf7d0" : "#fecaca"}`, borderRadius: "12px", padding: "14px", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: s.color, background: `${s.color}18`, padding: "2px 8px", borderRadius: "4px" }}>{s.type}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: t.text }}>{s.name}</span>
                </div>
                <div style={{ fontSize: "10px", color: t.sub }}>{s.reason}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "8px" }}>
                <div style={{ fontSize: "9px", color: t.sub }}>CONFIDENCE</div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: s.confidence >= 70 ? "#16a34a" : s.confidence >= 60 ? "#f59e0b" : "#f97316" }}>{s.confidence}%</div>
              </div>
            </div>
            <div style={{ height: "4px", background: dark ? "#1e293b" : "#e2e8f0", borderRadius: "99px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{ height: "100%", width: `${s.confidence}%`, background: s.confidence >= 70 ? "#16a34a" : s.confidence >= 60 ? "#f59e0b" : "#f97316", borderRadius: "99px", transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "6px" }}>
              {[["Entry", fmt(Math.round(s.entry)), t.text], ["Stop Loss", fmt(Math.round(s.sl)), "#ef4444"], ["Target 1", fmt(Math.round(s.tp)), "#16a34a"],
              ...(s.tp2 ? [["Target 2", fmt(Math.round(s.tp2)), "#0891b2"]] : []), ["Risk", fmt(Math.abs(Math.round(s.entry - s.sl))), "#f59e0b"], ["R/R", `1:${rr.toFixed(1)}`, "#8b5cf6"]].map(([label, val, color]) => (
                <div key={label} style={{ background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)", borderRadius: "6px", padding: "6px 8px" }}>
                  <div style={{ fontSize: "8px", color: t.sub, marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BANDAR ANALYZER COMPONENTS
// ═══════════════════════════════════════════════════════════

function PressureChart({ rows, dark, t }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !rows.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 44, r: 10, t: 12, b: 32 };
    const chartW = W - pad.l - pad.r, chartH = H - pad.t - pad.b;
    const n = rows.length, barW = Math.max(4, Math.floor(chartW / n) - 3);
    const maxAbs = Math.max(...rows.map(r => Math.abs(r.pressure)), 1);
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"; ctx.lineWidth = 1; ctx.stroke();
      const val = maxAbs - (maxAbs * 2 / 4) * i;
      ctx.fillStyle = dark ? "#6a8aaa" : "#64748b";
      ctx.font = `${9}px 'Segoe UI',sans-serif`; ctx.textAlign = "right";
      ctx.fillText(fmtNum(val), pad.l - 4, y + 3);
    }
    const zeroY = pad.t + chartH / 2;
    ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(W - pad.r, zeroY);
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"; ctx.lineWidth = 1.5; ctx.stroke();
    rows.forEach((r, i) => {
      const x = pad.l + (chartW / n) * i + (chartW / n - barW) / 2;
      const pct = Math.abs(r.pressure) / maxAbs, barH = Math.max(2, pct * (chartH / 2));
      const isBull = r.pressure >= 0, y = isBull ? zeroY - barH : zeroY;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (isBull) { grad.addColorStop(0, "#22c55e"); grad.addColorStop(1, "#16a34a40"); }
      else { grad.addColorStop(0, "#ef444440"); grad.addColorStop(1, "#dc2626"); }
      ctx.fillStyle = grad; ctx.fillRect(x, y, barW, barH);
      if (n <= 14 || i % Math.ceil(n / 10) === 0) {
        ctx.fillStyle = dark ? "#6a8aaa" : "#94a3b8"; ctx.font = `8px 'Segoe UI',sans-serif`; ctx.textAlign = "center";
        ctx.fillText(fmtDate(r.date), x + barW / 2, H - pad.b + 14);
      }
    });
  }, [rows, dark]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

function CumChart({ rows, dark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || rows.length < 2) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 44, r: 10, t: 12, b: 32 };
    const chartW = W - pad.l - pad.r, chartH = H - pad.t - pad.b;
    let cum = 0;
    const pts = rows.map(r => { cum += r.pressure; return cum; });
    const minP = Math.min(...pts), maxP = Math.max(...pts), range = maxP - minP || 1;
    const toX = (i) => pad.l + (i / (rows.length - 1)) * chartW;
    const toY = (v) => pad.t + chartH - ((v - minP) / range) * chartH;
    [0, 0.25, 0.5, 0.75, 1].forEach(pct => {
      const y = pad.t + chartH * pct;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = dark ? "#6a8aaa" : "#64748b"; ctx.font = `9px 'Segoe UI',sans-serif`; ctx.textAlign = "right";
      ctx.fillText(fmtNum(maxP - range * pct), pad.l - 4, y + 3);
    });
    ctx.beginPath();
    pts.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(rows.length - 1), pad.t + chartH); ctx.lineTo(toX(0), pad.t + chartH); ctx.closePath();
    const isUp = pts[pts.length - 1] >= pts[0];
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(0, isUp ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    pts.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = isUp ? "#22c55e" : "#ef4444"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    pts.forEach((v, i) => {
      if (rows.length <= 14 || i % Math.ceil(rows.length / 10) === 0 || i === rows.length - 1) {
        ctx.beginPath(); ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2); ctx.fillStyle = isUp ? "#22c55e" : "#ef4444"; ctx.fill();
      }
      if (rows.length <= 14 || i % Math.ceil(rows.length / 10) === 0) {
        ctx.fillStyle = dark ? "#6a8aaa" : "#94a3b8"; ctx.font = `8px 'Segoe UI',sans-serif`; ctx.textAlign = "center";
        ctx.fillText(fmtDate(rows[i].date), toX(i), H - pad.b + 14);
      }
    });
  }, [rows, dark]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

const BANDAR_SAMPLE = [
  { date: "2025-03-01", close: "1520", volume: "12500000" }, { date: "2025-03-03", close: "1545", volume: "18700000" },
  { date: "2025-03-04", close: "1530", volume: "9800000" }, { date: "2025-03-05", close: "1560", volume: "22300000" },
  { date: "2025-03-06", close: "1555", volume: "11200000" }, { date: "2025-03-07", close: "1580", volume: "25600000" },
  { date: "2025-03-10", close: "1570", volume: "14300000" }, { date: "2025-03-11", close: "1595", volume: "31200000" },
  { date: "2025-03-12", close: "1610", volume: "28900000" }, { date: "2025-03-13", close: "1600", volume: "16700000" },
];

// ═══════════════════════════════════════════════════════════
// PIVOT ANALYZER PAGE
// ═══════════════════════════════════════════════════════════
function PivotPage({ dark, t }) {
  const [high, setHigh] = useState(""); const [low, setLow] = useState(""); const [close, setClose] = useState("");
  const [currentPrice, setCurrentPrice] = useState(""); const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false); const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("pivot_history") || "[]"); } catch { return []; } });
  const [subTab, setSubTab] = useState("main");
  const [avgEntries, setAvgEntries] = useState([{ price: "", lot: "" }, { price: "", lot: "" }]);
  const [avgResult, setAvgResult] = useState(null);
  const [session] = useState(getSession());
  const [glowLevel, setGlowLevel] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv); }, []);

  const fmt = (n) => n != null ? n.toLocaleString("id-ID") : "—";
  const fmtDec = (n) => n != null ? parseFloat(n.toFixed(2)).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "—";
  const card = { background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", position: "relative", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.07)", transition: "background 0.3s" };
  const inp = { width: "100%", padding: "10px", background: t.input, border: `1.5px solid ${t.border}`, borderRadius: "8px", color: t.text, fontSize: "14px", fontWeight: 600, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const clear = () => { setHigh(""); setLow(""); setClose(""); setCurrentPrice(""); setResult(null); setProgress(0); setGlowLevel(null); };

  const hitung = () => {
    const h = parseFloat(high), l = parseFloat(low), c = parseFloat(close);
    if (isNaN(h) || isNaN(l) || isNaN(c)) return;
    setLoading(true); setProgress(0); setResult(null);
    let p = 0;
    const iv = setInterval(() => { p += Math.random() * 22 + 6; if (p >= 100) { p = 100; clearInterval(iv); } setProgress(Math.min(Math.round(p), 100)); }, 45);
    setTimeout(() => {
      const pivot = (h + l + c) / 3;
      const res = { pivot: Math.round(pivot), r1: Math.round(2 * pivot - l), r2: Math.round(pivot + (h - l)), r3: Math.round(h + 2 * (pivot - l)), s1: Math.round(2 * pivot - h), s2: Math.round(pivot - (h - l)), s3: Math.round(l - 2 * (h - pivot)), high: h, low: l, close: c };
      setResult(res); setLoading(false);
      const entry = { ...res, date: new Date().toLocaleDateString("id-ID"), time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
      const updated = [entry, ...history].slice(0, 10); setHistory(updated);
      try { localStorage.setItem("pivot_history", JSON.stringify(updated)); } catch {}
    }, 700);
  };

  const getSentiment = () => {
    if (!result || !currentPrice) return null;
    const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
    if (cp > result.r2) return { label: "Strong Bullish 🚀", color: "#15803d", bg: dark ? "#14532d" : "#dcfce7", border: "#86efac" };
    if (cp > result.r1) return { label: "Bullish 📈", color: "#22c55e", bg: dark ? "#166534" : "#f0fdf4", border: "#bbf7d0" };
    if (cp > result.pivot) return { label: "Mild Bullish 🟢", color: "#84cc16", bg: dark ? "#365314" : "#f7fee7", border: "#bef264" };
    if (cp > result.s1) return { label: "Mild Bearish 🟡", color: "#f59e0b", bg: dark ? "#78350f" : "#fffbeb", border: "#fde68a" };
    if (cp > result.s2) return { label: "Bearish 📉", color: "#f97316", bg: dark ? "#7c2d12" : "#fff7ed", border: "#fed7aa" };
    return { label: "Strong Bearish 💥", color: "#dc2626", bg: dark ? "#7f1d1d" : "#fef2f2", border: "#fecaca" };
  };

  const getNearest = () => {
    if (!result || !currentPrice) return null;
    const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
    const all = [{ label: "R3", value: result.r3 }, { label: "R2", value: result.r2 }, { label: "R1", value: result.r1 }, { label: "PP", value: result.pivot }, { label: "S1", value: result.s1 }, { label: "S2", value: result.s2 }, { label: "S3", value: result.s3 }];
    return { above: all.filter(x => x.value > cp).sort((a, b) => a.value - b.value)[0], below: all.filter(x => x.value < cp).sort((a, b) => b.value - a.value)[0], nearest: all.reduce((a, b) => Math.abs(a.value - cp) < Math.abs(b.value - cp) ? a : b) };
  };

  const copyAnalisa = () => {
    if (!result) return;
    const s = getSentiment();
    const text = `📊 PIVOT POINT ANALISA\n━━━━━━━━━━━━━━━━\nR3: ${fmt(result.r3)}\nR2: ${fmt(result.r2)}\nR1: ${fmt(result.r1)}\nPP: ${fmt(result.pivot)}\nS1: ${fmt(result.s1)}\nS2: ${fmt(result.s2)}\nS3: ${fmt(result.s3)}\n━━━━━━━━━━━━━━━━\n${s ? `Sentiment: ${s.label}\n` : ""}📈 NAIK: ${fmt(result.pivot)} → ${fmt(result.r1)} → ${fmt(result.r2)} → ${fmt(result.r3)}\n📉 TURUN: ${fmt(result.pivot)} → ${fmt(result.s1)} → ${fmt(result.s2)} → ${fmt(result.s3)}\n\n#PivotPoint #Trading #IDX`;
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const addEntry = () => setAvgEntries(e => [...e, { price: "", lot: "" }]);
  const removeEntry = (i) => setAvgEntries(e => e.filter((_, idx) => idx !== i));
  const updateEntry = (i, field, val) => setAvgEntries(e => e.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const hitungAvg = () => {
    const valid = avgEntries.filter(e => e.price !== "" && e.lot !== "" && !isNaN(parseFloat(e.price)) && !isNaN(parseFloat(e.lot)) && parseFloat(e.lot) > 0);
    if (!valid.length) return;
    const totalLot = valid.reduce((s, e) => s + parseFloat(e.lot), 0), totalValue = valid.reduce((s, e) => s + parseFloat(e.price) * parseFloat(e.lot), 0);
    setAvgResult({ avgPrice: totalValue / totalLot, totalLot, totalValue, count: valid.length });
  };
  const clearAvg = () => { setAvgEntries([{ price: "", lot: "" }, { price: "", lot: "" }]); setAvgResult(null); };

  const sentiment = getSentiment(), nearest = getNearest(), breakout = getBreakoutProb(result, currentPrice);
  const pivotStrength = getPivotStrength(result), autoBias = getAutoBias(result, currentPrice), smartZones = getSmartEntryZone(result, currentPrice);
  const cp = parseFloat(currentPrice);

  const levelDefs = result ? [
    { label: "R3", sub: "Resistance 3", value: result.r3, color: "#9f1239", light: dark ? "#4c0519" : "#fff1f2", border: "#fda4af" },
    { label: "R2", sub: "Resistance 2", value: result.r2, color: "#dc2626", light: dark ? "#3b0f0f" : "#fef2f2", border: "#fecaca" },
    { label: "R1", sub: "Resistance 1", value: result.r1, color: "#ea580c", light: dark ? "#431407" : "#fff7ed", border: "#fed7aa" },
    { label: "PP", sub: "Pivot Point", value: result.pivot, color: "#2563eb", light: dark ? "#1a2f50" : "#eff6ff", border: "#bfdbfe", bold: true },
    { label: "S1", sub: "Support 1", value: result.s1, color: "#16a34a", light: dark ? "#14532d" : "#f0fdf4", border: "#bbf7d0" },
    { label: "S2", sub: "Support 2", value: result.s2, color: "#0891b2", light: dark ? "#164e63" : "#ecfeff", border: "#a5f3fc" },
    { label: "S3", sub: "Support 3", value: result.s3, color: "#7c3aed", light: dark ? "#2e1065" : "#f5f3ff", border: "#c4b5fd" },
  ] : [];

  const floatPct = (() => {
    if (!result || !currentPrice || !levelDefs.length || isNaN(cp)) return null;
    const max = levelDefs[0].value, min = levelDefs[6].value, range = max - min;
    return range > 0 ? Math.min(Math.max(((cp - min) / range) * 100, 0), 100) : null;
  })();

  const subTabStyle = (active) => ({ flex: 1, padding: "9px 4px", background: active ? (dark ? "#1e3a5f" : "#0f172a") : "transparent", color: active ? "#fff" : t.sub, border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", minHeight: "36px" });

  return (
    <div>
      {/* Session */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: session.bg, border: `1px solid ${session.color}30`, borderRadius: "10px", padding: "9px 14px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: session.dot, boxShadow: `0 0 8px ${session.dot}`, animation: session.open ? "pulse 1.8s infinite" : "none" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: session.color }}>{session.name}</span>
          <span style={{ fontSize: "10px", color: t.sub }}>{session.open ? "• OPEN" : "• CLOSED"}</span>
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub }}>{time.toLocaleTimeString("id-ID")}</span>
      </div>

      {/* Sub tabs */}
      <div style={{ display: "flex", gap: "4px", background: t.card, padding: "4px", borderRadius: "12px", marginBottom: "14px", border: `1px solid ${t.border}` }}>
        {[["main", "📊 Analisa"], ["avg", "🧮 Avg Down"], ["history", "🕐 History"]].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)} style={subTabStyle(subTab === key)}>{label}</button>
        ))}
      </div>

      {/* MAIN */}
      {subTab === "main" && <>
        <div style={card}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>DATA OHLC · INPUT MANUAL</span>
            <button onClick={clear} style={{ fontSize: "11px", color: "#ef4444", background: dark ? "#3b0f0f" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>✕ Clear</button>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              {[{ label: "High", val: high, set: setHigh, color: "#dc2626", emoji: "↑" }, { label: "Low", val: low, set: setLow, color: "#16a34a", emoji: "↓" }, { label: "Close", val: close, set: setClose, color: "#2563eb", emoji: "●" }].map(({ label, val, set, color, emoji }) => (
                <div key={label}>
                  <label style={{ display: "flex", gap: "4px", fontSize: "11px", fontWeight: 700, color, marginBottom: "5px" }}>{emoji} {label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="0" style={inp}
                    onFocus={e => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${color}18`; }}
                    onBlur={e => { e.target.style.borderColor = t.border; e.target.style.boxShadow = "none"; }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8b5cf6", display: "block", marginBottom: "5px" }}>🎯 Harga Sekarang (opsional)</label>
              <input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="Aktifkan semua fitur analisa" style={inp}
                onFocus={e => { e.target.style.borderColor = "#8b5cf6"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = t.border; e.target.style.boxShadow = "none"; }} />
            </div>
            {loading && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "11px", color: t.sub }}>Menghitung pivot...</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>{progress}%</span>
                </div>
                <div style={{ height: "7px", background: t.border, borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed,#ec4899)", borderRadius: "99px", transition: "width 0.08s", boxShadow: "0 0 8px rgba(124,58,237,0.5)" }} />
                </div>
              </div>
            )}
            <button onClick={hitung} disabled={loading}
              style={{ width: "100%", padding: "13px", background: loading ? t.border : "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: loading ? t.sub : "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 800, cursor: loading ? "wait" : "pointer", boxShadow: loading ? "none" : "0 4px 16px rgba(124,58,237,0.35)", transition: "all 0.2s" }}>
              {loading ? `Menghitung... ${progress}%` : "⟳  Hitung Pivot Point"}
            </button>
          </div>
        </div>

        {/* Pivot Strength */}
        {pivotStrength && (
          <div style={{ ...card, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>💪 PIVOT STRENGTH</span>
              <span style={{ fontSize: "13px", fontWeight: 900, color: pivotStrength.color }}>{pivotStrength.label}</span>
            </div>
            <div style={{ height: "10px", background: t.border, borderRadius: "99px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ height: "100%", width: `${pivotStrength.strength}%`, background: "linear-gradient(90deg,#dc2626,#f59e0b,#16a34a)", borderRadius: "99px", transition: "width 0.9s ease", boxShadow: `0 0 8px ${pivotStrength.color}60` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[["Score", pivotStrength.strength + "/100", pivotStrength.color], ["Pivot Zone", fmt(Math.round(pivotStrength.pivotZone)) + " pt", "#2563eb"], ["R1-R2 Gap", fmt(Math.round(pivotStrength.r1r2Gap)) + " pt", "#ea580c"]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center", padding: "8px 6px", background: t.cardInner, borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: "8px", color: t.sub, marginBottom: "3px" }}>{l}</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend Arrow */}
        {result && currentPrice && <TrendArrow result={result} currentPrice={currentPrice} t={t} dark={dark} />}

        {/* Auto Bias */}
        {autoBias && (
          <div style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "10px" }}>🧠 AUTO BIAS ANALYZER</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "10px", color: t.sub, marginBottom: "3px" }}>REKOMENDASI BIAS</div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: autoBias.biasColor }}>{autoBias.bias}</div>
                <div style={{ fontSize: "13px", marginTop: "2px" }}>{autoBias.biasIcon}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: t.sub, marginBottom: "3px" }}>BULL SCORE</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: autoBias.bullScore > 50 ? "#16a34a" : "#dc2626" }}>{autoBias.bullScore}%</div>
              </div>
            </div>
            <div style={{ height: "8px", background: t.border, borderRadius: "99px", overflow: "hidden", marginBottom: "8px", display: "flex" }}>
              <div style={{ height: "100%", width: `${autoBias.bullScore}%`, background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: "99px 0 0 99px", transition: "width 0.8s" }} />
              <div style={{ height: "100%", flex: 1, background: "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: "0 99px 99px 0" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "6px" }}>
              {[["Di Atas", autoBias.above + " level", "#dc2626"], ["Di Bawah", autoBias.below + " level", "#16a34a"], ["Jarak PP", autoBias.distFromPP + "%", autoBias.biasColor]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center", padding: "7px 5px", background: t.cardInner, borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: "8px", color: t.sub, marginBottom: "2px" }}>{l}</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Smart Entry Zone */}
        {smartZones && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "8px" }}>🎯 SMART ENTRY ZONE</div>
            {smartZones.map((zone, i) => (
              <div key={i} style={{ background: zone.type === "LONG" ? (dark ? "rgba(22,163,74,0.08)" : "#f0fdf4") : (dark ? "rgba(220,38,38,0.08)" : "#fef2f2"), border: `1px solid ${zone.type === "LONG" ? "#bbf7d0" : "#fecaca"}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 900, color: zone.color, background: `${zone.color}15`, padding: "2px 7px", borderRadius: "4px" }}>{zone.type}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: t.text }}>{zone.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 900, background: zone.quality === "A+" ? (dark ? "rgba(22,163,74,0.2)" : "#dcfce7") : (dark ? "rgba(245,158,11,0.2)" : "#fffbeb"), color: zone.quality === "A+" ? "#16a34a" : "#f59e0b", padding: "2px 8px", borderRadius: "6px" }}>{zone.quality}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "6px" }}>
                  {[["Entry Low", fmt(Math.round(zone.entryLow)), zone.color], ["Entry High", fmt(Math.round(zone.entryHigh)), zone.color], ["Stop Loss", fmt(Math.round(zone.sl)), "#ef4444"], ["Target", fmt(Math.round(zone.tp)), "#16a34a"], ["Risk", fmt(Math.round(Math.abs(zone.entryLow - zone.sl))), "#f59e0b"], ["R/R", `1:${(Math.abs(zone.tp - zone.entryLow) / Math.abs(zone.entryLow - zone.sl)).toFixed(1)}`, "#8b5cf6"]].map(([l, v, c]) => (
                    <div key={l} style={{ background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.8)", borderRadius: "6px", padding: "6px 8px" }}>
                      <div style={{ fontSize: "8px", color: t.sub, marginBottom: "2px" }}>{l}</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentiment */}
        {sentiment && (
          <div style={{ background: sentiment.bg, border: `1px solid ${sentiment.border}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: t.sub, marginBottom: "2px", fontWeight: 600, letterSpacing: "1px" }}>MARKET SENTIMENT</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: sentiment.color }}>{sentiment.label}</div>
            </div>
            {nearest && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: t.sub, marginBottom: "2px" }}>TARGET TERDEKAT</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: t.text }}>↑ {nearest.above?.label ?? "—"} | {nearest.below?.label ?? "—"} ↓</div>
              </div>
            )}
          </div>
        )}

        {/* Breakout */}
        {breakout && (
          <div style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "10px" }}>📊 BREAKOUT PROBABILITY</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#16a34a" }}>▲ Bullish {breakout.bullPct}%</span>
              <span style={{ fontSize: "11px", color: t.sub }}>{breakout.momentum}</span>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#dc2626" }}>{breakout.bearPct}% Bearish ▼</span>
            </div>
            <div style={{ height: "10px", background: t.border, borderRadius: "99px", overflow: "hidden", marginBottom: "6px", display: "flex" }}>
              <div style={{ height: "100%", width: `${breakout.bullPct}%`, background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: "99px 0 0 99px", transition: "width 0.8s" }} />
              <div style={{ height: "100%", flex: 1, background: "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: "0 99px 99px 0" }} />
            </div>
          </div>
        )}

        {/* Pivot Ladder */}
        {levelDefs.length > 0 && (
          <div style={card}>
            <HeatmapBg levels={levelDefs} currentPrice={currentPrice} dark={dark} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>PIVOT LADDER</span>
                <span style={{ fontSize: "11px", color: t.sub }}>7 LEVEL · HEATMAP</span>
              </div>
              {levelDefs.map(({ label, sub, value, color, light, bold }, i) => {
                const isNearest = nearest?.nearest?.label === label, isAbove = nearest?.above?.label === label, isBelow = nearest?.below?.label === label;
                const pct = !isNaN(cp) ? (((value - cp) / cp) * 100).toFixed(2) : null, isPivot = label === "PP";
                return (
                  <SlideIn key={label} delay={i * 55}>
                    <div onMouseEnter={() => setGlowLevel(label)} onMouseLeave={() => setGlowLevel(null)}
                      style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < 6 ? `1px solid ${t.border}` : "none", background: isNearest ? light : "transparent", transition: "all 0.25s", boxShadow: glowLevel === label ? `inset 0 0 0 1px ${color}30` : isPivot ? `inset 0 0 0 1px ${color}20` : "none" }}>
                      <div style={{ width: "3px", height: "36px", background: color, borderRadius: "2px", marginRight: "12px", opacity: isNearest || isAbove || isBelow ? 1 : 0.28, boxShadow: (glowLevel === label || isPivot) ? `0 0 10px ${color}` : "none", transition: "box-shadow 0.3s" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color, textShadow: isPivot ? `0 0 12px ${color}80` : "none" }}>{label}</span>
                          {isNearest && <span style={{ fontSize: "8px", background: color, color: "#fff", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>TERDEKAT</span>}
                          {isAbove && !isNearest && <span style={{ fontSize: "8px", background: dark ? "#1e3a5f" : "#dbeafe", color: "#2563eb", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>TARGET ↑</span>}
                          {isBelow && !isNearest && <span style={{ fontSize: "8px", background: dark ? "#14532d" : "#dcfce7", color: "#16a34a", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>SUPPORT ↓</span>}
                        </div>
                        <div style={{ fontSize: "9px", color: t.sub }}>{sub}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: bold ? "19px" : "15px", fontWeight: 800, color: isNearest ? color : bold ? color : t.text, textShadow: isPivot ? `0 0 16px ${color}60` : "none" }}>
                          <AnimNum value={value} fmt={fmt} />
                        </div>
                        {pct !== null && <div style={{ fontSize: "9px", color: value > cp ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{value > cp ? "+" : ""}{pct}%</div>}
                      </div>
                    </div>
                  </SlideIn>
                );
              })}

              {/* Ladder viz */}
              <div style={{ padding: "14px 16px", borderTop: `1px solid ${t.border}` }}>
                <div style={{ fontSize: "10px", color: t.sub, marginBottom: "10px", fontWeight: 600, letterSpacing: "1px" }}>VISUALISASI LADDER</div>
                {levelDefs.map(({ label, value, color }) => {
                  const max = levelDefs[0].value, min = levelDefs[6].value, range = max - min, barPct = range > 0 ? ((value - min) / range) * 100 : 50;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <div style={{ width: "22px", fontSize: "9px", fontWeight: 700, color, textAlign: "right" }}>{label}</div>
                      <div style={{ flex: 1, height: "7px", background: dark ? "#1e293b" : "#f1f5f9", borderRadius: "99px", position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${barPct}%`, background: `linear-gradient(90deg,${color}40,${color})`, borderRadius: "99px", transition: "width 0.7s ease", boxShadow: `0 0 6px ${color}40` }} />
                        {floatPct !== null && <div style={{ position: "absolute", top: "-4px", left: `${floatPct}%`, width: "14px", height: "14px", background: "#f59e0b", borderRadius: "50%", border: "2px solid #fff", transform: "translateX(-50%)", zIndex: 3, boxShadow: "0 0 10px rgba(245,158,11,0.7)", transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} />}
                      </div>
                      <div style={{ width: "50px", fontSize: "9px", color: t.sub, textAlign: "right" }}>{fmt(value)}</div>
                    </div>
                  );
                })}
                {floatPct !== null && (
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: dark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px rgba(245,158,11,0.7)" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b" }}>Harga: {fmt(Math.round(cp))}</span>
                    {nearest?.nearest && <span style={{ fontSize: "10px", color: t.sub, marginLeft: "auto" }}>≈ {nearest.nearest.label}</span>}
                  </div>
                )}
              </div>
              <PriceDistanceMeter result={result} currentPrice={currentPrice} fmt={fmt} t={t} />
            </div>
          </div>
        )}

        {result && currentPrice && <AutoRiskCalc result={result} currentPrice={currentPrice} fmt={fmt} t={t} dark={dark} />}
        {result && currentPrice && <TradeSetup result={result} currentPrice={currentPrice} fmt={fmt} t={t} dark={dark} />}

        {result && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
              {[
                { dir: "NAIK", icon: "📈", color: "#16a34a", bg: dark ? "#14532d" : "#f0fdf4", border: "#bbf7d0", textColor: dark ? "#bbf7d0" : "#166534", path: `Di atas ${fmt(result.pivot)} → ${fmt(result.r1)} → ${fmt(result.r2)} → ${fmt(result.r3)}` },
                { dir: "TURUN", icon: "📉", color: "#dc2626", bg: dark ? "#7f1d1d" : "#fef2f2", border: "#fecaca", textColor: dark ? "#fecaca" : "#991b1b", path: `Di bawah ${fmt(result.pivot)} → ${fmt(result.s1)} → ${fmt(result.s2)} → ${fmt(result.s3)}` },
              ].map(({ dir, icon, color, bg, border, textColor, path }) => (
                <div key={dir} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}><span>{icon}</span><span style={{ fontSize: "11px", fontWeight: 800, color }}>SKENARIO {dir}</span></div>
                  <p style={{ margin: 0, fontSize: "12px", color: textColor, lineHeight: 1.7 }}>{path}</p>
                </div>
              ))}
            </div>
            <button onClick={copyAnalisa} style={{ width: "100%", padding: "13px", background: copied ? "#16a34a" : "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 800, cursor: "pointer", transition: "background 0.3s", boxShadow: copied ? "0 4px 14px rgba(22,163,74,0.4)" : "0 4px 14px rgba(37,99,235,0.35)" }}>
              {copied ? "✅ Berhasil Disalin!" : "📋 Copy Analisa"}
            </button>
          </div>
        )}
      </>}

      {/* AVG DOWN */}
      {subTab === "avg" && (
        <div>
          <div style={card}>
            <div style={{ padding: "13px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>🧮 KALKULATOR AVERAGE</span>
              <button onClick={clearAvg} style={{ fontSize: "11px", color: "#ef4444", background: dark ? "#3b0f0f" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>✕ Reset</button>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: "8px", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub }}>HARGA BELI</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub }}>JUMLAH LOT</div>
                <div />
              </div>
              {avgEntries.map((entry, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <input type="number" value={entry.price} placeholder="1550" onChange={e => updateEntry(i, "price", e.target.value)} style={inp} />
                  <input type="number" value={entry.lot} placeholder="Lot" onChange={e => updateEntry(i, "lot", e.target.value)} style={inp} />
                  <button onClick={() => avgEntries.length > 1 ? removeEntry(i) : null} style={{ width: "36px", height: "36px", background: avgEntries.length > 1 ? (dark ? "#3b0f0f" : "#fef2f2") : t.input, border: `1px solid ${avgEntries.length > 1 ? "#fecaca" : t.border}`, borderRadius: "8px", color: avgEntries.length > 1 ? "#ef4444" : t.sub, cursor: avgEntries.length > 1 ? "pointer" : "default", fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                </div>
              ))}
              <button onClick={addEntry} style={{ width: "100%", padding: "9px", background: "transparent", border: `1.5px dashed ${t.border}`, borderRadius: "8px", color: t.sub, fontSize: "12px", fontWeight: 600, cursor: "pointer", marginBottom: "12px" }}>+ Tambah Baris</button>
              <button onClick={hitungAvg} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#16a34a,#0891b2)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>🧮 Hitung Average</button>
            </div>
          </div>
          {avgResult && (
            <div style={card}>
              <div style={{ padding: "13px 16px", borderBottom: `1px solid ${t.border}` }}><span style={{ fontSize: "11px", fontWeight: 700, color: t.sub }}>HASIL KALKULASI</span></div>
              <div style={{ padding: "16px" }}>
                <div style={{ textAlign: "center", padding: "16px", background: t.cardInner, borderRadius: "10px", marginBottom: "14px", border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: "11px", color: t.sub, marginBottom: "4px", fontWeight: 600 }}>HARGA RATA-RATA</div>
                  <div style={{ fontSize: "32px", fontWeight: 900, color: "#2563eb" }}><AnimNum value={avgResult.avgPrice} fmt={fmtDec} /></div>
                </div>
                {[["Total Lot", fmtDec(avgResult.totalLot) + " lot", "#16a34a"], ["Total Nilai", "Rp " + fmt(Math.round(avgResult.totalValue * 100)), "#f59e0b"], ["Jumlah Transaksi", avgResult.count + " transaksi", "#8b5cf6"]].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ fontSize: "13px", color: t.sub }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {subTab === "history" && (
        <div style={card}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>🕐 RIWAYAT KALKULASI</span>
            {history.length > 0 && <button onClick={() => { setHistory([]); try { localStorage.removeItem("pivot_history"); } catch {} }} style={{ fontSize: "10px", color: "#ef4444", background: dark ? "#3b0f0f" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}>Hapus Semua</button>}
          </div>
          {history.length === 0 ? <div style={{ textAlign: "center", padding: "40px 20px", color: t.sub }}>Belum ada riwayat 📭</div>
            : history.map((h, i) => (
              <div key={i} style={{ padding: "13px 16px", borderBottom: i < history.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: t.text }}>H:{fmt(Math.round(h.high))} L:{fmt(Math.round(h.low))} C:{fmt(Math.round(h.close))}</span>
                  <span style={{ fontSize: "10px", color: t.sub }}>{h.date} {h.time}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
                  {[["R3", h.r3, "#9f1239"], ["R2", h.r2, "#dc2626"], ["R1", h.r1, "#ea580c"], ["PP", h.pivot, "#2563eb"], ["S1", h.s1, "#16a34a"], ["S2", h.s2, "#0891b2"], ["S3", h.s3, "#7c3aed"]].map(([label, val, color]) => (
                    <div key={label} style={{ textAlign: "center", padding: "5px 3px", background: t.cardInner, borderRadius: "6px", border: `1px solid ${t.border}` }}>
                      <div style={{ fontSize: "8px", fontWeight: 700, color }}>{label}</div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: t.text }}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BANDAR ANALYZER PAGE
// ═══════════════════════════════════════════════════════════
function BandarPage({ dark, t }) {
  const [ticker, setTicker]           = useState("BBCA");
  const [rows, setRows]               = useState(BANDAR_SAMPLE);
  const [result, setResult]           = useState(null);
  const [activeChart, setActiveChart] = useState("bar");
  const [bandarSubTab, setBandarSubTab] = useState("input");
  const wl = useWatchlist();

  const card = { background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.6)" : "0 2px 12px rgba(0,0,0,0.07)" };
  const inp = { width: "100%", padding: "8px 10px", background: t.input, border: `1.5px solid ${t.border}`, borderRadius: "8px", color: t.text, fontSize: "13px", fontWeight: 600, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const addRow = () => setRows(r => [...r, { date: "", close: "", volume: "" }]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => setRows(r => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const analyze = useCallback(() => {
    const valid = rows.filter(r => r.date && r.close !== "" && r.volume !== "" && !isNaN(parseFloat(r.close)) && !isNaN(parseFloat(r.volume)));
    if (valid.length < 2) return;
    const sorted = [...valid].sort((a, b) => new Date(a.date) - new Date(b.date));
    const computed = sorted.map((r, i) => {
      const close = parseFloat(r.close), volume = parseFloat(r.volume);
      const prevClose = i > 0 ? parseFloat(sorted[i - 1].close) : close;
      const change = close - prevClose;
      return { date: r.date, close, volume, change: i === 0 ? 0 : change, pressure: i === 0 ? 0 : change * volume };
    }).slice(1);

    const bullPressure = computed.filter(r => r.pressure > 0).reduce((s, r) => s + r.pressure, 0);
    const bearPressure = computed.filter(r => r.pressure < 0).reduce((s, r) => s + r.pressure, 0);
    const netPressure = bullPressure + bearPressure;
    const ratio = bullPressure > 0 ? bullPressure / (bullPressure + Math.abs(bearPressure)) : 0;

    let status, signal, statusColor, signalColor;
    if (netPressure > 0) {
      status = "ACCUMULATION"; statusColor = "#22c55e";
      if (ratio > 0.7) { signal = "Strong Accumulation 🚀"; signalColor = "#15803d"; }
      else if (ratio > 0.55) { signal = "Weak Accumulation 📈"; signalColor = "#22c55e"; }
      else { signal = "Possible Markup Phase ⚡"; signalColor = "#84cc16"; }
    } else if (netPressure < 0) {
      status = "DISTRIBUTION"; statusColor = "#ef4444"; signal = "Distribution Phase 📉"; signalColor = "#dc2626";
    } else {
      status = "NEUTRAL"; statusColor = "#f59e0b"; signal = "Neutral / Consolidation ⚖️"; signalColor = "#f59e0b";
    }

    // ── 1. BANDAR INVENTORY ────────────────────────────────
    const totalAccum = bullPressure;
    const totalDistrib = Math.abs(bearPressure);
    const inventoryPct = (totalAccum + totalDistrib) > 0
      ? Math.round((totalAccum / (totalAccum + totalDistrib)) * 100) : 50;

    // ── 2. BANDAR TRAP DETECTOR ────────────────────────────
    const priceChange = computed.length > 1 ? computed[computed.length-1].close - computed[0].close : 0;
    const recentRows  = computed.slice(-5);
    const recentNet   = recentRows.reduce((s, r) => s + r.pressure, 0);
    const recentBull  = recentRows.filter(r => r.pressure > 0).reduce((s, r) => s + r.pressure, 0);
    const recentBear  = recentRows.filter(r => r.pressure < 0).reduce((s, r) => s + r.pressure, 0);
    const isTrap      = priceChange > 0 && recentNet < 0;
    const isWeakBull  = priceChange > 0 && recentBull < Math.abs(recentBear) * 0.6;
    const trapLevel   = isTrap ? "HIGH" : isWeakBull ? "MEDIUM" : "LOW";
    const trapColor   = trapLevel === "HIGH" ? "#dc2626" : trapLevel === "MEDIUM" ? "#f59e0b" : "#22c55e";

    // ── 3. BANDAR ACTIVITY TIMELINE ────────────────────────
    const half       = Math.floor(computed.length / 2);
    const firstNet   = computed.slice(0, half).reduce((s, r) => s + r.pressure, 0);
    const secondNet  = computed.slice(half).reduce((s, r) => s + r.pressure, 0);
    let timelinePhase;
    if      (firstNet > 0 && secondNet > 0 && priceChange > 0) timelinePhase = "MARKUP";
    else if (firstNet > 0 && secondNet < 0)                    timelinePhase = "DISTRIBUTION";
    else if (firstNet < 0 && secondNet < 0 && priceChange < 0) timelinePhase = "MARKDOWN";
    else                                                        timelinePhase = "ACCUMULATION";

    // ── 4. LIQUIDITY MAGNET ────────────────────────────────
    const closes  = computed.map(r => r.close);
    const minP    = Math.min(...closes), maxP = Math.max(...closes);
    const zSize   = (maxP - minP) / 3 || 10;
    const zones   = [0,1,2].map(i => {
      const low = minP + zSize*i, high = minP + zSize*(i+1);
      const vol = computed.filter(r => r.close >= low && r.close <= high).reduce((s,r)=>s+r.volume,0);
      return { low, high, vol };
    }).sort((a,b) => b.vol - a.vol);
    const magnetZone = zones[0];

    // ── 5. SMART MONEY FLOW MAP ────────────────────────────
    const maxAbsP  = Math.max(...computed.map(r => Math.abs(r.pressure)), 1);
    const flowMap  = computed.map(r => ({ date: r.date, intensity: r.pressure / maxAbsP, close: r.close, date_short: r.date.slice(5) }));

    // ── 6. SMART MONEY SIGNALS ─────────────────────────────
    const smSignals = [];
    if (ratio > 0.7  && netPressure > 0)       smSignals.push({ label: "Strong Accumulation",  color: "#15803d", bg: dark?"#14532d":"#dcfce7", icon: "🏦" });
    if (priceChange > 0 && ratio > 0.6 && netPressure > 0) smSignals.push({ label: "Possible Pump Setup", color: "#0891b2", bg: dark?"#164e63":"#ecfeff", icon: "🚀" });
    if (netPressure < 0 && ratio < 0.4)        smSignals.push({ label: "Hidden Distribution",  color: "#7c3aed", bg: dark?"#2e1065":"#f5f3ff", icon: "🕵️" });
    if (isTrap)                                 smSignals.push({ label: "Bandar Trap Warning",  color: "#dc2626", bg: dark?"#7f1d1d":"#fef2f2", icon: "⚠️" });
    if (isWeakBull && !isTrap)                  smSignals.push({ label: "Weak Bull — Caution", color: "#f59e0b", bg: dark?"#78350f":"#fffbeb", icon: "⚡" });
    if (smSignals.length === 0)                 smSignals.push({ label: "Neutral / Wait",       color: "#64748b", bg: dark?"#1e293b":"#f8fafc", icon: "⏳" });

    const finalResult = {
      rows: computed, bullPressure, bearPressure, netPressure, ratio,
      status, statusColor, signal, signalColor,
      inventoryPct, trapLevel, trapColor, isTrap, isWeakBull,
      timelinePhase, magnetZone, flowMap, smSignals, priceChange,
    };
    setResult(finalResult);
    saveAnalysisHistory(ticker, finalResult);
    setBandarSubTab("result");
  }, [rows, dark, ticker]);

  const bullAnim = useAnimatedNumber(result?.bullPressure ?? 0);
  const bearAnim = useAnimatedNumber(result ? Math.abs(result.bearPressure) : 0);
  const netAnim = useAnimatedNumber(result?.netPressure ?? 0);

  const subTabStyle = (active) => ({ flex: 1, padding: "9px 4px", background: active ? (dark ? "#1a3a5c" : "#0f172a") : "transparent", color: active ? "#fff" : t.sub, border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", minHeight: "36px" });

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: "4px", background: t.card, padding: "4px", borderRadius: "12px", marginBottom: "14px", border: `1px solid ${t.border}` }}>
        {[["input", "📥 Input Data"], ["result", "📊 Hasil"], ["guide", "📖 Panduan"]].map(([key, label]) => (
          <button key={key} onClick={() => setBandarSubTab(key)} style={subTabStyle(bandarSubTab === key)}>{label}</button>
        ))}
      </div>

      {/* INPUT */}
      {bandarSubTab === "input" && (
        <div>
          {/* ── Reminder ── */}
          <ReminderButton dark={dark} t={t} />

          {/* ── Watchlist ── */}
          <WatchlistBar dark={dark} t={t} currentSymbol={ticker}
            onSelect={(sym) => {
              setTicker(sym);
              // auto scroll ke fetch panel
            }}
          />

          {/* ── Yahoo Finance Fetch for Bandar ── */}
          <StockFetchPanel
            dark={dark} t={t} mode="bandar"
            onFetched={({ rows: fetchedRows, symbol }) => {
              setRows(fetchedRows);
              setTicker(symbol);
            }}
          />

          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>KODE SAHAM</span>
              <button onClick={() => setRows(BANDAR_SAMPLE)} style={{ fontSize: "10px", color: "#2563eb", background: dark ? "rgba(37,99,235,0.12)" : "#dbeafe", border: "1px solid #3b82f6", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>📋 Load Sample</button>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="Contoh: BBCA, TLKM" style={{ ...inp, flex: 1, fontSize: "16px", fontWeight: 800, letterSpacing: "1px" }} />
                <button onClick={() => wl.has(ticker) ? wl.remove(ticker) : wl.add(ticker)}
                  title={wl.has(ticker) ? "Hapus dari watchlist" : "Simpan ke watchlist"}
                  style={{ width: "42px", height: "42px", flexShrink: 0, background: wl.has(ticker) ? (dark?"rgba(245,158,11,0.15)":"#fffbeb") : t.input, border: `1.5px solid ${wl.has(ticker)?"#f59e0b":t.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {wl.has(ticker) ? "⭐" : "☆"}
                </button>
              </div>
              <div style={{ marginTop: "6px", fontSize: "10px", color: t.sub }}>
                {wl.has(ticker) ? "⭐ Tersimpan di watchlist — klik bintang untuk hapus" : "☆ Klik bintang untuk simpan ke watchlist favorit"}
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>DATA HARIAN ({rows.length} baris)</span>
              <button onClick={() => setRows([])} style={{ fontSize: "10px", color: "#ef4444", background: dark ? "#3b0f0f" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>✕ Hapus</button>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 28px", gap: "6px", marginBottom: "6px" }}>
                {["Tanggal", "Close", "Volume", ""].map(h => <div key={h} style={{ fontSize: "9px", fontWeight: 700, color: t.sub }}>{h}</div>)}
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 28px", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                    <input type="date" value={row.date} onChange={e => updateRow(i, "date", e.target.value)} style={{ ...inp, padding: "7px 8px", fontSize: "11px" }} />
                    <input type="number" value={row.close} onChange={e => updateRow(i, "close", e.target.value)} placeholder="1500" style={{ ...inp, padding: "7px 8px" }}
                      onFocus={e => { e.target.style.borderColor = "#22c55e"; }} onBlur={e => { e.target.style.borderColor = t.border; }} />
                    <input type="number" value={row.volume} onChange={e => updateRow(i, "volume", e.target.value)} placeholder="10000000" style={{ ...inp, padding: "7px 8px" }}
                      onFocus={e => { e.target.style.borderColor = "#2563eb"; }} onBlur={e => { e.target.style.borderColor = t.border; }} />
                    <button onClick={() => removeRow(i)} style={{ width: "28px", height: "28px", background: dark ? "#3b0f0f" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#ef4444", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  </div>
                ))}
              </div>
              <button onClick={addRow} style={{ width: "100%", marginTop: "6px", padding: "8px", background: "transparent", border: `1.5px dashed ${t.border}`, borderRadius: "8px", color: t.sub, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>+ Tambah Baris</button>
            </div>
          </div>
          <button onClick={analyze} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", marginBottom: "12px" }}>
            🔍 Analisa Tekanan Bandar
          </button>
        </div>
      )}

      {/* RESULT */}
      {bandarSubTab === "result" && !result && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.sub }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
          <div style={{ fontSize: "14px", fontWeight: 700 }}>Belum ada hasil analisa</div>
          <div style={{ fontSize: "12px", marginTop: "6px" }}>Masuk ke tab Input Data dan klik Analisa</div>
        </div>
      )}

      {bandarSubTab === "result" && result && (
        <div>
          {/* Status */}
          <div style={{ background: result.netPressure > 0 ? (dark ? "rgba(22,163,74,0.1)" : "#f0fdf4") : result.netPressure < 0 ? (dark ? "rgba(239,68,68,0.1)" : "#fef2f2") : (dark ? "rgba(245,158,11,0.1)" : "#fffbeb"), border: `1.5px solid ${result.statusColor}40`, borderRadius: "16px", padding: "18px 20px", marginBottom: "12px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: "16px", top: "12px", fontSize: "48px", opacity: 0.08 }}>{result.status === "ACCUMULATION" ? "📈" : "📉"}</div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "4px" }}>{ticker} · BANDAR STATUS</div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: result.statusColor, marginBottom: "4px" }}>{result.status}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: result.signalColor }}>{result.signal}</div>
            <div style={{ marginTop: "12px", height: "6px", background: dark ? "#1e293b" : "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(result.ratio * 100)}%`, background: `linear-gradient(90deg,${result.statusColor}60,${result.statusColor})`, borderRadius: "99px", transition: "width 1s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontSize: "9px", color: "#ef4444" }}>Bear 0%</span>
              <span style={{ fontSize: "9px", color: result.statusColor, fontWeight: 700 }}>Bull Ratio: {Math.round(result.ratio * 100)}%</span>
              <span style={{ fontSize: "9px", color: "#22c55e" }}>Bull 100%</span>
            </div>
          </div>

          {/* Simplified View */}
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>💹 SIMPLIFIED TRADER VIEW</span>
            </div>
            <div style={{ padding: "16px" }}>
              {[["🟢 Bull Pressure", fmtNum(bullAnim), "#22c55e"], ["🔴 Bear Pressure", fmtNum(Math.abs(bearAnim)), "#ef4444"], [result.netPressure >= 0 ? "✅ Net Pressure" : "❌ Net Pressure", (result.netPressure >= 0 ? "+" : "-") + fmtNum(Math.abs(netAnim)), result.statusColor]].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: "13px", color: t.sub }}>{label}</span>
                  <span style={{ fontSize: "15px", fontWeight: 900, color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", padding: "12px 14px", background: result.status === "ACCUMULATION" ? (dark ? "rgba(22,163,74,0.12)" : "#f0fdf4") : (dark ? "rgba(239,68,68,0.12)" : "#fef2f2"), border: `1px solid ${result.statusColor}50`, borderRadius: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: t.sub }}>Bandar Status</span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: result.statusColor }}>: {result.status}</span>
              </div>
            </div>
          </div>

          {/* ── Comparison Card ── */}
          <ComparisonCard ticker={ticker} currentResult={result} dark={dark} t={t} />

          {/* Charts */}
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>📉 VISUAL PRESSURE GRAPH</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {[["bar", "Bar"], ["cum", "Kumulatif"]].map(([k, l]) => (
                  <button key={k} onClick={() => setActiveChart(k)} style={{ fontSize: "10px", padding: "3px 10px", background: activeChart === k ? "#2563eb" : t.input, color: activeChart === k ? "#fff" : t.sub, border: `1px solid ${activeChart === k ? "#2563eb" : t.border}`, borderRadius: "6px", cursor: "pointer", fontWeight: 700 }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: "12px 8px", height: "180px" }}>
              {activeChart === "bar" ? <PressureChart rows={result.rows} dark={dark} t={t} /> : <CumChart rows={result.rows} dark={dark} />}
            </div>
          </div>

          {/* Table */}
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>📋 PRESSURE TABLE</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", minWidth: "320px" }}>
                <thead>
                  <tr style={{ background: t.cardInner }}>
                    {["Tanggal", "Close", "Δ Harga", "Volume", "Pressure"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Tanggal" ? "left" : "right", color: t.sub, fontWeight: 700, fontSize: "9px", letterSpacing: "0.5px", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.border}20`, background: r.pressure > 0 ? (dark ? "rgba(22,163,74,0.04)" : "rgba(22,163,74,0.03)") : r.pressure < 0 ? (dark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)") : "transparent" }}>
                      <td style={{ padding: "8px 10px", color: t.sub, fontSize: "10px" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: t.text }}>{r.close.toLocaleString("id-ID")}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: r.change > 0 ? "#22c55e" : r.change < 0 ? "#ef4444" : t.sub }}>{r.change > 0 ? "+" : ""}{r.change}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: t.sub }}>{fmtNum(r.volume)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: r.pressure > 0 ? "#22c55e" : r.pressure < 0 ? "#ef4444" : t.sub }}>{r.pressure > 0 ? "+" : ""}{fmtNum(r.pressure)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: t.cardInner, borderTop: `1px solid ${t.border}` }}>
                    <td colSpan={4} style={{ padding: "10px", fontWeight: 700, color: t.sub, fontSize: "10px" }}>NET PRESSURE</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: "13px", color: result.statusColor }}>{result.netPressure > 0 ? "+" : ""}{fmtNum(result.netPressure)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bull vs Bear */}
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>🥊 BULL VS BEAR SUMMARY</span>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                {[{ label: "Total Bull", value: result.bullPressure, color: "#22c55e", bg: dark ? "rgba(22,163,74,0.1)" : "#f0fdf4", border: "#bbf7d0", icon: "📈" }, { label: "Total Bear", value: Math.abs(result.bearPressure), color: "#ef4444", bg: dark ? "rgba(239,68,68,0.1)" : "#fef2f2", border: "#fecaca", icon: "📉" }].map(({ label, value, color, bg, border, icon }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icon}</div>
                    <div style={{ fontSize: "9px", color: t.sub, marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "16px", fontWeight: 900, color }}>{fmtNum(value)}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: "10px", background: "#ef4444", borderRadius: "99px", overflow: "hidden", marginBottom: "8px" }}>
                <div style={{ height: "100%", width: `${Math.round(result.ratio * 100)}%`, background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: "99px", transition: "width 1s ease" }} />
              </div>
              <div style={{ textAlign: "center", padding: "10px", background: t.cardInner, borderRadius: "10px", border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: "9px", color: t.sub, marginBottom: "2px" }}>NET PRESSURE</div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: result.statusColor }}>{result.netPressure > 0 ? "+" : ""}{fmtNum(result.netPressure)}</div>
              </div>
            </div>
          </div>

          {/* ═══ 1. BANDAR INVENTORY ═══ */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark?"0 4px 24px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>📦</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>BANDAR INVENTORY</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 900, color: result.inventoryPct >= 60 ? "#22c55e" : result.inventoryPct >= 40 ? "#f59e0b" : "#ef4444" }}>{result.inventoryPct}% tersisa</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ marginBottom: "8px", height: "14px", background: dark?"#1e293b":"#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${result.inventoryPct}%`, background: result.inventoryPct >= 60 ? "linear-gradient(90deg,#16a34a,#22c55e)" : result.inventoryPct >= 40 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#dc2626,#ef4444)", borderRadius: "99px", transition: "width 1s ease", boxShadow: `0 0 10px ${result.inventoryPct>=60?"#22c55e":result.inventoryPct>=40?"#f59e0b":"#ef4444"}60` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", color: t.sub }}>Distribusi Habis 0%</span>
                <span style={{ fontSize: "9px", color: t.sub }}>Penuh 100%</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[["Total Akumulasi", fmtNum(result.bullPressure), "#22c55e"], ["Total Distribusi", fmtNum(Math.abs(result.bearPressure)), "#ef4444"], ["Estimasi Sisa", result.inventoryPct+"%", result.inventoryPct>=60?"#22c55e":result.inventoryPct>=40?"#f59e0b":"#ef4444"]].map(([l,v,c])=>(
                  <div key={l} style={{ background: t.cardInner, borderRadius: "8px", padding: "8px 10px", border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: "8px", color: t.sub, marginBottom: "3px" }}>{l}</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "10px", padding: "8px 10px", background: result.inventoryPct>=60?(dark?"rgba(22,163,74,0.08)":"#f0fdf4"):result.inventoryPct>=40?(dark?"rgba(245,158,11,0.08)":"#fffbeb"):(dark?"rgba(239,68,68,0.08)":"#fef2f2"), borderRadius: "8px", fontSize: "11px", color: result.inventoryPct>=60?"#16a34a":result.inventoryPct>=40?"#f59e0b":"#ef4444", fontWeight: 600 }}>
                {result.inventoryPct >= 60 ? "🏦 Bandar masih menyimpan banyak saham. Potensi markup belum selesai." : result.inventoryPct >= 40 ? "⚖️ Bandar mulai melepas sebagian. Pantau volume distribusi." : "🚨 Inventory tipis. Bandar kemungkinan sudah banyak distribusi."}
              </div>
            </div>
          </div>

          {/* ═══ 2. BANDAR TRAP DETECTOR ═══ */}
          <div style={{ background: result.trapLevel==="HIGH"?(dark?"rgba(220,38,38,0.1)":"#fef2f2"):result.trapLevel==="MEDIUM"?(dark?"rgba(245,158,11,0.08)":"#fffbeb"):(dark?"rgba(22,163,74,0.08)":"#f0fdf4"), border: `1.5px solid ${result.trapColor}40`, borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "38px", height: "38px", background: `${result.trapColor}20`, border: `2px solid ${result.trapColor}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                  {result.trapLevel==="HIGH"?"🪤":result.trapLevel==="MEDIUM"?"⚡":"✅"}
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: t.sub, letterSpacing: "1px", marginBottom: "2px" }}>BANDAR TRAP DETECTOR</div>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: result.trapColor }}>
                    {result.trapLevel==="HIGH"?"⚠️ TRAP WARNING":result.trapLevel==="MEDIUM"?"⚡ CAUTION":"✅ AMAN"}
                  </div>
                </div>
              </div>
              <div style={{ padding: "4px 10px", background: `${result.trapColor}20`, border: `1px solid ${result.trapColor}`, borderRadius: "20px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: result.trapColor }}>{result.trapLevel} RISK</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
              {[["Δ Harga", (result.priceChange>0?"+":"")+Math.round(result.priceChange), result.priceChange>0?"#22c55e":"#ef4444"], ["Net 5 Hari", result.isTrap?"Negatif ↓":"Positif ↑", result.isTrap?"#ef4444":"#22c55e"], ["Bull Lemah", result.isWeakBull?"Ya ⚠️":"Tidak ✓", result.isWeakBull?"#f59e0b":"#22c55e"]].map(([l,v,c])=>(
                <div key={l} style={{ background: dark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.7)", borderRadius: "8px", padding: "7px 8px" }}>
                  <div style={{ fontSize: "8px", color: t.sub, marginBottom: "2px" }}>{l}</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: t.sub, lineHeight: 1.6 }}>
              {result.trapLevel==="HIGH" ? "🚨 Harga naik tapi tekanan jual mendominasi. Kemungkinan bandar memancing retail sebelum turun (bull trap)." : result.trapLevel==="MEDIUM" ? "⚡ Kenaikan harga tidak didukung volume beli kuat. Berhati-hati masuk posisi." : "✅ Tidak ada indikasi trap. Pergerakan harga didukung tekanan beli yang sehat."}
            </div>
          </div>

          {/* ═══ 3. BANDAR ACTIVITY TIMELINE ═══ */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark?"0 4px 24px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>📅</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>BANDAR ACTIVITY TIMELINE</span>
            </div>
            <div style={{ padding: "16px" }}>
              {(() => {
                const phases = [
                  { key: "ACCUMULATION", label: "Akumulasi",    icon: "🏦", color: "#2563eb" },
                  { key: "MARKUP",       label: "Markup",       icon: "🚀", color: "#22c55e" },
                  { key: "DISTRIBUTION", label: "Distribusi",   icon: "💸", color: "#f59e0b" },
                  { key: "MARKDOWN",     label: "Markdown",     icon: "📉", color: "#ef4444" },
                ];
                const activeIdx = phases.findIndex(p => p.key === result.timelinePhase);
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                      {phases.map((p, i) => (
                        <div key={p.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: i === activeIdx ? p.color : (dark?"#1e293b":"#f1f5f9"), border: `2px solid ${i === activeIdx ? p.color : (dark?"#334155":"#e2e8f0")}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i===activeIdx?"18px":"14px", transition: "all 0.3s", boxShadow: i===activeIdx?`0 0 14px ${p.color}80`:"none", marginBottom: "5px" }}>
                              {p.icon}
                            </div>
                            <div style={{ fontSize: "9px", fontWeight: i===activeIdx?800:500, color: i===activeIdx?p.color:t.sub, textAlign: "center", lineHeight: 1.2 }}>{p.label}</div>
                          </div>
                          {i < phases.length-1 && (
                            <div style={{ height: "2px", width: "20px", background: i < activeIdx ? phases[i].color : (dark?"#1e293b":"#e2e8f0"), flexShrink: 0, transition: "background 0.3s", marginBottom: "20px" }} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 12px", background: (()=>{const p=phases[activeIdx]; return dark?`${p.color}15`:`${p.color}10`;})(), border: `1px solid ${phases[activeIdx].color}40`, borderRadius: "8px", fontSize: "11px", color: phases[activeIdx].color, fontWeight: 700, textAlign: "center" }}>
                      Fase saat ini: {phases[activeIdx].label.toUpperCase()} {phases[activeIdx].icon}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "10px", color: t.sub, lineHeight: 1.6 }}>
                      {result.timelinePhase==="ACCUMULATION"?"Bandar sedang mengumpulkan saham di harga rendah. Belum ada tanda-tanda markup.":result.timelinePhase==="MARKUP"?"Harga mulai dinaikkan setelah akumulasi. Momentum bullish sedang berjalan.":result.timelinePhase==="DISTRIBUTION"?"Bandar mulai melepas saham ke retail. Waspadai pembalikan arah.":"Harga turun setelah distribusi selesai. Fase penurunan sedang berlangsung."}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ═══ 4. LIQUIDITY MAGNET ═══ */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark?"0 4px 24px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>🧲</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>LIQUIDITY MAGNET</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ marginBottom: "12px", padding: "14px", background: dark?"rgba(245,158,11,0.08)":"#fffbeb", border: "1.5px solid #f59e0b50", borderRadius: "12px" }}>
                <div style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>🎯 ZONA LIKUIDITAS TERKUAT</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#f59e0b" }}>{Math.round(result.magnetZone.low).toLocaleString("id-ID")} – {Math.round(result.magnetZone.high).toLocaleString("id-ID")}</div>
                <div style={{ fontSize: "10px", color: t.sub, marginTop: "3px" }}>Volume terkonsentrasi: {fmtNum(result.magnetZone.vol)}</div>
              </div>
              <div style={{ fontSize: "10px", color: t.sub, marginBottom: "10px", fontWeight: 600 }}>DISTRIBUSI VOLUME PER ZONA HARGA</div>
              {(() => {
                const closes = result.rows.map(r => r.close);
                const minP = Math.min(...closes), maxP = Math.max(...closes);
                const zSize = (maxP-minP)/3 || 10;
                const allZones = [0,1,2].map(i => {
                  const low=minP+zSize*i, high=minP+zSize*(i+1);
                  const vol=result.rows.filter(r=>r.close>=low&&r.close<=high).reduce((s,r)=>s+r.volume,0);
                  return {low,high,vol};
                });
                const maxVol = Math.max(...allZones.map(z=>z.vol),1);
                return allZones.map((z,i)=>(
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "10px", color: t.text, fontWeight: 600 }}>{Math.round(z.low).toLocaleString("id-ID")} – {Math.round(z.high).toLocaleString("id-ID")}</span>
                      <span style={{ fontSize: "10px", color: t.sub }}>{fmtNum(z.vol)}</span>
                    </div>
                    <div style={{ height: "8px", background: dark?"#1e293b":"#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(z.vol/maxVol)*100}%`, background: z.vol===result.magnetZone.vol?"linear-gradient(90deg,#d97706,#f59e0b)":"linear-gradient(90deg,#2563eb60,#2563eb)", borderRadius: "99px", transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* ═══ 5. SMART MONEY FLOW MAP ═══ */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark?"0 4px 24px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>🌊</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>SMART MONEY FLOW MAP</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: "3px", marginBottom: "8px", alignItems: "flex-end", height: "60px" }}>
                {result.flowMap.map((d, i) => {
                  const isBull = d.intensity >= 0;
                  const h = Math.max(8, Math.abs(d.intensity) * 55);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: isBull?"flex-end":"flex-start", height: "60px" }}>
                      <div style={{ width: "100%", height: `${h}px`, background: isBull
                        ? `rgba(34,197,94,${0.3+Math.abs(d.intensity)*0.7})`
                        : `rgba(239,68,68,${0.3+Math.abs(d.intensity)*0.7})`,
                        borderRadius: isBull?"3px 3px 0 0":"0 0 3px 3px",
                        transition: "height 0.5s ease"
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ height: "2px", background: dark?"#334155":"#e2e8f0", marginBottom: "4px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", color: t.sub }}>{fmtDate(result.flowMap[0]?.date)}</span>
                <span style={{ fontSize: "9px", color: t.sub }}>↑ Bull  |  Bear ↓</span>
                <span style={{ fontSize: "9px", color: t.sub }}>{fmtDate(result.flowMap[result.flowMap.length-1]?.date)}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["🟢 Accumulation", "#22c55e", dark?"rgba(34,197,94,0.1)":"#f0fdf4"], ["🔴 Distribution", "#ef4444", dark?"rgba(239,68,68,0.1)":"#fef2f2"]].map(([l,c,bg])=>(
                  <div key={l} style={{ flex:1, display:"flex", alignItems:"center", gap:"6px", padding:"6px 10px", background:bg, borderRadius:"8px" }}>
                    <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:c }} />
                    <span style={{ fontSize:"10px", color:c, fontWeight:700 }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ 6. SMART MONEY SIGNALS BADGES ═══ */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark?"0 4px 24px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>🎯</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>SMART MONEY SIGNALS</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {result.smSignals.map((sig, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: sig.bg, border: `1px solid ${sig.color}40`, borderRadius: "20px" }}>
                    <span style={{ fontSize: "13px" }}>{sig.icon}</span>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: sig.color }}>{sig.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "6px" }}>
                {[
                  { label: "Inventory",    val: result.inventoryPct+"%",    color: result.inventoryPct>=60?"#22c55e":result.inventoryPct>=40?"#f59e0b":"#ef4444" },
                  { label: "Trap Risk",    val: result.trapLevel,            color: result.trapColor },
                  { label: "Fase",         val: result.timelinePhase,        color: result.timelinePhase==="MARKUP"?"#22c55e":result.timelinePhase==="ACCUMULATION"?"#2563eb":result.timelinePhase==="DISTRIBUTION"?"#f59e0b":"#ef4444" },
                  { label: "Net Tekanan",  val: result.netPressure>0?"Positif ↑":"Negatif ↓", color: result.netPressure>0?"#22c55e":"#ef4444" },
                ].map(({label,val,color})=>(
                  <div key={label} style={{ background: t.cardInner, borderRadius: "8px", padding: "8px 10px", border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: "9px", color: t.sub, marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Money */}
          <div style={{ background: dark ? "linear-gradient(135deg,rgba(29,78,216,0.15),rgba(124,58,237,0.15))" : "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: `1px solid ${dark ? "#2563eb40" : "#c7d2fe"}`, borderRadius: "16px", padding: "18px", marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px", marginBottom: "10px" }}>🧠 SMART MONEY SIGNAL</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "44px", height: "44px", background: `${result.statusColor}20`, border: `2px solid ${result.statusColor}`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {result.status === "ACCUMULATION" ? "🏦" : "💸"}
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: result.signalColor, marginBottom: "4px" }}>{result.signal}</div>
                <div style={{ fontSize: "11px", color: t.sub, lineHeight: 1.6 }}>
                  {result.status === "ACCUMULATION"
                    ? result.ratio > 0.7 ? "Volume besar masuk di harga rendah. Indikasi kuat bandar sedang mengumpulkan saham. Potensi markup di depan."
                      : "Tekanan beli lebih dominan namun belum signifikan. Pantau konfirmasi volume berikutnya."
                    : "Bandar terindikasi melepas saham. Volume jual besar. Waspadai penurunan harga lebih lanjut."}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[["Total Hari", result.rows.length + " hari", "#2563eb"], ["Bull Days", result.rows.filter(r => r.pressure > 0).length + " hari", "#22c55e"], ["Bear Days", result.rows.filter(r => r.pressure < 0).length + " hari", "#ef4444"], ["Avg/Hari", fmtNum(result.netPressure / result.rows.length) + "/hari", result.statusColor]].map(([l, v, c]) => (
                <div key={l} style={{ background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "9px", color: t.sub, marginBottom: "2px" }}>{l}</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GUIDE */}
      {bandarSubTab === "guide" && (
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>📖 CARA MENGGUNAKAN & LOGIKA</span>
          </div>
          <div style={{ padding: "18px 16px" }}>
            {[
              { step: "1", title: "Input Data OHLC", desc: "Masukkan tanggal, harga close, dan volume harian minimal 2 hari berturut-turut. Gunakan Load Sample untuk contoh.", color: "#2563eb" },
              { step: "2", title: "Hitung Perubahan Harga", desc: "ΔHarga = Close hari ini − Close kemarin. Positif = tekanan bullish, Negatif = tekanan bearish.", color: "#7c3aed" },
              { step: "3", title: "Pressure Score = ΔHarga × Volume", desc: "Volume besar di hari naik → akumulasi kuat. Volume besar di hari turun → distribusi.", color: "#0891b2" },
              { step: "4", title: "Bull & Bear Pressure", desc: "Bull = sum pressure positif. Bear = sum pressure negatif. Keduanya dibandingkan untuk menentukan dominasi.", color: "#22c55e" },
              { step: "5", title: "Net Pressure = Kesimpulan", desc: "Net > 0 → ACCUMULATION (bandar beli). Net < 0 → DISTRIBUTION (bandar jual).", color: "#f59e0b" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "28px", height: "28px", background: `${color}20`, border: `2px solid ${color}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color, flexShrink: 0 }}>{step}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "3px" }}>{title}</div>
                  <div style={{ fontSize: "11px", color: t.sub, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ background: dark ? "rgba(245,158,11,0.08)" : "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b", marginBottom: "4px" }}>⚠️ Disclaimer</div>
              <div style={{ fontSize: "10px", color: t.sub, lineHeight: 1.6 }}>Tool ini hanya untuk tujuan edukasi. Bukan rekomendasi beli/jual saham. Selalu lakukan riset mandiri.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECURE FETCH — memanggil /api/stock (Vercel proxy)
// API key TIDAK pernah ada di sini — hanya di server
// ═══════════════════════════════════════════════════════════
async function fetchViaProxy(symbol, days = 30) {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const url = `/api/stock?symbol=${clean}&days=${days}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Server error");
  return json.data; // array of { date, open, high, low, close, volume }
}

// ── Shared Fetch Panel (tanpa input API key) ──────────────
function StockFetchPanel({ dark, t, onFetched, mode = "ohlc" }) {
  const [symbol, setSymbol]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [period, setPeriod]   = useState("20");

  const inp = {
    padding: "9px 12px", background: t.input, border: `1.5px solid ${t.border}`,
    borderRadius: "8px", color: t.text, fontSize: "13px", fontWeight: 600,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  const fetch_ = async () => {
    if (!symbol.trim()) { setError("Masukkan kode saham"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const days = parseInt(period) || 20;
      const all = await fetchViaProxy(symbol.trim(), days);
      const sliced = all.slice(-days);
      if (sliced.length < 2) throw new Error("Data terlalu sedikit, coba tambah periode");

      const sym = symbol.toUpperCase();
      if (mode === "ohlc") {
        const last = sliced[sliced.length - 1];
        onFetched({ high: last.high, low: last.low, close: last.close, symbol: sym, date: last.date });
        setSuccess(`✅ ${sym}.JK · ${last.date} · H:${last.high} L:${last.low} C:${last.close}`);
      } else {
        const rows = sliced.map(r => ({ date: r.date, close: String(r.close), volume: String(r.volume) }));
        onFetched({ rows, symbol: sym });
        setSuccess(`✅ ${rows.length} hari data ${sym}.JK berhasil diambil`);
      }
    } catch (e) {
      const msg = e.message || "Gagal mengambil data";
      if (msg.includes("memblokir") || msg.includes("JSON") || msg.includes("valid")) {
        setError("⚠️ Yahoo Finance sedang tidak merespons. Tunggu 1–2 menit lalu coba lagi.");
      } else if (msg.includes("Timeout") || msg.includes("timeout")) {
        setError("⏱️ Koneksi timeout. Pastikan internet stabil lalu coba lagi.");
      } else if (msg.includes("tidak ditemukan") || msg.includes("404")) {
        setError("❌ Kode saham tidak ditemukan. Periksa kembali kode emiten (contoh: BBCA, TLKM).");
      } else {
        setError("❌ " + msg);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ background: dark ? "linear-gradient(135deg,rgba(37,99,235,0.12),rgba(124,58,237,0.12))" : "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: `1.5px solid ${dark ? "#2563eb50" : "#c7d2fe"}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 800, color: t.text }}>Auto-Fetch Data Saham</div>
          <div style={{ fontSize: "9px", color: t.sub }}>Yahoo Finance · Gratis tanpa limit · IDX &amp; Global</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: dark ? "rgba(22,163,74,0.15)" : "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
          <span style={{ fontSize: "9px", color: "#16a34a", fontWeight: 700 }}>TANPA LIMIT</span>
        </div>
      </div>

      {/* Symbol + Period */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "8px", marginBottom: "10px" }}>
        <div>
          <label style={{ fontSize: "9px", fontWeight: 700, color: "#22c55e", display: "block", marginBottom: "4px", letterSpacing: "0.5px" }}>KODE SAHAM</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="BBCA / TLKM / GOTO"
            style={{ ...inp, width: "100%", textTransform: "uppercase" }}
            onKeyDown={e => e.key === "Enter" && fetch_()}
          />
        </div>
        <div>
          <label style={{ fontSize: "9px", fontWeight: 700, color: "#8b5cf6", display: "block", marginBottom: "4px", letterSpacing: "0.5px" }}>PERIODE</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>
            {["5","10","20","30","60","90"].map(v => <option key={v} value={v}>{v} hari</option>)}
          </select>
        </div>
      </div>

      {/* Fetch button */}
      <button onClick={fetch_} disabled={loading}
        style={{ width: "100%", padding: "11px", background: loading ? (dark ? "#1e2d42" : "#e2e8f0") : "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: loading ? t.sub : "#fff", border: "none", borderRadius: "9px", fontSize: "12px", fontWeight: 800, cursor: loading ? "wait" : "pointer", boxShadow: loading ? "none" : "0 3px 12px rgba(124,58,237,0.35)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        {loading
          ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Mengambil data...</>
          : "🚀 Fetch Data Otomatis"}
      </button>

      {error && (
        <div style={{ marginTop: "8px", padding: "10px 12px", background: dark ? "rgba(239,68,68,0.1)" : "#fef2f2", border: "1px solid #fecaca", borderRadius: "7px" }}>
          <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700, marginBottom: "6px" }}>{error}</div>
          <button onClick={fetch_} style={{ fontSize: "11px", padding: "5px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700 }}>
            ↺ Coba Lagi
          </button>
        </div>
      )}
      {success && <div style={{ marginTop: "8px", padding: "8px 10px", background: dark ? "rgba(22,163,74,0.1)" : "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "7px", fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>{success}</div>}

      <div style={{ marginTop: "10px", padding: "8px 10px", background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.6)", borderRadius: "7px" }}>
        <div style={{ fontSize: "9px", color: t.sub, lineHeight: 1.7 }}>
          🔒 <strong>Gratis tanpa API key</strong> — Yahoo Finance, tidak ada limit harian &nbsp;·&nbsp;
          Saham IDX ketik tanpa ".JK" (auto ditambah) &nbsp;·&nbsp; Tekan Enter untuk fetch
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// ⭐ WATCHLIST — simpan saham favorit
// ═══════════════════════════════════════════════════════════
const WATCHLIST_KEY  = "ts_watchlist_v1";
const HISTORY_KEY    = "ts_analysis_history_v1";
const REMINDER_KEY   = "ts_reminder_v1";

function useWatchlist() {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); } catch { return []; }
  });
  const save = (next) => { setList(next); try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next)); } catch {} };
  const add    = (sym) => { if (!list.includes(sym)) save([...list, sym]); };
  const remove = (sym) => save(list.filter(s => s !== sym));
  const has    = (sym) => list.includes(sym);
  return { list, add, remove, has };
}

function WatchlistBar({ dark, t, onSelect, currentSymbol }) {
  const wl = useWatchlist();
  const [inputVal, setInputVal] = useState("");

  const handleAdd = () => {
    const sym = inputVal.trim().toUpperCase();
    if (sym) { wl.add(sym); setInputVal(""); }
  };

  if (wl.list.length === 0 && !inputVal) return (
    <div style={{ marginBottom: "12px", padding: "10px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "14px" }}>⭐</span>
      <span style={{ fontSize: "11px", color: t.sub, flex: 1 }}>Belum ada watchlist. Ketik kode saham dan klik + untuk simpan favorit.</span>
      <input value={inputVal} onChange={e => setInputVal(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter"&&handleAdd()} placeholder="BBCA" style={{ width: "70px", padding: "5px 8px", background: t.input, border: `1.5px solid ${t.border}`, borderRadius: "7px", color: t.text, fontSize: "12px", fontWeight: 700, outline: "none" }} />
      <button onClick={handleAdd} style={{ padding: "5px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>+</button>
    </div>
  );

  return (
    <div style={{ marginBottom: "12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px" }}>⭐</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>WATCHLIST FAVORIT</span>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <input value={inputVal} onChange={e => setInputVal(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter"&&handleAdd()} placeholder="+ Tambah" style={{ width: "80px", padding: "4px 8px", background: t.input, border: `1.5px solid ${t.border}`, borderRadius: "6px", color: t.text, fontSize: "11px", fontWeight: 600, outline: "none" }} />
          {inputVal && <button onClick={handleAdd} style={{ padding: "4px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>+</button>}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {wl.list.map(sym => (
          <div key={sym} style={{ display: "flex", alignItems: "center", gap: "0px", borderRadius: "20px", overflow: "hidden", border: `1.5px solid ${sym===currentSymbol?"#2563eb":t.border}`, background: sym===currentSymbol?(dark?"rgba(37,99,235,0.15)":"#dbeafe"):t.cardInner }}>
            <button onClick={() => onSelect(sym)} style={{ padding: "5px 10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 800, color: sym===currentSymbol?"#2563eb":t.text }}>
              {sym}
            </button>
            <button onClick={() => wl.remove(sym)} style={{ padding: "5px 7px 5px 2px", background: "transparent", border: "none", cursor: "pointer", fontSize: "11px", color: t.sub }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 PERBANDINGAN HISTORIS — kemarin vs hari ini
// ═══════════════════════════════════════════════════════════
function saveAnalysisHistory(ticker, result) {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    stored[ticker] = stored[ticker] || [];
    stored[ticker] = [
      { date: new Date().toLocaleDateString("id-ID"), time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        status: result.status, netPressure: result.netPressure, ratio: result.ratio,
        inventoryPct: result.inventoryPct, trapLevel: result.trapLevel,
        timelinePhase: result.timelinePhase, statusColor: result.statusColor,
        bullPressure: result.bullPressure, bearPressure: result.bearPressure,
      },
      ...stored[ticker],
    ].slice(0, 7); // simpan 7 analisa terakhir per saham
    localStorage.setItem(HISTORY_KEY, JSON.stringify(stored));
  } catch {}
}

function ComparisonCard({ ticker, currentResult, dark, t }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
      setHistory(stored[ticker] || []);
    } catch { setHistory([]); }
  }, [ticker, currentResult]);

  if (history.length < 2) return null;

  const prev = history[1]; // analisa sebelumnya
  const curr = history[0]; // analisa terbaru

  const delta = (curr.netPressure - prev.netPressure);
  const deltaInv = curr.inventoryPct - prev.inventoryPct;
  const deltaRatio = Math.round((curr.ratio - prev.ratio) * 100);

  const DiffBadge = ({ val, unit = "" }) => {
    const pos = val > 0;
    const zero = val === 0;
    return (
      <span style={{ fontSize: "10px", fontWeight: 800, color: zero ? t.sub : pos ? "#22c55e" : "#ef4444", marginLeft: "4px" }}>
        {zero ? "—" : (pos ? "▲+" : "▼") + fmtNum(Math.abs(val)) + unit}
      </span>
    );
  };

  return (
    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: "12px", boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px" }}>📊</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: t.sub, letterSpacing: "1px" }}>PERBANDINGAN ANALISA</span>
        <span style={{ marginLeft: "auto", fontSize: "9px", color: t.sub }}>{curr.date} {curr.time}</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {/* Status comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ padding: "10px 12px", background: t.cardInner, borderRadius: "10px", border: `1px solid ${t.border}`, textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: t.sub, marginBottom: "3px" }}>SEBELUMNYA</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: prev.statusColor }}>{prev.status}</div>
            <div style={{ fontSize: "9px", color: t.sub, marginTop: "2px" }}>{prev.date}</div>
          </div>
          <div style={{ fontSize: "18px", textAlign: "center", color: t.sub }}>→</div>
          <div style={{ padding: "10px 12px", background: curr.statusColor + "18", borderRadius: "10px", border: `1.5px solid ${curr.statusColor}40`, textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: t.sub, marginBottom: "3px" }}>SEKARANG</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: curr.statusColor }}>{curr.status}</div>
            <div style={{ fontSize: "9px", color: t.sub, marginTop: "2px" }}>{curr.date}</div>
          </div>
        </div>

        {/* Metric diffs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "6px" }}>
          {[
            { label: "Net Pressure", val: delta, unit: "", fmt: true },
            { label: "Inventory",    val: deltaInv,   unit: "%", fmt: false },
            { label: "Bull Ratio",   val: deltaRatio, unit: "%", fmt: false },
          ].map(({ label, val, unit, fmt: doFmt }) => (
            <div key={label} style={{ background: t.cardInner, borderRadius: "8px", padding: "8px 10px", border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: "8px", color: t.sub, marginBottom: "3px" }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: t.text }}>
                  {doFmt ? fmtNum(Math.abs(curr.netPressure)) : Math.abs(curr[label === "Inventory" ? "inventoryPct" : "ratio"] * (unit === "%" && label === "Bull Ratio" ? 100 : 1)).toFixed(0) + unit}
                </span>
                <DiffBadge val={val} unit={unit} />
              </div>
            </div>
          ))}
        </div>

        {/* Trap change warning */}
        {prev.trapLevel !== curr.trapLevel && (
          <div style={{ marginTop: "10px", padding: "8px 12px", background: curr.trapLevel === "HIGH" ? (dark ? "rgba(220,38,38,0.1)" : "#fef2f2") : curr.trapLevel === "MEDIUM" ? (dark ? "rgba(245,158,11,0.08)" : "#fffbeb") : (dark ? "rgba(22,163,74,0.08)" : "#f0fdf4"), border: `1px solid ${curr.trapLevel === "HIGH" ? "#fecaca" : curr.trapLevel === "MEDIUM" ? "#fde68a" : "#bbf7d0"}`, borderRadius: "8px", fontSize: "11px", fontWeight: 600, color: curr.trapLevel === "HIGH" ? "#dc2626" : curr.trapLevel === "MEDIUM" ? "#f59e0b" : "#16a34a" }}>
            {curr.trapLevel === "HIGH" ? "⚠️ Trap risk meningkat dari " : curr.trapLevel === "LOW" ? "✅ Trap risk turun dari " : "⚡ Trap risk berubah dari "}
            {prev.trapLevel} → {curr.trapLevel}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔔 REMINDER — notifikasi browser jam 19:00 WIB
// ═══════════════════════════════════════════════════════════
function ReminderButton({ dark, t }) {
  const [status, setStatus] = useState(() => {
    try { return localStorage.getItem(REMINDER_KEY) || "off"; } catch { return "off"; }
  });
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");

  const toggle = async () => {
    if (perm === "denied") { alert("Notifikasi diblokir browser. Aktifkan di Settings browser kamu."); return; }
    if (status === "on") {
      setStatus("off");
      try { localStorage.setItem(REMINDER_KEY, "off"); } catch {}
      return;
    }
    if (perm !== "granted") {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result !== "granted") return;
    }
    setStatus("on");
    try { localStorage.setItem(REMINDER_KEY, "on"); } catch {}
    // Kirm notifikasi konfirmasi
    new Notification("TradingStars ✅", {
      body: "Reminder aktif! Kamu akan diingatkan analisa jam 19:00 WIB setiap hari.",
      icon: "/favicon.ico",
    });
  };

  // Cek dan kirim reminder setiap menit
  useEffect(() => {
    if (status !== "on" || typeof Notification === "undefined") return;
    const check = () => {
      const now = new Date();
      // Konversi ke WIB (UTC+7)
      const wibHour   = (now.getUTCHours() + 7) % 24;
      const wibMinute = now.getUTCMinutes();
      if (wibHour === 19 && wibMinute === 0 && Notification.permission === "granted") {
        try {
          new Notification("⏰ Waktunya Analisa Saham!", {
            body: "Market IDX sudah tutup. Data Yahoo Finance sudah tersedia. Buka TradingStars dan analisa sekarang!",
            icon: "/favicon.ico",
          });
        } catch {}
      }
    };
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
  }, [status]);

  const isOn = status === "on";
  return (
    <div style={{ marginBottom: "12px", padding: "12px 14px", background: isOn ? (dark ? "rgba(22,163,74,0.08)" : "#f0fdf4") : t.card, border: `1px solid ${isOn ? "#bbf7d0" : t.border}`, borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ fontSize: "20px" }}>🔔</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: isOn ? "#16a34a" : t.text }}>
          {isOn ? "Reminder Aktif ✅" : "Reminder Analisa"}
        </div>
        <div style={{ fontSize: "10px", color: t.sub }}>
          {isOn ? "Notifikasi jam 19:00 WIB setiap hari" : "Aktifkan notifikasi harian jam 19:00 WIB"}
        </div>
      </div>
      <button onClick={toggle} style={{ padding: "7px 14px", background: isOn ? "#16a34a" : "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: 800, cursor: "pointer", flexShrink: 0, boxShadow: isOn ? "0 2px 8px rgba(22,163,74,0.3)" : "0 2px 8px rgba(124,58,237,0.3)" }}>
        {isOn ? "Matikan" : "Aktifkan"}
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// WAKEUP LOADER — muncul saat server Render sedang bangun
// Render free tier "tidur" setelah 15 menit tidak ada request
// ═══════════════════════════════════════════════════════════
function WakeUpLoader({ dark }) {
  const [dots, setDots]     = useState(".");
  const [elapsed, setElapsed] = useState(0);
  const [tip, setTip]       = useState(0);

  const tips = [
    "Mengambil data dari server...",
    "Server sedang bangun dari tidur...",
    "Biasanya butuh 20–40 detik pertama kali...",
    "Setelah ini langsung cepat kok!",
    "Sambil nunggu, siapkan kode emiten yang mau dianalisa 😊",
  ];

  useEffect(() => {
    const dotsIv = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    const timeIv = setInterval(() => setElapsed(e => e + 1), 1000);
    const tipIv  = setInterval(() => setTip(t => (t + 1) % tips.length), 3000);
    return () => { clearInterval(dotsIv); clearInterval(timeIv); clearInterval(tipIv); };
  }, []);

  const pct = Math.min(Math.round((elapsed / 40) * 100), 95);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: dark ? "#060d18" : "#f0f4f8",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "24px",
    }}>
      {/* Logo animasi */}
      <div style={{ position: "relative", marginBottom: "32px" }}>
        <div style={{
          width: "80px", height: "80px",
          borderRadius: "22px",
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(37,99,235,0.4)",
          animation: "pulse-logo 2s ease-in-out infinite",
        }}>
          <img src="/logo.jpg" alt="TradingStars" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        {/* Spinning ring */}
        <div style={{
          position: "absolute", inset: "-8px",
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "#2563eb",
          borderRightColor: "#7c3aed",
          animation: "spin-ring 1.2s linear infinite",
        }} />
      </div>

      {/* Title */}
      <div style={{ fontSize: "22px", fontWeight: 900, color: dark ? "#e8f0fe" : "#0f172a", marginBottom: "6px", letterSpacing: "-0.5px" }}>
        TradingStars
      </div>
      <div style={{ fontSize: "13px", color: dark ? "#6a8aaa" : "#64748b", marginBottom: "32px" }}>
        Trading Analyzer Pro
      </div>

      {/* Progress bar */}
      <div style={{ width: "240px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: dark ? "#6a8aaa" : "#64748b" }}>Menghubungkan server{dots}</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>{pct}%</span>
        </div>
        <div style={{ height: "6px", background: dark ? "#1a2d44" : "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg,#2563eb,#7c3aed,#ec4899)",
            borderRadius: "99px",
            transition: "width 0.8s ease",
            boxShadow: "0 0 10px rgba(124,58,237,0.5)",
          }} />
        </div>
      </div>

      {/* Elapsed time */}
      <div style={{ fontSize: "12px", color: dark ? "#6a8aaa" : "#94a3b8", marginBottom: "20px" }}>
        {elapsed < 5 ? "Membangunkan server..." : `${elapsed} detik${elapsed > 15 ? " — hampir selesai!" : ""}`}
      </div>

      {/* Tips carousel */}
      <div style={{
        padding: "10px 18px",
        background: dark ? "rgba(37,99,235,0.1)" : "#eff6ff",
        border: `1px solid ${dark ? "#1e3a5f" : "#bfdbfe"}`,
        borderRadius: "10px",
        fontSize: "12px",
        color: dark ? "#93c5fd" : "#1d4ed8",
        textAlign: "center",
        maxWidth: "280px",
        lineHeight: 1.5,
        animation: "fade-tip 0.5s ease",
        key: tip,
      }}>
        💡 {tips[tip]}
      </div>

      <style>{`
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-logo {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes fade-tip {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Hook: cek apakah server sudah bangun ──────────────────
function useServerWakeUp() {
  const [awake, setAwake]     = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // max 40 detik (20 × 2 detik)

    const check = async () => {
      try {
        const res = await fetch("/api/stock?symbol=HEALTH&days=5", {
          signal: AbortSignal.timeout(3000),
        });
        // Kalau server merespons (apapun responnya), berarti sudah bangun
        if (res.status !== 0) {
          setAwake(true);
          setChecking(false);
          return;
        }
      } catch {
        // Server belum bangun, coba lagi
      }
      attempts++;
      if (attempts >= maxAttempts) {
        // Timeout, lanjut saja
        setAwake(true);
        setChecking(false);
        return;
      }
      setTimeout(check, 2000);
    };

    // Cek langsung, kalau gagal tampilkan loader
    const initial = async () => {
      try {
        const res = await fetch("/api/stock?symbol=HEALTH&days=5", {
          signal: AbortSignal.timeout(2000),
        });
        if (res.status !== 0) {
          setAwake(true);
          setChecking(false);
          return;
        }
      } catch {
        // Server tidur, tampilkan loader lalu cek berkala
        setChecking(true);
        setTimeout(check, 2000);
      }
    };

    initial();
  }, []);

  return { awake, checking };
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING TUTORIAL
// Muncul sekali saat pertama buka, bisa dibuka lagi via tombol ?
// ═══════════════════════════════════════════════════════════
const ONBOARDING_KEY = "tradingstars_onboarded_v1";

const TUTORIAL_STEPS = [
  {
    icon: "👋",
    title: "Selamat datang di TradingStars! ⭐",
    color: "#2563eb",
    desc: "Platform analisa saham untuk komunitas TradingStars. Tersedia 2 fitur utama yang bisa kamu gunakan setiap hari setelah market tutup.",
    tips: [
      "📐 Pivot Analyzer — hitung level support & resistance",
      "🏦 Bandar Tracker — deteksi aktivitas institusi (bandar)",
    ],
    note: null,
  },
  {
    icon: "📐",
    title: "Pivot Analyzer",
    color: "#7c3aed",
    desc: "Hitung Pivot Point harian untuk menentukan level support dan resistance. Input dilakukan secara manual menggunakan data OHLC hari sebelumnya.",
    tips: [
      "High → harga tertinggi hari kemarin",
      "Low  → harga terendah hari kemarin",
      "Close → harga penutupan hari kemarin",
      "Isi Harga Sekarang untuk aktifkan semua fitur analisa",
    ],
    note: "💡 Data OHLC bisa dilihat di aplikasi broker atau finance.yahoo.com",
  },
  {
    icon: "🏦",
    title: "Bandar Tracker",
    color: "#0891b2",
    desc: "Deteksi apakah institusi (bandar) sedang akumulasi atau distribusi saham — otomatis dari data Yahoo Finance.",
    tips: [
      "1. Ketik kode emiten (contoh: BBCA, TLKM, BBRI)",
      "2. Pilih periode analisa (20–60 hari disarankan)",
      "3. Klik tombol Fetch Data Otomatis",
      "4. Klik Analisa Tekanan Bandar",
    ],
    note: "💡 Data diambil otomatis dari Yahoo Finance — gratis, tanpa API key",
  },
  {
    icon: "🧠",
    title: "Fitur Smart Money",
    color: "#16a34a",
    desc: "Setelah analisa selesai, kamu akan melihat 6 fitur deteksi aktivitas bandar:",
    tips: [
      "📦 Bandar Inventory — estimasi sisa saham bandar",
      "🪤 Trap Detector — deteksi jebakan bull trap",
      "📅 Activity Timeline — fase pasar saat ini",
      "🧲 Liquidity Magnet — zona harga konsentrasi bandar",
      "🌊 Flow Map — heatmap tekanan beli vs jual",
      "🎯 Smart Money Signals — sinyal akumulasi/distribusi",
    ],
    note: null,
  },
  {
    icon: "⏰",
    title: "Kapan waktu terbaik analisa?",
    color: "#f59e0b",
    desc: "Data saham IDX diperbarui setelah market tutup. Berikut jadwal yang disarankan:",
    tips: [
      "15:00–15:15 WIB → Market IDX tutup",
      "15:30–16:00 WIB → Data tersedia di Yahoo Finance",
      "19:00–22:00 WIB → Waktu terbaik analisa ✅",
      "Reminder analisa aktif jam 19:00 WIB setiap hari",
    ],
    note: "⚠️ Jangan analisa saat market masih buka — data hari ini belum masuk",
  },
  {
    icon: "🚀",
    title: "Siap mulai!",
    color: "#22c55e",
    desc: "Kamu sudah siap menggunakan TradingStars Trading Analyzer. Ingat: tool ini untuk edukasi dan bantu analisa, bukan rekomendasi beli/jual.",
    tips: [
      "Gunakan Bandar Tracker untuk cek aktivitas institusi",
      "Gunakan Pivot Analyzer untuk level entry & exit",
      "Analisa tiap malam untuk persiapan besok",
      "Tombol ? di pojok kanan atas untuk buka panduan ini lagi",
    ],
    note: "📚 Disclaimer: Bukan rekomendasi investasi. Selalu lakukan riset mandiri.",
  },
];

function OnboardingModal({ dark, t, onClose }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const total   = TUTORIAL_STEPS.length;
  const isLast  = step === total - 1;

  // Trap focus & close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", backdropFilter: "blur(4px)",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: "400px", maxHeight: "90vh", overflowY: "auto",
        background: t.card, borderRadius: "20px",
        border: `1px solid ${t.border}`,
        boxShadow: dark ? "0 24px 80px rgba(0,0,0,0.8)" : "0 24px 80px rgba(0,0,0,0.15)",
        overflow: "hidden",
        animation: "slideUp 0.3s ease",
      }}>
        {/* Progress bar */}
        <div style={{ height: "3px", background: t.border }}>
          <div style={{ height: "100%", width: `${((step + 1) / total) * 100}%`, background: `linear-gradient(90deg,#2563eb,#7c3aed)`, transition: "width 0.4s ease" }} />
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "14px 20px 0" }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} style={{
              width: i === step ? "20px" : "7px", height: "7px",
              borderRadius: "99px", border: "none", cursor: "pointer",
              background: i === step ? current.color : (i < step ? `${current.color}60` : t.border),
              transition: "all 0.3s ease", padding: 0,
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <div style={{
              width: "52px", height: "52px", flexShrink: 0,
              background: `${current.color}18`,
              border: `2px solid ${current.color}40`,
              borderRadius: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px",
            }}>{current.icon}</div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: current.color, letterSpacing: "1px", marginBottom: "3px" }}>
                LANGKAH {step + 1} / {total}
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: t.text, lineHeight: 1.2 }}>{current.title}</div>
            </div>
          </div>

          {/* Description */}
          <p style={{ margin: "0 0 14px", fontSize: "13px", color: t.sub, lineHeight: 1.7 }}>{current.desc}</p>

          {/* Tips list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: current.note ? "12px" : "0" }}>
            {current.tips.map((tip, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "8px",
                padding: "8px 12px",
                background: t.cardInner,
                border: `1px solid ${t.border}`,
                borderRadius: "8px",
              }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: current.color, marginTop: "5px", flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: t.text, lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          {current.note && (
            <div style={{
              marginTop: "12px", padding: "10px 12px",
              background: dark ? `${current.color}12` : `${current.color}08`,
              border: `1px solid ${current.color}30`,
              borderRadius: "8px",
              fontSize: "11px", color: t.sub, lineHeight: 1.6,
            }}>{current.note}</div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          padding: "14px 24px 20px",
          display: "flex", gap: "10px", alignItems: "center",
          borderTop: `1px solid ${t.border}`,
        }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: "10px 16px", background: t.cardInner,
              border: `1px solid ${t.border}`, borderRadius: "10px",
              color: t.sub, fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}>← Kembali</button>
          ) : (
            <button onClick={onClose} style={{
              padding: "10px 16px", background: t.cardInner,
              border: `1px solid ${t.border}`, borderRadius: "10px",
              color: t.sub, fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}>Lewati</button>
          )}

          <button onClick={() => isLast ? onClose() : setStep(s => s + 1)} style={{
            flex: 1, padding: "11px 16px",
            background: `linear-gradient(135deg,#1d4ed8,#7c3aed)`,
            border: "none", borderRadius: "10px",
            color: "#fff", fontSize: "13px", fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
          }}>
            {isLast ? "✅ Mulai Analisa!" : `Selanjutnya →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════
export default function TradingHub() {
  const [dark, setDark]       = useState(true);
  const [mainTab, setMainTab] = useState("pivot");

  // Onboarding: muncul sekali, bisa dibuka lagi via tombol ?
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return true; }
  });

  const closeOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
  };

  const openOnboarding = () => setShowOnboarding(true);

  const t = {
    bg:        dark ? "#060d18" : "#f0f4f8",
    card:      dark ? "#0d1520" : "#ffffff",
    cardInner: dark ? "#0a1220" : "#f8fafc",
    border:    dark ? "#1a2d44" : "#e2e8f0",
    text:      dark ? "#e8f0fe" : "#0f172a",
    sub:       dark ? "#6a8aaa" : "#64748b",
    input:     dark ? "#060d18" : "#f8fafc",
  };

  const { awake } = useServerWakeUp();

  // Tampilkan loader sampai server bangun
  if (!awake) return <WakeUpLoader dark={dark} />;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", justifyContent: "center", padding: "12px 10px", fontFamily: "'Segoe UI', system-ui, sans-serif", transition: "background 0.4s", position: "relative" }}>
      <Particles dark={dark} />

      {/* ── ONBOARDING MODAL ── */}
      {showOnboarding && <OnboardingModal dark={dark} t={t} onClose={closeOnboarding} />}

      <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 }}>

        {/* ── MASTER HEADER ── */}
        <FadeIn delay={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img src="/logo.jpg" alt="TradingStars" style={{ width: "46px", height: "46px", borderRadius: "12px", objectFit: "cover", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: t.text, letterSpacing: "-0.5px" }}>TradingStars</div>
                <div style={{ fontSize: "10px", color: t.sub }}>Trading Analyzer Pro · by TradingStars</div>
              </div>
            </div>
            {/* Right: Help + Dark toggle */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={openOnboarding} title="Buka panduan"
                style={{ width: "36px", height: "36px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "50%", cursor: "pointer", fontSize: "16px", color: t.sub, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                ?
              </button>
              <button onClick={() => setDark(d => !d)} style={{ padding: "8px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "20px", cursor: "pointer", fontSize: "14px", color: t.text }}>
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </FadeIn>

        {/* ── MAIN TAB SWITCHER ── */}
        <FadeIn delay={60}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[
              ["pivot",  "📐", "Pivot Analyzer",  "Classical Floor Method"],
              ["bandar", "🏦", "Bandar Tracker",   "Accumulation & Distribution"],
            ].map(([key, icon, label, sub]) => (
              <button key={key} onClick={() => setMainTab(key)}
                style={{ flex: 1, padding: "10px 8px", background: mainTab === key ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : t.card, color: mainTab === key ? "#fff" : t.sub, border: `1px solid ${mainTab === key ? "transparent" : t.border}`, borderRadius: "14px", cursor: "pointer", transition: "all 0.25s", boxShadow: mainTab === key ? "0 4px 16px rgba(124,58,237,0.35)" : "none", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ fontSize: "18px" }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 800 }}>{label}</div>
                    <div style={{ fontSize: "9px", opacity: 0.75 }}>{sub}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </FadeIn>

        <div style={{ height: "1px", background: `linear-gradient(90deg,transparent,${t.border},transparent)`, marginBottom: "16px" }} />

        {mainTab === "pivot"  && <PivotPage  dark={dark} t={t} />}
        {mainTab === "bandar" && <BandarPage dark={dark} t={t} />}

        <div style={{ textAlign: "center", marginTop: "20px", marginBottom: "8px" }}>
          <img src="/logo.jpg" alt="TradingStars" style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", opacity: 0.7, marginBottom: "6px" }} />
          <div style={{ fontSize: "11px", fontWeight: 700, color: t.sub }}>TradingStars Trading Analyzer Pro</div>
          <div style={{ fontSize: "10px", color: t.sub, marginTop: "2px" }}>For Educational Use Only · Bukan rekomendasi investasi</div>
        </div>
      </div>
      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
