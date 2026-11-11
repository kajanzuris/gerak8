// OBJEK PELENGKAP: gambar/emoji kecil yang muncul dengan gerakan TEPAT saat kata tertentu diucapkan,
// di atas blok visual. Diisi lewat "pops" per adegan di scenes.src.json (opsional; tanpa "pops" tidak ada yang berubah).
//   { "word": "kucing", "img": "pics/kucing.png", "anim": "pop", "x": 830, "y": 560, "s": 1 }
//   { "word": "uang",   "glyph": "💰", "anim": "drop" }
// word  = kata dari title yang memicu kemunculan (tanpa word: 0,3 dtk setelah adegan mulai). at = detik sejak adegan mulai.
// img   = file di public/<video>/ (nama harus persis);  glyph = emoji/teks besar tanpa file.
// x,y   = titik tengah di layar 1080x1920 (kosong = ikut slot maskot bila ada, atau sudut atas area gambar bergantian kanan/kiri);  s = skala (1 = 260px).
// anim  = pop (membesar, bawaan) | drop (jatuh) | slide-left | slide-right | spin. Setelah muncul, objek melayang pelan.
// (prop "scale" dari renderer menggandakan ukuran semua pops di adegan itu)
// dur   = lama objek terlihat (detik, bawaan 2,2) sebelum mengecil dan hilang, supaya banyak pops tidak menumpuk di layar.
//
// slots = (opsional, dari Explainer) posisi di baris maskot, mis. di sisi seberang maskot. Pop ke-1 dan ke-2 yang TIDAK punya x/y
// memakai slot itu; pop lain memakai posisi default. x/y yang ditulis di JSON selalu menang.
import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ctx, norm, clamp01 } from "./ui";
import type { Cx, Pop } from "./types";

// Detik (absolut) objek mulai muncul. Berbeda dari blok "stage", TIDAK dibatasi 0,45 dtk: ikut kata yang diucapkan.
export const popTime = (p: Pop, cx: Cx, i: number): number => {
  if (typeof p.at === "number") return cx.base + Math.max(0, p.at);
  const k = p.word ? norm(p.word) : "";
  const hit = k ? cx.ws.find((w) => norm(w.w).startsWith(k)) : undefined;
  return hit ? hit.a : cx.base + 0.3 + i * 0.25;
};

const SIZE = 260;
const LIFE = 2.2; // detik terlihat (bawaan)
const EXIT = 0.3; // detik animasi mengecil saat hilang
const SLOTS_X = [830, 250]; // posisi bawaan: kanan lalu kiri

export type PopSlotXY = { x: number; y: number };

export const PopLayer: React.FC<{ pops: Pop[]; defaultY: number; slots?: PopSlotXY[]; scale?: number }> = ({ pops, defaultY, slots, scale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cx = React.useContext(Ctx);
  return (
    <>
      {pops.map((p, i) => {
        if (!p || (!p.img && !p.glyph)) return null;
        const lf = frame - Math.round(popTime(p, cx, i) * fps);
        if (lf < 0) return null; // belum waktunya
        const life = Math.max(0.8, p.dur ?? LIFE) * fps;
        if (lf > life + EXIT * fps) return null; // sudah hilang
        const out = clamp01((lf - life) / (EXIT * fps)); // 0 = tampil, 1 = hilang
        const sp = spring({ frame: lf, fps, config: { damping: 10, stiffness: 120 } });
        const inv = 1 - sp;
        const size = SIZE * (p.s ?? 1) * (scale ?? 1); // scale: pengali ukuran (tema dinamis memakai pops besar)
        const slot = slots && i < slots.length && p.x === undefined && p.y === undefined ? slots[i] : undefined;
        const cxp = p.x ?? slot?.x ?? SLOTS_X[i % 2];
        const cyp = p.y ?? slot?.y ?? defaultY + Math.floor(i / 2) * (SIZE + 20) + size / 2;
        const bob = Math.sin((frame + i * 13) / 14) * 10; // melayang pelan
        const anim = p.anim || "pop";
        const dx = anim === "slide-left" ? -inv * 600 : anim === "slide-right" ? inv * 600 : 0;
        const dy = anim === "drop" ? -inv * 320 : 0;
        const rot = anim === "spin" ? -inv * 360 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cxp - size / 2,
              top: cyp - size / 2,
              width: size,
              height: size,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `translate(${dx}px, ${dy + bob}px) rotate(${rot}deg) scale(${sp * (1 - out)})`,
              opacity: 1 - out,
              filter: "drop-shadow(0 12px 18px rgba(0,0,0,.35))",
            }}
          >
            {p.img ? (
              <Img src={staticFile(`${cx.name}/${p.img}`)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{p.glyph}</span>
            )}
          </div>
        );
      })}
    </>
  );
};
