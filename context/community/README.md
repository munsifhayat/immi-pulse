# Pulse — The Community Layer for IMMI-PULSE

> Research-backed product plan for the anonymous visa-timeline **community** that turns scattered
> Reddit / Facebook / Telegram / 186-tracker activity into one default platform — and the front door
> to the agent directory + consultant SaaS.

**Deliverables (open in a browser):**
1. [`immi-pulse-community-plan.html`](./immi-pulse-community-plan.html) — the visually rich **strategy plan** (problem → wedge → vision → product → roadmap → business).
2. [`pulse-app-mockups.html`](./pulse-app-mockups.html) — a **clickable high-fidelity app prototype** of the actual module. Working app shell (top bar + sidebar + view-switching nav), live charts, and modals. Click the left nav, posts, and "Add milestone" to explore. Screens: Home feed · My Journey (Pulse Timeline) · My Club (Lodgement cohort) · Grant Wall · Processing Stats (percentile bands + DHA-vs-community + cohort distribution + SkillSelect rounds) · Find an Agent · Thread detail (with s276 advice banner) · Spaces · Mobile (PWA phone frames) + Add-milestone / Onboarding / Book-consult modals.

This README preserves the research, citations, and decisions behind both.

Researched mid-2026. Audience: founder / product.

---

## 1. The one-line thesis

Be the **verified, structured, AI-powered "is my wait normal?" community** — combining Reddit's anonymity,
a tracker's structure, the diaspora groups' scale, and an **OMARA-trust layer none of them has** — across
every visa subclass the trackers ignore, on mobile, in real time.

There is **no "Lawfully for Australia."** That is the wedge.

---

## 2. Key research findings

### Market landscape (saturated with noise, starved of structure)
- **r/AusVisa ≈ 85,000 members, +58% YoY** (≈5× in two years). Demand is compounding and homeless.
- **Facebook is fragmented & unverified:** nationality groups are huge (Indians in Sydney ≈135k), subclass
  groups have 4–6 near-duplicates each; **>A$5M** lost by international students to FB scams in early 2025.
- **Telegram = worst scam vector;** WhatsApp's **1,024-member cap** forces "Group 2/3" splits; **Discord is empty**
  (first-mover gap, but cold-start risk).
- **The old guard is dying:** **PomsInOz (≈47k members) collapsed in 2024** — single-owner, no succession, content
  lost, domain now redirects to a NYC restaurant. Forum signature-timelines stall at 2022–23.
- **Structural trend:** structured trackers survive; free-text discussion dies (MyImmiTracker's chat dormant
  since 2020 while its tracker stays fresh).

