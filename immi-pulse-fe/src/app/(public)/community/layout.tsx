import type { Metadata } from "next";

// The feed page itself is a client component, so its metadata lives here on the
// server. These are the long-tail phrases anxious applicants actually Google.
export const metadata: Metadata = {
  title: "Is my visa wait normal? Australian visa timelines & processing times",
  description:
    "Compare your Australian visa wait against real applicant timelines. See live processing times for subclass 189, 190, 482, 186, 820 and partner visas, and share your own journey anonymously.",
  keywords: [
    "visa processing time Australia",
    "is my visa wait normal",
    "subclass 189 processing time",
    "subclass 190 grant timeline",
    "482 visa processing time 2026",
    "186 ENS timeline",
    "820 partner visa waiting time",
    "Australian visa timeline community",
  ],
  alternates: { canonical: "/community" },
  openGraph: {
    type: "website",
    url: "/community",
    title: "Is my visa wait normal? Real Australian visa timelines",
    description:
      "See where your wait sits against real applicant timelines for Australian visas, and share your own anonymously.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Is my visa wait normal? Real Australian visa timelines",
    description:
      "See where your wait sits against real applicant timelines for Australian visas.",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
