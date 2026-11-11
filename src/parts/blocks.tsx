// BLOK VISUAL: tampilan tiap jenis blok di "stage" (window, compare, image, stat, ...). StageItem memilih blok mana.
// Catatan ukuran teks: tidak ada teks isi di bawah ~22px (layar 1080px lebar). Bila mengubah ukuran font/padding di sini,
// sesuaikan juga estBlockH() di config.ts (perkiraan tinggi blok untuk posisi "pops").

import { Img, staticFile } from "remotion";
import React from "react";
import { Appear, Arrow, Btn, Check, Ctx, Dots, FileIcon, IconTile, Trash, Typewriter, card, clamp01, countText, fgOn, resolveT } from "./ui";
import { C, FILE_COL, FONT, MONO, TERM_COL, TONE2, V } from "./config";
import type { Item, Row } from "./types";

export const FilesGrid: React.FC<{ n: number; groups?: string[]; t0: number }> = ({ n, groups, t0 }) => {
  const { t } = React.useContext(Ctx);
  if (groups && groups.length) {
    return (
      <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
        {groups.map((g, gi) => (
          <div key={g} style={{ flex: 1, border: `3px dashed ${FILE_COL[gi % 4]}`, borderRadius: 20, padding: "14px 10px", textAlign: "center", opacity: clamp01((t - t0 - gi * 0.25) * 3), fontFamily: FONT }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {[0, 1, 2].map((j) => <FileIcon key={j} i={gi} s={30} />)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 26, color: FILE_COL[gi % 4] }}>{g}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: "10px 6px", justifyItems: "center" }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ opacity: clamp01((t - t0 - i * 0.02) * 6), transform: `translate(${Math.sin(i * 7.3) * 8}px,${Math.cos(i * 3.1) * 8}px) rotate(${Math.sin(i * 5.7) * 14}deg)` }}>
          <FileIcon i={i} s={42} />
        </div>
      ))}
    </div>
  );
};

export const RowView: React.FC<{ r: Row; t0: number }> = ({ r, t0 }) => {
  const { t, accent } = React.useContext(Ctx);
  let body: React.ReactNode = null;
  if (r.k === "bubble") {
    const user = r.from === "user";
    body = (
      <div style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start", gap: 12, alignItems: "flex-start" }}>
        {!user && (
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "#dfe8ff", color: C.blue, fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>AI</div>
        )}
        <div style={{ maxWidth: "78%", padding: "16px 22px", borderRadius: 24, fontSize: 28, fontWeight: 600, lineHeight: 1.3, background: user ? accent : V.soft, color: user ? "#fff" : V.cardInk }}>{r.text}</div>
      </div>
    );
  } else if (r.k === "check") {
    const st = r.state || "done";
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: V.row, borderRadius: 18, padding: "12px 18px" }}>
        {st === "done" ? (
          <div style={{ width: 34, height: 34, borderRadius: 17, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Check /></div>
        ) : st === "busy" ? (
          <div style={{ width: 34, height: 34, borderRadius: 17, border: `4px solid ${V.cardLine}`, borderTopColor: C.green, boxSizing: "border-box", transform: `rotate(${t * 540}deg)` }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 17, border: `4px solid ${V.cardLine}`, boxSizing: "border-box" }} />
        )}
        <div style={{ fontSize: 28, fontWeight: 600 }}>{r.text}</div>
      </div>
    );
  } else if (r.k === "input") {
    const full = r.text || "";
    const n = Math.floor(Math.max(0, t - t0 - 0.25) * 18);
    const cursor = n < full.length || Math.floor(t * 2) % 2 === 0 ? "|" : "";
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 12, border: `3px solid ${C.green}`, borderRadius: 40, padding: "10px 12px 10px 26px", background: V.cardBg }}>
        <div style={{ flex: 1, fontSize: 28, fontWeight: 600, minHeight: 40, display: "flex", alignItems: "center" }}>{full.slice(0, n)}{cursor}</div>
        <div style={{ width: 54, height: 54, borderRadius: 27, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Arrow /></div>
      </div>
    );
  } else if (r.k === "note") {
    body = (
      <div style={{ background: V.note, border: `2px solid ${V.noteLine}`, borderRadius: 22, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 600, flex: 1 }}>{r.text}</div>
        {(r.items || []).map((it, i, a) => <Btn key={i} label={it} main={i === a.length - 1} />)}
      </div>
    );
  } else if (r.k === "buttons") {
    body = (
      <div style={{ display: "flex", gap: 14, justifyContent: "flex-end" }}>
        {(r.items || []).map((it, i, a) => <Btn key={i} label={it} main={i === a.length - 1} />)}
      </div>
    );
  } else if (r.k === "files") {
    body = <FilesGrid n={r.n || 18} groups={r.groups} t0={t0} />;
  }
  return <Appear t0={t0}>{body}</Appear>;
};

