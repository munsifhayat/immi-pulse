export type VisaTrend = "faster" | "slower" | "steady";

export type VisaProcessingTime = {
  code: string;
  name: string;
  stream?: string;
  official: {
    p50: string;
    p90: string;
    updated: string;
  };
  community: {
    median: string;
    sampleSize: number;
    fastest: string;
    slowest: string;
    trend: VisaTrend;
    deltaVsOfficial: string;
  };
};

export const processingTimes: VisaProcessingTime[] = [
  {
    code: "186",
    name: "Employer Nomination Scheme",
    stream: "Direct Entry",
    official: { p50: "7 months", p90: "13 months", updated: "Mar 2026" },
    community: {
      median: "5.2 months",
      sampleSize: 842,
      fastest: "3 weeks",
      slowest: "19 months",
      trend: "faster",
      deltaVsOfficial: "~26% faster",
    },
  },
  {
    code: "189",
    name: "Skilled Independent",
    stream: "Points-tested",
    official: { p50: "11 months", p90: "22 months", updated: "Mar 2026" },
    community: {
      median: "9.8 months",
      sampleSize: 1204,
      fastest: "2 months",
      slowest: "26 months",
      trend: "steady",
      deltaVsOfficial: "~11% faster",
    },
  },
  {
    code: "190",
    name: "Skilled Nominated",
    stream: "State-nominated",
    official: { p50: "8 months", p90: "15 months", updated: "Mar 2026" },
    community: {
      median: "6.5 months",
      sampleSize: 967,
      fastest: "5 weeks",
      slowest: "18 months",
      trend: "faster",
      deltaVsOfficial: "~19% faster",
    },
  },
  {
    code: "482",
    name: "Skills in Demand",
    stream: "Core Skills",
    official: { p50: "32 days", p90: "58 days", updated: "Mar 2026" },
    community: {
      median: "26 days",
      sampleSize: 1513,
      fastest: "4 days",
      slowest: "4 months",
      trend: "faster",
      deltaVsOfficial: "~19% faster",
    },
  },
  {
    code: "500",
    name: "Student Visa",
    stream: "Higher Education",
    official: { p50: "5 weeks", p90: "4 months", updated: "Mar 2026" },
    community: {
      median: "6.1 weeks",
      sampleSize: 2187,
      fastest: "6 days",
      slowest: "7 months",
      trend: "slower",
      deltaVsOfficial: "~22% slower",
    },
  },
  {
    code: "820",
    name: "Partner Visa (Onshore)",
    stream: "Temporary",
    official: { p50: "18 months", p90: "31 months", updated: "Mar 2026" },
    community: {
      median: "15.4 months",
      sampleSize: 638,
      fastest: "4 months",
      slowest: "38 months",
      trend: "faster",
      deltaVsOfficial: "~14% faster",
    },
  },
  {
    code: "485",
    name: "Temporary Graduate",
    stream: "Post-Higher Education",
    official: { p50: "4 months", p90: "9 months", updated: "Mar 2026" },
    community: {
      median: "3.7 months",
      sampleSize: 1092,
      fastest: "3 weeks",
      slowest: "11 months",
      trend: "steady",
      deltaVsOfficial: "~8% faster",
    },
  },
  {
    code: "491",
    name: "Skilled Work Regional",
    stream: "Provisional",
    official: { p50: "9 months", p90: "17 months", updated: "Mar 2026" },
    community: {
      median: "7.9 months",
      sampleSize: 523,
      fastest: "6 weeks",
      slowest: "21 months",
      trend: "faster",
      deltaVsOfficial: "~12% faster",
    },
  },
];

export const processingSources = [
  { label: "home.affairs.gov.au", type: "Official" as const },
  { label: "186 Tracker app (community)", type: "Community" as const },
  { label: "r/AusVisa", type: "Community" as const },
  { label: "PomsInOz forums", type: "Community" as const },
  { label: "ImmiTracker", type: "Community" as const },
];
