// RENDERER LAMA (style stick / robot / block / sprite): kartu, karakter berjalan, objek (pics). Tidak dipakai style "explainer".
// Block/Stick/Bg/Prop kini ada di src/parts/ (di-ekspor ulang di bawah supaya impor lama tetap jalan).
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import { Bg, Prop, clamp, isImg } from "./parts/scenery";
import { Block, Stick } from "./parts/mascots";
import type { Pose } from "./parts/mascots";

// Kompatibilitas: Block/Stick/Bg/Prop dulu diekspor dari file ini; kini tinggal di parts/mascots & scenery.
export { Stick, Block } from "./parts/mascots";
export { Bg, Prop } from "./parts/scenery";

export const FPS = 30;

export const XF = 10;

export type Card = { type: "list" | "stat" | "bars" | "tool"; title?: string; items?: string[]; value?: string; label?: string; name?: string; tagline?: string; cta?: string };

export type Char = { type?: string; x: number; pose: Pose; enter?: "left" | "right"; s?: number; color?: string; flip?: boolean; walkTo?: number; img?: string; talkImg?: string };

// gambar objek (kucing, ikan, dst.) yang muncul saat katanya diucapkan; dibuat tools/visualize.py, waktu `at` (detik) dihitung tools/prepare.py
export type Pic = { img: string; at?: number; word?: string; x?: number; y?: number; s?: number; anim?: "pop" | "drop" };

export type Scn = { title: string; start: number; accent: string; bg: string; chars: Char[]; prop?: string; card?: Card; pics?: Pic[] };

// waktu kata (detik) hasil tools/prepare.py; s = indeks adegan
export type Word = { w: string; hl: boolean; a: number; b: number; s: number };

export type VideoData = { durationInFrames: number; watermark?: string; music?: boolean; cta?: string; words?: Word[]; env?: number[]; style?: "stick" | "robot" | "block" | "sprite" | "explainer"; scenes: Scn[] };

export type StoryProps = { name: string; data?: VideoData };

// Kartu lama menyimpan semua isi di satu string `value` → ubah ke field terstruktur (aman untuk data lama maupun baru)
export const normCard = (c: Card): Card => {
  if (c.items || c.label || !c.value) return c;
  if (c.type === "list") {
    const title = c.value.match(/title:\s*([^,]+)/i)?.[1]?.trim();
    const items = c.value.match(/items:\s*\[(.*)\]/i)?.[1]?.split(",").map((x) => x.trim());
    return { ...c, title: c.title ?? title, items };
  }
  if (c.type === "stat" && c.value.includes("|")) {
    const [v, l] = c.value.split("|");
    return { ...c, value: v, label: l };
  }
  return c;
};

// Gerak untuk karakter SPRITE (gambar PNG transparan): napas, goyang, memantul sesuai pose, membesar-mengecil saat bicara.
export const spriteMotion = (pose: Pose, f: number, talk: number) => {
  let dx = 0, dy = 0, rot = Math.sin(f / 25) * 1.2;
  let sx = 1 - 0.012 * talk, sy = 1 + 0.015 * Math.sin(f / 9) + 0.03 * talk;
  if (pose === "cheer") { dy = -Math.abs(Math.sin(f / 5)) * 34; rot += Math.sin(f / 5) * 3; }
  else if (pose === "walk") { dy = -Math.abs(Math.sin(f / 4)) * 16; rot += Math.sin(f / 4) * 3; }
  else if (pose === "tremble") dx = Math.sin(f * 2.2) * 6;
  else if (pose === "sad") { rot += 5; dy = 10; }
  else if (pose === "think") rot -= 4;
  else if (pose === "shock") { sx *= 1.05; sy *= 1.05; dy = -8; }
  else if (pose === "wave" || pose === "point") rot += Math.sin(f / 8) * 2;
  else if (pose === "explain") { rot += Math.sin(f / 8) * 2; sy += 0.012 * Math.sin(f / 6); }
  else if (pose === "thumbs") { dy = -Math.abs(Math.sin(f / 6)) * 10; }
  return { dx, dy, rot, sx, sy };
};