export const WindowView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const cx = React.useContext(Ctx);
  const tone = b.tone || C.blue;
  return (
    <Appear t0={t0}>
      <div style={card}>
        <div style={{ background: `${tone}26`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          {["#ff6159", "#ffbd2e", "#27c93f"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
          <div style={{ marginLeft: 10, fontWeight: 800, fontSize: 28, color: tone }}>{b.title}</div>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {(b.rows || []).map((r, i) => <RowView key={i} r={r} t0={resolveT(r.at, cx, (t0 - cx.base) + 0.4 + i * 0.45)} />)}
        </div>
      </div>
    </Appear>
  );
};

export const CompareView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => (
  <div style={{ display: "flex", gap: 24, width: "100%" }}>
    {[b.left, b.right].map((c, ci) => {
      if (!c) return null;
      const tone = c.tone || (ci ? C.green : C.blue);
      return (
        <Appear key={ci} t0={t0 + ci * 0.25} style={{ flex: 1 }}>
          <div style={card}>
            <div style={{ background: tone, color: "#fff", fontWeight: 800, fontSize: 30, padding: "16px 0", textAlign: "center", letterSpacing: 1 }}>{c.title}</div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {c.items.map((it, k) => (
                <Appear key={k} t0={t0 + ci * 0.25 + 0.4 + k * 0.3}>
                  <div style={{ background: `${tone}22`, borderRadius: 18, padding: "14px 18px", fontSize: 30, fontWeight: 600 }}>{it}</div>
                </Appear>
              ))}
            </div>
          </div>
        </Appear>
      );
    })}
  </div>
);

export const TreeView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => (
  <div style={{ display: "flex", gap: 20, width: "100%", fontFamily: FONT }}>
    {(b.cols || []).map((c, i) => (
      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Appear t0={t0 + i * 0.15} style={{ width: "100%" }}>
          <div style={{ ...card, borderRadius: 18, padding: "14px 0", textAlign: "center", fontWeight: 800, fontSize: 28 }}>{c.head}</div>
        </Appear>
        {c.mid ? (
          <>
            <div style={{ width: 3, height: 26, background: V.cardLine }} />
            <Appear t0={t0 + 0.5 + i * 0.15} style={{ width: "100%" }}>
              <div style={{ ...card, borderRadius: 18, border: `3px solid ${C.blue}`, padding: "14px 0", textAlign: "center", fontWeight: 800, fontSize: 28 }}>
                {c.mid}
                {c.tag ? <div style={{ display: "inline-block", marginLeft: 8, background: C.blue, color: "#fff", borderRadius: 12, padding: "2px 12px", fontSize: 20 }}>{c.tag}</div> : null}
              </div>
            </Appear>
          </>
        ) : null}
        {c.low ? (
          <>
            <div style={{ width: 3, height: 26, background: V.cardLine }} />
            <Appear t0={t0 + 1.0 + i * 0.15} style={{ width: "100%" }}>
              <div style={{ ...card, borderRadius: 18, padding: "14px 0", textAlign: "center", fontWeight: 600, fontSize: 30 }}>{c.low}</div>
            </Appear>
          </>
        ) : null}
      </div>
    ))}
  </div>
);

export const DialogView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => (
  <Appear t0={t0}>
    <div style={card}>
      <div style={{ background: V.note, padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: "#f5a623", color: "#fff", fontWeight: 800, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>!</div>
        <div style={{ fontWeight: 800, fontSize: 28 }}>
          <Typewriter text={b.title || ""} t0={t0} delay={0.15} speed={28} />
        </div>
      </div>
      <div style={{ padding: "30px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 800 }}>
          <Typewriter text={b.text || ""} t0={t0} delay={0.3} speed={26} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, margin: "26px 0 10px" }}>
          {[0, 1, 2].map((i) => <FileIcon key={i} i={i} s={44} />)}
          <svg width={40} height={24} viewBox="0 0 40 24"><path d="M2 12h32M26 4l8 8-8 8" stroke={C.mute} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <Trash />
        </div>
        {b.sub ? (
          <div style={{ fontSize: 28, color: V.mute }}>
            <Typewriter text={b.sub} t0={t0} delay={0.6} speed={30} />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 26 }}>
          {(b.buttons || []).map((x, i, a) => <Btn key={i} label={x} main={i === a.length - 1} />)}
        </div>
      </div>
    </div>
  </Appear>
);

// Kartu penekanan. Isi sebaiknya kata kunci / ajakan BARU, bukan salinan kalimat (itu sudah tampil sebagai judul/caption).
// Tinggi baris diset eksplisit (title 1.2, sub 1.25) supaya perkiraan tinggi di config.ts (estBlockH) akurat.
export const CalloutView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { accent } = React.useContext(Ctx);
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: "48px 40px", textAlign: "center", background: V.callout }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: accent, letterSpacing: 1, lineHeight: 1.2 }}>
          <Typewriter text={b.title || ""} t0={t0} delay={0.2} speed={24} />
        </div>
        {b.sub ? (
          <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.25, color: V.mute, margin: "12px 0 28px" }}>
            <Typewriter text={b.sub} t0={t0} delay={0.5} speed={30} />
          </div>
        ) : null}
        {b.cta ? <div style={{ display: "inline-block", background: accent, color: "#fff", borderRadius: 40, padding: "14px 36px", fontWeight: 800, fontSize: 30 }}>{b.cta}</div> : null}
      </div>
    </Appear>
  );
};

