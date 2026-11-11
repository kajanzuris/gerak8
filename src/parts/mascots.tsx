// MASKOT: Block dan Stick (vektor), SpriteMascot (PNG sendiri), OrbMascot (neon), HoloRing (hud). Dipakai juga renderer lama.

import { Img, staticFile } from "remotion";
import React from "react";
import { HUD_ORANGE, TONE2 } from "./config";

export type Pose = "idle" | "point" | "shock" | "sad" | "cheer" | "wave" | "walk" | "tremble" | "think" | "explain" | "thumbs";

export const Limb: React.FC<{ x1: number; y1: number; x2: number; y2: number; c: string }> = ({ x1, y1, x2, y2, c }) => (
  <g strokeLinecap="round">
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth={32} />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={22} />
  </g>
);

// Keadaan tubuh & wajah sebuah pose pada frame f. Dipakai bersama oleh Stick dan Block: pose baru cukup ditambah di sini.
export const poseState = (pose: Pose, f: number, talk?: number) => {
  const talking = talk !== undefined && talk > 0.07;
  const breathe = Math.sin(f / 9) * 3 - (talking ? (talk as number) * 3 : 0);
  const blink = f % 90 < 4;
  let aL = 14, aR = -14, legs = 0, tilt = 0, mouth = "smile";
  if (pose === "point") { aR = -95; mouth = "open"; }
  else if (pose === "shock") { aL = 150; aR = -150; mouth = "o"; }
  else if (pose === "sad") { aL = 8; aR = -8; tilt = 12; mouth = "sad"; }
  else if (pose === "cheer") { aL = 160 + Math.sin(f / 4) * 12; aR = -160 - Math.sin(f / 4) * 12; mouth = "open"; }
  else if (pose === "wave") { aR = -150 + Math.sin(f / 3) * 25; }
  else if (pose === "walk") { legs = Math.sin(f / 4) * 28; aL = Math.sin(f / 4) * 25; aR = -Math.sin(f / 4) * 25; }
  else if (pose === "tremble") { aL = 40; aR = -40; mouth = "o"; }
  else if (pose === "think") { aR = -120; mouth = "sad"; tilt = -6; }
  else if (pose === "explain") { const g = (talk ?? 0) * 16 + Math.sin(f / 9) * 6; aL = 52 + g; aR = -52 - g; }
  else if (pose === "thumbs") { aR = -128 + Math.sin(f / 6) * 5; }
  else if (pose === "idle") { aL = 14 + Math.sin(f / 13) * 3; aR = -14 - Math.sin(f / 13 + 1.2) * 3; }
  const nod = talking ? Math.sin(f / 3.2) * (talk as number) * 2.5 : 0; // kepala mengangguk tipis mengikuti suara
  if (talk !== undefined) mouth = talking ? "talk" : pose === "sad" || pose === "think" ? "sad" : "smile";
  const shake = pose === "tremble" ? Math.sin(f * 2.2) * 5 : 0;
  const bob = pose === "walk" ? Math.abs(Math.sin(f / 4)) * -10 : 0;
  return { breathe, blink, aL, aR, legs, tilt, nod, mouth, shake, bob };
};

// Alis: bentuk mengikuti pose (kaget = naik, sedih = ujung dalam naik, think = satu alis naik) dan ikut terangkat tipis saat bicara.
// Offset y negatif = naik; o = ujung luar, i = ujung dalam; l = kiri, r = kanan.
export const Brows: React.FC<{ pose: Pose; talk?: number; y: number }> = ({ pose, talk, y }) => {
  let lo = 0, li = 0, ro = 0, ri = 0;
  if (pose === "shock" || pose === "tremble") { lo = li = ro = ri = -9; }
  else if (pose === "sad") { lo = 5; li = -7; ro = 5; ri = -7; }
  else if (pose === "think") { lo = -8; li = -12; ro = 2; ri = 0; }
  else if (pose === "cheer" || pose === "explain" || pose === "thumbs") { lo = li = ro = ri = -6; }
  else if (pose === "point" || pose === "wave") { lo = li = ro = ri = -3; }
  const up = -(talk ?? 0) * 5;
  return (
    <g stroke="#111" strokeWidth={5} strokeLinecap="round">
      <line x1={-36} y1={y + lo + up} x2={-14} y2={y + li + up} />
      <line x1={14} y1={y + ri + up} x2={36} y2={y + ro + up} />
    </g>
  );
};

