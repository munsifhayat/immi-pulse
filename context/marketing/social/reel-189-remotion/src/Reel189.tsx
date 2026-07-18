import React from "react";
import {
  AbsoluteFill,
  Series,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: OUTFIT } = loadOutfit("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["latin"],
});
const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// ---- brand kit ----
const NAVY = "#101928";
const PURPLE = "#7A5AF8";
const PURPLE_DEEP = "#3E1C96";
const PURPLE_LIGHT = "#BDB4FE";
const TEAL = "#1B7B6F";
const TEAL_LIGHT = "#2DD4BF";
const GRAY = "#475367";
const GRAY_LIGHT = "#F0F2F5";
const WHITE = "#FFFFFF";

export const FPS = 30;
const S1 = 90, S2 = 120, S3 = 150, S4 = 120, S5 = 90, S6 = 90;
export const REEL_DURATION_IN_FRAMES = S1 + S2 + S3 + S4 + S5 + S6; // 660 = 22s

// ---------- shared bits ----------
const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  const y = interpolate(enter, [0, 1], [40, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 360,
        textAlign: "center",
        fontFamily: OUTFIT,
        fontWeight: 800,
        fontSize: 66,
        lineHeight: 1.18,
        color: WHITE,
        textShadow: "0 4px 24px rgba(0,0,0,0.55)",
        opacity: enter,
        transform: `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
};

const HL: React.FC<{ children: React.ReactNode; bg?: string; italic?: boolean }> = ({
  children,
  bg = PURPLE,
  italic = false,
}) => (
  <span
    style={{
      background: bg,
      padding: "2px 16px",
      borderRadius: 12,
      color: WHITE,
      fontStyle: italic ? "italic" : "normal",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
);

const SourceNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      bottom: 250,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: INTER,
      fontWeight: 500,
      fontSize: 26,
      color: "rgba(255,255,255,0.45)",
    }}
  >
    {children}
  </div>
);

// percentile track
const Track: React.FC<{ fillPct: number; height?: number }> = ({ fillPct, height = 46 }) => (
  <div
    style={{
      width: "100%",
      height,
      borderRadius: height / 2,
      background: "linear-gradient(90deg,#2b3a52,#3a4d6e)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: `${fillPct}%`,
        background: `linear-gradient(90deg,${PURPLE_DEEP},${PURPLE} 55%,${TEAL_LIGHT})`,
      }}
    />
  </div>
);

// ---------- scenes ----------
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  const blink = Math.floor(frame / 12) % 2 === 0 ? 1 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", transform: `scale(${scale})`, opacity: pop }}>
        <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 360, color: WHITE, letterSpacing: -6 }}>
          189
        </span>
        <span
          style={{
            display: "inline-block",
            width: 18,
            height: 230,
            background: PURPLE,
            marginLeft: 22,
            borderRadius: 8,
            opacity: blink,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: OUTFIT,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: 12,
          color: PURPLE_LIGHT,
          marginTop: 10,
          opacity: pop,
        }}
      >
        SUBCLASS
      </div>
      <Caption>
        How long is the 189 <HL italic>actually</HL> taking?
      </Caption>
    </AbsoluteFill>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  const stamp = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 220 } });
  const stampScale = interpolate(stamp, [0, 1], [1.5, 1], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          background: GRAY_LIGHT,
          borderRadius: 36,
          padding: "70px 80px",
          width: 760,
          textAlign: "center",
          opacity: card,
          transform: `translateY(${interpolate(card, [0, 1], [60, 0])}px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: GRAY, textTransform: "uppercase" }}>
          What Home Affairs publishes
        </div>
        <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 240, color: PURPLE_DEEP, transform: `scale(${stampScale})`, lineHeight: 1 }}>
          75<span style={{ fontSize: 110 }}>th</span>
        </div>
        <div style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: 40, letterSpacing: 8, color: GRAY, textTransform: "uppercase" }}>
          percentile
        </div>
      </div>
      <Caption>
        What they <HL>publish</HL>: the 75th percentile
      </Caption>
      <SourceNote>Source: Dept. of Home Affairs · illustrative</SourceNote>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const fill = interpolate(frame, [6, 46], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const markerPct = interpolate(frame, [10, 50], [2, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const months = Math.round(
    interpolate(frame, [10, 55], [0, 7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 820 }}>
        <div style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: PURPLE_LIGHT, marginBottom: 28, textAlign: "center" }}>
          THE REAL MIDDLE
        </div>
        <div style={{ position: "relative" }}>
          <Track fillPct={fill} />
          <div
            style={{
              position: "absolute",
              top: -16,
              left: `${markerPct}%`,
              width: 6,
              height: 78,
              background: WHITE,
              borderRadius: 4,
              boxShadow: `0 0 26px ${TEAL_LIGHT}`,
              transform: "translateX(-50%)",
            }}
          />
        </div>
        <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 96, color: WHITE, textAlign: "center", marginTop: 40 }}>
          ≈ {months} months
        </div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 34, color: TEAL_LIGHT, textAlign: "center", marginTop: 4 }}>
          the actual median
        </div>
      </div>
      <Caption>
        The <HL bg={TEAL}>median</HL> is ≈ 7 months
      </Caption>
      <SourceNote>illustrative — swap live DHA + Pulse data before publishing</SourceNote>
    </AbsoluteFill>
  );
};

