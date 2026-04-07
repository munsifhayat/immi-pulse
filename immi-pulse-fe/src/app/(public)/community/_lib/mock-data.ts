import {
  Briefcase,
  Heart,
  GraduationCap,
  Building2,
  Users,
  MessageCircle,
} from "lucide-react";
import type {
  CommunitySpace,
  ThreadPreview,
  TrendingTopic,
  CommunityStats,
} from "./types";

export const communityStats: CommunityStats = {
  totalMembers: 24680,
  activeToday: 1240,
  totalThreads: 14570,
  answeredPercentage: 89,
  verifiedAgents: 342,
};

export const spaces: CommunitySpace[] = [
  {
    id: "skilled",
    name: "Skilled Migration",
    description:
      "Discuss 189, 190, and 491 visa pathways, points tests, EOI strategies, and state nominations.",
    icon: Briefcase,
    memberCount: 8420,
    threadCount: 2340,
    latestActivity: "2 min ago",
  },
  {
    id: "partner",
    name: "Partner Visas",
    description:
      "Share experiences with 820/801 applications, evidence requirements, and processing timelines.",
    icon: Heart,
    memberCount: 6180,
    threadCount: 1890,
    latestActivity: "5 min ago",
  },
  {
    id: "student",
    name: "Student Visas",
    description:
      "Student visa 500 discussions — work hours, course changes, CoE requirements, and graduate pathways.",
    icon: GraduationCap,
    memberCount: 12350,
    threadCount: 3120,
    latestActivity: "1 min ago",
  },
  {
    id: "employer",
    name: "Employer Sponsored",
    description:
      "482 and 186 visa discussions — employer nominations, labour market testing, and transition pathways.",
    icon: Building2,
    memberCount: 5740,
    threadCount: 1560,
    latestActivity: "8 min ago",
  },
  {
    id: "family",
    name: "Family & Parent Visas",
    description:
      "Parent visa 143/103/173 and family stream discussions — costs, wait times, and documentation.",
    icon: Users,
    memberCount: 3890,
    threadCount: 980,
    latestActivity: "15 min ago",
  },
  {
    id: "general",
    name: "General Discussion",
    description:
      "Open discussions on Australian immigration, settling in, life after visa grant, and general Q&A.",
    icon: MessageCircle,
    memberCount: 15200,
    threadCount: 4680,
    latestActivity: "Just now",
  },
];

