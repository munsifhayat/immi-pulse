"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import {
  useCommunityRecover,
  useCommunityResetPassword,
} from "@/lib/api/hooks/community";
import { PasswordField, fieldCls } from "./password-field";

/**
 * Password recovery, both halves of it.
 *
 * With a `?token=` in the URL this is the "set a new password" step the email
 * links to. Without one it is the "send me a link" step. One component because
 * they are one journey, and because someone who lands here with an expired
 * token needs the request form immediately below the error rather than after
 * another navigation.
 *
 * Backend: `POST /community/public/auth/recover` and `.../reset` (both shipped
 * in p1). The reset route existed with nothing linking to it — every recovery
 * email sent since then pointed at a page that did not exist.
 */
export function RecoverView() {
  const token = useSearchParams().get("token");
  return token ? <ResetPanel token={token} /> : <RequestPanel />;
}

/* ── Ask for a link ───────────────────────────────────────────────────────── */

function RequestPanel({ note }: { note?: string }) {
  const recover = useCommunityRecover();
  const [email, setEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || recover.isPending) return;
    await recover.mutateAsync({ email: email.trim() });
  }

  if (recover.isSuccess) {
    return (
      <Panel
        eyebrow="Check your email"
        title={
          <>
            If we have that address, a link is on its{" "}
            <span className="c-serif text-[1.12em] text-purple-deep">way</span>.
          </>
        }
      >
        {/*
          Deliberately says "if". The backend answers identically for known and
          unknown addresses, and this copy has to match, or the wording becomes
          the oracle the endpoint refuses to be. Anyone can guess at who holds an
          account on an immigration forum; nobody should be able to confirm it.
        */}
        <div className="flex items-start gap-3 rounded-xl border border-hair bg-paper px-4 py-3.5">
          <MailCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-purple-deep"
            strokeWidth={1.75}
          />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            The link works once and expires in an hour. We never say whether an
            address has an account here — not even to you — so this message looks
            the same either way.
          </p>
        </div>
        <BackToCommunity />
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Account recovery"
      title={
        <>
          Get back into your{" "}
          <span className="c-serif text-[1.12em] text-purple-deep">handle</span>.
        </>
      }
      description="Recovery works only if you gave us an email when you signed up. It was optional, and without one there is no way back in — we said so at the time, and it is still true."
    >
      {note && (
        <p className="rounded-xl border border-[#C77D18]/35 bg-[#C77D18]/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          {note}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="c-eyebrow mb-2 block" htmlFor="recover-email">
            Your email
          </label>
          <input
            id="recover-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={fieldCls}
          />
        </div>
        <button
          type="submit"
          disabled={!email.trim() || recover.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {recover.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          )}
          Send me a link
        </button>
      </form>
      <BackToCommunity />
    </Panel>
  );
}

/* ── Set a new password ───────────────────────────────────────────────────── */

function ResetPanel({ token }: { token: string }) {
  const router = useRouter();
  const reset = useCommunityResetPassword();
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || reset.isPending) return;
    await reset.mutateAsync({ token, password });
    // Straight into the community, already signed in. Someone who has just been
    // locked out should not be handed a login form as their reward.
    router.push("/");
  }

  if (reset.isSuccess) {
    return (
      <Panel eyebrow="Done" title="You're back in.">
        <div className="flex items-start gap-3 rounded-xl border border-hair bg-paper px-4 py-3.5">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-teal"
            strokeWidth={1.75}
          />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Your password is changed and you are signed in on this device.
          </p>
        </div>
        <BackToCommunity label="Go to the community" />
      </Panel>
    );
  }

  // An expired or already-used token is a dead end unless the request form is
  // right here — otherwise the member is told "no" and given nowhere to go.
  if (reset.isError) {
    return <RequestPanel note={(reset.error as Error).message} />;
  }

  return (
    <Panel
      eyebrow="Account recovery"
      title={
        <>
          Choose a new{" "}
          <span className="c-serif text-[1.12em] text-purple-deep">
            password
          </span>
          .
        </>
      }
      description="Your handle and everything you have posted under it are untouched. Only the password changes."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="c-eyebrow mb-2 block">New password</label>
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={!password || reset.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {reset.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          )}
          Set password and sign in
        </button>
      </form>
      <BackToCommunity />
    </Panel>
  );
}

/* ── Chrome ───────────────────────────────────────────────────────────────── */

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-hair bg-white px-6 py-7">
      <div>
        <span className="c-eyebrow">{eyebrow}</span>
        <h1 className="mt-2 font-heading text-[22px] font-semibold tracking-[-0.4px] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function BackToCommunity({ label = "Back to the community" }: { label?: string }) {
  return (
    <p className="text-center text-[12.5px] text-ink-soft">
      <Link href="/" className="font-semibold text-purple-deep hover:underline">
        {label}
      </Link>
    </p>
  );
}
