"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Newspaper, ArrowRight } from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import { articles } from "./_lib/mock-data";
import { NewsHeroArticle } from "./_components/news-hero-article";
import { NewsCategoryFilter } from "./_components/news-category-filter";
import { NewsCard } from "./_components/news-card";
import { NewsSidebar } from "./_components/news-sidebar";

/* Reusable subtle grid SVG */
function GridBg({
  id,
  size = 48,
  opacity = 0.06,
  stroke = "#7C5CFC",
  className = "",
}: {
  id: string;
  size?: number;
  opacity?: number;
  stroke?: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={id}
            x="0"
            y="0"
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${size} 0 L 0 0 0 ${size}`}
              fill="none"
              stroke={stroke}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${id})`}
          opacity={opacity}
        />
      </svg>
    </div>
  );
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const featuredArticle = articles.find((a) => a.isFeatured)!;

  const filteredArticles = useMemo(() => {
    const regular = articles.filter((a) => !a.isFeatured);
    if (activeCategory === "All") return regular;
    return regular.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════════ HERO + FEATURED ═══════════════ */}
      <section className="relative overflow-hidden bg-white pt-16">
        <GridBg id="news-hero-grid" size={48} opacity={0.04} />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple/[0.04] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm"
          >
            <Newspaper className="h-3.5 w-3.5 text-purple" />
            <span className="text-[13px] font-medium text-navy">
              News & Updates
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-6 max-w-2xl font-heading text-[clamp(2.5rem,5vw,4rem)] font-normal leading-[1.08] tracking-[-2px] text-navy"
          >
            Immigration News &{" "}
            <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
              Updates
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1.5}
            className="mt-4 max-w-xl text-[18px] leading-relaxed text-gray-text"
          >
            Curated policy changes, visa updates, processing time reports, and
            expert insights for the Australian immigration landscape.
          </motion.p>

          {/* Featured Article */}
          <NewsHeroArticle article={featuredArticle} />
        </div>
      </section>

      {/* ═══════════════ ARTICLE GRID + SIDEBAR ═══════════════ */}
      <section className="relative overflow-hidden bg-gray-light/50 py-20">
        <GridBg id="news-grid-bg" size={52} opacity={0.025} />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Category Filter */}
          <NewsCategoryFilter
            active={activeCategory}
            onChange={setActiveCategory}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Articles */}
            <div>
              {filteredArticles.length === 0 ? (
                <div className="rounded-2xl border border-border bg-white p-12 text-center">
                  <Newspaper className="mx-auto h-10 w-10 text-gray-text/30" />
                  <h3 className="mt-4 font-heading text-lg font-semibold text-navy">
                    No articles in this category
                  </h3>
                  <p className="mt-2 text-[15px] text-gray-text">
                    Try selecting a different category above.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="grid gap-6 sm:grid-cols-2"
                >
                  {filteredArticles.map((article, i) => (
                    <motion.div
                      key={article.id}
                      variants={fadeUp}
                      custom={Math.min(i, 5)}
                    >
                      <NewsCard article={article} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <NewsSidebar />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ NEWSLETTER CTA ═══════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-purple to-purple-deep px-8 py-20 text-center sm:px-16">
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-white">
              Stay Informed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70">
              Get the latest Australian immigration news, policy changes, and
              processing time updates delivered to your inbox every week.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-8 flex max-w-md gap-3"
            >
              <input
                type="email"
                placeholder="you@email.com"
                className="h-12 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 text-[14px] text-white placeholder:text-white/40 backdrop-blur-sm focus-visible:border-white/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              />
              <button
                type="submit"
                className="h-12 rounded-lg bg-white px-6 text-[14px] font-semibold text-purple transition-colors hover:bg-white/90"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-3 text-[13px] text-white/40">
              Free weekly digest. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