export const ListView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { accent } = React.useContext(Ctx);
  const items = b.items || [];
  return (
    <Appear t0={t0}>
      <div style={card}>
        <div style={{ background: accent, color: "#fff", fontWeight: 800, fontSize: 34, padding: "18px 28px" }}>{b.title}</div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((it, i) => (
            <Appear key={i} t0={t0 + 0.35 + i * 0.3}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, background: V.row2, borderRadius: 20, padding: "14px 18px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: C.green, color: "#fff", fontWeight: 800, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 30, fontWeight: 600 }}>{it}</div>
              </div>
            </Appear>
          ))}
          {b.cta ? (
            <Appear t0={t0 + 0.5 + items.length * 0.3}>
              <div style={{ background: C.green, color: "#fff", borderRadius: 40, padding: "16px 0", textAlign: "center", fontWeight: 800, fontSize: 30 }}>{b.cta}</div>
            </Appear>
          ) : null}
        </div>
      </div>
    </Appear>
  );
};

export const StatView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t, accent } = React.useContext(Ctx);
  const m = (b.value || "").match(/[\d.,]+/);
  const num = m ? parseFloat(m[0].replace(",", ".")) : NaN;
  const k = clamp01((t - t0) / 1.2);
  const shown = m && !isNaN(num) ? (b.value || "").replace(m[0], String(Math.round(num * k))) : b.value;
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: "40px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 190, fontWeight: 800, color: accent, lineHeight: 1 }}>{shown}</div>
        <div style={{ fontSize: 44, fontWeight: 600, marginTop: 12 }}>{b.label}</div>
      </div>
    </Appear>
  );
};

