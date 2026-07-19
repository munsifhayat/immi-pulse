import type { Metadata } from "next";
import { YouView } from "@/components/community/you-view";

// A member's own activity page. Never indexed — the whole point of a
// pseudonymous handle is that it does not accumulate a public dossier.
export const metadata: Metadata = {
  title: "You",
  robots: { index: false, follow: false },
  alternates: { canonical: "/you" },
};

export default function YouPage() {
  return <YouView />;
}
