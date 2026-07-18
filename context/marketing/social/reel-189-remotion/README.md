# Reel 01 — "How long is the 189 actually taking?" (Remotion source)

Renders the flagship data-drop reel to a 1080×1920 MP4. Brand-accurate (navy/purple/teal, Outfit + Inter),
six animated scenes matching [`../flagship-storyboard.html`](../flagship-storyboard.html) and Reel 01 in
[`../reel-scripts.md`](../reel-scripts.md).

The rendered output ships at [`../reel-189-how-long-is-the-189.mp4`](../reel-189-how-long-is-the-189.mp4)
(~22s, 30fps, ~2.2 MB).

## Render / edit

```bash
bun install                          # first time (uses bun, per repo convention)
bun run render                       # → out/reel-189-how-long-is-the-189.mp4
bunx remotion studio src/index.ts    # live preview / tweak in the browser
```

## Structure

- `src/Reel189.tsx` — the whole composition: 6 scenes (`Scene1`…`Scene6`), brand tokens, captions, percentile
  bars. All motion is `useCurrentFrame()`-driven (no CSS animations — Remotion requirement).
- `src/Cover.tsx` — the **consistent reel-cover/thumbnail template** (SF font, `immi-pulse` link wordmark,
  tagline, percentile-bar signature). Parameterized: `kicker`, `title`, `highlight`, `tagline`, `wordmark`, `url`.
- `src/Root.tsx` — registers `Reel189` (1080×1920, 30fps, 660 frames) and `Cover` (1080×1920 still).
- Scene durations are the `S1…S6` constants in `Reel189.tsx`; change them to retime beats.

## Covers (consistent thumbnails)

Rendered covers ship in [`../covers/`](../covers/). One props file per reel lives in `props/`.

```bash
# render one cover from a props file
bunx remotion still src/index.ts Cover out/cover-07.png --frame=0 --props=props/07.json
# tweak the flagship via defaults
bunx remotion still src/index.ts Cover out/cover-01.png --frame=0
```

Each `props/NN.json` sets `kicker` + `title` (+ optional `highlight` word). `tagline`, `wordmark`, and `url` are
kept identical across all covers for series consistency — change them in every props file (or in
`coverDefaults`) if the brand line or domain changes.

Font is **San Francisco** via the system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display"`) — renders
SF on macOS. On a non-macOS render box, install SF Pro or swap the `SF` constant in `Cover.tsx`.

## Before publishing

- The numbers are **illustrative** (median ≈ 7 months, 75th percentile). Swap in live DHA + Pulse figures —
  edit the `months` interpolation and the band targets in `Scene3`/`Scene4`.
- No audio is baked in (no ElevenLabs key was available at render). Add a **trending sound in-app**
  (TikTok/IG) for the algorithm boost, or wire VO/music via the `elevenlabs-voiceover` /
  `elevenlabs-music-bed` skills and re-render.
- Keep the s276 guardrail: this shares official/aggregated data only — not advice on a specific case.