// talk (0..1) = kerasnya suara pada frame ini → mulut ikut membuka (lip-sync sederhana)
export const Stick: React.FC<{ pose: Pose; color: string; f: number; type?: string; talk?: number }> = ({ pose, color, f, type, talk }) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const { breathe, blink, aL, aR, legs, tilt, nod, mouth, shake, bob } = poseState(pose, f, talk);
  const arm = (side: number, a: number) => (
    <Limb x1={side * 50} y1={-310 + breathe} x2={side * 50 - Math.sin(rad(a)) * 130} y2={-310 + breathe + Math.cos(rad(a)) * 130} c="#f4f1ea" />
  );
  return (
    <g transform={`translate(${shake},${bob})`}>
      <Limb x1={-22} y1={-190} x2={-22 + legs} y2={0} c="#2b2d42" />
      <Limb x1={22} y1={-190} x2={22 - legs} y2={0} c="#2b2d42" />
      <rect x={-52} y={-335 + breathe} width={104} height={150} rx={34} fill={color} stroke="#111" strokeWidth={6} />
      {type === "girl" && <polygon points="-60,-200 60,-200 88,-120 -88,-120" fill={color} stroke="#111" strokeWidth={6} />}
      {arm(-1, aL)}
      {arm(1, aR)}
      {pose === "thumbs" && (() => {
        const ex = 50 - Math.sin(rad(aR)) * 130, ey = -310 + breathe + Math.cos(rad(aR)) * 130;
        return (
          <g fill="#f4f1ea" stroke="#111" strokeWidth={6}>
            <rect x={ex - 7} y={ey - 52} width={14} height={34} rx={7} />
            <circle cx={ex} cy={ey} r={24} />
          </g>
        );
      })()}
      <g transform={`rotate(${tilt + nod} 0 -340)`}>
        {type === "robot" ? (
          <g>
            <rect x={-68} y={-478 + breathe} width={136} height={136} rx={20} fill="#cfd8dc" stroke="#111" strokeWidth={6} />
            <line x1={0} y1={-478 + breathe} x2={0} y2={-520 + breathe} stroke="#111" strokeWidth={6} />
            <circle cx={0} cy={-528 + breathe} r={9} fill="#ff6b6b" />
          </g>
        ) : (
          <circle cx={0} cy={-410 + breathe} r={72} fill="#f4f1ea" stroke="#111" strokeWidth={6} />
        )}
        {type === "girl" && <path d={`M-74 ${-410 + breathe} Q-80 ${-500 + breathe} 0 ${-495 + breathe} Q80 ${-500 + breathe} 74 ${-410 + breathe} L68 ${-340 + breathe} Q60 ${-440 + breathe} 0 ${-446 + breathe} Q-60 ${-440 + breathe} -68 ${-340 + breathe} Z`} fill="#3a1f0d" />}
        {type === "boss" && <g fill="#222"><rect x={-84} y={-490 + breathe} width={168} height={26} rx={10} /><rect x={-52} y={-536 + breathe} width={104} height={52} rx={10} /></g>}
        {blink ? (
          <g stroke="#111" strokeWidth={5}><line x1={-34} y1={-420 + breathe} x2={-14} y2={-420 + breathe} /><line x1={14} y1={-420 + breathe} x2={34} y2={-420 + breathe} /></g>
        ) : (
          <g fill="#111"><circle cx={-24} cy={-420 + breathe} r={7} /><circle cx={24} cy={-420 + breathe} r={7} /></g>
        )}
        <Brows pose={pose} talk={talk} y={-446 + breathe} />
        {mouth === "smile" && <path d={`M-24 ${-390 + breathe} Q0 ${-366 + breathe} 24 ${-390 + breathe}`} stroke="#111" strokeWidth={5} fill="none" />}
        {mouth === "sad" && <path d={`M-22 ${-372 + breathe} Q0 ${-394 + breathe} 22 ${-372 + breathe}`} stroke="#111" strokeWidth={5} fill="none" />}
        {mouth === "open" && <ellipse cx={0} cy={-382 + breathe} rx={15} ry={(10 + Math.abs(Math.sin(f / 3)) * 10)} fill="#111" />}
        {mouth === "talk" && <ellipse cx={0} cy={-382 + breathe} rx={13 + (talk as number) * 9} ry={4 + (talk as number) * 24} fill="#111" />}
        {mouth === "o" && <circle cx={0} cy={-380 + breathe} r={13} fill="#111" />}
        {pose === "sad" && <circle cx={30} cy={-405 + breathe + (f % 40)} r={6} fill="#6ec6ff" opacity={1 - (f % 40) / 40} />}
      </g>
    </g>
  );
};

