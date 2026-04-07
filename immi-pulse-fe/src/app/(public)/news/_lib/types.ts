export type NewsCategory =
  | "Policy Changes"
  | "Visa Updates"
  | "Processing Times"
  | "Industry News"
  | "Tips & Guides";

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  source: string;
  date: string;
  readTime: string;
  gradient: string;
  isFeatured?: boolean;
  tags: string[];
}
