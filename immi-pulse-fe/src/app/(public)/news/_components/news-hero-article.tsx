"use client";

import { ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import type { NewsArticle } from "../_lib/types";

export function NewsHeroArticle({ article }: { article: NewsArticle }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={2}
      className="mt-12 grid items-center gap-8 lg:grid-cols-2"
    >
      {/* Gradient placeholder */}
      <div
        className={`aspect-[16/10] rounded-2xl bg-gradient-to-br ${article.gradient} flex items-end p-6`}
      >
        <span className="rounded-full bg-white/80 px-4 py-1.5 text-[12px] font-semibold text-navy backdrop-blur-sm">
          Featured
        </span>
      </div>

      {/* Details */}
      <div>
        <span className="inline-flex rounded-full bg-purple/10 px-3 py-1 text-[12px] font-semibold text-purple">
          {article.category}
        </span>
        <h2 className="mt-4 font-heading text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-snug tracking-[-0.5px] text-navy">
          {article.title}
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-gray-text">
          {article.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3 text-[13px] text-gray-text/60">
          <span className="font-medium text-gray-text">{article.source}</span>
          <span>&bull;</span>
          <span>{article.date}</span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readTime}
          </span>
        </div>
        <button className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-purple transition-colors hover:text-purple-deep">
          Read Article
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
