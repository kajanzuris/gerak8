// FILE BARU: src/VideoEditor.tsx
// Renderer khusus mode "Edit Video AI" (theme: "editor"):
// - Memutar video gabungan dari Google Flow (source.mp4)
// - Auto Zoom-In / Zoom-Out & Jump-Cut saat kata *penting* diucapkan
// - Tepat saat kata pemicu (triggerWord) diucapkan, video asli otomatis mengecil (shrink)
//   atau bergerak menutup separuh layar (split-top / split-bottom) dan separuh lainnya
//   menampilkan gambar ilustrasi AI, simbol, atau kartu keterangan.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "./parts/config";
import { StageItem } from "./parts/blocks";
import { PopLayer } from "./parts/overlays";
import { Ctx, clamp01, fallbackWords, norm } from "./parts/ui";
import type { Data, Scene, W } from "./parts/types";

const YELLOW = "#ffc933";
const INK = "#120e24";

const outline = (r: number, color: string) =>
  Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    return `${Math.round(Math.cos(a) * r)}px ${Math.round(Math.sin(a) * r)}px 0 ${color}`;
  }).join(",");

const SUB_SHADOW = `${outline(4, "#000000")}, 0 6px 20px rgba(0,0,0,0.85)`;
const PUNCH_SHADOW = `${outline(6, INK)}, 0 12px 24px rgba(0,0,0,0.55)`;

type LayoutMode = "full" | "split-top" | "split-bottom" | "shrink-left" | "shrink-right";

const AUTO_LAYOUTS: LayoutMode[] = ["split-top", "shrink-left", "split-bottom", "shrink-right"];

const groupSubtitleWords = (words: W[], maxWords = 5): W[][] => {
  const groups: W[][] = [];
  let cur: W[] = [];
  words.forEach((w) => {
    if (cur.length && (cur.length >= maxWords || cur[0].s !== w.s)) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
    if (/[.?!,]$/.test(w.w)) {
      groups.push(cur);
      cur = [];
    }
  });
  if (cur.length) groups.push(cur);
  return groups;
};

const pickLayout = (sc: Scene, idx: number, hasVisual: boolean): LayoutMode => {
  if (!hasVisual) return "full";
  const custom = sc.vidLayout;
  if (custom && ["full", "split-top", "split-bottom", "shrink-left", "shrink-right"].includes(custom)) {
    return custom;
  }
  return AUTO_LAYOUTS[idx % AUTO_LAYOUTS.length];
};

