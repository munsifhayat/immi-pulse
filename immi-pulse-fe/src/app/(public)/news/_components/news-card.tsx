"use client";

import { Clock } from "lucide-react";
import type { NewsArticle } from "../_lib/types";

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="group rounded-2xl border border-border bg-white overflow-hidden transition-all duration-300 hover:border-purple/10 hover:shadow-lg hover:shadow-purple/5">
      {/* Gradient placeholder image */}
      <div
        className={`aspect-[16/9] bg-gradient-to-br ${article.gradient} flex items-end p-4`}
      >
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-navy backdrop-blur-sm">
          {article.category}
        </span>
      </div>

      <div className="p-6">
        <h3 className="font-heading text-[16px] font-semibold leading-snug text-navy line-clamp-2 group-hover:text-purple transition-colors">
          {article.title}
        </h3>
        <p className="mt-2.5 text-[14px] leading-relaxed text-gray-text line-clamp-2">
          {article.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3 text-[12px] text-gray-text/60">
          <span className="font-medium text-gray-text">{article.source}</span>
          <span>&bull;</span>
          <span>{article.date}</span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readTime}
          </span>
        </div>
      </div>
    </article>
  );
}
