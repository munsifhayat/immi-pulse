import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: OUTFIT } = loadOutfit("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin"] });
const { fontFamily: INTER } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const NAVY = "#101928";
const PURPLE = "#7A5AF8";
const PURPLE_DEEP = "#3E1C96";
const PURPLE_LIGHT = "#BDB4FE";
const TEAL = "#1B7B6F";
const TEAL_LIGHT = "#2DD4BF";
const GRAY = "#475367";
const WHITE = "#FFFFFF";

export const FPS = 30;

// --- timeline: scene lengths in frames; audio plays full at each scene start ---
const LEAD = 8;
const SCENE_LEN = [98, 104, 113, 110, 96, 131]; // tuned to VO clip durations + gaps
const STARTS: number[] = [];
{
  let t = LEAD;
  for (const len of SCENE_LEN) {
    STARTS.push(t);
    t += len;
  }
}
export const REEL_DURATION_IN_FRAMES = LEAD + SCENE_LEN.reduce((a, b) => a + b, 0); // = 660 (22s)

// ---------- shared ----------
const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 10 });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 350,
        textAlign: "center",
        fontFamily: OUTFIT,
        fontWeight: 800,
        fontSize: 66,
        lineHeight: 1.16,
        color: WHITE,
        textShadow: "0 4px 24px rgba(0,0,0,0.55)",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

const HL: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = PURPLE }) => (
  <span style={{ background: bg, padding: "2px 16px", borderRadius: 12, color: WHITE, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
    {children}
  </span>
);

const NowTag: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 0.55 + Math.abs(Math.sin(f / 7)) * 0.45;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 54 }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: TEAL_LIGHT, opacity: pulse, boxShadow: `0 0 22px ${TEAL_LIGHT}` }} />
      <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: 36, letterSpacing: 10, color: PURPLE_LIGHT }}>RIGHT NOW</span>
    </div>
  );
};

const Track: React.FC<{ fillPct: number; w?: number; h?: number }> = ({ fillPct, w = 100, h = 28 }) => (
  <div style={{ width: `${w}%`, height: h, borderRadius: h / 2, background: "#27364d", overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${fillPct}%`, background: `linear-gradient(90deg,${PURPLE_DEEP},${PURPLE} 55%,${TEAL_LIGHT})` }} />
  </div>
);

// ---------- scenes ----------
const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 200 } });
  const check = spring({ frame: f - 16, fps, config: { damping: 10, stiffness: 220 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <NowTag />
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`, opacity: pop, background: "#16203200", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ width: 180, height: 180, borderRadius: 90, background: "rgba(45,212,191,0.14)", border: `3px solid ${TEAL_LIGHT}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 110, color: TEAL_LIGHT, transform: `scale(${check})` }}>✓</span>
        </div>
        <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: 56, color: WHITE }}>Visa lodged</span>
      </div>
      <Caption>Right now, someone just hit <HL>submit</HL>.</Caption>
    </AbsoluteFill>
  );
};

const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 4, fps, config: { damping: 16, stiffness: 200 } });
  const count = Math.min(10, Math.max(1, Math.floor(interpolate(f, [8, 46], [1, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  const spin = interpolate(f, [8, 46], [0, 360 * 3], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <NowTag />
      <div style={{ opacity: pop, transform: `translateY(${interpolate(pop, [0, 1], [50, 0])}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
        <div style={{ background: "#0e1726", border: "1px solid #27364d", borderRadius: 24, padding: "30px 54px", fontFamily: INTER, fontWeight: 600, fontSize: 42, color: GRAY }}>
          Status: <span style={{ color: PURPLE_LIGHT }}>Received</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 56, color: WHITE, transform: `rotate(${spin}deg)`, display: "inline-block" }}>↻</span>
          <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 130, color: WHITE }}>×{count}</span>
        </div>
      </div>
      <Caption>Refreshing for the <HL>10th time</HL> today.</Caption>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 2, fps, config: { damping: 9, stiffness: 200 } });
  const ring = interpolate(f, [2, 40], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 700, height: 700, borderRadius: 350, border: `4px solid ${TEAL_LIGHT}`, opacity: (1 - ring) * 0.6, transform: `scale(${0.4 + ring * 1.1})` }} />
        <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 200, color: TEAL_LIGHT, transform: `scale(${interpolate(pop, [0, 1], [0.4, 1])})`, letterSpacing: -4, textShadow: `0 0 60px rgba(45,212,191,0.5)` }}>
          GRANTED
        </span>
      </div>
      <Caption>Someone just got the email. <HL bg={TEAL}>Granted.</HL></Caption>
    </AbsoluteFill>
  );
};

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 4, fps, config: { damping: 14, stiffness: 180 } });
  const b = spring({ frame: f - 12, fps, config: { damping: 14, stiffness: 180 } });
  const Bag: React.FC<{ p: number; delay: number }> = ({ p }) => (
    <div style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px)` }}>
      <div style={{ width: 30, height: 34, margin: "0 auto", borderTop: `8px solid ${PURPLE_LIGHT}`, borderLeft: `8px solid ${PURPLE_LIGHT}`, borderRight: `8px solid ${PURPLE_LIGHT}`, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
      <div style={{ width: 190, height: 240, borderRadius: 26, background: `linear-gradient(160deg, ${PURPLE} , ${PURPLE_DEEP})`, marginTop: -4, border: `2px solid ${PURPLE_LIGHT}` }}>
        <div style={{ width: "70%", height: 8, background: "rgba(255,255,255,0.35)", borderRadius: 4, margin: "40px auto 0" }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 50 }}>
        <Bag p={a} delay={0} />
        <Bag p={b} delay={12} />
      </div>
      <Caption>Packing a whole life into <HL>two bags</HL>.</Caption>
    </AbsoluteFill>
  );
};

const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cells = Array.from({ length: 30 });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 880, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 22 }}>
        {cells.map((_, i) => {
          const g = spring({ frame: f - i * 2, fps, config: { damping: 200 }, durationInFrames: 18 });
          const target = 45 + ((i * 37) % 55);
          return <div key={i} style={{ opacity: 0.35 + g * 0.65 }}><Track fillPct={interpolate(g, [0, 1], [0, target])} h={20} /></div>;
        })}
      </div>
      <Caption>All at once. <HL bg={TEAL}>Thousands of you.</HL></Caption>
    </AbsoluteFill>
  );
};

const HANDLES = [
  "anon_4821", "skilled_189", "kiwi_2027", "perthmum", "nurse_190", "devguy_491",
  "partner_820", "syd2026", "onshore_485", "hopeful_186", "studentJ", "lodged_may",
];

const Scene6: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const WALL_OUT = 78; // handle wall lives 0..78, then brand close
  const wallOpacity = interpolate(f, [WALL_OUT - 12, WALL_OUT], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const close = spring({ frame: f - WALL_OUT, fps, config: { damping: 200 }, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* handle wall + caption */}
      <div style={{ position: "absolute", inset: 0, opacity: wallOpacity, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 900, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
          {HANDLES.map((h, i) => {
            const g = spring({ frame: f - i * 2.5, fps, config: { damping: 200 }, durationInFrames: 14 });
            const granted = i % 4 === 0;
            const pulse = 0.7 + Math.abs(Math.sin((f + i * 9) / 9)) * 0.3;
            return (
              <div key={h} style={{ opacity: g, display: "flex", alignItems: "center", gap: 12, background: "#0e1726", border: "1px solid #27364d", borderRadius: 999, padding: "16px 26px" }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: granted ? TEAL_LIGHT : PURPLE, opacity: pulse }} />
                <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 32, color: granted ? TEAL_LIGHT : "#cfd6e2" }}>{h}</span>
              </div>
            );
          })}
        </div>
        <Caption>You were never doing this <HL bg={TEAL}>alone.</HL></Caption>
      </div>

      {/* brand close */}
      <div style={{ position: "absolute", inset: 0, opacity: close, justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: 22, transform: `translateY(${interpolate(close, [0, 1], [40, 0])}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="64" height="46" viewBox="0 0 56 40" fill="none"><path d="M2 20 H14 L20 6 L30 34 L37 20 H54" stroke={PURPLE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: 88, color: WHITE, letterSpacing: -1 }}>
            immi<span style={{ color: PURPLE_LIGHT }}>-pulse</span>
          </span>
        </div>
        <div style={{ width: 300, position: "relative" }}>
          <div style={{ height: 12, borderRadius: 6, background: `linear-gradient(90deg,${PURPLE},${TEAL_LIGHT})` }} />
        </div>
        <span style={{ fontFamily: OUTFIT, fontWeight: 500, fontSize: 42, color: "#e7eaf0" }}>Immigration intelligence, for everyone.</span>
      </div>
    </AbsoluteFill>
  );
};

