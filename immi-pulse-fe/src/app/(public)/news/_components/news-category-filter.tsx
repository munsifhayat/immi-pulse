"use client";

import { NEWS_CATEGORIES } from "../_lib/mock-data";

interface NewsCategoryFilterProps {
  active: string;
  onChange: (category: string) => void;
}

export function NewsCategoryFilter({
  active,
  onChange,
}: NewsCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("All")}
        className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
          active === "All"
            ? "border-purple bg-purple text-white"
            : "border-border bg-white text-gray-text hover:border-purple/30 hover:text-navy"
        }`}
      >
        All
      </button>
      {NEWS_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
            active === cat
              ? "border-purple bg-purple text-white"
              : "border-border bg-white text-gray-text hover:border-purple/30 hover:text-navy"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
