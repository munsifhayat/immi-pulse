import type { Metadata } from "next";
import { WaitCheckView } from "@/components/room/wait-check-view";

// Its own route with a shareable URL — this is the page people send each other
// and the one search engines have the most reason to index.
export const metadata: Metadata = {
  title: "Is my visa wait normal? Check your Australian visa wait",
  description:
    "Enter your visa subclass and lodgement date to see where your wait sits against real shared timelines and the Department of Home Affairs' published processing times. Free, no account needed.",
  keywords: [
    "is my visa wait normal",
    "visa wait check Australia",
    "how long is my visa taking",
    "Australian visa processing time calculator",
  ],
  alternates: { canonical: "/wait-check" },
  openGraph: {
    type: "website",
    url: "/wait-check",
    title: "Is my visa wait normal?",
    description:
      "See where your Australian visa wait sits against real applicant timelines. Free, no account needed.",
  },
};

export default function WaitCheckPage() {
  return <WaitCheckView />;
}
