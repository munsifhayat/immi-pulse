# IMMI-PULSE — Social Reels Playbook

> Ready-to-produce short-form video package for Instagram Reels · TikTok · YouTube Shorts.
> Goal: **traction** — pull the homeless r/AusVisa / Facebook / Telegram visa audience into Pulse, the
> "is my wait normal?" community. Grounded in the real product (see `context/community/`).

**Files in this package**
1. `README.md` (this) — strategy, brand kit, voice, cadence, hook bank, hashtag banks, KPIs, compliance.
2. [`reel-scripts.md`](./reel-scripts.md) — **12 fully shot-by-shot reel scripts**, ready to shoot or render.
3. [`flagship-storyboard.html`](./flagship-storyboard.html) — visual storyboard of the flagship reel (open in browser).

---

## 1. The one strategic idea

People waiting on an Australian visa are **anxious and refreshing**. They ask one question on a loop:
**"Is my wait normal?"** Reddit (r/AusVisa ≈85k, +58% YoY), Facebook subclass groups, and Telegram are
flooded with that question and starved of a trustworthy answer.

Every reel answers a slice of that question, then points to the place that answers it properly: **Pulse**.

> **The content wedge = the product wedge.** We don't "do marketing reels." We publicly answer the #1 job
> ("is my wait normal?") with real percentile data and real timelines, and the community is the punchline.

---

## 2. Audience & where they scroll

| Segment | Emotional state | Best platform | Hook style |
|---|---|---|---|
| **Skilled applicants** (189/190/491) | Anxious, points-obsessed, refreshing | TikTok + IG Reels | Data reveals, "is it normal?" |
| **Partner applicants** (820/801, 309/100) | Long silent wait, relationship stress | IG Reels + TikTok | Story / emotional timelines |
| **Students & graduates** (500/485) | Scam-exposed, deadline panic | TikTok + IG | Myth-bust, anti-scam |
| **Employer-sponsored** (482/186) | Process-confused | IG Reels + YT Shorts | Explainer / "ImmiAccount won't tell you" |
| **OMARA agents** (B2B) | Drowning in "how long?" DMs | LinkedIn + IG | Pain-relief, authority |

Primary geo for ads/boost: Australia + India, Nepal, Philippines, UK diaspora.

---

## 3. Content pillars (the rotation)

Post on a 4-pillar rotation so the feed never feels like an ad:

1. **📊 Data drops** — "Here's what the 189 is *actually* taking this month." (authority + shareable)
2. **🫶 Reassurance / reframe** — "You're not stuck, you're in the 50th percentile." (saves, comments)
3. **🧠 Myth-bust / education** — "3 lies about PR wait times." (shares, watch-time)
4. **🎉 Story / celebration** — grant-day timelines, partner-visa journeys. (emotional, UGC, follows)

Soft CTA pillar woven in ~1 of 4: **🛠 Utility** — "free tool that tells you if your wait is normal."

---

## 4. Brand kit (bake into every frame)

- **Colours:** Navy `#101928` (bg / text), Purple `#7A5AF8` (primary accent / highlights),
  Purple Deep `#3E1C96`, Purple Light `#BDB4FE`, Teal `#1B7B6F` (success / grant moments),
  Gray Light `#F0F2F5` (cards), White `#FFFFFF`.
- **Fonts:** **Outfit** for big on-screen headlines (the `font-heading`), **Inter** for body / captions.
- **Logo / handle lock-up:** bottom-centre or top-left, low opacity, never covering the subtitles.
- **Captions/subtitles:** ALWAYS burned-in (85% of feed watches muted). White text, navy or purple
  highlight box on the key word. Bottom third, above the platform UI safe-zone.
- **Aspect:** 1080×1920 (9:16). Keep all text inside the centre 1080×1350 safe area.
- **Motion:** quick, confident cuts; numbers count up; percentile bars fill; one idea per frame.
  Reference the existing app mockups in `context/community/pulse-app-mockups.html` for the real chart look.
- **Wordmark + tagline (covers):** `immi`**`-pulse`** (with the pulse glyph; `-pulse` in Purple Light) over the
  brand line **"Immigration intelligence, for everyone."** Cover headlines use **San Francisco** (SF Pro); reels
  use Outfit. The tagline is broad on purpose — it covers all four pillars (community · verified-agent
  marketplace · AI immigration intelligence · consultant SaaS), not just the wait-check wedge. Covers live in
  `covers/`; template in `reel-189-remotion/src/Cover.tsx`.

**Tone of voice:** calm, credible, on-your-side. Never hype, never "GET YOUR PR FAST!!!". We are the
sober, data-honest friend in a feed full of scammers and screenshot-braggers. Confidence comes from *data*,
warmth comes from *acknowledging the wait is hard*.

---

## 5. Hook bank (first 1.5 seconds — steal these)

The hook is 90% of the reel. On-screen text + spoken, both at once, frame 0.

