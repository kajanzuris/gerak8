// TAMPILAN PER TEMA: latar, caption, judul (Headline), header, lencana untuk hud / klasik / tutorial / neon.

import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";
import { C, FONT, HUD_ORANGE, MONO, TONE2 } from "./config";
import { Ctx, clamp01 } from "./ui";
import type { W } from "./types";

// ---------- latar, maskot orb, caption, lencana untuk tema tutorial & neon ----------
export const GridFloor: React.FC<{ f: number; color: string; h?: number; opacity?: number }> = ({ f, color, h = 760, opacity = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, perspective: 700, perspectiveOrigin: "50% 0%", overflow: "hidden", opacity, WebkitMaskImage: "linear-gradient(to top, #000 25%, transparent 100%)", maskImage: "linear-gradient(to top, #000 25%, transparent 100%)" }}>
    <div style={{ position: "absolute", left: "-50%", width: "200%", top: 0, height: 1800, transformOrigin: "50% 0%", transform: "rotateX(72deg)", backgroundImage: `linear-gradient(${color} 2px, transparent 2px), linear-gradient(90deg, ${color} 2px, transparent 2px)`, backgroundSize: "90px 90px", backgroundPosition: `0 ${(f * 1.5) % 90}px` }} />
  </div>
);

export const TutBackdrop: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 18%, #ff9a3c 0%, #f26a1b 45%, #d9480f 100%)" }} />
    <GridFloor f={f} color="rgba(255,255,255,.16)" h={700} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(60,10,0,.35) 100%)" }} />
  </AbsoluteFill>
);

export const NeonBackdrop: React.FC<{ f: number; floor: number }> = ({ f, floor }) => {
  const a = Math.sin(f / 90);
  const b = Math.cos(f / 120);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${30 + a * 10}% ${22 + b * 6}%, rgba(255,63,142,.18), transparent 38%), radial-gradient(circle at ${72 - a * 8}% ${60 + b * 8}%, rgba(255,178,31,.12), transparent 40%), radial-gradient(ellipse at 50% 100%, rgba(120,30,140,.28), transparent 55%), #07020f` }} />
      {floor > 0.01 ? <GridFloor f={f} color="rgba(255,255,255,.22)" h={760} opacity={floor} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,.5) 100%)" }} />
    </AbsoluteFill>
  );
};

export const groupsOfN = (words: W[], n: number) => {
  const g: W[][] = [];
  let cur: W[] = [];
  words.forEach((w) => {
    if (cur.length && (cur.length >= n || cur[0].s !== w.s)) { g.push(cur); cur = []; }
    cur.push(w);
    if (/[.?!,]$/.test(w.w)) { g.push(cur); cur = []; }
  });
  if (cur.length) g.push(cur);
  return g;
};

// caption tutorial: bilah gelap di bawah, kata yang sudah/sedang diucapkan menyala
export const TutCaption: React.FC<{ words: W[]; t: number }> = ({ words, t }) => {
  const groups = groupsOfN(words, 6);
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) return null;
  const g = groups[gi];
  if (t > g[g.length - 1].b + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 1450, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", padding: "18px 26px", borderRadius: 20, background: "#2b0f05", boxShadow: "0 7px 0 rgba(0,0,0,.28)", fontFamily: FONT, fontSize: 44, fontWeight: 700, lineHeight: 1.25 }}>
      {g.map((w, i) => {
        const on = t >= w.a;
        return <span key={i} style={{ color: !on ? "#c9a894" : w.hl ? "#ffb066" : "#ffffff", opacity: on ? 1 : 0.6 }}>{w.w}</span>;
      })}
    </div>
  );
};

// caption neon: satu frasa muncul sekaligus, kata penting berwarna pink / kuning bergantian
export const NeonCaption: React.FC<{ words: W[]; t: number; accent: string }> = ({ words, t, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = groupsOfN(words, 7);
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) return null;
  const g = groups[gi];
  if (t > g[g.length - 1].b + 0.8) return null;
  const sp = clamp01(spring({ frame: frame - Math.round(g[0].a * fps), fps, config: { damping: 16, stiffness: 220 } }));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1290, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", gap: "2px 16px", textAlign: "center", opacity: clamp01(sp * 2), transform: `translateY(${(1 - sp) * 18}px)`, fontFamily: FONT }}>
      {g.map((w, i) => (
        <span key={i} style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.25, color: w.hl ? (gi % 2 === 0 ? accent : TONE2) : "#ffffff", textShadow: "0 2px 18px rgba(0,0,0,.6)" }}>{w.w}</span>
      ))}
    </div>
  );
};

