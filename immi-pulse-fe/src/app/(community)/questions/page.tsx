import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/community-feed";

export const metadata: Metadata = {
  title: "Australian visa questions, answered by people in the same queue",
  description:
    "Questions from people waiting on Australian visas — answered by applicants a few months further along. Experiences, not migration advice.",
  alternates: { canonical: "/questions" },
};

export default function QuestionsPage() {
  return <CommunityFeed type="question" />;
}
