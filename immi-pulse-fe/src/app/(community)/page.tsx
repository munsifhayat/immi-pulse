import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/community-feed";

// The homepage is the community now. These are the phrases anxious applicants
// actually type, not the ones a SaaS landing page would rank for.
export const metadata: Metadata = {
  title: "Australian visa timelines & waits — the community",
  description:
    "Real Australian visa timelines, shared anonymously. See live processing times for subclass 189, 190, 482, 186, 500, 485 and partner visas, ask the people just ahead of you, and check whether your own wait is normal.",
  keywords: [
    "visa processing time Australia",
    "is my visa wait normal",
    "subclass 189 processing time",
    "subclass 190 grant timeline",
    "482 visa processing time",
    "820 partner visa waiting time",
    "500 student visa timeline",
    "Australian visa community",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Is my visa wait normal? Real Australian visa timelines",
    description:
      "See where your wait sits against real applicant timelines, and ask the people just ahead of you.",
  },
};

export default function HomePage() {
  return <CommunityFeed />;
}
