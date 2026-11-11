// TEMA "dynamic" (dinamis): gambar penuh lebar + panel caption gelap, teks punch raksasa, objek 3D besar (pops),
// adegan tanpa foto berlatar gradasi + cincin radar, konfeti, sapuan warna, dan kolase penutup.
// Aktif bila scenes.src.json punya  "style": "explainer"  dan  "theme": "dynamic".  Dipanggil dari Explainer.tsx.
//
// Jenis adegan (otomatis dari isi adegan):
//   foto    : ada blok { type: "image", src } -> gambar 1080x1440 (3:4) di atas, caption di panel bawah
//   kolase  : adegan punya "collage": ["img/img01.png", ...] (3-5 gambar) -> kolase miring + pita + tombol CTA
//   ilustrasi: selain itu -> latar gradasi "look" + cincin radar; isi: blok stage (bila ada) atau objek besar (pops)
// Field adegan lain: punch / punchWord / punchAt (teks raksasa), look, fx ("confetti"), sweep (sapuan warna).
import { AbsoluteFill, Audio, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";
import { FONT, easeIO } from "./config";
import { PopLayer } from "./overlays";
import { StageItem } from "./blocks";
import { Ctx, clamp01, fallbackWords, norm } from "./ui";
import type { Data, Item, Scene, W } from "./types";

// ---------- angka tata letak (layar 1080x1920) ----------
const NAVY = "#070b18";
const YELLOW = "#ffc933";
const INK = "#17122b"; // warna garis tepi teks punch
const IMG_H = 1440; // gambar 3:4 selebar layar
const CAP_TOP = 1385; // puncak blok caption
const PUNCH_Y = { top: 250, mid: 760, low: 1075 };
const PHOTO_SLOTS = [{ x: 800, y: 430 }, { x: 290, y: 760 }]; // posisi 2 pops pertama di adegan foto
const HERO_SLOT = [{ x: 540, y: 930 }]; // objek besar di tengah adegan ilustrasi
const POP_SCALE_PHOTO = 1.7;
const POP_SCALE_HERO = 2.7;
const SWEEP_SEC = 0.45;
const FADE_SEC = 0.2;

type Look = { bg: string; ring: string };
const LOOKS: Record<string, Look> = {
  peach: { bg: "linear-gradient(180deg,#ff9a6c,#ffd08a)", ring: "rgba(255,255,255,.55)" },
  violet: { bg: "linear-gradient(180deg,#2d1b78,#5a3fd0)", ring: "rgba(255,255,255,.30)" },
  teal: { bg: "linear-gradient(180deg,#0aa5a0,#0a3d5c)", ring: "rgba(120,255,240,.45)" },
  sand: { bg: "linear-gradient(180deg,#ffe8b6,#ffc98a)", ring: "rgba(255,255,255,.70)" },
  night: { bg: "linear-gradient(180deg,#0b1030,#1d2a6b)", ring: "rgba(110,170,255,.40)" },
};
const LOOK_NAMES = Object.keys(LOOKS);

// garis tepi teks dengan text-shadow (aman di semua versi Chrome, tidak bergantung paint-order)
const outline = (r: number, color: string) =>
  Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    return `${Math.round(Math.cos(a) * r)}px ${Math.round(Math.sin(a) * r)}px 0 ${color}`;
  }).join(",");
const PUNCH_SHADOW = `${outline(7, INK)},0 14px 0 rgba(0,0,0,.28)`;

// ---------- pembantu ----------
const imageOf = (sc: Scene): Item | undefined => (sc.stage || []).find((b) => b.type === "image" && !!b.src);
const kindOf = (sc: Scene): "collage" | "photo" | "art" =>
  sc.collage && sc.collage.length >= 3 ? "collage" : imageOf(sc) ? "photo" : "art";
const lookFor = (sc: Scene, i: number): Look => LOOKS[sc.look ?? ""] ?? LOOKS[LOOK_NAMES[i % LOOK_NAMES.length]];