// Karakter BLOK (gaya game, ORISINAL): kepala & badan kotak, lengan/kaki balok. Pose dan lip-sync sama dengan Stick.
export const Block: React.FC<{ pose: Pose; color: string; f: number; type?: string; talk?: number }> = ({ pose, color, f, type, talk }) => {
  const { breathe, blink, aL, aR, legs, tilt, nod, mouth, shake, bob } = poseState(pose, f, talk);
  const SK = type === "robot" ? "#cfd8dc" : "#f2c9a0", ln = "#111", b = breathe;
  const arm = (side: number, a: number) => (
    <g transform={`translate(${side * 76},${-322 + b}) rotate(${a})`}>
      <rect x={-17} y={-6} width={34} height={140} rx={8} fill={SK} stroke={ln} strokeWidth={5} />
      <rect x={-17} y={-6} width={34} height={64} rx={8} fill={color} stroke={ln} strokeWidth={5} />
    </g>
  );
  const leg = (side: number) => (
    <g transform={`translate(${side * 30},-190) rotate(${side * legs * 0.3})`}>
      <rect x={-22} y={0} width={44} height={190} rx={6} fill="#2b2d42" stroke={ln} strokeWidth={5} />
    </g>
  );
  return (
    <g transform={`translate(${shake},${bob})`}>
      {leg(-1)}
      {leg(1)}
      <rect x={-62} y={-335 + b} width={124} height={150} rx={10} fill={color} stroke={ln} strokeWidth={6} />
      {type === "girl" && <rect x={-80} y={-215 + b} width={160} height={58} rx={10} fill={color} stroke={ln} strokeWidth={6} />}
      {arm(-1, aL)}
      {arm(1, aR)}
      {pose === "thumbs" && (() => {
        const th = (aR * Math.PI) / 180;
        const ex = 76 - Math.sin(th) * 134, ey = -322 + b + Math.cos(th) * 134;
        return (
          <g fill={SK} stroke={ln} strokeWidth={5}>
            <rect x={ex - 8} y={ey - 54} width={16} height={36} rx={6} />
            <rect x={ex - 22} y={ey - 22} width={44} height={44} rx={8} />
          </g>
        );
      })()}
      <g transform={`rotate(${tilt + nod} 0 -345)`}>
        <rect x={-64} y={-482 + b} width={128} height={128} rx={14} fill={SK} stroke={ln} strokeWidth={6} />
        {type === "girl" && <g fill="#3a1f0d" stroke={ln} strokeWidth={5}><rect x={-70} y={-494 + b} width={140} height={44} rx={10} /><rect x={-70} y={-494 + b} width={26} height={118} rx={8} /><rect x={44} y={-494 + b} width={26} height={118} rx={8} /></g>}
        {type === "boss" && <g fill="#222"><rect x={-84} y={-498 + b} width={168} height={24} rx={8} /><rect x={-52} y={-544 + b} width={104} height={50} rx={8} /></g>}
        {type === "robot" && <g><rect x={-54} y={-440 + b} width={108} height={36} rx={8} fill="#1d2b53" /><line x1={0} y1={-482 + b} x2={0} y2={-522 + b} stroke={ln} strokeWidth={6} /><circle cx={0} cy={-530 + b} r={9} fill="#ff6b6b" /></g>}
        {blink ? (
          <g stroke={ln} strokeWidth={5}><line x1={-36} y1={-424 + b} x2={-16} y2={-424 + b} /><line x1={16} y1={-424 + b} x2={36} y2={-424 + b} /></g>
        ) : (
          <g fill={type === "robot" ? "#7df9ff" : "#111"}><rect x={-36} y={-434 + b} width={18} height={20} /><rect x={18} y={-434 + b} width={18} height={20} /></g>
        )}
        <Brows pose={pose} talk={talk} y={-446 + b} />
        {mouth === "smile" && <path d={`M-24 ${-390 + b} Q0 ${-366 + b} 24 ${-390 + b}`} stroke={ln} strokeWidth={5} fill="none" />}
        {mouth === "sad" && <path d={`M-22 ${-372 + b} Q0 ${-394 + b} 22 ${-372 + b}`} stroke={ln} strokeWidth={5} fill="none" />}
        {mouth === "open" && <rect x={-15} y={-396 + b} width={30} height={14 + Math.abs(Math.sin(f / 3)) * 10} rx={4} fill={ln} />}
        {mouth === "talk" && <rect x={-14 - (talk as number) * 6} y={-396 + b} width={28 + (talk as number) * 12} height={4 + (talk as number) * 24} rx={4} fill={ln} />}
        {mouth === "o" && <rect x={-12} y={-394 + b} width={24} height={24} rx={4} fill={ln} />}
      </g>
    </g>
  );
};

