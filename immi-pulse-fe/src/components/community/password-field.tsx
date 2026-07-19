"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const fieldCls =
  "w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10";

/**
 * One password field with a reveal toggle — never a confirm field.
 *
 * Lifted out of the account dialog so the recovery page can use exactly the
 * same control. Someone resetting a password has already lost one; meeting a
 * differently-behaved field at that moment is the worst possible time to make
 * them guess how this one works.
 */
export function PasswordField({
  value,
  onChange,
  autoComplete,
  placeholder = "Choose a password",
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${fieldCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
      >
        {shown ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
