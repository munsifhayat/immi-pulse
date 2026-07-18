import type { Metadata } from "next";
import { RoomFeed } from "@/components/room/room-feed";

export const metadata: Metadata = {
  title: "Real Australian visa timelines — lodged, medicals, s56, granted",
  description:
    "Anonymously shared Australian visa timelines: lodgement dates, medicals, s56 requests and grants, subclass by subclass.",
  alternates: { canonical: "/timelines" },
};

export default function TimelinesPage() {
  return <RoomFeed type="timeline" />;
}