**Curiosity / data**
- "This is how long the 189 is *actually* taking right now."
- "I pulled the real Australian visa wait times. They're not what they tell you."
- "The number Home Affairs publishes is the 75th percentile. Here's the *median*."

**Reassurance / pattern-interrupt**
- "Your visa isn't stuck. Watch this."
- "Stop refreshing ImmiAccount. I'll just tell you."
- "If your partner visa is past 12 months — you're still normal. Here's proof."

**Myth-bust / controversy**
- "Three lies you've been told about Australian PR wait times."
- "ImmiAccount's new tracker has a problem nobody's talking about."
- "Those 'granted in 3 months!' screenshots are lying to you. Here's why."

**Relatable / POV**
- "POV: you've refreshed ImmiAccount 47 times today and it still says 'Received'."
- "Nobody warns you about the *silent wait*."

**Anti-scam / trust**
- "Australians lost over A$5 million to visa scams last year. Most started in a Facebook group."

> Rule: never bury the hook. If the first frame is a logo or "Hi guys," you've already lost.

---

## 6. Hashtag banks (rotate 8–15, mix big + niche)

**Core / niche (high intent — always include 3–4):**
`#AusVisa` `#189visa` `#190visa` `#491visa` `#partnervisa820` `#subclass500` `#482visa`
`#skillselect` `#PRaustralia` `#immiaccount` `#visaprocessingtimes`

**Community / lifestyle (reach):**
`#movetoaustralia` `#migratetoaustralia` `#australianpr` `#immigrationaustralia`
`#newinaustralia` `#diaspora` `#indiansinaustralia` `#nepaleseinaustralia` `#filipinosinaustralia`

**Broad (discovery):**
`#australia` `#visa` `#immigration` `#expat` `#movingabroad`

TikTok: lean fewer (4–6), more niche. Instagram: 8–12. Keep `#AusVisa` + the specific subclass every time.

---

## 7. Posting cadence (first 8 weeks)

- **Frequency:** 4–5 reels/week. TikTok + IG Reels same asset; YT Shorts repurpose 2–3/week.
- **Rhythm:** Mon data-drop · Tue reassurance · Wed myth-bust · Thu story/celebration · Fri utility/CTA.
- **Best AEST windows:** 7–9am (commute refresh-check), 12–1pm, 7–9:30pm.
- **Always reply** to the first 30 comments in the first hour (algorithm + this is the community forming).
- **Pin a comment** with the CTA link on every post (avoids "link in bio" friction killing watch-time).
- **Series > one-offs:** "Wait-Time Wednesday" and "Grant-Day Friday" build a return habit.

---

## 8. KPIs & what "traction" means

| Metric | Why it matters here | 8-week target |
|---|---|---|
| **Saves + shares** | Proxy for "this answered my anxiety" — strongest signal | >5% of views |
| **Avg watch / completion** | Algorithm fuel; >50% completion = distribution | >55% on <20s reels |
| **Comments asking "what's my subclass?"** | Demand signal → community | qualitative, rising |
| **Profile → link taps** | Funnel into Pulse | >2% of reached |
| **Pulse new timelines created** | The real north star (data contributors) | attributed via UTM |

Tag every link `?utm_source=ig|tiktok|yt&utm_medium=reel&utm_campaign=waitnormal`.

---

## 9. ⚠️ Compliance — non-negotiable for THIS brand

IMMI-PULSE content must respect **Migration Act s276**: giving "immigration assistance" while unregistered is
an offence. The Act **exempts passing on official information without substantial comment.**

**In reels you MAY:** share DHA's published processing times, share aggregated/community timelines, share your
own journey, explain how a process step works in general, cite official sources.

**In reels you must NOT:** advise a specific person on *their* application ("you should appeal", "lodge a 190
instead"), promise outcomes or timeframes, or imply Home Affairs endorsement. Route any "what should I do?"
to **"talk to a verified OMARA-registered agent on Pulse."** That guardrail is also the funnel.

Always: cite the source on data frames ("Source: Dept. of Home Affairs, published monthly · illustrative").
Never present illustrative numbers as a guarantee.

---

## 10. How to actually produce these

Three production paths, fastest → highest-fidelity:

1. **Phone + CapCut (same day):** screen-record the real Pulse app (`pulse-app-mockups.html` charts), add
   burned-in captions, trending audio. Good enough to start — *shipping beats polish for traction.*
2. **Motion-designed (Remotion):** render data-drop reels programmatically from the brand kit. The
   `brand-sizzle-video` + `remotion-best-practices` skills in this workspace can scaffold a 9:16 composition;
   `elevenlabs-voiceover` adds the VO, `elevenlabs-music-bed` the bed.
3. **Hybrid:** Remotion for the data/percentile-bar frames + real screen-record of the app for the demo beat.

The 12 scripts in [`reel-scripts.md`](./reel-scripts.md) are written to work in any of the three.

---

*Researched against `context/community/` (mid-2026). Processing-time numbers in scripts are illustrative
placeholders — pull live figures from the DHA pipeline before publishing.*
