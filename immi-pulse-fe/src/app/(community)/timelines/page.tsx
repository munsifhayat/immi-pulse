import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/community-feed";

export const metadata: Metadata = {
  title: "Real Australian visa timelines — lodged, medicals, s56, granted",
  description:
    "Anonymously shared Australian visa timelines: lodgement dates, medicals, s56 requests and grants, subclass by subclass.",
  alternates: { canonical: "/timelines" },
};

export default function TimelinesPage() {
  return <CommunityFeed type="timeline" />;
}
