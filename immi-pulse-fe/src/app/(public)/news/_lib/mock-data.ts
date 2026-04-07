import type { NewsArticle, NewsCategory } from "./types";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "Policy Changes",
  "Visa Updates",
  "Processing Times",
  "Industry News",
  "Tips & Guides",
];

export const categoryGradients: Record<NewsCategory, string> = {
  "Policy Changes": "from-purple/15 via-purple-light/10 to-purple-muted/20",
  "Visa Updates": "from-teal/12 via-teal-light/8 to-teal/5",
  "Processing Times": "from-navy/10 via-navy/5 to-purple/8",
  "Industry News": "from-purple/10 via-teal/8 to-purple-light/10",
  "Tips & Guides": "from-purple-muted/20 via-purple-light/10 to-purple/5",
};

export const articles: NewsArticle[] = [
  {
    id: "n1",
    title:
      "DHA Announces Major Processing Time Improvements for Skilled Visas",
    excerpt:
      "The Department of Home Affairs has announced significant processing time benchmarks for 2026-27, with Subclass 482 targeting 10 weeks and a new Specialist Skills Fast Lane promising 7-day decisions for critical occupations.",
    category: "Policy Changes",
    source: "IMMI-PULSE Research",
    date: "April 4, 2026",
    readTime: "6 min read",
    gradient: categoryGradients["Policy Changes"],
    isFeatured: true,
    tags: ["DHA", "Processing Times", "482"],
  },
  {
    id: "n2",
    title:
      "April 2026 Skilled Visa Round: 189 Invitations Drop to 1,000",
    excerpt:
      "The latest SkillSelect round saw only 1,000 invitations for Subclass 189, down from 1,500 in March. Minimum points score rose to 70 for most occupations.",
    category: "Visa Updates",
    source: "DHA Watch",
    date: "April 3, 2026",
    readTime: "4 min read",
    gradient: categoryGradients["Visa Updates"],
    tags: ["189", "SkillSelect", "Points"],
  },
  {
    id: "n3",
    title:
      "Student Visa 500: Updated Work Hour Regulations Take Effect",
    excerpt:
      "From April 1, 2026, student visa holders are now permitted to work 48 hours per fortnight during semester, up from the previous 40-hour limit. The change applies to all new and existing holders.",
    category: "Policy Changes",
    source: "IMMI-PULSE Research",
    date: "April 1, 2026",
    readTime: "3 min read",
    gradient: categoryGradients["Policy Changes"],
    tags: ["500", "Work Hours", "Students"],
  },
  {
    id: "n4",
    title:
      "Partner Visa 820/801 Processing Now Averages 18 Months",
    excerpt:
      "DHA global processing times data shows partner visa applications lodged in 2025 are now averaging 18 months to first decision, a 3-month improvement over the prior year.",
    category: "Processing Times",
    source: "DHA Watch",
    date: "March 28, 2026",
    readTime: "4 min read",
    gradient: categoryGradients["Processing Times"],
    tags: ["820", "801", "Partner"],
  },
  {
    id: "n5",
    title:
      "NSW Opens 190 Nominations for ICT Occupations in Q2 2026",
    excerpt:
      "New South Wales has reopened state nomination for several high-demand ICT occupations including Software Engineer, ICT Business Analyst, and Cyber Security Analyst.",
    category: "Visa Updates",
    source: "NSW Nomination Watch",
    date: "March 26, 2026",
    readTime: "3 min read",
    gradient: categoryGradients["Visa Updates"],
    tags: ["190", "NSW", "ICT"],
  },
  {
    id: "n6",
    title:
      "How AI Is Transforming Immigration Consulting in Australia",
    excerpt:
      "A deep dive into how Australian migration agents are adopting AI tools for visa classification, document validation, and case management — and why the industry is ripe for disruption.",
    category: "Industry News",
    source: "IMMI-PULSE Research",
    date: "March 24, 2026",
    readTime: "8 min read",
    gradient: categoryGradients["Industry News"],
    tags: ["AI", "Technology", "Industry"],
  },
  {
    id: "n7",
    title: "5 Common Mistakes in Subclass 482 Applications",
    excerpt:
      "From incomplete employer nominations to missing skills assessment documentation, these five errors account for over 60% of 482 visa delays. Here's how to avoid them.",
    category: "Tips & Guides",
    source: "IMMI-PULSE Research",
    date: "March 22, 2026",
    readTime: "5 min read",
    gradient: categoryGradients["Tips & Guides"],
    tags: ["482", "Tips", "Applications"],
  },
  {
    id: "n8",
    title:
      "Victoria 491 Regional Visa: New Priority Occupations Added",
    excerpt:
      "The Victorian government has added 15 new priority occupations to the 491 regional visa nomination list, including healthcare, construction, and agricultural roles.",
    category: "Visa Updates",
    source: "VIC Migration Hub",
    date: "March 20, 2026",
    readTime: "3 min read",
    gradient: categoryGradients["Visa Updates"],
    tags: ["491", "Victoria", "Regional"],
  },
  {
    id: "n9",
    title: "Understanding the Points Test: A Complete 2026 Guide",
    excerpt:
      "Everything you need to know about Australia's points-based skilled migration system — from age and English scores to employment and education claims. Updated for 2026 thresholds.",
    category: "Tips & Guides",
    source: "IMMI-PULSE Research",
    date: "March 18, 2026",
    readTime: "10 min read",
    gradient: categoryGradients["Tips & Guides"],
    tags: ["Points Test", "Guide", "189", "190"],
  },
  {
    id: "n10",
    title:
      "DHA ImmiAccount March 2026 Overhaul: What You Need to Know",
    excerpt:
      "The Department's new ImmiAccount system launched in March with real-time queue position tracking, improved document uploads, and a refreshed mobile interface.",
    category: "Policy Changes",
    source: "DHA Watch",
    date: "March 15, 2026",
    readTime: "5 min read",
    gradient: categoryGradients["Policy Changes"],
    tags: ["DHA", "ImmiAccount", "Technology"],
  },
  {
    id: "n11",
    title:
      "Employer Sponsored 186 Processing Times Halved Since January",
    excerpt:
      "Processing times for Subclass 186 employer-sponsored visas have dropped to an average of 5 months, down from 10 months at the start of the year, following DHA's resource reallocation.",
    category: "Processing Times",
    source: "DHA Watch",
    date: "March 12, 2026",
    readTime: "3 min read",
    gradient: categoryGradients["Processing Times"],
    tags: ["186", "Processing Times", "Employer Sponsored"],
  },
  {
    id: "n12",
    title:
      "OMARA Compliance Updates: New CPD Requirements for 2026-27",
    excerpt:
      "The Office of the MARA has announced updated Continuing Professional Development requirements for registered migration agents, effective from July 1, 2026.",
    category: "Industry News",
    source: "OMARA Bulletin",
    date: "March 10, 2026",
    readTime: "4 min read",
    gradient: categoryGradients["Industry News"],
    tags: ["OMARA", "Compliance", "CPD"],
  },
];