### Top jobs-to-be-done
1. **"Is my wait normal?"** (the #1 job) → benchmark my timeline. 2. Reduce anxiety during the silent wait.
3. Celebrate the milestone ("got my grant!"). 4. Understand a status (CO/s56/medicals). 5. Odds (points/rounds).
6. Find a trustworthy agent. 7. Settlement logistics. 8. Find my cohort.

### Competitor teardown (patterns to steal / beat)
- **MyImmiTracker / ImmiTracker** — crowdsourced, **mean-only stats** (weak on right-skewed data), dated UI,
  Canada-first, thin AU coverage (no 482/500/485/186 trackers; partner lumped). `immitracker.com` is dead/parked —
  live product is **myimmitracker.com**.
- **Trackitt** — tracker + forum + **signatures** + processing intelligence; US/India-centric, ad-laden, dated.
- **VisaJourney (US) — UX gold standard:** one lifelong timeline; **case signatures on every post**; cohort
  comparison ("filter to people like me"); **"applications lodged on [date] are being granted now + trend arrow"**
  estimator; month-filer megathreads; email alerts; reviews tied to real timelines.
- **Lawfully (US) — the modern bar & monetization template:** mobile-first, AI grant-date/RFE prediction, cohort
  ranking, **real-time push** (the killer feature), + **B2B data SaaS ($250/mo)** off the same dataset.
- **Visafold (visafold.com.au)** — closest AU analogue (~150 users); document vault + percentile-vs-official +
  PR-pathway + "agent portal coming soon." Validates the thesis, leaves the field open.

### Official data (the pipeline)
- DHA publishes **75th + 90th percentile** processing times per subclass, **updated monthly** (25/50/75/90 internally).
- **No API** — scrape-only, but **robots-permitted and CC BY 4.0 licensed** (attribute, throttle, don't imply
  endorsement). Same for **SkillSelect invitation rounds** and the **CSOL** occupation-list PDF.
- **ImmiAccount native tracker (launched 18 Mar 2026)** gives a live queue position + target decision date for
  **482/500/ENS only** — **no peer comparison, no community, excludes skilled 189/190/491 + partner.** It
  commoditizes single-application queue position → we differentiate on cross-application, multi-subclass,
  prediction, cohorts, trust and consultant tooling.

### Community design patterns (from Blind, Levels.fyi, BabyCenter, Strava, Duolingo, Discourse, IVF communities)
- **Cohorts beat everything:** BabyCenter "Birth Clubs" (auto-group by due-date month) score peer support
  **as high as family & friends.** → **Lodgement Clubs** = subclass + lodgement month.
- **Reassurance, not ranking:** publish **percentile bands (25/50/75/90)**, frame position as *normalcy*.
  **Hard veto on any "fastest grant" leaderboard** — actively harmful to an anxious audience. Only safe
  leaderboard is "Top Helpers."
- **Anonymity must be real at the infra level** (Blind decouples email; Blind's 2018 leak shows weak promises fail).
  Our users are *more* vulnerable than tech workers.
- **Open read (Levels.fyi), soft give-to-get** only for the personalized layer. Never the Glassdoor hard wall.
- **Streak the controllable community behaviour**, weekly cadence, warm streak-freeze (Duolingo mercy, none of the guilt).
- **Survivorship bias is the incumbents' fatal flaw** — show pending denominators, decay stale data, reject outliers.

### Legal backbone (moderation = the Migration Act)
- **Migration Act s276:** giving "immigration assistance" while unregistered is an offence — **but expressly exempts
  passing on official information without substantial comment.** That line *is* the moderation policy: share your own
  timeline + DHA info ✓; advise on someone's application ✗. Enforced by an AI advice-classifier (Claude Haiku).
- **Verified OMARA-agent badge** (checked against the public register) is the only tier allowed to give case advice —
  turning the biggest scam risk (ghost consultants) into a trust signal **and** the monetization funnel.

---

## 3. What already exists in the codebase (head start)

A working community **skeleton** already ships:
- **Backend** (`immi-pulse-be/.../agents/immigration/community/`): `community_spaces`, `community_threads`,
  `community_comments`, `community_reports`; public + admin routers; **7 seeded spaces** (skilled, partner, student,
  employer, graduate, visitor, working-holiday); anonymous threads (IP-hash), upvotes, nested comments, reporting,
  admin moderation.
- **Frontend** (`immi-pulse-fe/src/app/(public)/community/*`): hub, space detail, new-thread, thread detail; hooks in
  `src/lib/api/hooks/community.ts`. Agent directory at `/find-consultants`.
- **Reusable stack:** Next.js 16 + React Query + Recharts; FastAPI + async SQLAlchemy + Alembic + APScheduler + an
  AWS Bedrock (Claude) gateway. Brand tokens: Navy `#0F1117`, Purple `#7C5CFC`, Teal `#1B7B6F`; Outfit + Inter; shadcn/ui.

**Missing (the build):** persistent anonymous identity, visa-subclass reference data, the timeline/milestone model,
processing-time aggregates, cohorts, trust tiers, badges, notifications, full-text search, verified-agent badges,
community→case funnel, AI moderation.

---

## 4. The product (10 surfaces)

1. **Community Home** — living feed (Grant Wall + cohort + trending), open read, one-tap anonymous handle, signature cards.
2. **Pulse Timeline** — one lifelong timeline; generic spine (`lodge → biometrics → health → police → CO → s56 → grant`)
   + per-visa branches; auto-computed durations; screenshot→milestone AI extraction.
3. **Lodgement Clubs** — auto-cohorts by subclass + lodge-month (BabyCenter model); communal milestones; cohort push.
4. **The "Your Wait" Engine** — percentile position framed as normalcy; auto-reassurance at the cohort median; honest
   bands; official+community fused; survivorship-bias fixed.
5. **PulseStats** — public, SEO-rich aggregate pages per subclass (percentile bands, round cut-offs, ceilings).
6. **Grant Wall** — celebration feed; granted users routed to Alumni; muteable.
7. **Verified Agent Directory** — OMARA badges, ranked agent answers, AMAs, reviews tied to real outcomes → SaaS funnel.
8. **Gamification** — journey + contribution badges ("Granted & Still Helping"), warm weekly streak, no speed leaderboard.
9. **Identity & Trust ladder** — T0 Ghost → T1 Named (decoupled email) → T2 Verified case → T3 Trusted member → T4 OMARA Agent.
10. **Moderation** — s276 AI classifier, distributed multi-flag auto-hide, anti-scam controls, trauma-informed spaces.

---

## 5. The data backbone

- **Spine + branches.** One milestone event model; per-visa flags toggle milestones (skilled = rich pre-lodge
  EOI/ITA/state-nom; **482 = 3-object sponsor/nomination/visa bundle, 3 streams**; 186 DE vs TRT; 500 = CoE/GS/OSHC/provider-tier;
  partner & 491 = multi-year two-stage continuations; 188 closed-intake / 858 NIV invite-only).
- **Cohort key:** `subclass × stream × ANZSCO × state × lodgement-month`.
- **Date-versioned occupation→list→visa mapping** (CSOL replaced MLTSSL/STSOL on 7 Dec 2024) so stats never lie.
- **New tables:** `visa_subclasses`, `milestone_types`, `user_timelines`, `timeline_milestones`, `cohorts`,
  `processing_snapshots`, `anon_identities`, `trust_grants`, `badges`.

---

## 6. Roadmap

| Phase | Theme | Rough effort | Ships |
|------|-------|------|-------|
| **1** | The Tracker | 3–4 wks | Persistent anon identity, visa reference data, milestone spine, **Pulse Timeline**, feed glow-up |
| **2** | Is My Wait Normal? | 3–4 wks | Cohort engine + **Lodgement Clubs**, **PulseStats** + DHA pipeline, "Your Wait" engine, Grant Wall, notifications |
| **3** | Trust & Agents | 3–4 wks | Full trust ladder, s276 AI classifier + anti-scam, verified-agent directory integration → SaaS funnel |
| **4** | Scale & Delight | ongoing | PWA + push, semantic search, badges/streaks, B2B data product, multi-language (Hindi/Nepali/Tagalog/Punjabi) |

---

## 7. Business model

- **Free community forever** — acquisition + SEO + data network effect; open read; soft give-to-get only on the personalized layer.
- **Consumer Pulse+ (~A$5–9/mo)** — predictions w/ confidence intervals, document vault + expiry alerts, premium stats.
- **Agent / B2B** — verified-agent subscriptions, community lead-gen into the existing SaaS, aggregated AU case-data product.
  (Lawfully's dual model, AU-first.) The moat is the dataset, not the model.

**North star:** weekly active timeline-trackers (data contributors). **Funnel:** community → "talk to a verified agent"
→ SaaS portal account.

---

## 8. Sources

### Community landscape
- r/AusVisa stats: redditli.st/subreddit/AusVisa · gummysearch.com/r/AusVisa · reddapi.dev/subreddits/ausvisa/insights
- Facebook scams / OMARA: overseasstudentsaustralia.com/international-students-scams-australia · abf.gov.au crackdown newsroom · immi.homeaffairs.gov.au/help-support/visa-scams
- Diaspora groups: indianlink.com.au (Indians in Sydney) · remit.com.au (Filipino-Australian groups)
- PomsInOz closure: pomsinoz.com/announcement/6-forum-closure · findaforum.net/Forums/pomsinoz-com
- Whirlpool: en.wikipedia.org/wiki/Whirlpool_(website)

### Trackers & official data
- MyImmiTracker: myimmitracker.com · myimmitracker.com/en/au/trackers
- Trackitt: trackitt.com · db.trackitt.com/greencard-dashboard/features
- VisaJourney: visajourney.com/timeline · visajourney.com/times
- Lawfully: lawfully.com/case-tracker · lawfully.com/intelligence
- Visafold: visafold.com.au · 186 app: apps.apple.com/us/app/186-visa-tracker-australia/id6757000631
- DHA: immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times ·
  .../skillselect/invitation-rounds · immi.homeaffairs.gov.au/Documents/core-sol.pdf ·
  homeaffairs.gov.au copyright (CC BY) · data.gov.au org `immi`
- ImmiAccount tracker (Mar 2026): visahq.com/news/2026-03-18/au/immiaccount-rolls-out-real-time-queue-tracker...

### Visa milestones & community design
- Subclasses: immi.homeaffairs.gov.au listings for 482 (Skills in Demand), 186, 189/190/491, 500, 485, partner 820/801 & 309/100, 188/858
- s276 (Migration Act): austlii.edu.au/au/legis/cth/consol_act/ma1958118/s276.html
- Anonymity/trust: en.wikipedia.org/wiki/Blind_(app) · help.teamblind.com · levels.fyi/verified · glassdoor trust pages
- Cohorts/gamification: en.wikipedia.org/wiki/BabyCenter · trophy.so/blog/strava-gamification-case-study ·
  blog.discourse.org/2018/06/understanding-discourse-trust-levels · apptitude.io/blog/how-duolingos-streak-mechanic-actually-works

> Caveats: Facebook subclass-group sizes are estimates (platform blocks crawlers); MyImmiTracker's "200k users" is a
> self-reported marketing claim; processing-time bands in the HTML are illustrative pending the live DHA pipeline.
