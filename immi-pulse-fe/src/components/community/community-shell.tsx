"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountDialog } from "./account-dialog";
import { LeftRail, COMMUNITY_NAV, UnreadBadge, useUnreadCount } from "./left-rail";
import { RightRail } from "./right-rail";
import { ShareJourney } from "./share-journey";
import { CommunityProvider, useCommunity } from "./community-context";
import { TimelineGlyph } from "./timeline-glyph";
import { COMMUNITY_TAGLINE } from "./brand";

/**
 * Narrow-screen nav.
 *
 * The left rail's queue filter and identity block are desktop affordances; on a
 * phone what matters is getting between the six places, so this reduces to the
 * icon row and nothing else.
 */
function MobileBar() {
  const pathname = usePathname();
  const { account, openAccount } = useCommunity();
  const unread = useUnreadCount();

  return (
    <div className="sticky top-0 z-40 border-b border-hair bg-paper/90 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/" className="font-heading text-[16px] font-bold text-ink">
          IMMI360
          <sup className="c-mono relative -top-1.5 ml-0.5 text-[8px] tracking-[0.1em] text-purple">
            AU
          </sup>
        </Link>
        <span className="c-serif hidden text-[13px] text-ink-soft sm:inline">
          {COMMUNITY_TAGLINE}
        </span>
      </div>
      <nav className="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COMMUNITY_NAV.map(({ href, label, Icon, private: isPrivate }) => {
          const active = pathname === href;
          const gated = isPrivate && !account;
          const cls = `relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
            active ? "text-ink" : "text-ink-soft"
          }`;
          const inner = (
            <>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
              {href === "/inbox" && <UnreadBadge count={unread} />}
              {active && (
                <span className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-ink" />
              )}
            </>
          );
          return gated ? (
            <button key={href} onClick={() => openAccount("signup")} className={cls}>
              {inner}
            </button>
          ) : (
            <Link key={href} href={href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * The share builder, mounted once for the whole shell.
 *
 * Every "share your timeline" in the product opens *this* dialog. Before, the
 * left-rail button was a link to `/wait-check`, which meant pressing it while
 * already on `/wait-check` did nothing at all — and even elsewhere it took you
 * to a page that estimates a wait rather than the form that records one.
 */
function ShareHost() {
  const { shareOpen, shareSubclass, openShare, closeShare, identity, openAccount } =
    useCommunity();

  return (
    <ShareJourney
      open={shareOpen}
      onOpenChange={(o) =>
        o ? openShare({ subclass: shareSubclass }) : closeShare()
      }
      identity={identity}
      defaultSubclass={shareSubclass}
      onCapReached={() => {
        closeShare();
        openAccount("signup");
      }}
    />
  );
}

/**
 * The phone's way in.
 *
 * The left rail is the only place the share action lived, and the left rail is
 * hidden below `lg` — so on a phone there was no way to contribute a timeline
 * at all. This is that missing affordance.
 */
function MobileShareButton() {
  const { openShare } = useCommunity();
  return (
    <button
      onClick={() => openShare()}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-[14px] font-semibold text-paper shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_28%,transparent)] transition-transform active:scale-95 lg:hidden"
    >
      <TimelineGlyph className="h-[18px] w-[18px]" strokeWidth={2} />
      Share your timeline
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="c-paper min-h-screen text-ink">
      <MobileBar />
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 lg:grid-cols-[265px_minmax(0,1fr)] xl:grid-cols-[265px_minmax(0,660px)_340px]">
        {/* Left rail — static, never scrolls with the feed. */}
        <aside className="hidden px-5 pb-5 pt-5 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
          <LeftRail />
        </aside>

        {/* Centre — the only column that scrolls. */}
        <main className="min-h-screen min-w-0 border-hair bg-white/55 lg:border-x">
          {children}
        </main>

        {/* Right rail — static context, and the footer. */}
        <aside className="hidden px-4 pb-5 pt-4 xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
          <RightRail />
        </aside>
      </div>
      <MobileShareButton />
      <ShareHost />
      <AccountDialog />
    </div>
  );
}

export function CommunityShell({ children }: { children: React.ReactNode }) {
  return (
    <CommunityProvider>
      <Shell>{children}</Shell>
    </CommunityProvider>
  );
}

/** Sticky page header for a centre-column view. */
export function CommunityHeader({
  title,
  accent,
  right,
  children,
}: {
  title: string;
  accent?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-hair bg-paper/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-5 pb-2.5 pt-3.5">
        <h1 className="font-heading text-[20px] font-semibold tracking-[-0.3px] text-ink">
          {title}
          {accent && (
            <>
              {" "}
              <span className="c-serif text-[1.12em] text-purple-deep">
                {accent}
              </span>
            </>
          )}
        </h1>
        {right}
      </div>
      {children}
    </div>
  );
}
