import type { Metadata } from "next";
import { InboxView } from "@/components/community/inbox-view";

// Someone's replies are not a search result.
export const metadata: Metadata = {
  title: "Your inbox",
  robots: { index: false, follow: false },
  alternates: { canonical: "/inbox" },
};

export default function InboxPage() {
  return <InboxView />;
}