export const ImageView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t, name, mute: pageMute } = React.useContext(Ctx);
  const still = b.fit === "contain" || b.hold; // screenshot / gambar yang bertahan antar adegan: jangan di-zoom
  const zoom = still ? 1 : 1 + 0.06 * clamp01((t - t0) / 6); // zoom pelan supaya gambar diam tidak terasa mati
  const k = b.shrink && b.shrink > 0 && b.shrink < 1 ? b.shrink : 1; // dikecilkan saat adegan bermaskot (diisi Explainer)
  if (b.frame === false) {
    // gambar transparan (produk/karakter): tanpa kartu, utuh (contain), melayang pelan + bayangan
    return (
      <Appear t0={t0}>
        <div style={{ height: Math.round((b.h || 760) * k), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {b.src ? (
            <Img src={staticFile(`${name}/${b.src}`)} style={{ maxWidth: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 18px 24px rgba(0,0,0,.25))", transform: `translateY(${Math.sin(t * 2) * 8}px)` }} />
          ) : null}
        </div>
        {b.caption ? (
          <div style={{ fontSize: 28, fontWeight: 600, textAlign: "center", marginTop: 8, color: pageMute }}>
            <Typewriter text={b.caption} t0={t0} delay={0.28} speed={28} />
          </div>
        ) : null}
      </Appear>
    );
  }
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: 14, ...(k < 1 ? { width: `${Math.round(k * 1000) / 10}%`, margin: "0 auto" } : {}) }}>
        <div style={{ height: Math.round((b.h || 640) * k), borderRadius: 22, overflow: "hidden", background: V.soft }}>
          {b.src ? <Img src={staticFile(`${name}/${b.src}`)} style={{ width: "100%", height: "100%", objectFit: b.fit === "contain" ? "contain" : "cover", transform: `scale(${zoom})` }} /> : null}
        </div>
        {b.caption ? (
          <div style={{ fontSize: 28, fontWeight: 600, textAlign: "center", margin: "14px 0 4px", color: V.mute }}>
            <Typewriter text={b.caption} t0={t0} delay={0.28} speed={28} />
          </div>
        ) : null}
      </div>
    </Appear>
  );
};

export const MeterView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t, accent } = React.useContext(Ctx);
  const v = Math.max(0, Math.min(100, b.pct ?? 0));
  const k = clamp01((t - t0) / 1.2);
  const cells = 20;
  const filled = Math.round(cells * (v / 100) * k);
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: "22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 30, letterSpacing: 1 }}>
          <span>{b.title}</span>
          <span style={{ color: accent }}>{Math.round(v * k)}%</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {Array.from({ length: cells }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 34, borderRadius: 6, background: i < filled ? accent : "rgba(128,128,128,.25)" }} />
          ))}
        </div>
        {b.label ? <div style={{ fontSize: 30, color: V.mute, marginTop: 12 }}>{b.label}</div> : null}
      </div>
    </Appear>
  );
};

