// LATAR & PROPERTI tema Klasik (Bg, Prop). Dipakai juga renderer lama.

import { interpolate } from "remotion";
import { Stick } from "./mascots";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const isImg = (b: string) => /[./]/.test(b);

export const SKY: Record<string, [string, string]> = {
  night: ["#050914", "#16213e"],
  dusk: ["#1b1535", "#5b3a6e"],
  dawn: ["#ff9a5a", "#ffd9a0"],
  stage: ["#000000", "#0a0a12"],
  crowd: ["#0a1226", "#24344f"],
  room: ["#2b2d42", "#3d405b"],
  office: ["#dee2e6", "#adb5bd"],
  day: ["#8ecae6", "#e0f4ff"],
};

export const GROUND: Record<string, string> = { dawn: "#2d6a4f", day: "#6a994e", room: "#5c4033", office: "#6c757d" };

export const Bg: React.FC<{ type: string; f: number; p: number }> = ({ type, f, p }) => {
  const [c1, c2] = SKY[type] || SKY.night;
  const pan = -p * 60;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={"g" + type} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill={`url(#g${type})`} />
      {["night", "dusk", "crowd"].includes(type) &&
        Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={(i * 97) % 1080} cy={(i * 53) % 800} r={2 + (i % 3)} fill="#fff" opacity={0.3 + 0.4 * Math.abs(Math.sin(f / 20 + i))} />
        ))}
      {type === "dawn" && <circle cx={540 + pan * 0.5} cy={interpolate(f, [0, 90], [1250, 880], clamp)} r={170} fill="#fff3b0" />}
      {type === "day" && <g fill="#fff" opacity={0.85}><ellipse cx={300 + pan} cy={420} rx={150} ry={46} /><ellipse cx={800 - pan} cy={600} rx={180} ry={52} /></g>}
      {(type === "room" || type === "office") && <rect x={640} y={420} width={320} height={420} fill={type === "room" ? "#1d3557" : "#a8dadc"} stroke="#111" strokeWidth={10} />}
      {type === "stage" && <polygon points="540,0 220,1500 860,1500" fill="rgba(255,230,150,0.28)" />}
      {(type === "night" || type === "dusk" || type === "crowd") &&
        Array.from({ length: 12 }, (_, i) => {
          const w = 90 + ((i * 37) % 60);
          const h = 260 + ((i * 71) % 320);
          const x = i * 100 + pan * 0.6 - 20;
          return (
            <g key={i}>
              <rect x={x} y={1500 - h} width={w} height={h} fill="#0b0f1d" />
              {Array.from({ length: 6 }, (_, k) => (
                <rect key={k} x={x + 14 + (k % 2) * 34} y={1500 - h + 30 + Math.floor(k / 2) * 60} width={18} height={26} fill="#ffd166" opacity={(i + k) % 3 === 0 ? 0 : 0.6} />
              ))}
            </g>
          );
        })}
      <rect y={1500} width={1080} height={420} fill={GROUND[type] || "#0d1020"} />
      <rect y={1500} width={1080} height={6} fill="rgba(255,255,255,0.15)" />
    </svg>
  );
};

