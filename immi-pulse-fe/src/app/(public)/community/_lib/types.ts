import type { LucideIcon } from "lucide-react";

export type UserBadgeType = "omara-agent" | "visa-holder" | "applicant";

export interface CommunityUser {
  id: string;
  name: string;
  initials: string;
  badge: UserBadgeType;
}

export interface CommunitySpace {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  memberCount: number;
  threadCount: number;
  latestActivity: string;
}

export interface ThreadPreview {
  id: string;
  title: string;
  excerpt: string;
  author: CommunityUser;
  createdAt: string;
  replyCount: number;
  upvotes: number;
  views: number;
  hasBestAnswer: boolean;
  tags: string[];
  isPinned?: boolean;
}

export interface TrendingTopic {
  label: string;
  postCount: number;
  trend: "up" | "stable";
}

export interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  totalThreads: number;
  answeredPercentage: number;
  verifiedAgents: number;
}
