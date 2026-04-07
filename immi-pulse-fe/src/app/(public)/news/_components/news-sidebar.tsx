"use client";

import { Clock, TrendingUp } from "lucide-react";
import { articles, NEWS_CATEGORIES } from "../_lib/mock-data";

export function NewsSidebar() {
  const categoryCounts = NEWS_CATEGORIES.map((cat) => ({
    name: cat,
    count: articles.filter((a) => a.category === cat).length,
  }));

  const trendingArticles = articles
    .filter((a) => !a.isFeatured)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Categories
        </h3>
        <div className="mt-4 space-y-2.5">
          {categoryCounts.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="text-gray-text">{cat.name}</span>
              <span className="rounded-full bg-gray-light px-2 py-0.5 text-[11px] font-semibold text-navy">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple" />
          <h3 className="font-heading text-[15px] font-semibold text-navy">
            Trending
          </h3>
        </div>
        <div className="mt-4 space-y-4">
          {trendingArticles.map((article) => (
            <div key={article.id}>
              <h4 className="text-[13px] font-medium leading-snug text-navy line-clamp-2">
                {article.title}
              </h4>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-text/60">
                <span>{article.date}</span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {article.readTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter Mini */}
      <div className="rounded-2xl border border-purple/20 bg-purple/5 p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Weekly Digest
        </h3>
        <p className="mt-2 text-[13px] text-gray-text">
          Get the top immigration news delivered every Friday.
        </p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-3 flex flex-col gap-2"
        >
          <input
            type="email"
            placeholder="you@email.com"
            className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] text-navy placeholder:text-gray-text/50 focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-purple text-[13px] font-medium text-white transition-colors hover:bg-purple-deep"
          >
            Subscribe
          </button>
        </form>
      </div>
    </div>
  );
}
