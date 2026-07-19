import type { Metadata } from "next";
import { Suspense } from "react";
import { RecoverView } from "@/components/community/recover-view";

/**
 * Password recovery.
 *
 * The URL is `/community/recover?token=…` because that is what the recovery
 * email has always linked to (`accounts.send_recovery_email`), including in
 * mail already sitting in people's inboxes. Moving the route would break every
 * link already sent, so the page comes to the URL rather than the other way
 * round. Note `/community` redirects to `/` on an **exact** match only, so this
 * child route is reachable.
 */
export const metadata: Metadata = {
  title: "Reset your password · immi360",
  // A recovery URL carries a single-use token. Nothing about this page should
  // ever be indexed, followed, or kept in a search cache.
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <div className="c-paper min-h-screen px-5 py-16">
      <div className="mx-auto w-full max-w-[440px]">
        <Suspense fallback={null}>
          <RecoverView />
        </Suspense>
      </div>
    </div>
  );
}