export const BarsView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t, accent } = React.useContext(Ctx);
  const items = (b.bars || []).slice(0, 6);
  const hi = b.hi ?? items.length - 1;
  const H = 360;
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: "26px 26px 18px" }}>
        {b.title ? <div style={{ fontWeight: 800, fontSize: 30, marginBottom: 16 }}>{b.title}</div> : null}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: H }}>
          {items.map((it, i) => {
            const k = clamp01((t - t0 - i * 0.18) / 0.7);
            const e = 1 - Math.pow(1 - k, 3);
            const h = Math.max(8, (Math.max(0, Math.min(100, it.value)) / 100) * (H - 40)) * e;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                <div style={{ width: "100%", height: h, borderRadius: "10px 10px 0 0", background: i === hi ? accent : V.bar, boxShadow: i === hi ? `0 0 22px ${accent}88` : undefined }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
          {items.map((it, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 26, color: V.mute, fontWeight: 600 }}>{it.label}</div>)}
        </div>
      </div>
    </Appear>
  );
};

// terminal: perintah diketik huruf demi huruf, keluaran muncul berurutan
export const TermView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t } = React.useContext(Ctx);
  let cursorT = t0 + 0.4;
  const sched = (b.lines || []).slice(0, 8).map((l) => {
    const kind = l.k || (l.text.trim().startsWith("$") ? "cmd" : "out");
    const dur = kind === "cmd" ? Math.min(1.6, Math.max(0.4, l.text.length / 40)) : 0.2;
    const s = { l, kind, start: cursorT, dur };
    cursorT += dur + (kind === "cmd" ? 0.3 : 0.15);
    return s;
  });
  return (
    <Appear t0={t0}>
      <div style={{ ...card, background: "#15171e", border: "2px solid #2b2f3b", color: "#e8eaf0" }}>
        <div style={{ background: "#232733", padding: "16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <Dots />
          <div style={{ marginLeft: 12, fontFamily: MONO, fontSize: 22, color: "#9aa3b5" }}>{b.title || "Terminal"}</div>
        </div>
        <div style={{ padding: "26px 28px", minHeight: b.h || 420, fontFamily: MONO, fontSize: 27, lineHeight: 1.55, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
          {sched.map((s, i) => {
            if (t < s.start) return null;
            const full = s.l.text;
            const n = s.kind === "cmd" ? Math.min(full.length, Math.floor(((t - s.start) / s.dur) * full.length)) : full.length;
            const typing = s.kind === "cmd" && n < full.length;
            const isLast = i === sched.length - 1;
            const cur = typing || (isLast && s.kind === "cmd") ? (Math.floor(t * 2.5) % 2 === 0 ? "\u258C" : " ") : "";
            const shown = full.slice(0, n);
            const prompt = s.kind === "cmd" && shown.startsWith("$");
            return (
              <div key={i} style={{ color: TERM_COL[s.kind] }}>
                {prompt ? <span style={{ color: "#4ade80" }}>$</span> : null}
                {prompt ? shown.slice(1) : shown}
                {cur}
              </div>
            );
          })}
        </div>
      </div>
    </Appear>
  );
};

// jendela browser: address bar, judul situs, tab (Windows | Mac), blok kode, tombol Copy yang "ditekan"
export const BrowserView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t } = React.useContext(Ctx);
  const tabs = b.items || [];
  const press = t > t0 + 1.2 && t < t0 + 1.45;
  return (
    <Appear t0={t0}>
      <div style={{ ...card, background: "#ffffff", color: "#16161a", border: "2px solid #e6e6ea" }}>
        <div style={{ background: "#eceef2", padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Dots />
          <div style={{ flex: 1, background: "#fff", borderRadius: 20, padding: "8px 18px", fontSize: 24, fontWeight: 600, color: "#555b66", display: "flex", alignItems: "center", gap: 10, overflow: "hidden", whiteSpace: "nowrap" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#8a909c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            {b.url}
          </div>
        </div>
        <div style={{ padding: "30px 32px", minHeight: b.h || 380 }}>
          {b.title ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#16161a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800 }}>{b.icon || b.title.slice(0, 1)}</div>
              <div style={{ fontSize: 40, fontWeight: 800 }}>{b.title}</div>
            </div>
          ) : null}
          {b.sub ? <div style={{ fontSize: 26, color: "#6b7280", marginBottom: 18 }}>{b.sub}</div> : null}
          {tabs.length ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {tabs.map((x, i) => (
                <div key={i} style={{ padding: "8px 22px", borderRadius: 10, fontSize: 24, fontWeight: 700, background: i === (b.tab ?? 0) ? "#16161a" : "#eceef2", color: i === (b.tab ?? 0) ? "#fff" : "#555b66" }}>{x}</div>
              ))}
            </div>
          ) : null}
          {b.text ? <div style={{ background: "#1b1d24", color: "#e8eaf0", borderRadius: 14, padding: "20px 22px", fontFamily: MONO, fontSize: 26, lineHeight: 1.5, wordBreak: "break-all" }}>{b.text}</div> : null}
          {b.cta ? <div style={{ display: "inline-block", marginTop: 18, background: "#16161a", color: "#fff", borderRadius: 10, padding: "10px 28px", fontSize: 24, fontWeight: 700, transform: press ? "scale(.92)" : "scale(1)" }}>{b.cta}</div> : null}
        </div>
      </div>
    </Appear>
  );
};

// layar HP dengan chat (rows: bubble dari "user" / "bot")
export const PhoneView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const rows = (b.rows || []).slice(0, 6);
  return (
    <Appear t0={t0}>
      <div style={{ width: 480, height: b.h || 820, margin: "0 auto", borderRadius: 60, border: "12px solid #0e0f13", background: "#c8e0b2", boxShadow: V.cardShadow, overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: FONT }}>
        <div style={{ background: "#5f87b0", padding: "34px 22px 16px", display: "flex", alignItems: "center", gap: 14, color: "#fff" }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: "#fff", color: "#5f87b0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26 }}>{(b.title || "B").slice(0, 1).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{b.title}</div>
            <div style={{ fontSize: 22, opacity: 0.8 }}>{b.sub || "bot"}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "18px 16px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12 }}>
          {rows.map((r, i) => {
            const user = r.from === "user";
            return (
              <Appear key={i} t0={t0 + 0.5 + i * 0.7}>
                <div style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", padding: "12px 18px", borderRadius: 20, background: user ? "#effdde" : "#ffffff", color: "#16161a", fontSize: 26, fontWeight: 600, lineHeight: 1.3 }}>{r.text}</div>
                </div>
              </Appear>
            );
          })}
        </div>
        <div style={{ background: "#fff", padding: "16px 20px", fontSize: 22, color: "#9aa0aa" }}>Message</div>
      </div>
    </Appear>
  );
};

// kartu label berikon ("Rahasia", "Agen AI", "Ide") dengan tag opsional di kanan
export const ChipView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { accent } = React.useContext(Ctx);
  const tone = b.tone || accent;
  return (
    <Appear t0={t0}>
      <div style={{ ...card, border: `2px solid ${tone}`, padding: "20px 26px", display: "flex", alignItems: "center", gap: 22 }}>
        <IconTile glyph={b.icon} fallback={(b.title || "?").slice(0, 1)} tone={tone} size={78} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1 }}>
            <Typewriter text={b.title || ""} t0={t0} delay={0.22} speed={26} />
          </div>
          {b.sub ? (
            <div style={{ fontSize: 30, color: V.mute, marginTop: 4 }}>
              <Typewriter text={b.sub} t0={t0} delay={0.5} speed={30} />
            </div>
          ) : null}
        </div>
        {b.tag ? <div style={{ border: `2px solid ${tone}`, color: tone, borderRadius: 30, padding: "6px 18px", fontSize: 26, fontWeight: 700 }}>{b.tag}</div> : null}
      </div>
    </Appear>
  );
};