// kelompok kata caption (maks n kata; berhenti di tanda baca atau pergantian adegan)
const groupsOfN = (words: W[], n: number): W[][] => {
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

// ---------- elemen ----------
const Rings: React.FC<{ color: string; frame: number; cy?: number }> = ({ color, frame, cy = 900 }) => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
    {[170, 330, 500, 690].map((r, i) => (
      <circle key={i} cx={540} cy={cy} r={r * (1 + 0.018 * Math.sin(frame / 22 + i * 1.3))} fill="none" stroke={color} strokeWidth={4} />
    ))}
    <circle cx={540} cy={cy} r={26} fill="none" stroke={color} strokeWidth={5} />
  </svg>
);

const CONFETTI = ["#ffc933", "#ff5d73", "#22d3ee", "#7cf29a", "#ffffff"];
const Confetti: React.FC<{ frame: number }> = ({ frame }) => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
    {Array.from({ length: 36 }, (_, i) => {
      const x = ((i * 97) % 1080) + Math.sin(frame / 18 + i) * 18;
      const y = ((frame * (4 + (i % 5)) + i * 131) % 2000) - 60;
      return <rect key={i} x={x} y={y} width={14} height={22} rx={3} fill={CONFETTI[i % CONFETTI.length]} transform={`rotate(${frame * 5 + i * 40} ${x} ${y})`} />;
    })}
  </svg>
);

const Punch: React.FC<{ text: string; at: "top" | "mid" | "low"; t0: number; white: boolean; tilt: number }> = ({ text, at, t0, white, tilt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 9, stiffness: 170, mass: 0.8 } });
  if (s < 0.01) return null;
  const n = Math.max(text.length, 5);
  const size = Math.max(96, Math.min(168, Math.floor(900 / (n * 0.66))));
  const wob = Math.sin(frame / 10 + tilt) * 1.2;
  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: PUNCH_Y[at],
        width: 960,
        textAlign: "center",
        transform: `translate(-50%,-50%) rotate(${tilt + wob}deg) scale(${0.35 + 0.65 * s})`,
        opacity: clamp01(s * 2),
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.98,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: white ? "#ffffff" : YELLOW,
        textShadow: PUNCH_SHADOW,
      }}
    >
      {text}
    </div>
  );
};