// lencana "Langkah N /M" (tema tutorial); muncul membal saat langkah berganti
export const StepBadge: React.FC<{ step: string; label: string; t0: number }> = ({ step, label, t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = clamp01(spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 12, stiffness: 200 } }));
  const parts = step.split("/");
  return (
    <div style={{ position: "absolute", left: 80, top: 84, background: "#2b0f05", color: "#fff", borderRadius: 40, padding: "10px 26px", fontSize: 32, fontWeight: 700, fontFamily: FONT, transform: `rotate(-4deg) scale(${0.6 + 0.4 * s})`, opacity: clamp01(s * 2), boxShadow: "0 6px 0 rgba(0,0,0,.28)" }}>
      {label} <span style={{ fontSize: 40, fontWeight: 800 }}>{parts[0]}</span>
      {parts[1] !== undefined ? <span style={{ opacity: 0.7 }}> /{parts[1]}</span> : null}
    </div>
  );
};

// handle akun di dasar layar (tema tutorial)
export const HandleTag: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1600, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: 30, fontWeight: 600, color: "rgba(255,244,230,.85)" }}>
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
    {text}
  </div>
);

export const Header: React.FC<{ brand: string; tag: string }> = ({ brand, tag }) => (
  <div style={{ position: "absolute", left: 30, right: 30, top: 60, height: 78, borderRadius: 39, background: "#fff", color: C.ink, boxShadow: "0 4px 18px rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", fontFamily: FONT }}>
    {brand ? (
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 800, fontSize: 34 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: C.red, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{brand.slice(0, 1)}</div>
        {brand}
      </div>
    ) : <div />}
    {tag ? <div style={{ background: C.ink, color: "#fff", borderRadius: 30, padding: "8px 22px", fontSize: 26, fontWeight: 600 }}>{tag}</div> : null}
  </div>
);