// beberapa kartu kecil berdampingan (cols: head = judul, mid = keterangan, tag = ikon)
export const TilesView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { accent } = React.useContext(Ctx);
  const cols = (b.cols || []).slice(0, 4);
  const tones = [accent, TONE2, C.blue, C.green];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
      {cols.map((c, i) => {
        const tone = tones[i % 4];
        return (
          <div key={i} style={{ flex: cols.length === 1 ? "1 1 100%" : cols.length === 2 ? "1 1 0" : "0 0 calc(50% - 9px)", minWidth: 0 }}>
            <Appear t0={t0 + i * 0.3}>
              <div style={{ ...card, border: `2px solid ${tone}`, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                <IconTile glyph={c.tag} fallback={c.head.slice(0, 1)} tone={tone} size={62} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{c.head}</div>
                  {c.mid ? <div style={{ fontSize: 26, color: V.mute, marginTop: 2 }}>{c.mid}</div> : null}
                </div>
              </div>
            </Appear>
          </div>
        );
      })}
    </div>
  );
};

// kartu angka (KPI): judul + tag, angka naik, bar progres, avatar; big = angka besar di tengah
export const KpiView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { t, accent } = React.useContext(Ctx);
  const tone = b.tone || accent;
  const k = clamp01((t - t0 - 0.2) / 1.3);
  const val = b.value ? countText(b.value, k) : "";
  const pill = b.tag ? <div style={{ marginLeft: "auto", background: tone, color: fgOn(tone), borderRadius: 30, padding: "5px 18px", fontSize: 24, fontWeight: 800 }}>{b.tag}</div> : null;
  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
      <IconTile glyph={b.icon} fallback={(b.title || "?").slice(0, 1)} tone={tone} size={46} />
      <span>{b.title}</span>
      {pill}
    </div>
  );
  if (b.big) {
    return (
      <Appear t0={t0}>
        <div style={{ ...card, border: `2px solid ${tone}`, padding: "24px 30px" }}>
          {head}
          <div style={{ textAlign: "center", fontSize: 120, fontWeight: 800, lineHeight: 1.15, marginTop: 8, color: k >= 1 ? tone : V.cardInk }}>{val}</div>
        </div>
      </Appear>
    );
  }
  const avatars = (b.items || []).slice(0, 5);
  const av = [accent, TONE2, C.blue, C.green, "#7b4fd8"];
  return (
    <Appear t0={t0}>
      <div style={{ ...card, border: `2px solid ${tone}`, padding: "20px 26px" }}>
        {head}
        {val || avatars.length ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{val}</div>
            <div style={{ display: "flex" }}>
              {avatars.map((a, i) => (
                <div key={i} style={{ width: 48, height: 48, borderRadius: 24, background: av[i % av.length], color: fgOn(av[i % av.length]), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, marginLeft: i ? -12 : 0, border: "3px solid rgba(0,0,0,.35)" }}>{a.slice(0, 1)}</div>
              ))}
            </div>
          </div>
        ) : null}
        {b.pct !== undefined ? (
          <div style={{ height: 14, borderRadius: 7, background: "rgba(128,128,128,.25)", marginTop: 14, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, b.pct)) * clamp01((t - t0 - 0.2) / 1.1)}%`, height: "100%", background: tone, borderRadius: 7 }} />
          </div>
        ) : null}
      </div>
    </Appear>
  );
};

// tumpukan notifikasi (mis. "Penjualan baru +US$ 49") masuk satu per satu
export const NotifsView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { accent } = React.useContext(Ctx);
  const tone = b.tone || accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(b.notifs || []).slice(0, 4).map((n, i) => (
        <Appear key={i} t0={t0 + i * 0.55}>
          <div style={{ ...card, border: `2px solid ${tone}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <IconTile glyph={n.icon} fallback={n.text.slice(0, 1)} tone={tone} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>{n.text}</div>
              {n.sub ? <div style={{ fontSize: 26, color: V.mute }}>{n.sub}</div> : null}
            </div>
            {n.value ? <div style={{ fontSize: 34, fontWeight: 800, color: tone }}>{n.value}</div> : null}
          </div>
        </Appear>
      ))}
    </div>
  );
};