const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];

// ---------- chrome ----------
const Background: React.FC = () => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 70) * 40;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at ${80 + drift / 10}% -8%, #241449 0%, transparent 60%), radial-gradient(900px 700px at -8% 22%, #14233a 0%, transparent 55%), #0a0f18` }} />
  );
};

const Wordmark: React.FC = () => (
  <div style={{ position: "absolute", top: 54, left: 60, display: "flex", alignItems: "center", gap: 6 }}>
    <svg width="34" height="24" viewBox="0 0 56 40" fill="none"><path d="M2 20 H14 L20 6 L30 34 L37 20 H54" stroke={PURPLE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: 36, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>immi<span style={{ color: PURPLE_LIGHT }}>-pulse</span></span>
  </div>
);

const ProgressBar: React.FC = () => {
  const f = useCurrentFrame();
  const pct = interpolate(f, [0, REEL_DURATION_IN_FRAMES], [0, 100]);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${PURPLE},${TEAL_LIGHT})` }} />
    </div>
  );
};

const musicVol = (f: number) =>
  interpolate(f, [0, 15, REEL_DURATION_IN_FRAMES - 45, REEL_DURATION_IN_FRAMES], [0, 0.24, 0.24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const CommReel01: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Background />

      {/* visuals */}
      {SCENES.map((S, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={SCENE_LEN[i]}>
          <S />
        </Sequence>
      ))}

      <Wordmark />
      <ProgressBar />

      {/* audio — VO per beat (full clip, from-only so never clipped) */}
      {STARTS.map((s, i) => (
        <Sequence key={`vo-${i}`} from={s}>
          <Audio src={staticFile(`audio/beat-0${i + 1}.mp3`)} volume={0.96} />
        </Sequence>
      ))}

      {/* music bed at root, faded */}
      <Audio src={staticFile("audio/music-bed.mp3")} volume={musicVol} />
    </AbsoluteFill>
  );
};