const Caption: React.FC<{ words: W[]; t: number; outlined: boolean }> = ({ words, t, outlined }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = React.useMemo(() => groupsOfN(words, 7), [words]);
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) return null;
  const g = groups[gi];
  if (t > g[g.length - 1].b + 0.5) return null;
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: CAP_TOP, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", gap: "0 16px", textAlign: "center", fontFamily: FONT, fontSize: 56, fontWeight: 800, lineHeight: 1.3, textShadow: outlined ? `${outline(3, INK)},0 4px 14px rgba(0,0,0,.45)` : "0 3px 16px rgba(0,0,0,.65)" }}>
      {g.map((w, i) => {
        const s = clamp01(spring({ frame: frame - Math.round(w.a * fps), fps, config: { damping: 14, stiffness: 220 } }));
        return (
          <span key={i} style={{ display: "inline-block", opacity: s > 0.02 ? clamp01(s * 2) : 0, transform: `translateY(${(1 - s) * 22}px) scale(${0.9 + 0.1 * s})`, color: w.hl ? YELLOW : "#ffffff" }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

const Progress: React.FC<{ pct: number; accent: string }> = ({ pct, accent }) => (
  <div style={{ position: "absolute", left: 36, right: 36, top: 30, height: 8, borderRadius: 4, background: "rgba(8,12,28,.7)" }}>
    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: accent }} />
    <div style={{ position: "absolute", top: -5, left: `calc(${pct}% - 9px)`, width: 18, height: 18, borderRadius: 9, background: "#ffffff", border: `3px solid ${accent}`, boxSizing: "border-box" }} />
  </div>
);

// kolase penutup: kartu foto miring (urutan gambar: tengah paling atas)
const COLLAGE = [
  { x: 270, y: 560, r: -8 },
  { x: 810, y: 540, r: 7 },
  { x: 300, y: 930, r: -5 },
  { x: 780, y: 960, r: 5 },
  { x: 540, y: 740, r: 2 },
];
const CARD_W = 330;
const CARD_H = 440;

const Collage: React.FC<{ name: string; srcs: string[]; t0: number; accent: string; cta?: string }> = ({ name, srcs, t0, accent, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = srcs.slice(0, 5);
  // susunan slot menurut jumlah gambar: 5 = semua, 4 = empat pojok, 3 = dua atas + tengah
  const slotIdx = list.length >= 5 ? [0, 1, 2, 3, 4] : list.length === 4 ? [0, 1, 2, 3] : [0, 1, 4];
  const rib = clamp01(spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 12, stiffness: 140 } }));
  const pill = clamp01(spring({ frame: frame - Math.round((t0 + 0.9) * fps), fps, config: { damping: 12, stiffness: 160 } }));
  return (
    <>
      <svg width={130} height={230} viewBox="0 0 130 230" style={{ position: "absolute", left: 475, top: 60 - (1 - rib) * 260 }}>
        <path d="M6 0 H124 V218 L65 170 L6 218 Z" fill={YELLOW} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      {list.map((_, k) => {
        const n = k;
        const slot = COLLAGE[slotIdx[k]];
        const s = clamp01(spring({ frame: frame - Math.round((t0 + 0.15 + n * 0.18) * fps), fps, config: { damping: 12, stiffness: 150 } }));
        const float = Math.sin(frame / 24 + k * 1.7) * 6;
        return (
          <div key={k} style={{ position: "absolute", left: slot.x - CARD_W / 2, top: slot.y - CARD_H / 2 + (1 - s) * 70 + float, width: CARD_W, height: CARD_H, padding: 10, boxSizing: "border-box", borderRadius: 16, background: "#ffffff", boxShadow: "0 18px 34px rgba(0,0,0,.38)", transform: `rotate(${slot.r + (1 - s) * -12}deg) scale(${0.5 + 0.5 * s})`, opacity: clamp01(s * 2), zIndex: slotIdx[k] === 4 ? 5 : 1 }}>
            <Img src={staticFile(`${name}/${list[k]}`)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
          </div>
        );
      })}
      {cta ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1215, display: "flex", justifyContent: "center", opacity: pill, transform: `scale(${0.8 + 0.2 * pill})` }}>
          <div style={{ padding: "22px 64px", borderRadius: 70, background: accent, color: NAVY, fontFamily: FONT, fontWeight: 800, fontSize: 46, boxShadow: "0 10px 24px rgba(0,0,0,.3)" }}>{cta}</div>
        </div>
      ) : null}
    </>
  );
};

