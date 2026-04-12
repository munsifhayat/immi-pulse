"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { useCommunitySpace, useCreateThread } from "@/lib/api/hooks/community";
import { fadeUp } from "@/lib/motion";

export default function NewThreadPage() {
  const params = useParams<{ spaceSlug: string }>();
  const router = useRouter();
  const slug = params?.spaceSlug ?? "";

  const spaceQuery = useCommunitySpace(slug);
  const createThread = useCreateThread();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 4) {
      setError("Title must be at least 4 characters.");
      return;
    }
    if (body.trim().length < 1) {
      setError("Please write something in the body.");
      return;
    }
    if (!isAnonymous && !displayName.trim()) {
      setError("Enter a display name or post anonymously.");
      return;
    }

    try {
      const thread = await createThread.mutateAsync({
        space_slug: slug,
        title: title.trim(),
        body: body.trim(),
        is_anonymous: isAnonymous,
        author_display_name: isAnonymous ? undefined : displayName.trim(),
      });
      router.push(`/community/thread/${thread.id}`);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.detail ?? "Submission failed.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-3xl px-6 py-16"
    >
      <Link
        href={`/community/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
      >
        <ArrowLeft className="h-4 w-4" /> Back to{" "}
        {spaceQuery.data?.name ?? "space"}
      </Link>

      <div className="mt-6">
        <h1 className="font-heading text-4xl font-normal tracking-tight text-navy">
          Start a new thread
        </h1>
        <p className="mt-2 text-[15px] text-gray-text">
          Ask a question or share something useful with the community.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6 rounded-3xl border border-border bg-white p-8 shadow-sm"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-purple">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. 189 EOI invitation after 6 months — here's what worked for me"
            className="h-11 w-full rounded-lg border border-border bg-gray-light px-3 text-[14px] text-navy outline-none focus:border-purple"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-purple">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={10}
            placeholder="Share your story, ask your question, include anything relevant..."
            className="w-full resize-y rounded-lg border border-border bg-gray-light px-3 py-2 text-[14px] text-navy outline-none focus:border-purple"
          />
          <p className="text-[11px] text-gray-text">
            Text only. No images. {10000 - body.length} characters remaining.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-gray-light/50 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-navy">
              Post anonymously
            </span>
          </label>
          {!isAnonymous && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-text">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Your display name"
                className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[14px] text-navy outline-none focus:border-purple"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-[13px] font-medium text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-6">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-text">
            <Shield className="h-3.5 w-3.5" />
            Threads are rate-limited to 10 per day per person.
          </p>
          <button
            type="submit"
            disabled={createThread.isPending}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-6 py-2.5 text-[14px] font-medium text-white shadow-lg shadow-purple/20 hover:border-purple-deep hover:bg-purple-deep disabled:opacity-60"
          >
            {createThread.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Post thread
          </button>
        </div>
      </form>
    </motion.div>
  );
}
