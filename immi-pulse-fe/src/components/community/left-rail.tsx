"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleUser,
  GaugeCircle,
  Home,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useFeedSummary, useInbox, useCommunityLogout } from "@/lib/api/hooks/community";
import { useCommunity } from "./community-context";
import { CommunityTimelinesGlyph, TimelineGlyph } from "./timeline-glyph";
import { COMMUNITY_TAGLINE } from "./brand";

/**
 * Nav icons come from two places — lucide for the generic ones, our own glyphs
 * for the two that are about timelines — so the slot is typed by the props both
 * honour rather than by either library.
 */
export type NavIcon = React.ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

export interface CommunityNavItem {
  href: string;
  label: string;
  Icon: NavIcon;
  /** Signed-in only — a visitor has no inbox and no profile. */
  private?: boolean;
}

export const COMMUNITY_NAV: CommunityNavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/questions", label: "Questions", Icon: HelpCircle },
  { href: "/timelines", label: "Timelines", Icon: CommunityTimelinesGlyph },
  { href: "/wait-check", label: "Wait Check", Icon: GaugeCircle },
  { href: "/inbox", label: "Inbox", Icon: Bell, private: true },
  { href: "/you", label: "You", Icon: CircleUser, private: true },
];

/** The visa queues people actually filter by, in the order they ask about them. */
export const COMMUNITY_QUEUES: { id: string; code: string; label: string }[] = [
  { id: "all", code: "", label: "All queues" },
  { id: "student-visas", code: "500", label: "Student" },
  { id: "employer-sponsored", code: "482/186", label: "Employer sponsored" },
  { id: "skilled-migration", code: "189/190", label: "Skilled" },
  { id: "partner-visas", code: "820/309", label: "Partner" },
  { id: "graduate-post-study", code: "485", label: "Graduate" },
];

/** The unread badge — the reason anyone comes back to a community they posted in. */
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="c-mono grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-purple px-1.5 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function useUnreadCount(): number {
  const { account } = useCommunity();
  const { data } = useInbox(!!account);
  return data?.unread_count ?? 0;
}

export function LeftRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { account, identity, queue, setQueue, openAccount, openShare } =
    useCommunity();
  const { data: summary } = useFeedSummary();
  const unread = useUnreadCount();
  const logout = useCommunityLogout();

  const feedRoutes = ["/", "/questions", "/timelines"];

  function pickQueue(id: string) {
    setQueue(id);
    // A queue is a filter on the feed, so choosing one from the inbox or the
    // wait-check page means "take me to the feed showing that".
    if (!feedRoutes.includes(pathname)) router.push("/");
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex flex-col gap-0.5 px-3 pb-6 pt-1">
        <span className="font-heading text-[18px] font-bold tracking-[-0.02em] text-ink">
          IMMI360
          <sup className="c-mono relative -top-1.5 ml-0.5 text-[8.5px] tracking-[0.1em] text-purple">
            AU
          </sup>
        </span>
        <span className="c-serif text-balance text-[14.5px] leading-snug text-ink-soft">
          {COMMUNITY_TAGLINE}
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {COMMUNITY_NAV.map(({ href, label, Icon, private: isPrivate }) => {
          const active = pathname === href;
          // A visitor still sees Inbox and You — hiding them hides the reason
          // to sign up. Clicking one opens the prompt instead of 404ing.
          const gated = isPrivate && !account;
          const cls = `flex items-center gap-3.5 rounded-full px-3 py-2.5 text-[15px] transition-colors ${
            active
              ? "font-bold text-ink"
              : "font-medium text-ink-soft hover:bg-paper-deep hover:text-ink"
          }`;
          const inner = (
            <>
              <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={active ? 2 : 1.75} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {href === "/inbox" && <UnreadBadge count={unread} />}
            </>
          );
          return gated ? (
            <button
              key={href}
              onClick={() => openAccount("signup")}
              className={`${cls} text-left`}
            >
              {inner}
            </button>
          ) : (
            <Link key={href} href={href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 px-3">
        <span className="c-eyebrow mb-3 block">Filter by queue</span>
        <ul>
          {COMMUNITY_QUEUES.map((q) => {
            const active = queue === q.id;
            // A loaded summary that simply has no posts in this queue means
            // zero, not unknown — "—" is reserved for "we haven't looked yet".
            const count = !summary
              ? undefined
              : q.id === "all"
                ? summary.all
                : (summary.by_category[q.id] ?? 0);
            return (
              <li key={q.id}>
                <button
                  onClick={() => pickQueue(q.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-dashed border-hair/70 py-[7px] text-left text-[13px] transition-colors ${
                    active
                      ? "font-semibold text-ink"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {q.code && (
                      <span
                        className={`c-mono mr-1.5 text-[11px] ${
                          active ? "text-purple-deep" : ""
                        }`}
                      >
                        {q.code}
                      </span>
                    )}
                    {q.label}
                  </span>
                  <span className="c-mono shrink-0 text-[10.5px] text-ink-soft/80">
                    {count ?? "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        Opens the builder in place. It used to link to `/wait-check`, so on
        that page — the one the button is most visible from — clicking it did
        nothing whatsoever.
      */}
      <button
        onClick={() => openShare()}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-5 py-3 text-[14px] font-semibold text-paper transition-colors hover:bg-transparent hover:text-ink"
      >
        <TimelineGlyph className="h-[17px] w-[17px]" strokeWidth={2} />
        Share your timeline
      </button>

      {/* Identity block — who you are posting as, and the way out. */}
      <div className="mt-auto pt-5">
        {account ? (
          <div className="flex items-center gap-3 rounded-2xl px-2.5 py-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
              style={{ backgroundColor: account.color }}
            >
              {account.handle.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink">
                {account.handle}
              </div>
              <div className="c-mono text-[9.5px] uppercase tracking-[0.05em] text-ink-soft">
                {account.can_recover ? "Anonymous · recoverable" : "Anonymous"}
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 text-ink-soft transition-colors hover:text-ink"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAccount("signup")}
            className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-paper-deep"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
              style={{ backgroundColor: identity?.color ?? "#7C5CFC" }}
            >
              {identity?.initials ?? "··"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-ink">
                {identity?.handle ?? "Reading anonymously"}
              </div>
              <div className="c-mono text-[9.5px] uppercase tracking-[0.05em] text-ink-soft">
                Claim this handle →
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