// maskot bola bercahaya dengan dua cincin orbit (setengah cincin di belakang bola, setengah di depan)
export const OrbMascot: React.FC<{ x: number; y: number; s: number; f: number; talk: number; op: number }> = ({ x, y, s, f, talk, op }) => {
  const rings = [
    { rx: 250, ry: 92, rot: -18, sp: 0.022, ph: 0, col: TONE2, dot: 15 },
    { rx: 215, ry: 70, rot: 38, sp: -0.03, ph: 2.1, col: "#ff3f8e", dot: 11 },
  ];
  const r = 150 * (1 + 0.05 * talk);
  const bob = Math.sin(f / 26) * 10;
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  rings.forEach((rg, ri) => {
    const a = f * rg.sp + rg.ph;
    const dx = rg.rx * Math.cos(a);
    const dy = rg.ry * Math.sin(a);
    const dot = <circle cx={dx} cy={dy} r={rg.dot} fill={rg.col} filter="url(#orbGlow)" />;
    const arcBack = `M ${-rg.rx} 0 A ${rg.rx} ${rg.ry} 0 0 1 ${rg.rx} 0`;
    const arcFront = `M ${rg.rx} 0 A ${rg.rx} ${rg.ry} 0 0 1 ${-rg.rx} 0`;
    back.push(<g key={"b" + ri} transform={`rotate(${rg.rot})`}><path d={arcBack} fill="none" stroke={rg.col} strokeWidth={3} opacity={0.45} />{dy < 0 ? dot : null}</g>);
    front.push(<g key={"f" + ri} transform={`rotate(${rg.rot})`}><path d={arcFront} fill="none" stroke={rg.col} strokeWidth={4} opacity={0.9} />{dy >= 0 ? dot : null}</g>);
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 700, height: 500, transform: `translate(-50%,-50%) scale(${s})`, opacity: op, pointerEvents: "none" }}>
      <svg viewBox="-350 -250 700 500" width={700} height={500} style={{ filter: "drop-shadow(0 0 40px rgba(255,90,120,.45))" }}>
        <defs>
          <radialGradient id="orbG" cx="0.38" cy="0.32" r="0.8">
            <stop offset="0%" stopColor="#ffe7a8" />
            <stop offset="35%" stopColor="#ff8a5c" />
            <stop offset="70%" stopColor="#d93a7d" />
            <stop offset="100%" stopColor="#4a1458" />
          </radialGradient>
          <radialGradient id="orbHalo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="55%" stopColor="rgba(255,90,120,.35)" />
            <stop offset="100%" stopColor="rgba(255,90,120,0)" />
          </radialGradient>
          <filter id="orbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g transform={`translate(0,${bob})`}>
          <circle r={r * 1.6} fill="url(#orbHalo)" />
          {back}
          <circle r={r} fill="url(#orbG)" />
          <circle r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={2} />
          <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.38} ry={r * 0.2} fill="#fff" opacity={0.22} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
          {front}
        </g>
      </svg>
    </div>
  );
};

export const SpriteMascot: React.FC<{ name: string; img: string; talkImg?: string; x: number; flip: boolean; pose: string; f: number; talk: number; ent: number; feet: number }> = ({ name, img, talkImg, x, flip, pose, f, talk, ent, feet }) => {
  let dy = Math.sin(f / 9) * 4;
  let rot = Math.sin(f / 25) * 1.2;
  if (pose === "cheer") { dy = -Math.abs(Math.sin(f / 5)) * 34; rot += Math.sin(f / 5) * 3; }
  else if (pose === "walk") { dy = -Math.abs(Math.sin(f / 4)) * 16; rot += Math.sin(f / 4) * 3; }
  else if (pose === "tremble") rot += Math.sin(f * 2.2) * 2;
  else if (pose === "sad") { rot += 5; dy += 10; }
  else if (pose === "think") rot -= 4;
  const sx = 1 - 0.012 * talk;
  const sy = 1 + 0.03 * talk;
  return (
    <div style={{ position: "absolute", left: x, top: feet, height: 520, display: "grid", transformOrigin: "50% 100%", transform: `translate(-50%, -100%) translate(0px, ${dy + (1 - ent) * 420}px) rotate(${rot}deg) scale(${(flip ? -1 : 1) * sx}, ${sy})` }}>
      <Img src={staticFile(`${name}/${img}`)} style={{ gridArea: "1 / 1", height: "100%", width: "auto" }} />
      {talkImg ? <Img src={staticFile(`${name}/${talkImg}`)} style={{ gridArea: "1 / 1", height: "100%", width: "auto", opacity: talk > 0.25 ? 1 : 0 }} /> : null}
    </div>
  );
};

export const HoloRing: React.FC<{ x: number; y: number; f: number; accent: string }> = ({ x, y, f, accent }) => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
    <g transform={`translate(${x},${y})`} fill="none">
      <circle r={230} stroke={accent} strokeWidth={3} strokeDasharray="14 12" opacity={0.7} transform={`rotate(${f * 0.5})`} />
      <circle r={285} stroke={HUD_ORANGE} strokeWidth={3} strokeDasharray="40 18" opacity={0.6} transform={`rotate(${-f * 0.35})`} />
      <circle r={190} stroke={accent} strokeWidth={2} opacity={0.35} />
    </g>
  </svg>
);