// ikon aplikasi besar (boleh 2-3, dipisah panah): glyph/emoji atau gambar (src) + label
export const IconsView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { name, ink } = React.useContext(Ctx);
  const icons = (b.icons || []).slice(0, 3);
  const size = icons.length > 1 ? 230 : 280;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 }}>
      {icons.map((ic, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Appear t0={t0 + i * 0.35}><div style={{ fontSize: 80, fontWeight: 800, color: ink, fontFamily: FONT }}>{"\u2192"}</div></Appear> : null}
          <Appear t0={t0 + i * 0.35}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: size, height: size, borderRadius: size * 0.24, background: ic.bg || "#ffffff", boxShadow: V.cardShadow, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, fontWeight: 800, color: "#16161a", fontFamily: FONT }}>
                {ic.src ? <Img src={staticFile(`${name}/${ic.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ic.glyph}
              </div>
              {ic.label ? <div style={{ fontSize: 36, fontWeight: 800, color: ink, marginTop: 16, fontFamily: FONT }}>{ic.label}</div> : null}
            </div>
          </Appear>
        </React.Fragment>
      ))}
    </div>
  );
};

// kartu profil akun untuk penutup ("Follow buat insight lainnya")
export const ProfileView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { name, accent } = React.useContext(Ctx);
  return (
    <Appear t0={t0}>
      <div style={{ ...card, padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: 60, background: accent, color: fgOn(accent), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 800, flexShrink: 0 }}>
            {b.src ? <Img src={staticFile(`${name}/${b.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : b.icon || (b.title || "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>
              <Typewriter text={b.title || ""} t0={t0} delay={0.25} speed={26} />
            </div>
            {b.sub ? (
              <div style={{ fontSize: 32, color: V.mute, marginTop: 6 }}>
                <Typewriter text={b.sub} t0={t0} delay={0.55} speed={30} />
              </div>
            ) : null}
          </div>
        </div>
        {b.cta ? <div style={{ marginTop: 24, background: V.ghost, color: V.cardInk, borderRadius: 16, padding: "18px 0", textAlign: "center", fontSize: 32, fontWeight: 800 }}>{b.cta}</div> : null}
      </div>
    </Appear>
  );
};

// kartu merek penutup: teks kecil + nama besar + tombol toggle hijau
export const BrandView: React.FC<{ b: Item; t0: number }> = ({ b, t0 }) => {
  const { ink } = React.useContext(Ctx);
  return (
    <Appear t0={t0}>
      <div style={{ textAlign: "center", color: ink, fontFamily: FONT }}>
        {b.sub ? (
          <div style={{ fontSize: 40, fontWeight: 600, marginBottom: 18, opacity: 0.9 }}>
            <Typewriter text={b.sub} t0={t0} delay={0.2} speed={28} />
          </div>
        ) : null}
        <div style={{ fontSize: 118, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
          <Typewriter text={b.title || ""} t0={t0} delay={0.45} speed={20} />
        </div>
        <div style={{ position: "relative", width: 160, height: 72, borderRadius: 36, background: "#1fb86a", margin: "36px auto 0", boxShadow: "0 0 30px rgba(31,184,106,.45)" }}>
          <div style={{ position: "absolute", right: 8, top: 8, width: 56, height: 56, borderRadius: 28, background: "#06331c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, border: "4px solid #fff", boxSizing: "border-box" }} />
          </div>
        </div>
        {b.cta ? <div style={{ display: "inline-block", marginTop: 30, background: "#ffffff", color: "#16161a", borderRadius: 40, padding: "14px 40px", fontSize: 32, fontWeight: 800 }}>{b.cta}</div> : null}
      </div>
    </Appear>
  );
};

export const StageItem: React.FC<{ b: Item; i: number }> = ({ b, i }) => {
  const cx = React.useContext(Ctx);
  const t0 = b.hold ? -100 : resolveT(b.at, cx, 0.05 + i * 0.35); // hold = lanjutan dari adegan sebelumnya: langsung tampil, tanpa animasi masuk
  switch (b.type) {
    case "window": return <WindowView b={b} t0={t0} />;
    case "compare": return <CompareView b={b} t0={t0} />;
    case "tree": return <TreeView b={b} t0={t0} />;
    case "dialog": return <DialogView b={b} t0={t0} />;
    case "callout": return <CalloutView b={b} t0={t0} />;
    case "list": return <ListView b={b} t0={t0} />;
    case "stat": return <StatView b={b} t0={t0} />;
    case "image": return <ImageView b={b} t0={t0} />;
    case "meter": return <MeterView b={b} t0={t0} />;
    case "bars": return <BarsView b={b} t0={t0} />;
    case "terminal": return <TermView b={b} t0={t0} />;
    case "browser": return <BrowserView b={b} t0={t0} />;
    case "phone": return <PhoneView b={b} t0={t0} />;
    case "chip": return <ChipView b={b} t0={t0} />;
    case "tiles": return <TilesView b={b} t0={t0} />;
    case "kpi": return <KpiView b={b} t0={t0} />;
    case "notifs": return <NotifsView b={b} t0={t0} />;
    case "icons": return <IconsView b={b} t0={t0} />;
    case "profile": return <ProfileView b={b} t0={t0} />;
    case "brand": return <BrandView b={b} t0={t0} />;
    case "files":
      return (
        <Appear t0={t0}>
          <div style={{ ...card, padding: 24 }}>
            {b.title ? <div style={{ fontWeight: 800, fontSize: 28, marginBottom: 14 }}>{b.title}</div> : null}
            <FilesGrid n={b.n || 24} groups={b.groups} t0={t0} />
          </div>
        </Appear>
      );
    default: return null;
  }
};