// lf (opsional) = frame lokal sejak adegan mulai; properti beranimasi sekali-jalan (roket, grafik, gembok) memakainya. Bila tidak diisi, memakai f.
export const Prop: React.FC<{ kind: string; f: number; hx: number; accent: string; lf?: number }> = ({ kind, f, hx, accent, lf }) => {
  const pulse = 1 + Math.sin(f / 6) * 0.08;
  const lt = lf ?? f;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
      {kind === "think" && (
        <g>
          <circle cx={hx + 110} cy={960} r={10} fill="#fff" />
          <circle cx={hx + 150} cy={905} r={16} fill="#fff" />
          <ellipse cx={hx + 240} cy={800} rx={110} ry={72} fill="#fff" />
          <text x={hx + 240} y={832} fontSize={96} fontWeight={800} textAnchor="middle" fill="#222">?</text>
        </g>
      )}
      {kind === "phone" && (
        <g>
          <rect x={620} y={820} width={300} height={560} rx={44} fill="#111" stroke="#777" strokeWidth={6} />
          <rect x={638} y={850} width={264} height={500} rx={24} fill="#1d2b53" />
          <text x={770} y={1030} fontSize={110} textAnchor="middle" fill="#ff4d6d" transform={`translate(0,0) scale(${pulse})`} style={{ transformOrigin: "770px 1030px" }}>♥</text>
          <rect x={690} y={1230} width={160} height={64} rx={32} fill={accent} opacity={0.6 + Math.abs(Math.sin(f / 8)) * 0.4} />
          <text x={770} y={1274} fontSize={34} fontWeight={800} textAnchor="middle" fill="#111">Post</text>
        </g>
      )}
      {kind === "fork" && (
        <g fill="#8d6e63" stroke="#111" strokeWidth={5}>
          <polygon points="620,1120 820,1120 860,1160 820,1200 620,1200" />
          <polygon points="760,1260 960,1260 1000,1300 960,1340 760,1340" transform="translate(0,0)" />
          <rect x={700} y={1200} width={16} height={300} />
        </g>
      )}
      {kind === "shadow" && (
        <g transform={`translate(770,1150) scale(${1 + Math.sin(f / 10) * 0.06})`}>
          <ellipse cx={0} cy={0} rx={260} ry={320} fill="#000" opacity={0.88} />
          <ellipse cx={-80} cy={-60} rx={34} ry={24} fill="#fff" />
          <ellipse cx={80} cy={-60} rx={34} ry={24} fill="#fff" />
          <path d="M-100 60 Q0 120 100 60" stroke="#fff" strokeWidth={8} fill="none" />
        </g>
      )}
      {kind === "orb" && (
        <g>
          <circle cx={780} cy={1500} r={110 * pulse} fill="#ffd166" opacity={0.25} />
          <circle cx={780} cy={1500} r={70} fill="#ffd166" />
          <rect x={600} y={1500} width={400} height={30} fill="#0d1020" />
        </g>
      )}
      {kind === "crowd" &&
        Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`translate(${460 + i * 100 + f * 0.7},${1230 - i * 6}) scale(0.24)`}>
            <Stick pose="walk" color={i % 2 ? "#ff9f1c" : "#e5e5e5"} f={f + i * 5} />
          </g>
        ))}
      {kind === "bulb" && (
        <g>
          <circle cx={hx + 200} cy={860} r={130 * pulse} fill="#ffd166" opacity={0.25} />
          <circle cx={hx + 200} cy={860} r={80} fill="#ffd166" stroke="#111" strokeWidth={6} />
          <rect x={hx + 170} y={935} width={60} height={40} rx={8} fill="#999" />
        </g>
      )}
      {kind === "laptop" && (
        <g>
          <rect x={640} y={1230} width={320} height={210} rx={14} fill="#1d2b53" stroke="#777" strokeWidth={6} />
          {[0, 1, 2].map((i) => <rect key={i} x={668} y={1262 + i * 44} width={80 + ((f * 3 + i * 40) % 180)} height={20} rx={8} fill={accent} opacity={0.8} />)}
          <rect x={610} y={1440} width={380} height={22} rx={10} fill="#adb5bd" />
        </g>
      )}
      {kind === "trophy" && (
        <g transform="translate(780,1500)">
          <rect x={-22} y={-150} width={44} height={150} fill="#e0a800" stroke="#111" strokeWidth={5} />
          <path d="M-100 -380 H100 Q100 -170 0 -170 Q-100 -170 -100 -380 Z" fill="#ffd166" stroke="#111" strokeWidth={6} />
          <rect x={-80} y={-30} width={160} height={30} rx={8} fill="#8d6e63" stroke="#111" strokeWidth={5} />
        </g>
      )}
      {kind === "money" && [0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx={780} cy={1480 - i * 34} rx={90} ry={26} fill="#ffd166" stroke="#111" strokeWidth={5} />
          {i === 3 && <text x={780} y={1460 - i * 34 + 14} fontSize={36} fontWeight={800} textAnchor="middle" fill="#8d6e63">Rp</text>}
        </g>
      ))}
      {kind === "rocket" && (() => {
        const k = Math.min(1, Math.max(0, lt / 20));
        const ent = 1 - Math.pow(1 - k, 3);
        const flame = 0.75 + Math.abs(Math.sin(lt / 2.5)) * 0.5;
        return (
          <g transform={`translate(800,${1330 + (1 - ent) * 300 + Math.sin(lt / 9) * 14}) scale(1.3)`}>
            <polygon points={`-26,60 26,60 0,${60 + 110 * flame}`} fill="#ff9f1c" stroke="#111" strokeWidth={5} />
            <polygon points={`-12,60 12,60 0,${60 + 60 * flame}`} fill="#ffd166" />
            <polygon points="-48,0 -48,66 -96,94 -96,40" fill={accent} stroke="#111" strokeWidth={6} />
            <polygon points="48,0 48,66 96,94 96,40" fill={accent} stroke="#111" strokeWidth={6} />
            <path d="M0 -170 Q64 -90 52 64 L-52 64 Q-64 -90 0 -170 Z" fill="#f1f3f5" stroke="#111" strokeWidth={6} />
            <circle cx={0} cy={-60} r={24} fill="#4cc9f0" stroke="#111" strokeWidth={6} />
          </g>
        );
      })()}
      {kind === "chart" && (() => {
        const T = [70, 120, 105, 175, 235];
        const grow = (i: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, (lt - i * 5) / 22)), 3);
        const br = 1 + Math.sin(lt / 10) * 0.03;
        const ao = Math.min(1, Math.max(0, (lt - 32) / 10));
        return (
          <g>
            <rect x={610} y={1180} width={380} height={300} rx={22} fill="#1d2b53" stroke="#777" strokeWidth={6} />
            <line x1={630} y1={1452} x2={970} y2={1452} stroke="#adb5bd" strokeWidth={4} />
            {T.map((h, i) => (
              <rect key={i} x={640 + i * 66} y={1450 - h * grow(i) * br} width={46} height={h * grow(i) * br} rx={8} fill={i === T.length - 1 ? accent : "#4cc9f0"} />
            ))}
            <g opacity={ao}>
              <polyline points="650,1380 740,1340 800,1360 910,1250" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="910,1250 900,1283 877,1260" fill="#fff" />
            </g>
          </g>
        );
      })()}
      {kind === "lock" && (() => {
        const k = Math.min(1, Math.max(0, (lt - 4) / 16));
        const lift = (1 - (1 - Math.pow(1 - k, 3))) * 34;
        const sy = -140 - lift;
        return (
          <g transform="translate(800,1400)">
            <circle cx={0} cy={-20} r={150 * pulse} fill={accent} opacity={0.18} />
            <path d={`M-62 -90 V${sy} A62 62 0 0 1 62 ${sy} V-90`} fill="none" stroke="#111" strokeWidth={34} strokeLinecap="round" />
            <path d={`M-62 -90 V${sy} A62 62 0 0 1 62 ${sy} V-90`} fill="none" stroke="#adb5bd" strokeWidth={22} strokeLinecap="round" />
            <rect x={-100} y={-100} width={200} height={170} rx={24} fill="#ffd166" stroke="#111" strokeWidth={6} />
            <circle cx={0} cy={-26} r={20} fill="#111" />
            <rect x={-8} y={-16} width={16} height={46} rx={6} fill="#111" />
          </g>
        );
      })()}
      {kind === "confetti" &&
        Array.from({ length: 40 }, (_, i) => (
          <rect key={i} x={(i * 79) % 1080} y={((f * (6 + (i % 5)) + i * 90) % 1900) - 50} width={14} height={22} fill={["#ffd166", "#ff6b6b", "#4cc9f0", "#06d6a0"][i % 4]} transform={`rotate(${f * 6 + i * 20} ${(i * 79) % 1080} 0)`} />
        ))}
    </svg>
  );
};