// Kartu info di atas panel gelap supaya terbaca di latar terang maupun gelap
export const CardView: React.FC<{ c: Card; f: number; accent: string }> = ({ c: raw, f, accent }) => {
  const { fps } = useVideoConfig();
  const c = normCard(raw);
  const pop = (d: number) => spring({ frame: f - d, fps, config: { damping: 13 } });
  const items = c.items || [];
  const m = (c.value || "").match(/[\d.,]+/);
  const num = m ? parseFloat(m[0].replace(",", ".")) : NaN;
  const shown = m && !isNaN(num) ? (c.value || "").replace(m[0], String(Math.round(num * Math.min(1, f / 40)))) : c.value;
  const box: React.CSSProperties = { fontFamily: "Arial, sans-serif", color: "#fff" };
  const panel: React.CSSProperties = { width: 920, padding: "44px 40px", borderRadius: 48, background: "rgba(14,18,38,0.86)", border: `5px solid ${accent}`, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${0.85 + 0.15 * Math.min(1, pop(0))})`, opacity: Math.min(1, pop(0) * 2) };
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 700, ...box }}>
      {c.type !== "tool" && (
        <div style={panel}>
          {c.title ? <div style={{ fontSize: 58, fontWeight: 900, color: accent, opacity: pop(2), marginBottom: 26, textAlign: "center" }}>{c.title}</div> : null}
          {c.type === "list" && items.map((it, i) => {
            const k = Math.min(1, pop(10 + i * 10));
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, width: 820, margin: "12px 0", opacity: k, transform: `translateX(${(1 - k) * -140}px)` }}>
                <div style={{ width: 72, height: 72, borderRadius: 36, background: accent, color: "#111", fontSize: 42, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 52, fontWeight: 700 }}>{it}</div>
              </div>
            );
          })}
          {c.type === "stat" && (
            <>
              <div style={{ fontSize: 200, fontWeight: 900, color: accent, transform: `scale(${0.6 + 0.4 * Math.min(1.1, pop(4))})` }}>{shown}</div>
              <div style={{ fontSize: 56, fontWeight: 700, textAlign: "center", width: 800, opacity: pop(14) }}>{c.label}</div>
            </>
          )}
          {c.type === "bars" && items.map((it, i) => {
            const [lb, v] = it.split("|");
            const w = Math.min(100, Math.max(5, parseFloat(v) || 50)) * 7.6 * Math.min(1, pop(8 + i * 8));
            return (
              <div key={i} style={{ width: 820, margin: "12px 0" }}>
                <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 6 }}>{lb}</div>
                <div style={{ height: 48, width: w, borderRadius: 24, background: accent }} />
              </div>
            );
          })}
        </div>
      )}
      {c.type === "tool" && (
        <div style={{ width: 860, padding: 40, borderRadius: 44, background: "rgba(16,20,40,0.92)", border: `4px solid ${accent}`, transform: `scale(${0.8 + 0.2 * Math.min(1, pop(2))})`, opacity: Math.min(1, pop(2)) }}>
          <div style={{ fontSize: 66, fontWeight: 900, color: accent }}>{c.name}</div>
          <div style={{ fontSize: 40, margin: "10px 0 24px", opacity: 0.9 }}>{c.tagline}</div>
          {items.map((it, i) => (
            <div key={i} style={{ fontSize: 40, margin: "10px 0", opacity: Math.min(1, pop(12 + i * 8)) }}>✓ {it}</div>
          ))}
          <div style={{ marginTop: 28, display: "inline-block", padding: "16px 40px", borderRadius: 40, background: accent, color: "#111", fontSize: 40, fontWeight: 800, opacity: Math.min(1, pop(12 + items.length * 8)) }}>{c.cta || "Coba sekarang"}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Kamera berbeda tiap adegan: push-in, close-up ke karakter, pan, pull-out, tilt
export const CAMS = [
  { s: [1.0, 1.1], x: [0, -20], y: [0, 0], close: false },
  { s: [1.0, 1.4], x: [0, 0], y: [0, 0], close: true },
  { s: [1.12, 1.12], x: [50, -50], y: [0, 0], close: false },
  { s: [1.35, 1.0], x: [0, 0], y: [0, 0], close: true },
  { s: [1.12, 1.12], x: [-50, 50], y: [0, 0], close: false },
  { s: [1.0, 1.12], x: [0, 0], y: [40, -30], close: false },
];

// Layer gambar objek: muncul (pop/drop) tepat saat kata terkait diucapkan, lalu melayang pelan
export const PicLayer: React.FC<{ pics: Pic[]; f: number; from: number; name: string; fps: number }> = ({ pics, f, from, name, fps }) => (
  <>
    {pics.map((p, i) => {
      const t0 = p.at !== undefined ? Math.round(p.at * FPS) - from : 6 + i * 8; // frame lokal adegan
      const lf = f - t0;
      if (lf < 0) return null;
      const sp = spring({ frame: lf, fps, config: { damping: 10, stiffness: 120 } });
      const drop = p.anim === "drop" ? (1 - sp) * -300 : 0;
      const bob = Math.sin((f + i * 13) / 14) * 10;
      const size = 380 * (p.s ?? 1);
      return (
        <Img
          key={i}
          src={staticFile(`${name}/${p.img}`)}
          style={{
            position: "absolute",
            left: (p.x ?? 540) - size / 2,
            top: (p.y ?? 760) - size / 2,
            width: size,
            height: size,
            transform: `translateY(${drop + bob}px) scale(${sp})`,
            filter: "drop-shadow(0 12px 18px rgba(0,0,0,.35))",
          }}
        />
      );
    })}
  </>
);

export const SceneView: React.FC<{ s: Scn; idx: number; first: boolean; len: number; from: number; env?: number[]; name: string; style: string }> = ({ s, idx, first, len, from, env, name, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const te = first ? 1 : Easing.out(Easing.cubic)(interpolate(f, [0, XF], [0, 1], clamp));
  const p = Easing.inOut(Easing.cubic)(interpolate(f, [0, len], [0, 1], clamp));
  const hero = s.chars[0] || { x: 540 };
  const cam = s.chars.length ? CAMS[idx % CAMS.length] : CAMS[0];
  const lerp = (a: number[]) => a[0] + (a[1] - a[0]) * p;
  const impact = s.card?.type === "stat" || s.prop === "confetti" || s.prop === "bulb";
  const sf = f - XF;
  const sh = impact && sf >= 0 && sf < 12 ? Math.sin(sf * 2.6) * ((12 - sf) / 12) * 14 : 0;
  const kind = first ? -1 : idx % 4;
  const outer: React.CSSProperties =
    kind === 0 ? { transform: `translateX(${(1 - te) * 1080}px)` }
    : kind === 1 ? { transform: `translateX(${-(1 - te) * 1080}px)` }
    : kind === 2 ? { transform: `translateY(${(1 - te) * 1920}px)` }
    : kind === 3 ? { clipPath: `circle(${te * 150}% at 50% 62%)` }
    : {};
  const talk = env ? env[Math.min(env.length - 1, from + f)] : undefined;
  const sp0 = spring({ frame: f - 4, fps, config: { damping: 14 } });
  const place = (c: Char) => {
    const sc = c.s ?? 1;
    const off = c.enter === "left" ? -(c.x + 300) * (1 - sp0) : c.enter === "right" ? (1080 - c.x + 300) * (1 - sp0) : 0;
    const x = (c.walkTo ? interpolate(f, [0, len], [c.x, c.walkTo], clamp) : c.x) + off;
    return { x, sc };
  };
  return (
    <AbsoluteFill style={outer}>
      <AbsoluteFill style={{ transformOrigin: cam.close ? `${hero.x}px 1050px` : "50% 55%", transform: `translate(${lerp(cam.x) + sh}px, ${lerp(cam.y) + sh * 0.6}px) scale(${lerp(cam.s)})` }}>
        {isImg(s.bg) ? (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <Img src={staticFile(`${name}/${s.bg}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(1.08) translateX(${-p * 30}px)` }} />
          </AbsoluteFill>
        ) : (
          <Bg type={s.bg} f={f} p={p} />
        )}
        {s.chars.length > 0 && !isImg(s.bg) && (
          <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
            <circle cx={hero.x} cy={1130} r={340} fill={s.accent} opacity={0.16} />
          </svg>
        )}
        {s.prop ? <Prop kind={s.prop} f={f} hx={hero.x} accent={s.accent} /> : null}
        {s.pics?.length ? <PicLayer pics={s.pics} f={f} from={from} name={name} fps={fps} /> : null}
        {s.card ? <CardView c={s.card} f={f} accent={s.accent} /> : null}
        <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
          {s.chars.map((c, i) => {
            const { x, sc } = place(c);
            const col = c.color ?? "#4cc9f0";
            const tk = i === 0 ? talk : undefined;
            return (
              <g key={i} transform={`translate(${x},1500) scale(${c.flip ? -sc : sc},${sc})`}>
                <ellipse cx={0} cy={4} rx={90} ry={14} fill="#000" opacity={0.35} />
                {c.img ? null : style === "block" || c.type === "block" ? (
                  <Block pose={c.pose} color={col} f={f + i * 7} type={c.type} talk={tk} />
                ) : (
                  <Stick pose={c.pose} color={col} f={f + i * 7} type={style === "robot" ? "robot" : c.type} talk={tk} />
                )}
              </g>
            );
          })}
        </svg>
        {s.chars.map((c, i) => {
          if (!c.img) return null;
          const { x, sc } = place(c);
          const t = i === 0 ? talk ?? 0 : 0;
          const m = spriteMotion(c.pose, f + i * 7, t);
          const enterDy = (1 - Math.min(1, sp0)) * 80;
          return (
            <div key={"sp" + i} style={{ position: "absolute", left: x, top: 1500, height: 760 * sc, display: "grid", transformOrigin: "50% 100%", transform: `translate(-50%, -100%) translate(${m.dx}px, ${m.dy + enterDy}px) rotate(${m.rot}deg) scale(${(c.flip ? -1 : 1) * m.sx}, ${m.sy})` }}>
              <Img src={staticFile(`${name}/${c.img}`)} style={{ gridArea: "1 / 1", height: "100%", width: "auto" }} />
              {c.talkImg ? <Img src={staticFile(`${name}/${c.talkImg}`)} style={{ gridArea: "1 / 1", height: "100%", width: "auto", opacity: t > 0.25 ? 1 : 0 }} /> : null}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Caption: grup 3–4 kata di atas panel gelap; kata yang sedang diucapkan menyala dan memantul, kata penting (*...*) berwarna aksen.
export const groupsOf = (words: Word[]) => {
  const g: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w) => {
    if (cur.length && (cur.length >= 4 || cur[0].s !== w.s)) { g.push(cur); cur = []; }
    cur.push(w);
    if (/[.?!,]$/.test(w.w)) { g.push(cur); cur = []; }
  });
  if (cur.length) g.push(cur);
  return g;
};

export const Captions: React.FC<{ words: Word[]; accents: string[] }> = ({ words, accents }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = useMemo(() => groupsOf(words), [words]);
  const t = f / FPS;
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].a - 0.05) gi = i;
  if (gi < 0) gi = 0;
  const g = groups[gi];
  if (!g || t > g[g.length - 1].b + 0.6) return null;
  const sp = spring({ frame: f - Math.round(g[0].a * FPS), fps, config: { damping: 13, stiffness: 190 } });
  const accent = accents[g[0].s] || "#FFD166";
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div style={{ width: 940, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 22px", padding: "26px 36px", borderRadius: 48, background: "rgba(10,12,24,0.62)", transform: `scale(${0.88 + 0.12 * Math.min(1, sp)})`, opacity: 0.35 + 0.65 * Math.min(1, sp) }}>
        {g.map((w, i) => {
          const active = t >= w.a && t < w.b;
          const spoken = t >= w.b;
          const k = spring({ frame: f - Math.round(w.a * FPS), fps, config: { damping: 9, stiffness: 240 } });
          return (
            <span key={i} style={{ display: "inline-block", fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: w.hl ? 90 : 74, lineHeight: 1.25, color: w.hl ? accent : "#fff", opacity: spoken || active ? 1 : 0.55, transform: `scale(${active ? 1 + 0.14 * Math.min(1.2, k) : 1})`, textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const VectorStory: React.FC<StoryProps> = ({ name, data }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  if (!data) return null;
  const { scenes, watermark, cta, words, env } = data;
  const style = data.style ?? "stick";
  const ctaStart = durationInFrames - Math.round(2.0 * FPS);
  const cp = spring({ frame: frame - ctaStart, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* mix.wav = suara + musik (di-duck) + SFX, dibuat oleh tools/prepare.py */}
      <Audio src={staticFile(name + "/mix.wav")} />
      {scenes.map((s, i) => {
        const a = Math.round(s.start * FPS);
        const b = i < scenes.length - 1 ? Math.round(scenes[i + 1].start * FPS) : durationInFrames;
        const pad = i === 0 ? 0 : XF;
        const from = Math.max(0, a - pad);
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(b - a + pad, 1)}>
            <SceneView s={s} idx={i} first={i === 0} len={Math.max(b - a + pad, 1)} from={from} env={env} name={name} style={style} />
          </Sequence>
        );
      })}
      {words && words.length ? <Captions words={words} accents={scenes.map((s) => s.accent)} /> : null}
      {cta && frame >= ctaStart ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 300 }}>
          <div style={{ padding: "26px 56px", borderRadius: 60, background: scenes[scenes.length - 1].accent, color: "#111", fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: 54, textAlign: "center", transform: `scale(${0.7 + 0.3 * Math.min(1.1, cp)})`, opacity: Math.min(1, cp * 2) }}>{cta}</div>
        </AbsoluteFill>
      ) : null}
      {watermark ? <div style={{ position: "absolute", left: 60, bottom: 330, color: "rgba(255,255,255,0.45)", fontSize: 34, fontFamily: "Arial, sans-serif" }}>{watermark}</div> : null}
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: "rgba(255,255,255,0.8)" }} />
    </AbsoluteFill>
  );
};