export const threads: ThreadPreview[] = [
  {
    id: "t1",
    title: "Points test update — 65 points enough for 189 in April 2026?",
    excerpt:
      "I've got 65 points for ICT Business Analyst. With the latest round results showing cutoffs rising, should I be looking at 190 instead? Anyone got invited with 65 recently?",
    author: {
      id: "u1",
      name: "James L.",
      initials: "JL",
      badge: "applicant",
    },
    createdAt: "2 hours ago",
    replyCount: 18,
    upvotes: 24,
    views: 342,
    hasBestAnswer: true,
    tags: ["189", "Points Test"],
    isPinned: false,
  },
  {
    id: "t2",
    title:
      "Processing times for partner visa 820 — lodged December 2025",
    excerpt:
      "Lodged our 820 application in December 2025 with a strong evidence package. Has anyone who lodged around the same time received any movement or health check requests?",
    author: {
      id: "u2",
      name: "Maria K.",
      initials: "MK",
      badge: "visa-holder",
    },
    createdAt: "4 hours ago",
    replyCount: 31,
    upvotes: 42,
    views: 578,
    hasBestAnswer: false,
    tags: ["820", "Processing Times"],
    isPinned: true,
  },
  {
    id: "t3",
    title: "Skills assessment with ACS — software engineer timeline?",
    excerpt:
      "Just submitted my ACS skills assessment as a Software Engineer. Current processing timeline says 8-10 weeks. Has anyone received theirs faster recently?",
    author: {
      id: "u3",
      name: "Ravi P.",
      initials: "RP",
      badge: "applicant",
    },
    createdAt: "6 hours ago",
    replyCount: 12,
    upvotes: 15,
    views: 203,
    hasBestAnswer: false,
    tags: ["ACS", "Skills Assessment"],
  },
  {
    id: "t4",
    title:
      "Subclass 482 to 186 pathway — employer nomination questions",
    excerpt:
      "I'm on a 482 visa and my employer is willing to nominate me for the 186. What are the key requirements and how long does the transition typically take?",
    author: {
      id: "u4",
      name: "Sophie T.",
      initials: "ST",
      badge: "applicant",
    },
    createdAt: "8 hours ago",
    replyCount: 22,
    upvotes: 28,
    views: 445,
    hasBestAnswer: true,
    tags: ["482", "186", "Transition"],
  },
  {
    id: "t5",
    title: "Student visa 500 — working hours update for 2026?",
    excerpt:
      "I've heard there are changes to student work hours coming in 2026. Can anyone confirm if the relaxed 48-hour limit is being made permanent or reverted?",
    author: {
      id: "u5",
      name: "Amy C.",
      initials: "AC",
      badge: "applicant",
    },
    createdAt: "10 hours ago",
    replyCount: 38,
    upvotes: 56,
    views: 892,
    hasBestAnswer: false,
    tags: ["500", "Work Hours"],
  },
  {
    id: "t6",
    title: "NSW 190 nomination — ICT occupations open again",
    excerpt:
      "Great news: NSW has reopened 190 nominations for several ICT occupations as of this week. If you've been waiting to lodge, now is the time. Here's what I know about the requirements...",
    author: {
      id: "u6",
      name: "David M.",
      initials: "DM",
      badge: "omara-agent",
    },
    createdAt: "12 hours ago",
    replyCount: 44,
    upvotes: 67,
    views: 1240,
    hasBestAnswer: false,
    tags: ["190", "NSW", "ICT"],
    isPinned: true,
  },
  {
    id: "t7",
    title: "Health examination requirements changed for partner visa",
    excerpt:
      "Just got an update from my agent that the health exam requirements for partner visas have changed. Specific panel clinics are now required in certain countries.",
    author: {
      id: "u7",
      name: "Lisa W.",
      initials: "LW",
      badge: "visa-holder",
    },
    createdAt: "1 day ago",
    replyCount: 14,
    upvotes: 19,
    views: 267,
    hasBestAnswer: false,
    tags: ["Partner", "Health Exam"],
  },
  {
    id: "t8",
    title: "Regional 491 to 191 transition — has anyone done this?",
    excerpt:
      "I'm approaching the 3-year mark on my 491 visa and preparing to apply for 191. What documentation did you need to prove regional residence and income?",
    author: {
      id: "u8",
      name: "Chen H.",
      initials: "CH",
      badge: "applicant",
    },
    createdAt: "1 day ago",
    replyCount: 27,
    upvotes: 33,
    views: 412,
    hasBestAnswer: true,
    tags: ["491", "191", "Regional"],
  },
];

export const trendingTopics: TrendingTopic[] = [
  { label: "April 2026 189 round results", postCount: 156, trend: "up" },
  { label: "DHA processing time changes", postCount: 89, trend: "up" },
  { label: "NSW 190 nomination updates", postCount: 67, trend: "stable" },
  { label: "Student visa work rights 2026", postCount: 134, trend: "up" },
  { label: "Partner visa evidence tips", postCount: 45, trend: "stable" },
];

export const topContributors = [
  { name: "David M.", initials: "DM", badge: "omara-agent" as const, posts: 234 },
  { name: "Sarah K.", initials: "SK", badge: "omara-agent" as const, posts: 189 },
  { name: "Maria K.", initials: "MK", badge: "visa-holder" as const, posts: 156 },
  { name: "Chen H.", initials: "CH", badge: "applicant" as const, posts: 142 },
];
