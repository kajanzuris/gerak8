// KOMPONEN DASAR: konteks waktu (Ctx), waktu muncul (resolveT), animasi Appear/Typewriter, kartu, ikon kecil.

import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";
import { C, FILE_COL, FONT, V } from "./config";
import type { Cx, W } from "./types";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

export const Ctx = React.createContext<Cx>({ ws: [], base: 0, t: 0, accent: C.red, name: "", ink: C.ink, mute: C.mute, theme: "clean" });

// waktu (detik, absolut) kapan sebuah elemen muncul: kata tertentu di title, detik relatif, atau default
// Anti-layar-kosong: dibatasi maksimal 0.45s dari awal adegan agar penonton langsung melihat visual
export const resolveT = (at: string | number | undefined, cx: Cx, fallback: number) => {
  if (typeof at === "number") return cx.base + Math.min(0.45, at);
  if (typeof at === "string") {
    const k = norm(at);
    const h = k ? cx.ws.find((w) => norm(w.w).startsWith(k)) : undefined;
    if (h) return Math.min(h.a, cx.base + 0.45);
  }
  return cx.base + Math.min(0.45, fallback);
};

export const card: React.CSSProperties = {
  background: V.cardBg,
  borderRadius: V.radius,
  boxShadow: V.cardShadow,
  border: `2px solid ${V.cardLine}`,
  fontFamily: FONT,
  color: V.cardInk,
  overflow: "hidden",
};

export const Appear: React.FC<{ t0: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme } = React.useContext(Ctx);

  // Waktu berlalu sejak elemen mulai muncul
  const elapsed = frame - Math.round(t0 * fps);

  // Animasi masuk: Spring dinamis dengan sedikit pop/overshoot (bouncy)
  const s = clamp01(spring({ frame: elapsed, fps, config: { damping: 13, stiffness: 170, mass: 0.85 } }));

  // Animasi mengambang lembut (idle floating/breathing) setelah objek stabil agar video tidak kaku/mati
  const tLive = Math.max(0, elapsed / fps);
  const isSettled = elapsed > Math.round(0.35 * fps);
  const floatY = isSettled ? Math.sin(tLive * 2.2) * 4 : 0;
  const tiltDeg = theme === "classic" && !isSettled ? (1 - s) * -2 : 0;
  const hudFilter = theme === "hud" ? "drop-shadow(0 0 18px rgba(34, 211, 238, 0.2))" : theme === "neon" ? "drop-shadow(0 0 16px rgba(255, 63, 142, 0.18))" : undefined;

  return (
    <div
      style={{
        opacity: clamp01(s * 1.8),
        transform: `translateY(${(1 - s) * 28 + floatY}px) scale(${0.91 + 0.09 * s}) rotate(${tiltDeg}deg)`,
        transformOrigin: "center center",
        filter: hudFilter,
        ...style
      }}
    >
      {children}
    </div>
  );
};

// Efek ketik animasi (Typewriter effect): teks diketik huruf demi huruf setelah objek media/kartu muncul
export const Typewriter: React.FC<{
  text: string;
  t0: number;
  delay?: number;
  speed?: number;
  cursor?: boolean;
  style?: React.CSSProperties;
}> = ({ text, t0, delay = 0.28, speed = 28, cursor = true, style }) => {
  const { t } = React.useContext(Ctx);
  if (!text) return null;
  const startT = t0 + delay;
  if (t < startT) {
    return <span style={{ ...style, visibility: "hidden" }}>{text}</span>;
  }
  const elapsed = Math.max(0, t - startT);
  const n = Math.min(text.length, Math.floor(elapsed * speed));
  const isTyping = n < text.length;
  const blink = Math.floor(t * 3.5) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && (isTyping || elapsed < (text.length / speed) + 1.2) ? (
        <span style={{ opacity: blink ? 1 : 0, fontWeight: 300, marginLeft: 2, display: "inline-block" }}>|</span>
      ) : null}
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </span>
  );
};

export const Check = () => (
  <svg width={22} height={22} viewBox="0 0 24 24">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Arrow = () => (
  <svg width={26} height={26} viewBox="0 0 24 24">
    <path d="M4 12h15M13 6l6 6-6 6" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Trash = () => (
  <svg width={46} height={52} viewBox="0 0 46 52">
    <rect x={6} y={14} width={34} height={34} rx={6} fill={C.red} />
    <rect x={2} y={8} width={42} height={6} rx={3} fill={C.red} />
    <rect x={16} y={2} width={14} height={6} rx={3} fill={C.red} />
    <rect x={14} y={20} width={4} height={22} rx={2} fill="#fff" />
    <rect x={21} y={20} width={4} height={22} rx={2} fill="#fff" />
    <rect x={28} y={20} width={4} height={22} rx={2} fill="#fff" />
  </svg>
);

export const FileIcon: React.FC<{ i: number; s?: number }> = ({ i, s = 44 }) => (
  <svg width={s} height={s * 1.2} viewBox="0 0 40 48">
    <rect x={2} y={2} width={36} height={44} rx={7} fill="#fff" stroke={FILE_COL[i % 4]} strokeWidth={3} />
    <rect x={9} y={12} width={22} height={14} rx={3} fill={FILE_COL[i % 4]} opacity={0.85} />
    <rect x={9} y={32} width={14} height={5} rx={2} fill="#d6d0c2" />
  </svg>
);

export const Btn: React.FC<{ label: string; main?: boolean }> = ({ label, main }) => {
  const { accent } = React.useContext(Ctx);
  return (
    <div style={{ padding: "14px 32px", borderRadius: 22, fontSize: 28, fontWeight: 800, background: main ? accent : V.ghost, color: main ? "#fff" : V.mute }}>{label}</div>
  );
};

// teks hitam/putih yang terbaca di atas warna tertentu
export const fgOn = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const y = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  return y > 150 ? "#1a0a00" : "#ffffff";
};

// angka naik: "+1.284", "US$ 11.876", "87%"; pemisah ribuan (titik/koma) dipertahankan
export const countText = (value: string, k: number): string => {
  const m = value.match(/\d[\d.,]*/);
  if (!m) return value;
  const tok = m[0].replace(/[.,]+$/, "");
  const thousands = /^\d{1,3}([.,]\d{3})+$/.test(tok);
  const sep = thousands ? (tok.match(/[.,]/) as RegExpMatchArray)[0] : "";
  const target = thousands ? parseInt(tok.replace(/[.,]/g, ""), 10) : parseFloat(tok.replace(",", "."));
  if (isNaN(target)) return value;
  const e = 1 - Math.pow(1 - clamp01(k), 3);
  const cur = target * e;
  let out: string;
  if (thousands) out = String(Math.round(cur)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  else {
    const dec = (tok.split(/[.,]/)[1] || "").length;
    out = dec ? cur.toFixed(dec) : String(Math.round(cur));
  }
  return value.replace(tok, out);
};

export const IconTile: React.FC<{ glyph?: string; fallback?: string; tone: string; size?: number }> = ({ glyph, fallback, tone, size = 64 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: tone, color: fgOn(tone), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.5, flexShrink: 0, fontFamily: FONT }}>
    {glyph || fallback || ""}
  </div>
);

export const Dots: React.FC = () => (
  <>
    {["#ff6159", "#ffbd2e", "#27c93f"].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />)}
  </>
);

export const fallbackWords = (title: string, start: number, idx: number): W[] =>
  title.split(" ").filter(Boolean).map((raw, i) => ({ w: raw.replace(/\*/g, ""), hl: raw.includes("*"), a: start + i * 0.25, b: start + i * 0.25 + 0.25, s: idx }));