// judul 2 tingkat: `small` kata pertama = baris kecil, sisanya = baris besar; tiap kata muncul saat diucapkan
export const Headline: React.FC<{ ws: W[]; small: number; solo?: boolean }> = ({ ws, small, solo }) => {
  const { accent, ink, mute, theme, hl: hlColor } = React.useContext(Ctx);
  const hudTheme = theme === "hud";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const big = ws.slice(small);
  const bigSize = Math.round((big.length <= 3 ? 88 : big.length <= 5 ? 76 : big.length <= 8 ? 64 : 54) * (solo ? 1.08 : 1));
  const line = (arr: W[], size: number, weight: number, base: string) => (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.26}px`, fontSize: size, fontWeight: weight, lineHeight: 1.18, textTransform: hudTheme ? "uppercase" : undefined }}>
      {arr.map((w, i) => {
        const s = clamp01(spring({ frame: frame - Math.round(w.a * fps), fps, config: { damping: 14, stiffness: 200 } }));
        return (
          <span key={i} style={{ display: "inline-block", opacity: s > 0.02 ? clamp01(s * 2) : 0, transform: `translateY(${(1 - s) * 20}px)`, color: w.hl ? (hlColor || accent) : base, textShadow: hudTheme && w.hl ? `0 0 22px ${accent}aa` : undefined }}>{w.w}</span>
        );
      })}
    </div>
  );
  return (
    <>
      {small > 0 ? line(ws.slice(0, small), solo ? 50 : 42, 600, mute) : null}
      {line(big, bigSize, 800, ink)}
    </>
  );
};

export const HudBackdrop: React.FC<{ f: number; accent: string }> = ({ f, accent }) => {
  const dots = Array.from({ length: 22 }, (_, i) => {
    const x = (i * 197) % 1080;
    const y = 1900 - ((f * (0.8 + (i % 5) * 0.35) + i * 131) % 1900);
    const sz = 3 + (i % 3) * 2;
    const col = i % 4 === 0 ? HUD_ORANGE : accent;
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz, borderRadius: sz, background: col, opacity: 0.25 + 0.5 * Math.abs(Math.sin(f / 20 + i)), boxShadow: `0 0 10px ${col}` }} />;
  });
  const br = (pos: React.CSSProperties, bw: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 90, height: 90, border: `0 solid ${accent}`, opacity: 0.75, ...pos, ...bw }} />
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, #12305f 0%, #081a3a 48%, #030a1a 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 760, perspective: 700, perspectiveOrigin: "50% 0%", overflow: "hidden", WebkitMaskImage: "linear-gradient(to top, #000 25%, transparent 100%)", maskImage: "linear-gradient(to top, #000 25%, transparent 100%)" }}>
        <div style={{ position: "absolute", left: "-50%", width: "200%", top: 0, height: 1800, transformOrigin: "50% 0%", transform: "rotateX(72deg)", backgroundImage: `linear-gradient(${accent}55 2px, transparent 2px), linear-gradient(90deg, ${accent}55 2px, transparent 2px)`, backgroundSize: "90px 90px", backgroundPosition: `0 ${(f * 2) % 90}px` }} />
      </div>
      {dots}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0px, rgba(255,255,255,.035) 1px, transparent 1px, transparent 4px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.45) 100%)" }} />
      {br({ left: 26, top: 26 }, { borderTopWidth: 5, borderLeftWidth: 5 })}
      {br({ right: 26, top: 26 }, { borderTopWidth: 5, borderRightWidth: 5 })}
      {br({ left: 26, bottom: 26 }, { borderBottomWidth: 5, borderLeftWidth: 5 })}
      {br({ right: 26, bottom: 26 }, { borderBottomWidth: 5, borderRightWidth: 5 })}
    </AbsoluteFill>
  );
};

export const HudLabel: React.FC<{ text: string; brand: string; base: number; t: number; accent: string }> = ({ text, brand, base, t, accent }) => {
  const n = Math.floor(Math.max(0, t - base) * 28);
  const cursor = Math.floor(t * 2.5) % 2 === 0 ? "\u258C" : " ";
  return (
    <div style={{ position: "absolute", left: 64, right: 64, top: 66, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: accent, textShadow: `0 0 10px ${accent}88` }}>
      <div>{text.slice(0, n)}{cursor}</div>
      {brand ? <div style={{ color: "#9fb3d1", fontSize: 22, textShadow: "none" }}>{brand.toUpperCase()}</div> : null}
    </div>
  );
};

export const groupsOf = (words: W[]) => {
  const g: W[][] = [];
  let cur: W[] = [];
  words.forEach((w) => {
    if (cur.length && (cur.length >= 4 || cur[0].s !== w.s)) { g.push(cur); cur = []; }
    cur.push(w);
    if (/[.?!,]$/.test(w.w)) { g.push(cur); cur = []; }
  });
  if (cur.length) g.push(cur);
  return g;
};

export const HudCaption: React.FC<{ words: W[]; t: number; accent: string }> = ({ words, t, accent }) => {
  const groups = groupsOf(words);
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) return null;
  const g = groups[gi];
  if (t > g[g.length - 1].b + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1535, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 18px", padding: "20px 28px", borderRadius: 30, background: "rgba(5,15,35,.82)", border: `2px solid ${accent}99`, boxShadow: `0 0 26px ${accent}44, inset 0 0 18px ${accent}18`, fontWeight: 800, fontSize: 48, lineHeight: 1.2, color: "#fff" }}>
      {g.map((w, i) => {
        const active = t >= w.a && t < w.b;
        const spoken = t >= w.b;
        return <span key={i} style={{ color: w.hl || active ? accent : "#fff", opacity: spoken || active ? 1 : 0.45, textShadow: active ? `0 0 16px ${accent}` : undefined }}>{w.w}</span>;
      })}
    </div>
  );
};

export const ClassicCaption: React.FC<{ words: W[]; t: number; accent: string }> = ({ words, t, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = groupsOf(words);
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) return null;
  const g = groups[gi];
  if (t > g[g.length - 1].b + 0.6) return null;
  const sp = clamp01(spring({ frame: frame - Math.round(g[0].a * fps), fps, config: { damping: 13, stiffness: 190 } }));
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 180, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 18px", padding: "18px 28px", borderRadius: 36, background: "rgba(10,12,24,.75)", transform: `scale(${0.92 + 0.08 * sp})`, opacity: 0.35 + 0.65 * sp, boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
      {g.map((w, i) => {
        const active = t >= w.a && t < w.b;
        const spoken = t >= w.b;
        return (
          <span key={i} style={{ display: "inline-block", fontWeight: 800, fontSize: w.hl ? 56 : 48, lineHeight: 1.22, color: w.hl ? accent : "#fff", opacity: spoken || active ? 1 : 0.55, transform: `scale(${active ? 1.08 : 1})`, textShadow: "0 3px 14px rgba(0,0,0,.8)" }}>{w.w}</span>
        );
      })}
    </div>
  );
};