export const VideoEditor: React.FC<{ name: string; data: Data }> = ({ name, data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const accent = data.accent || "#e5252a";

  // 1. Cari adegan yang sedang aktif
  let idx = 0;
  data.scenes.forEach((s, i) => {
    if (t >= s.start - 1e-6) idx = i;
  });
  const sc = data.scenes[idx];
  const sceneEnd = idx + 1 < data.scenes.length ? data.scenes[idx + 1].start : durationInFrames / fps;
  const sceneDur = Math.max(0.5, sceneEnd - sc.start);
  const sceneProgress = clamp01((t - sc.start) / sceneDur);

  // 2. Kumpulkan daftar kata & waktunya
  const allWords: W[] = React.useMemo(
    () =>
      data.words && data.words.length
        ? data.words
        : data.scenes.flatMap((s, i) => fallbackWords(s.title, s.start, i)),
    [data.words, data.scenes]
  );
  const subGroups = React.useMemo(() => groupSubtitleWords(allWords, 5), [allWords]);
  const sceneWords = allWords.filter((w) => w.s === idx);

  // 3. Cek apakah ada elemen visual (Gambar AI / Kartu Keterangan / Simbol Pops) di adegan ini
  const stageBlocks = sc.stage || [];
  const imgBlock = stageBlocks.find((b) => b.type === "image" && !!b.src);
  const cardBlocks = stageBlocks.filter((b) => b.type !== "image");
  const pops = sc.pops || [];
  const hasVisual = !!imgBlock || cardBlocks.length > 0 || pops.length > 0;

  const layout = pickLayout(sc, idx, hasVisual);

  // 4. Cari detik Kata Pemicu (triggerTime) saat video harus mengecil / membelah layar
  const triggerTime = (() => {
    const candidates = [
      sc.triggerWord,
      typeof imgBlock?.at === "string" ? imgBlock.at : undefined,
      typeof cardBlocks[0]?.at === "string" ? cardBlocks[0].at : undefined,
      pops[0]?.word,
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      const k = norm(c);
      const hit = k ? sceneWords.find((w) => norm(w.w).startsWith(k)) : undefined;
      if (hit) {
        return Math.min(hit.a, Math.max(sc.start + 0.15, sceneEnd - 1.5));
      }
    }
    const firstHl = sceneWords.find((w) => w.hl);
    if (firstHl) {
      return Math.min(firstHl.a, Math.max(sc.start + 0.15, sceneEnd - 1.5));
    }
    return sc.start + 0.25;
  })();

  // Progress perubahan tata letak (0 = Fullscreen, 1 = Split/Shrink penuh)
  const splitSpring =
    layout === "full"
      ? 0
      : clamp01(
          spring({
            frame: frame - Math.round(triggerTime * fps),
            fps,
            config: { damping: 14, stiffness: 135, mass: 0.9 },
          })
        );

  // 5. Efek Kamera Zoom In / Zoom Out di dalam bingkai video
  const activeHlWord = sceneWords.find((w) => w.hl && t >= w.a - 0.06 && t <= w.b + 0.25);
  const baseZoom =
    idx % 2 === 0
      ? interpolate(sceneProgress, [0, 1], [1.0, 1.12])
      : interpolate(sceneProgress, [0, 1], [1.12, 1.0]);
  const punchZoom = activeHlWord
    ? spring({
        frame: frame - Math.round(activeHlWord.a * fps),
        fps,
        config: { damping: 12, stiffness: 210 },
      }) * 0.1
    : 0;
  const innerVideoScale = baseZoom + punchZoom;
  const innerPanX = (idx % 2 === 0 ? 1 : -1) * interpolate(sceneProgress, [0, 1], [-14, 14]);

  // 6. Hitung koordinat & ukuran kotak Video Asli berdasarkan mode (Full vs Split vs Shrink)
  const targetVideoBox = (() => {
    switch (layout) {
      case "split-top":
        return { left: 24, top: 24, width: 1032, height: 910, radius: 36, rot: 0 };
      case "split-bottom":
        return { left: 24, top: 966, width: 1032, height: 930, radius: 36, rot: 0 };
      case "shrink-left":
        return { left: 42, top: 300, width: 460, height: 860, radius: 40, rot: -2 };
      case "shrink-right":
        return { left: 578, top: 300, width: 460, height: 860, radius: 40, rot: 2 };
      default:
        return { left: 0, top: 0, width: 1080, height: 1920, radius: 0, rot: 0 };
    }
  })();

  const vLeft = interpolate(splitSpring, [0, 1], [0, targetVideoBox.left]);
  const vTop = interpolate(splitSpring, [0, 1], [0, targetVideoBox.top]);
  const vWidth = interpolate(splitSpring, [0, 1], [1080, targetVideoBox.width]);
  const vHeight = interpolate(splitSpring, [0, 1], [1920, targetVideoBox.height]);
  const vRadius = interpolate(splitSpring, [0, 1], [0, targetVideoBox.radius]);
  const vRot = interpolate(splitSpring, [0, 1], [0, targetVideoBox.rot]);

  // 7. Hitung koordinat & ukuran Panel Keterangan / Simbol / Gambar (Separuh layar sebelahnya)
  const infoBox = (() => {
    switch (layout) {
      case "split-top":
        return { left: 24, top: 960, width: 1032, height: 936, isSide: false };
      case "split-bottom":
        return { left: 24, top: 24, width: 1032, height: 910, isSide: false };
      case "shrink-left":
        return { left: 526, top: 300, width: 512, height: 860, isSide: true };
      case "shrink-right":
        return { left: 42, top: 300, width: 512, height: 860, isSide: true };
      default:
        return { left: 60, top: 400, width: 960, height: 800, isSide: false };
    }
  })();

  const keywordBadge =
    sc.punch ||
    (sceneWords.find((w) => w.hl)?.w || sceneWords[0]?.w || "")
      .replace(/[.,?!*]/g, "")
      .toUpperCase();

  const cleanCaption =
    imgBlock?.caption ||
    sc.title
      .replace(/\*/g, "")
      .split(/\s+/)
      .slice(0, 7)
      .join(" ");

  // 8. Subtitle aktif
  let activeGroupIdx = -1;
  for (let i = 0; i < subGroups.length; i++) {
    if (t >= subGroups[i][0].a - 0.05) activeGroupIdx = i;
  }
  const currentSubGroup = activeGroupIdx >= 0 ? subGroups[activeGroupIdx] : null;

  const isSplitVertical = (layout === "split-top" || layout === "split-bottom") && splitSpring > 0.35;
  const subtitleTop = isSplitVertical ? 875 : 1480;

  const videoSrc = data.videoSrc || "source.mp4";
  const hasSourceVideo = data.hasVideo !== false;

  const ctx = {
    ws: sceneWords,
    base: sc.start,
    t,
    accent,
    name,
    ink: "#ffffff",
    mute: "#cbd5e1",
    theme: "clean" as const,
  };

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #1e293b 0%, #090d16 70%, #05070c 100%)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Audio utama (Voiceover asli video + SFX transisi) */}
      <Audio src={staticFile(`${name}/mix.wav`)} />

      {/* =====================================================================
          BAGIAN A: PANEL KETERANGAN / GAMBAR / SIMBOL (MUNCUL SAAT SPLIT/SHRINK)
         ===================================================================== */}
      {layout !== "full" && splitSpring > 0.02 ? (
        <Ctx.Provider value={ctx}>
          <div
            style={{
              position: "absolute",
              left: infoBox.left,
              top: infoBox.top,
              width: infoBox.width,
              height: infoBox.height,
              borderRadius: 36,
              background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,29,0.98) 100%)",
              border: `3px solid ${accent}88`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.6), inset 0 0 30px ${accent}22`,
              padding: infoBox.isSide ? "28px 24px" : "24px 28px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: clamp01(splitSpring * 1.5),
              transform: `scale(${0.86 + 0.14 * splitSpring}) translateY(${(1 - splitSpring) * 40}px)`,
              overflow: "hidden",
            }}
          >
            {keywordBadge ? (
              <div
                style={{
                  alignSelf: "stretch",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 20px",
                  borderRadius: 22,
                  background: `${accent}26`,
                  border: `2px solid ${accent}`,
                }}
              >
                <span
                  style={{
                    fontSize: infoBox.isSide ? 32 : 38,
                    fontWeight: 900,
                    color: YELLOW,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {keywordBadge}
                </span>
                {pops[0]?.glyph ? (
                  <span style={{ fontSize: infoBox.isSide ? 42 : 48, lineHeight: 1 }}>{pops[0].glyph}</span>
                ) : null}
              </div>
            ) : null}

            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                margin: "14px 0",
                overflow: "hidden",
                borderRadius: 24,
              }}
            >
              {imgBlock?.src ? (
                <Img
                  src={staticFile(`${name}/${imgBlock.src}`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 24,
                    transform: `scale(${1 + 0.06 * sceneProgress})`,
                  }}
                />
              ) : cardBlocks.length > 0 ? (
                <div
                  style={{
                    width: 920,
                    transform: `scale(${infoBox.isSide ? 0.5 : 0.88})`,
                    transformOrigin: "center center",
                  }}
                >
                  {cardBlocks.map((b, bi) => (
                    <StageItem key={bi} b={b} i={bi} />
                  ))}
                </div>
              ) : pops.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 20,
                  }}
                >
                  {pops[0].img ? (
                    <Img
                      src={staticFile(`${name}/${pops[0].img}`)}
                      style={{
                        width: infoBox.isSide ? 280 : 360,
                        height: infoBox.isSide ? 280 : 360,
                        objectFit: "contain",
                        filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.5))",
                        transform: `translateY(${Math.sin(frame / 12) * 10}px)`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: infoBox.isSide ? 190 : 240,
                        lineHeight: 1,
                        filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.5))",
                        transform: `translateY(${Math.sin(frame / 12) * 10}px)`,
                      }}
                    >
                      {pops[0].glyph || "💡"}
                    </div>
                  )}
                </div>
              ) : null}

              {imgBlock?.src && pops.length > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    right: 18,
                    bottom: 18,
                    width: 130,
                    height: 130,
                    borderRadius: 32,
                    background: "rgba(10,15,29,0.85)",
                    border: `3px solid ${YELLOW}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
                    transform: `scale(${splitSpring}) rotate(${Math.sin(frame / 10) * 6}deg)`,
                  }}
                >
                  {pops[0].img ? (
                    <Img
                      src={staticFile(`${name}/${pops[0].img}`)}
                      style={{ width: "82%", height: "82%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: 78, lineHeight: 1 }}>{pops[0].glyph}</span>
                  )}
                </div>
              ) : null}
            </div>

            <div
              style={{
                alignSelf: "stretch",
                textAlign: "center",
                fontSize: infoBox.isSide ? 26 : 30,
                fontWeight: 700,
                color: "#e2e8f0",
                lineHeight: 1.3,
                padding: "6px 10px",
              }}
            >
              {cleanCaption}
            </div>
          </div>
        </Ctx.Provider>
      ) : null}

      {/* =====================================================================
          BAGIAN B: BINGKAI VIDEO ASLI (FULLSCREEN -> SPLIT / SHRINK OTOMATIS)
         ===================================================================== */}
      <div
        style={{
          position: "absolute",
          left: vLeft,
          top: vTop,
          width: vWidth,
          height: vHeight,
          borderRadius: vRadius,
          overflow: "hidden",
          transform: `rotate(${vRot}deg)`,
          boxShadow: splitSpring > 0.05 ? "0 24px 60px rgba(0,0,0,0.75)" : undefined,
          border: splitSpring > 0.05 ? "4px solid rgba(255,255,255,0.85)" : undefined,
          boxSizing: "border-box",
          backgroundColor: "#0b0f1d",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `translate(${innerPanX}px, 0px) scale(${innerVideoScale})`,
            transformOrigin: "50% 42%",
          }}
        >
          {hasSourceVideo ? (
            <OffthreadVideo
              src={staticFile(`${name}/${videoSrc}`)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : imgBlock?.src ? (
            <Img
              src={staticFile(`${name}/${imgBlock.src}`)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>

        {splitSpring < 0.5 ? (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%)",
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>

      {/* Pops melayang bila adegan tetap Fullscreen */}
      {layout === "full" && pops.length > 0 ? (
        <Ctx.Provider value={ctx}>
          <PopLayer pops={pops} defaultY={380} scale={1.4} />
        </Ctx.Provider>
      ) : null}

      {/* =====================================================================
          BAGIAN C: TEKS PUNCH SAAT FULLSCREEN
         ===================================================================== */}
      {layout === "full" && activeHlWord ? (
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: 200,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 104,
            color: YELLOW,
            textShadow: PUNCH_SHADOW,
            textTransform: "uppercase",
            transform: `scale(${0.85 + punchZoom * 1.5}) rotate(${idx % 2 === 0 ? -3 : 3}deg)`,
            pointerEvents: "none",
          }}
        >
          {activeHlWord.w.replace(/[.,?!*]/g, "")}
        </div>
      ) : null}

      {/* =====================================================================
          BAGIAN D: SUBTITLE AKTIF PER KATA (KARAOKE HIGHLIGHT)
         ===================================================================== */}
      {currentSubGroup && t <= currentSubGroup[currentSubGroup.length - 1].b + 0.5 ? (
        <div
          style={{
            position: "absolute",
            left: 50,
            right: 50,
            top: subtitleTop,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 16px",
            padding: "14px 24px",
            borderRadius: 28,
            backgroundColor: isSplitVertical ? "rgba(7,11,24,0.9)" : "rgba(7,11,24,0.55)",
            border: isSplitVertical ? `2px solid ${accent}aa` : undefined,
            boxShadow: isSplitVertical ? "0 14px 34px rgba(0,0,0,0.75)" : undefined,
            textAlign: "center",
            zIndex: 30,
          }}
        >
          {currentSubGroup.map((w, wi) => {
            const isActive = t >= w.a - 0.04 && t <= w.b + 0.08;
            const isSpoken = t >= w.a - 0.04;
            const wSpring = clamp01(
              spring({
                frame: frame - Math.round(w.a * fps),
                fps,
                config: { damping: 12, stiffness: 240 },
              })
            );

            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: isSplitVertical ? (w.hl ? 54 : 48) : w.hl ? 64 : 56,
                  lineHeight: 1.2,
                  padding: isActive && w.hl ? "2px 16px" : "2px 4px",
                  borderRadius: 14,
                  backgroundColor: isActive && w.hl ? accent : "transparent",
                  color: isActive ? (w.hl ? "#ffffff" : YELLOW) : isSpoken ? "#ffffff" : "rgba(255,255,255,0.45)",
                  transform: `translateY(${(1 - wSpring) * 14}px) scale(${
                    isActive ? 1.1 : 0.94 + 0.06 * wSpring
                  })`,
                  textShadow: SUB_SHADOW,
                }}
              >
                {w.w}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* =====================================================================
          BAGIAN E: TOMBOL CTA DI 2 DETIK TERAKHIR & PROGRESS BAR
         ===================================================================== */}
      {data.cta && data.showCta !== false && frame >= durationInFrames - Math.round(2 * fps) ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 90,
            display: "flex",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            style={{
              padding: "20px 48px",
              borderRadius: 60,
              backgroundColor: accent,
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 42,
              boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
            }}
          >
            {data.cta}
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 8,
          width: `${(frame / durationInFrames) * 100}%`,
          backgroundColor: accent,
          zIndex: 50,
        }}
      />
    </AbsoluteFill>
  );
};