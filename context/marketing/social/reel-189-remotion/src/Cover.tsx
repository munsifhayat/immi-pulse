import React from "react";
import { AbsoluteFill } from "remotion";

// ---- brand kit ----
const PURPLE = "#7A5AF8";
const PURPLE_LIGHT = "#BDB4FE";
const TEAL_LIGHT = "#2DD4BF";
const GRAY_LIGHT = "#F0F2F5";
const WHITE = "#FFFFFF";

// San Francisco (Apple system font). On macOS Chrome, BlinkMacSystemFont resolves to SF.
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

export type CoverProps = {
  kicker: string;
  title: string;
  highlight?: string;
  tagline: string;
  wordmark: string;
  url: string;
};

export const coverDefaults: CoverProps = {
  kicker: "AUS VISA · WAIT TIMES",
  title: "How long is the 189 actually taking?",
  highlight: "actually",
  tagline: "Immigration intelligence, for everyone.",
  wordmark: "immi-pulse",
  url: "", // empty → link line is hidden; just the wordmark + tagline
};

const renderTitle = (title: string, highlight?: string) => {
  if (!highlight || !title.includes(highlight)) return title;
  const [before, after] = title.split(highlight);
  return (
    <>
      {before}
      <span style={{ color: PURPLE_LIGHT, fontStyle: "italic" }}>{highlight}</span>
      {after}
    </>
  );
};

// small heartbeat / pulse glyph
const PulseGlyph: React.FC = () => (
  <svg width="56" height="40" viewBox="0 0 56 40" fill="none" style={{ marginRight: 4 }}>
    <path
      d="M2 20 H14 L20 6 L30 34 L37 20 H54"
      stroke={PURPLE}
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Cover: React.FC<CoverProps> = ({ kicker, title, highlight, tagline, wordmark, url }) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: SF,
        background: `radial-gradient(1100px 800px at 82% 8%, #2a1856 0%, transparent 58%),
          radial-gradient(1000px 800px at -6% 86%, #103a36 0%, transparent 52%),
          #0a0f18`,
      }}
    >
      {/* faint oversized brand motif */}
      <div
        style={{
          position: "absolute",
          right: -120,
          top: 360,
          width: 760,
          height: 760,
          borderRadius: "50%",
          border: "2px solid rgba(122,90,248,0.10)",
        }}
      />

      {/* content lives inside the central 1:1 / 3:4 grid-safe band */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 470,
          bottom: 360,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* kicker */}
        <div>
          <span
            style={{
              fontFamily: SF,
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: PURPLE_LIGHT,
              background: "rgba(122,90,248,0.14)",
              border: "1px solid rgba(122,90,248,0.35)",
              padding: "14px 26px",
              borderRadius: 999,
            }}
          >
            {kicker}
          </span>
        </div>

        {/* title + accent */}
        <div>
          <div
            style={{
              fontFamily: SF,
              fontWeight: 800,
              fontSize: 116,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: WHITE,
            }}
          >
            {renderTitle(title, highlight)}
          </div>
          {/* percentile-bar brand signature */}
          <div style={{ marginTop: 56, position: "relative", width: 320 }}>
            <div
              style={{
                height: 14,
                borderRadius: 7,
                background: `linear-gradient(90deg, ${PURPLE} 0%, ${TEAL_LIGHT} 100%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -7,
                left: "46%",
                width: 8,
                height: 28,
                background: WHITE,
                borderRadius: 4,
                boxShadow: `0 0 18px ${TEAL_LIGHT}`,
                transform: "translateX(-50%)",
              }}
            />
          </div>
        </div>

        {/* brand lockup */}
        <div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <PulseGlyph />
            <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 76, letterSpacing: -1, color: WHITE }}>
              immi<span style={{ color: PURPLE_LIGHT }}>-pulse</span>
            </span>
          </div>
          <div style={{ fontFamily: SF, fontWeight: 500, fontSize: 44, color: GRAY_LIGHT, marginTop: 16 }}>
            {tagline}
          </div>
          {url ? (
            <div
              style={{
                fontFamily: SF,
                fontWeight: 600,
                fontSize: 34,
                color: PURPLE_LIGHT,
                marginTop: 22,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                borderBottom: `2px solid rgba(189,180,254,0.5)`,
                paddingBottom: 4,
              }}
            >
              <span style={{ fontSize: 30 }}>↗</span> {url}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
