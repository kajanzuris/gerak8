// RENDERER VIDEO style "explainer" (kerangka): pilih adegan aktif, hitung transisi & latar, susun lapisan layar.
// Isi tiap bagian ada di src/parts/ : config (warna/angka/LAYOUT), types (bentuk JSON), ui (animasi dasar),
// blocks (tampilan tiap blok), themes (judul/caption/latar per tema), mascots, scenery.
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";
import { BG_PRESETS, C, CAP_LIFT, CLASSIC_BGS, CLASSIC_PROPS, FONT, HUD_CYAN, HUD_VARS, LAYOUT, NEON_VARS, TD, TRANS, TUT_VARS, bgStyle, classicVars, easeIO, mascotPopSlots, popDefaultY, stageGeo, transPair, withImageShrink } from "./parts/config";
import type { ThemeName } from "./parts/config";
import { Bg, Prop } from "./parts/scenery";
import { Block, HoloRing, OrbMascot, SpriteMascot, Stick } from "./parts/mascots";
import { ClassicCaption, HandleTag, Header, Headline, HudBackdrop, HudCaption, HudLabel, NeonBackdrop, NeonCaption, StepBadge, TutBackdrop, TutCaption } from "./parts/themes";
import { Ctx, clamp01, fallbackWords } from "./parts/ui";
import { StageItem } from "./parts/blocks";
import { PopLayer } from "./parts/overlays";
import { DynamicStory } from "./parts/dynamic";
import { VideoEditor } from "./VideoEditor";
import type { Data } from "./parts/types";
import type { Pose } from "./parts/mascots";
import type { Preset } from "./parts/config";
import type { StoryProps } from "./VectorStory";