const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { label: "25th", target: 42 },
    { label: "50th", target: 60 },
    { label: "75th", target: 80 },
    { label: "90th", target: 100 },
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 840, display: "flex", flexDirection: "column", gap: 36 }}>
        {rows.map((r, i) => {
          const grow = spring({ frame: frame - i * 8, fps, config: { damping: 200 }, durationInFrames: 22 });
          const w = interpolate(grow, [0, 1], [0, r.target]);
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: 44, color: PURPLE_LIGHT, width: 130, textAlign: "right" }}>
                {r.label}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 40,
                    width: `${w}%`,
                    borderRadius: 20,
                    background: `linear-gradient(90deg,${PURPLE_DEEP},${PURPLE})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Caption>
        25th · 50th · 75th · <HL>90th</HL>
      </Caption>
    </AbsoluteFill>
  );
};

const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const markerY = interpolate(drop, [0, 1], [-160, 0]);
  const glow = 18 + Math.sin(frame / 5) * 10;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 820, position: "relative" }}>
        <Track fillPct={100} height={56} />
        <div
          style={{
            position: "absolute",
            top: -22,
            left: "46%",
            width: 8,
            height: 100,
            background: WHITE,
            borderRadius: 5,
            boxShadow: `0 0 ${glow}px ${TEAL_LIGHT}`,
            transform: `translateX(-50%) translateY(${markerY}px)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -150,
            left: "46%",
            transform: "translateX(-50%)",
            fontFamily: OUTFIT,
            fontWeight: 800,
            fontSize: 40,
            color: WHITE,
            opacity: drop,
            whiteSpace: "nowrap",
          }}
        >
          YOU ARE HERE
        </div>
      </div>
      <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 64, color: TEAL_LIGHT, marginTop: 80, opacity: drop }}>
        normal ✓
      </div>
      <Caption>
        If you're in here → <HL bg={TEAL}>you're normal</HL>
      </Caption>
    </AbsoluteFill>
  );
};

const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const y = interpolate(card, [0, 1], [90, 0]);
  const pulse = 1 + Math.sin(frame / 6) * 0.02;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          background: WHITE,
          borderRadius: 40,
          padding: "64px 64px",
          width: 800,
          opacity: card,
          transform: `translateY(${y}px)`,
          boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: 72, color: NAVY }}>Is my wait normal?</div>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 36, color: GRAY, marginTop: 16 }}>
          Pick your subclass + lodge month · free, no login
        </div>
        <div
          style={{
            marginTop: 44,
            background: PURPLE,
            color: WHITE,
            fontFamily: OUTFIT,
            fontWeight: 700,
            fontSize: 48,
            padding: "30px 0",
            borderRadius: 20,
            textAlign: "center",
            transform: `scale(${pulse})`,
          }}
        >
          Check the 189 →
        </div>
      </div>
      <Caption>
        Free · <HL>every subclass</HL> · link below
      </Caption>
    </AbsoluteFill>
  );
};

// ---------- root ----------
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 40;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at ${80 + drift / 10}% -8%, #241449 0%, transparent 60%),
          radial-gradient(900px 700px at -8% 22%, #14233a 0%, transparent 55%),
          #0a0f18`,
      }}
    />
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [0, REEL_DURATION_IN_FRAMES], [0, 100]);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${PURPLE},${TEAL_LIGHT})` }} />
    </div>
  );
};

const Wordmark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 54,
      left: 60,
      fontFamily: OUTFIT,
      fontWeight: 800,
      fontSize: 38,
      letterSpacing: 2,
      color: "rgba(255,255,255,0.72)",
    }}
  >
    PULSE
  </div>
);

export const Reel189: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Background />
      <Series>
        <Series.Sequence durationInFrames={S1}><Scene1 /></Series.Sequence>
        <Series.Sequence durationInFrames={S2}><Scene2 /></Series.Sequence>
        <Series.Sequence durationInFrames={S3}><Scene3 /></Series.Sequence>
        <Series.Sequence durationInFrames={S4}><Scene4 /></Series.Sequence>
        <Series.Sequence durationInFrames={S5}><Scene5 /></Series.Sequence>
        <Series.Sequence durationInFrames={S6}><Scene6 /></Series.Sequence>
      </Series>
      <Wordmark />
      <ProgressBar />
    </AbsoluteFill>
  );
};