// ---------- video utama ----------
export const DynamicStory: React.FC<{ name: string; data: Data }> = ({ name, data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const accent = data.accent || "#22d3ee";
  const total = durationInFrames / fps;

  let idx = 0;
  data.scenes.forEach((s, i) => { if (t >= s.start - 1e-6) idx = i; });
  const sc = data.scenes[idx];
  const base = sc.start;
  const fade = idx > 0 ? clamp01((t - base) / FADE_SEC) : 1;
  const q = clamp01((t - base) / SWEEP_SEC);
  const sweeping = idx > 0 && sc.sweep === true && q < 1;

  const allWords: W[] = data.words && data.words.length ? data.words : data.scenes.flatMap((s, i) => fallbackWords(s.title, s.start, i));
  const wordsOf = (i: number): W[] => {
    const fw = allWords.filter((w) => w.s === i);
    return fw.length ? fw : fallbackWords(data.scenes[i].title, data.scenes[i].start, i);
  };

  // satu lapisan adegan; dipakai dua kali saat pudar antar adegan
  const layer = (i: number) => {
    const s = data.scenes[i];
    const kind = kindOf(s);
    const ws = wordsOf(i);
    const sceneEnd = i + 1 < data.scenes.length ? data.scenes[i + 1].start : total;
    const p = clamp01((t - s.start) / Math.max(0.5, sceneEnd - s.start)); // 0..1 sepanjang adegan
    const look = lookFor(s, i);
    const img = imageOf(s);
    const blocks = (s.stage || []).filter((b) => b.type !== "image");
    const pops = s.pops || [];
    const punchT0 = (() => {
      const k = s.punchWord ? norm(s.punchWord) : "";
      const hit = k ? ws.find((w) => norm(w.w).startsWith(k)) : undefined;
      return hit ? hit.a : s.start + 0.12;
    })();
    const punchAt = kind === "photo" ? s.punchAt ?? "low" : s.punchAt === "mid" ? "mid" : "top"; // adegan tanpa foto: "low" menimpa objek tengah, jadi dipaksa ke atas
    const tilt = i % 2 === 0 ? -4 : 3;
    const ctx = { ws, base: s.start, t, accent, name, ink: "#16161a", mute: "#6b665c", theme: "clean" as const };
    return (
      <Ctx.Provider key={"L" + i} value={ctx}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, overflow: "hidden", background: kind === "photo" ? NAVY : look.bg }}>
          {kind === "photo" && img ? (
            <>
              <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: IMG_H, overflow: "hidden" }}>
                <Img
                  src={staticFile(`${name}/${img.src}`)}
                  style={{ width: "100%", height: "100%", objectFit: img.fit === "contain" ? "contain" : "cover", transformOrigin: "50% 40%", transform: `translate(${(i % 2 ? -1 : 1) * p * 24}px, ${-p * 16}px) scale(${i % 2 ? 1.08 - 0.08 * p : 1 + 0.08 * p})` }}
                />
              </div>
              <div style={{ position: "absolute", left: 0, top: IMG_H - 200, width: 1080, height: 200, background: `linear-gradient(to bottom, rgba(7,11,24,0), ${NAVY})` }} />
              <div style={{ position: "absolute", left: 0, top: IMG_H, width: 1080, height: 1920 - IMG_H, background: NAVY }} />
              {pops.length ? <PopLayer pops={pops} defaultY={300} slots={PHOTO_SLOTS} scale={POP_SCALE_PHOTO} /> : null}
            </>
          ) : null}
          {kind === "art" ? (
            <>
              <Rings color={look.ring} frame={frame} />
              {s.fx === "confetti" ? <Confetti frame={frame} /> : null}
              {blocks.length ? (
                <>
                  <div style={{ position: "absolute", left: 60, right: 60, top: 480, height: 760, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
                    {blocks.map((b, bi) => <StageItem key={bi} b={b} i={bi} />)}
                  </div>
                  {pops.length ? <PopLayer pops={pops} defaultY={300} slots={PHOTO_SLOTS} scale={1.4} /> : null}
                </>
              ) : pops.length ? (
                <PopLayer pops={pops.slice(0, 1)} defaultY={700} slots={HERO_SLOT} scale={POP_SCALE_HERO} />
              ) : null}
            </>
          ) : null}
          {kind === "collage" ? (
            <>
              <Rings color={look.ring} frame={frame} cy={860} />
              <Collage name={name} srcs={s.collage || []} t0={s.start} accent={accent} cta={data.cta && data.showCta !== false ? data.cta : undefined} />
            </>
          ) : null}
          {s.punch ? <Punch text={s.punch} at={punchAt} t0={punchT0} white={i % 2 === 1} tilt={tilt} /> : null}
        </div>
      </Ctx.Provider>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, fontFamily: FONT }}>
      <Audio src={staticFile(name + "/mix.wav")} />
      {idx > 0 && fade < 1 && !sc.sweep ? layer(idx - 1) : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: sc.sweep ? 1 : fade }}>{layer(idx)}</div>
      {sweeping ? <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: accent, boxShadow: "0 24px 48px rgba(0,0,0,.25)", transform: `translateY(${easeIO(q) * 100}%)` }} /> : null}
      <Caption words={allWords} t={t} outlined={kindOf(sc) !== "photo"} />
      <Progress pct={(frame / durationInFrames) * 100} accent={accent} />
    </AbsoluteFill>
  );
};