export const Explainer: React.FC<StoryProps> = ({ name, data: d }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!d) return null;
  const data = d as unknown as Data;
  if (data.theme === "editor" || data.hasVideo) return <VideoEditor name={name} data={data} />;
  if (data.theme === "dynamic") return <DynamicStory name={name} data={data} />; // tema dinamis: renderer terpisah (parts/dynamic.tsx)
  const t = frame / fps;
  const hud = data.theme === "hud";
  const classic = data.theme === "classic";
  const tut = data.theme === "tutorial";
  const neon = data.theme === "neon";
  const themeName: ThemeName = hud ? "hud" : classic ? "classic" : tut ? "tutorial" : neon ? "neon" : "clean";
  const L = LAYOUT[themeName]; // semua angka posisi/ukuran per tema ada di parts/config.ts (LAYOUT)
  const accent = data.accent || (hud ? HUD_CYAN : classic ? "#FFD700" : tut ? "#ff5a1f" : neon ? "#ff3f8e" : C.red);

  // Sumber teks di layar (agar kalimat tidak tampil dua kali):
  //   clean            : judul besar (Headline) saja
  //   neon / classic   : caption saja (tidak pernah memakai Headline)
  //   hud / tutorial   : bawaan "caption"; bisa diubah lewat "textMode" di scenes.src.json: "headline" | "caption" | "both"
  //                      (adegan tanpa kartu/gambar selalu memakai judul besar, caption disembunyikan)
  const tm = data.textMode;
  const textMode: "headline" | "caption" | "both" = hud || tut ? (tm === "headline" || tm === "both" || tm === "caption" ? tm : "caption") : "headline";

  let idx = 0;
  data.scenes.forEach((s, i) => { if (t >= s.start - 1e-6) idx = i; });
  const sc = data.scenes[idx];
  const prev = idx > 0 ? data.scenes[idx - 1] : undefined;
  const base = sc.start;

  const talk = data.env ? data.env[Math.min(data.env.length - 1, frame)] : undefined;
  const hasMascot = !!sc.mascot && data.char !== "plain";
  const persist = hasMascot && prev?.mascot === sc.mascot;
  const ent = persist ? 1 : clamp01(spring({ frame: frame - Math.round(base * fps), fps, config: { damping: 14 } }));
  const mx = sc.mascot === "left" ? L.mxLeft : sc.mascot === "right" ? L.mxRight : L.mxCenter;
  const flip = sc.mascot === "right";
  const ctaStart = durationInFrames - Math.round(2 * fps);

  // latar per adegan: satu saja, atau ganti otomatis tiap N adegan; "bg" per adegan mengalahkan semuanya
  const names = (data.backgrounds || []).filter((n) => BG_PRESETS[n]);
  const bgNames = names.length ? names : ["cream"];
  const every = Math.max(1, data.bgEvery || 3);
  const presetFor = (i: number): Preset => {
    const own = data.scenes[i].bg;
    if (own && BG_PRESETS[own]) return BG_PRESETS[own];
    return BG_PRESETS[data.bgMode === "auto" ? bgNames[Math.floor(i / every) % bgNames.length] : bgNames[0]];
  };
  const preset = presetFor(idx);
  const cList = (data.backgrounds || []).filter((n) => CLASSIC_BGS.includes(n));
  const cBgFor = (i: number): string => {
    const own = data.scenes[i].bg;
    if (own && CLASSIC_BGS.includes(own)) return own;
    const pool = cList.length ? cList : CLASSIC_BGS;
    return pool[Math.floor(i / Math.max(1, data.bgEvery || 2)) % pool.length];
  };
  const ink = data.textColor || (hud || classic || neon ? "#ffffff" : tut ? "#1a0e08" : preset.ink);

  // jenis transisi masuk per adegan: "transition" di adegan, atau dari daftar global (berurutan / acak)
  const tlist = (data.transitions || []).filter((x) => TRANS.includes(x));
  const tkindFor = (i: number): string => {
    if (i === 0) return "none";
    if (data.scenes[i].stage?.[0]?.hold) return "none"; // gambar yang bertahan: jangan digeser
    const own = data.scenes[i].transition;
    if (own && TRANS.includes(own)) return own;
    if (!tlist.length) return "none";
    const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
    return tlist[data.transitionsMode === "random" ? Math.floor(r * tlist.length) : i % tlist.length];
  };
  const tkind = tkindFor(idx);
  const inTrans = idx > 0 && tkind !== "none" && t - base < TD;
  const pair = transPair(tkind, (t - base) / TD);

  const hasHeader = !classic && !tut && !neon && data.header !== false && (hud || !!(data.brand || data.tag));
  const dy = hasHeader ? 0 : -80;
  const feet = L.feet;
  const mScale = L.mScale;
  const wsMain = (data.words || []).filter((w) => w.s === idx);
  const hlWord = (wsMain.find((w) => w.hl) || wsMain[0] || { w: "" }).w.replace(/[.,!?;:"'*]/g, "").toUpperCase();
  const hudLabel = sc.label || `${(data.tag || "STATUS").toUpperCase()}: ${hlWord}`;
  const cstyle = data.charStyle || "block";
  const poseName = sc.pose || "idle";

  // ---- tema neon: maskot orb besar (hook / tanpa kartu) atau kecil (di bawah kartu), berpindah halus ----
  const orbFor = (i: number) => {
    const sn = data.scenes[i];
    const hasChar = !!sn.mascot && data.char !== "plain";
    const hide = sn.orb === "hide" || hasChar || !!sn.stage?.some((b) => b.type === "brand");
    const big = sn.orb ? sn.orb === "big" : !(sn.stage && sn.stage.length) || (sn.stage.length === 1 && sn.stage[0].type === "chip");
    return { hide, big, y: big ? 900 : 1620, sc: big ? 1.15 : 0.62 };
  };

  // satu lapisan adegan (judul + blok visual); dipakai dua kali saat transisi (adegan lama + baru)
  const layer = (i: number, wrap: React.CSSProperties) => {
    const s = data.scenes[i];
    const fw = (data.words || []).filter((w) => w.s === i);
    const wsI = fw.length ? fw : fallbackWords(s.title, s.start, i);
    const solo = !(s.stage && s.stage.length);
    const sm = (s.small ?? 0) <= 3 && (s.small ?? 0) <= wsI.length - 2 ? s.small ?? 0 : 0;
    const hm = !!s.mascot;
    const p = presetFor(i);
    const hasImg = (s.stage || []).some((b) => b.type === "image");
    const showHead = !(classic || neon) && (textMode !== "caption" || solo); // judul besar
    const lift = (hud || tut) && textMode === "caption" && !solo ? (CAP_LIFT[themeName] ?? 0) : 0; // judul hilang: stage naik
    const centerCards = neon && !hm && !solo && !hasImg && !orbFor(i).big; // neon: kartu di tengah ruang kosong
    const geo = stageGeo(themeName, { mascot: hm, shift: L.shiftWhenNoHeader ? dy : 0, lift, centerCards });
    // adegan bermaskot: gambar dikecilkan bila ruang stage kurang; pops ke baris maskot (sisi seberang maskot)
    const mOn = hm && data.char !== "plain";
    const stageEff = hm ? withImageShrink(s.stage || [], themeName, geo) : s.stage || [];
    const slots = mOn ? mascotPopSlots(themeName, s.mascot) : undefined;
    return (
      <Ctx.Provider key={"L" + i} value={{ ws: wsI, base: s.start, t, accent, name, ink: data.textColor || (hud || neon ? "#ffffff" : tut ? "#1a0e08" : p.ink), mute: data.textColor || (hud ? "#9fb3d1" : classic ? "#c4c9d8" : neon ? "#b9a8c9" : tut ? "#5a2a14" : p.mute), theme: themeName, hl: tut ? "#ffffff" : undefined }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, ...wrap }}>
          {!showHead ? null : (
            <div style={{ position: "absolute", left: 50, right: 50, top: solo ? 460 : L.headTop + (L.shiftWhenNoHeader ? dy : 0), height: solo ? 520 : 300, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, textAlign: "center" }}>
              <Headline ws={wsI} small={sm} solo={solo} />
            </div>
          )}
          {classic && s.prop && CLASSIC_PROPS.includes(s.prop) && typeof Prop !== "undefined" ? (
            <Prop kind={s.prop} f={frame} lf={Math.max(0, frame - Math.round(s.start * fps))} hx={s.mascot === "left" ? 300 : s.mascot === "right" ? 780 : 540} accent={accent} />
          ) : null}
          <div style={{ position: "absolute", left: 60, right: 60, top: geo.top, bottom: geo.bottomGap, display: "flex", flexDirection: "column", justifyContent: geo.align, gap: L.stageGap }}>
            {stageEff.map((b, bi) => <StageItem key={bi} b={b} i={bi} />)}
          </div>
          {s.pops && s.pops.length ? (
            <PopLayer
              pops={s.pops}
              defaultY={popDefaultY(stageEff, themeName, geo, Math.max(1, s.pops.length - (slots ? slots.length : 0)))}
              slots={slots}
            />
          ) : null}
        </div>
      </Ctx.Provider>
    );
  };

  // ---- tema tutorial: lencana langkah ----
  let stepStart = base;
  if (sc.step) {
    let si = idx;
    while (si > 0 && data.scenes[si - 1].step === sc.step) si--;
    stepStart = data.scenes[si].start;
  }
  const oc = orbFor(idx);
  const opv = idx > 0 ? orbFor(idx - 1) : oc;
  const ok = idx > 0 ? easeIO(clamp01((t - base) / 0.5)) : 1;
  const orbY = opv.y + (oc.y - opv.y) * ok;
  const orbS = opv.sc + (oc.sc - opv.sc) * ok;
  const orbVis = (oc.hide && opv.hide ? 0 : oc.hide ? 1 - ok : opv.hide ? ok : 1) * (idx === 0 ? clamp01(spring({ frame, fps, config: { damping: 14 } })) : 1);
  const floorOp = idx > 0 && opv.hide && !oc.hide ? 1 - ok : oc.hide ? (idx > 0 && opv.hide ? 1 : ok) : 0;

  const prevPreset = idx > 0 ? presetFor(idx - 1) : preset;
  // caption hud/tutorial: tampil bila mode "both", atau mode "caption" dan adegan punya kartu/gambar
  const showCaption = textMode === "both" || (textMode === "caption" && !!(sc.stage && sc.stage.length));

  return (
    <AbsoluteFill style={{ ...(hud ? { backgroundColor: "#030a1a", ...HUD_VARS } : classic ? { backgroundColor: "#000", ...classicVars(accent) } : tut ? { backgroundColor: "#d9480f", ...TUT_VARS } : neon ? { backgroundColor: "#07020f", ...NEON_VARS } : bgStyle(preset)), fontFamily: FONT, color: ink }}>
      <Audio src={staticFile(name + "/mix.wav")} />
      {hud ? <HudBackdrop f={frame} accent={accent} /> : null}
      {tut ? <TutBackdrop f={frame} /> : null}
      {neon ? <NeonBackdrop f={frame} floor={floorOp} /> : null}
      {classic && typeof Bg !== "undefined" ? (
        <>
          <Bg type={cBgFor(idx)} f={frame} p={clamp01((t - base) / 3)} />
          {inTrans && idx > 0 && cBgFor(idx - 1) !== cBgFor(idx) ? (
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: 1 - easeIO(clamp01((t - base) / TD)) }}>
              <Bg type={cBgFor(idx - 1)} f={frame} p={1} />
            </div>
          ) : null}
        </>
      ) : null}
      {!hud && !classic && !tut && !neon && inTrans && prevPreset !== preset ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, ...bgStyle(prevPreset), opacity: 1 - easeIO(clamp01((t - base) / TD)) }} />
      ) : null}
      {inTrans ? layer(idx - 1, pair.out) : null}
      {layer(idx, inTrans ? pair.inn : {})}
      {hasHeader ? (hud ? <HudLabel text={hudLabel} brand={data.brand || ""} base={base} t={t} accent={accent} /> : <Header brand={data.brand || ""} tag={data.tag || ""} />) : null}
      {hud && hasMascot ? <HoloRing x={mx} y={feet - 190 + (1 - ent) * 420} f={frame} accent={accent} /> : null}
      {hasMascot && cstyle === "sprite" && data.charImg ? (
        <SpriteMascot name={name} img={data.charImg} talkImg={data.charTalkImg} x={mx} flip={flip} pose={poseName} f={frame} talk={talk ?? 0} ent={ent} feet={feet} />
      ) : hasMascot ? (
        <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, filter: hud ? `drop-shadow(0 0 14px ${accent}99)` : neon ? `drop-shadow(0 0 18px ${accent}88)` : undefined }}>
          <g transform={`translate(${mx},${feet + (1 - ent) * 420}) scale(${flip ? -mScale : mScale},${mScale})`}>
            <ellipse cx={0} cy={4} rx={100} ry={14} fill="#000" opacity={0.15} />
            {cstyle === "stick" && typeof Stick !== "undefined" ? (
              <Stick pose={poseName as Pose} color={data.charColor || "#222"} f={frame} type={data.char} talk={talk} />
            ) : (
              <Block pose={poseName as Pose} color={data.charColor || "#222"} f={frame} type={data.char} talk={talk} />
            )}
          </g>
        </svg>
      ) : null}
      {neon && orbVis > 0.01 ? <OrbMascot x={540} y={orbY} s={orbS} f={frame} talk={talk ?? 0} op={orbVis} /> : null}
      {tut && sc.step && data.header !== false ? <StepBadge step={sc.step} label={data.stepLabel || "Langkah"} t0={stepStart} /> : null}
      {hud && showCaption ? <HudCaption words={data.words || []} t={t} accent={accent} /> : null}
      {tut && showCaption ? (
        // adegan bermaskot: caption naik agar tidak menimpa kepala maskot (kepala maskot mulai sekitar y=1460)
        hasMascot ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: "translateY(-210px)" }}>
            <TutCaption words={data.words || []} t={t} />
          </div>
        ) : (
          <TutCaption words={data.words || []} t={t} />
        )
      ) : null}
      {neon ? <NeonCaption words={data.words || []} t={t} accent={accent} /> : null}
      {tut && data.handle && data.header !== false ? <HandleTag text={data.handle} /> : null}
      {classic ? <ClassicCaption words={data.words || []} t={t} accent={accent} /> : null}
      {classic && data.header !== false && data.brand ? (
        <div style={{ position: "absolute", left: 60, bottom: 330, color: "rgba(255,255,255,0.45)", fontSize: 34, fontFamily: FONT }}>{data.brand}</div>
      ) : null}
      {data.cta && (data as any)?.showCta !== false && frame >= ctaStart ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 110 }}>
          <div style={{ padding: "22px 52px", borderRadius: 60, background: accent, color: "#fff", fontWeight: 800, fontSize: 46, fontFamily: FONT }}>{data.cta}</div>
        </AbsoluteFill>
      ) : null}
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: accent }} />
    </AbsoluteFill>
  );
};