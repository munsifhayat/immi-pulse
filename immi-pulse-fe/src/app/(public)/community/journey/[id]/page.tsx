import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import type { JourneyDetailOut } from "@/lib/api/hooks/community";
import { API_URL, SITE_URL } from "@/lib/site";
import { formatDays, shortDate } from "@/lib/room/format";
import { milestoneMeta, dayGap, gapLabel } from "@/components/room/milestone-meta";

// Cache each timeline page for 5 minutes; new milestones/comments refresh on
// the next request. Individual timelines change rarely, so this keeps the pages
// fast and crawlable without going fully static.
async function getJourney(id: string): Promise<JourneyDetailOut | null> {
  try {
    const res = await fetch(`${API_URL}/community/public/journeys/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as JourneyDetailOut;
  } catch {
    return null;
  }
}

function headline(j: JourneyDetailOut): string {
  const code = j.subclass_code ? `Subclass ${j.subclass_code}` : "Visa";
  if (j.post_type === "question") return j.title || "Visa question";
  if (j.outcome === "granted") {
    return j.processing_days != null
      ? `${code} granted in ${formatDays(j.processing_days)}`
      : `${code} granted`;
  }
  return j.elapsed_days != null
    ? `${code} timeline: ${j.elapsed_days} days waiting`
    : `${code} timeline`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const j = await getJourney(id);
  if (!j) return { title: "Timeline not found" };

  const title = headline(j);
  const summary =
    j.note?.trim() ||
    (j.post_type === "timeline"
      ? `A real, anonymously shared ${
          j.subclass_name ?? "Australian visa"
        } timeline. See how it compares with your own wait.`
      : "A question from the Australian visa community.");
  const url = `${SITE_URL}/community/journey/${j.id}`;

  return {
    title,
    description: summary.slice(0, 200),
    alternates: { canonical: `/community/journey/${j.id}` },
    openGraph: {
      type: "article",
      url,
      title,
      description: summary.slice(0, 200),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary.slice(0, 200),
    },
  };
}

function WaitBadge({ j }: { j: JourneyDetailOut }) {
  if (j.post_type !== "timeline") return null;
  let label: string;
  let cls: string;
  if (j.outcome === "granted") {
    label =
      j.processing_days != null
        ? `Granted in ${formatDays(j.processing_days)}`
        : "Granted";
    cls = "bg-teal/10 text-teal";
  } else if (j.outcome === "refused") {
    label = "Decided";
    cls = "bg-[#D6465B]/10 text-[#C23A50]";
  } else {
    label =
      j.elapsed_days != null ? `${j.elapsed_days} days waiting` : "In progress";
    cls = "bg-[#C77D18]/10 text-[#B4700F]";
  }
  return (
    <span
      className={`c-mono inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const j = await getJourney(id);
  if (!j) notFound();

  const isTimeline = j.post_type === "timeline";
  const chips = [
    j.subclass_code && `Subclass ${j.subclass_code}`,
    j.stream,
    j.occupation,
    [j.state, j.area].filter(Boolean).join(" · ") || null,
    j.sponsor_type,
  ].filter(Boolean) as string[];

  // JSON-LD so search engines can render a rich result for the shared timeline.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: headline(j),
    datePublished: j.created_at,
    author: { "@type": "Person", name: j.handle },
    articleBody: j.note ?? undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: j.upvotes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: j.comment_count,
      },
    ],
    url: `${SITE_URL}/community/journey/${j.id}`,
  };

  return (
    <div className="c-paper min-h-screen text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-[720px] px-6 py-10 lg:py-16">
        <Link
          href="/"
          className="c-mono inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-purple"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} /> The room
        </Link>

        {/* header */}
        <div className="mt-7 flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[17px] font-semibold text-white"
            style={{ backgroundColor: j.color }}
          >
            {j.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="c-eyebrow mb-2">
              {isTimeline ? "Shared timeline" : "Community question"}
            </div>
            <h1 className="font-heading text-[clamp(1.5rem,3.6vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.6px] text-ink">
              {headline(j)}
            </h1>
            <p className="c-mono mt-2 text-[12px] text-ink-soft">
              by {j.handle} · {shortDate(j.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <WaitBadge j={j} />
          {chips.map((c, i) => (
            <span
              key={i}
              className={`c-mono rounded-md px-2.5 py-1 text-[11px] ${
                i === 0
                  ? "bg-purple/10 text-purple-deep"
                  : "border border-hair text-ink-soft"
              }`}
            >
              {c}
            </span>
          ))}
        </div>

        {j.note && (
          <p className="mt-7 border-l-2 border-purple-muted pl-4 text-[16.5px] leading-relaxed text-ink">
            {isTimeline ? `“${j.note}”` : j.note}
          </p>
        )}

        {/* timeline */}
        {isTimeline && j.milestones.length > 0 && (
          <div className="mt-9">
            <div className="c-eyebrow mb-5">The timeline</div>
            <ol className="relative ml-1">
              {j.milestones.map((m, i) => {
                const meta = milestoneMeta(m.milestone_type);
                const prev = i > 0 ? j.milestones[i - 1] : null;
                const gap = prev ? dayGap(prev.occurred_on, m.occurred_on) : 0;
                const Icon = meta.Icon;
                return (
                  <li key={m.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      {i < j.milestones.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-hair" />
                      )}
                    </div>
                    <div className="min-w-0 pb-1 pt-1">
                      <p className="text-[14.5px] font-semibold text-ink">
                        {m.label || m.milestone_type}
                      </p>
                      <p className="c-mono mt-0.5 text-[11.5px] text-ink-soft">
                        {shortDate(m.occurred_on)}
                        {prev && (
                          <span className="text-ink-soft/70">
                            {"  ·  "}
                            {gapLabel(gap)} later
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* engagement summary (crawlable social proof) */}
        <div className="c-mono mt-9 flex items-center gap-5 border-y border-hair py-3.5 text-[12.5px] font-semibold text-ink-soft">
          <span>{j.upvotes} found this helpful</span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
            {j.comment_count} in the conversation
          </span>
        </div>

        {/* comments, server-rendered read-only for indexability */}
        {j.messages.length > 0 && (
          <div className="mt-6 space-y-3">
            {j.messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl border border-hair bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ backgroundColor: msg.color }}
                  >
                    {msg.initials}
                  </span>
                  <span className="text-[13px] font-semibold text-ink">
                    {msg.handle}
                  </span>
                  {msg.is_op && (
                    <span className="c-mono rounded bg-purple/10 px-1.5 text-[9px] uppercase text-purple-deep">
                      OP
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
                  {msg.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-hair bg-white p-7 text-center">
          <div className="c-eyebrow mb-2.5 justify-center">Your turn</div>
          <p className="font-heading text-[20px] font-semibold tracking-[-0.3px] text-ink">
            Wondering if your wait is{" "}
            <span className="c-serif text-[1.1em] text-purple-deep">normal</span>?
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-soft">
            Compare your own timeline against real applicants on the same
            subclass. No sign-in to check, or to share your first timeline.
          </p>
          <Link
            href="/wait-check"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90"
          >
            Check your wait <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        <p className="mt-6 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={1.75} />
          This is a personal timeline shared by a community member, not
          immigration advice. Processing outcomes vary by case. For advice on
          your application, speak to a registered migration agent.
        </p>
      </div>
    </div>
  );
}
