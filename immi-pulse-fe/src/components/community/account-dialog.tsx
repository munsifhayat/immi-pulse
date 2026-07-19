"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Shuffle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCommunityLogin,
  useCommunitySignup,
  useRerollIdentity,
} from "@/lib/api/hooks/community";
import { useCommunity } from "./community-context";
import { PasswordField, fieldCls } from "./password-field";

/* ── Signup ──────────────────────────────────────────────────────────────── */

function SignupPanel({ onSwitch }: { onSwitch: () => void }) {
  const { identity, closeAccount } = useCommunity();
  const signup = useCommunitySignup();
  const reroll = useRerollIdentity();

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const clean = email.trim().toLowerCase();
  const cleanConfirm = confirmEmail.trim().toLowerCase();
  // A plausible address, not a valid one — the browser's own type=email check
  // plus a shape test. Real validation is impossible without sending mail, and
  // we deliberately do not send any.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  const emailsMatch = clean.length > 0 && clean === cleanConfirm;
  // The mismatch only counts as an error once they have actually started
  // typing the second field — nagging from the first keystroke reads as broken.
  const showMismatch = cleanConfirm.length > 0 && !emailsMatch;

  const ready =
    password.length > 0 && looksLikeEmail && emailsMatch && !signup.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    await signup.mutateAsync({ password, email: clean });
    closeAccount();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/*
        The handle is assigned, never invented. A name someone chooses leaks who
        they are — their real name, their employer, the town they live in — and
        this community is full of people whose visa status is not safe to attach to
        any of that.
      */}
      <div className="rounded-xl border border-hair bg-paper px-4 py-3.5">
        <span className="c-eyebrow">You&apos;ll be known as</span>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
            style={{ backgroundColor: identity?.color ?? "#7C5CFC" }}
          >
            {identity?.initials ?? "··"}
          </span>
          <span className="min-w-0 flex-1 truncate font-heading text-[16px] font-semibold text-ink">
            {identity?.handle ?? "…"}
          </span>
          <button
            type="button"
            onClick={() => !reroll.isPending && reroll.mutate()}
            disabled={reroll.isPending}
            className="c-mono inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-hair bg-white px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {reroll.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : (
              <Shuffle className="h-3 w-3" strokeWidth={2} />
            )}
            Reroll
          </button>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-soft">
          We pick the name so it can never point back at you. Anything you have
          already posted from this browser stays yours.
        </p>
      </div>

      <div>
        <label className="c-eyebrow mb-2 block">Password</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
      </div>

      {/*
        Email is required and never verified — no link to click, no inbox to
        go and find. That makes the retype the only thing standing between a
        typo and an account nobody can ever recover, which is why it is a
        second field rather than fine print.
      */}
      <div>
        <label className="c-eyebrow mb-2 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className={fieldCls}
        />
      </div>

      <div>
        <label className="c-eyebrow mb-2 block">Confirm email</label>
        <input
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="off"
          onPaste={(e) => e.preventDefault()}
          required
          className={fieldCls}
        />
        {showMismatch ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#C23A50]">
            <AlertTriangle
              className="mr-1 inline h-3.5 w-3.5 -translate-y-px"
              strokeWidth={2}
            />
            These two addresses don&apos;t match.
          </p>
        ) : (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            Two reasons only: so we can tell you when someone replies, and so you
            can recover your password. It is never shown to anyone and never
            public. There is no confirmation email to go and click.
          </p>
        )}
      </div>

      {signup.isError && (
        <p className="text-[12.5px] leading-relaxed text-[#C23A50]">
          {(signup.error as Error).message}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {signup.isPending && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        )}
        Join the community
      </button>

      <p className="text-center text-[12.5px] text-ink-soft">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-purple-deep hover:underline"
        >
          Log in
        </button>
      </p>
    </form>
  );
}

/* ── Login ───────────────────────────────────────────────────────────────── */

function LoginPanel({ onSwitch }: { onSwitch: () => void }) {
  const { closeAccount } = useCommunity();
  const login = useCommunityLogin();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || !password || login.isPending) return;
    await login.mutateAsync({ handle: handle.trim(), password });
    closeAccount();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="c-eyebrow mb-2 block">Your handle</label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="e.g. BoldLagoon7745"
          autoComplete="username"
          className={fieldCls}
        />
      </div>
      <div>
        <label className="c-eyebrow mb-2 block">Password</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Your password"
        />
      </div>

      {login.isError && (
        <p className="text-[12.5px] leading-relaxed text-[#C23A50]">
          {(login.error as Error).message}
        </p>
      )}

      <button
        type="submit"
        disabled={!handle.trim() || !password || login.isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {login.isPending && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        )}
        Log in
      </button>

      {/*
        Recovery is offered here rather than only after a failed attempt: the
        person who needs it usually knows they have forgotten before they try,
        and making them fail first to be shown the door is pointless friction.
        The link is honest about the condition — recovery only exists for
        accounts that supplied an email, and saying so here saves a wasted trip.
      */}
      <p className="text-center text-[12.5px] text-ink-soft">
        Forgotten it?{" "}
        <Link
          href="/community/recover"
          className="font-semibold text-purple-deep hover:underline"
        >
          Recover your account
        </Link>{" "}
        — if you gave us an email.
      </p>

      <p className="text-center text-[12.5px] text-ink-soft">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-purple-deep hover:underline"
        >
          Get a handle
        </button>
      </p>
    </form>
  );
}

/* ── Dialog ──────────────────────────────────────────────────────────────── */

export function AccountDialog() {
  const { accountDialog, closeAccount, openAccount } = useCommunity();
  const mode = accountDialog;

  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && closeAccount()}>
      <DialogContent className="c-paper sm:max-w-[440px]">
        <DialogHeader>
          <span className="c-eyebrow">
            {mode === "login" ? "Welcome back" : "Anonymous account"}
          </span>
          <DialogTitle className="mt-2 font-heading text-[22px] font-semibold tracking-[-0.4px] text-ink">
            {mode === "login" ? (
              "Log in to the community"
            ) : (
              <>
                Fifteen seconds, no{" "}
                <span className="c-serif text-[1.12em] text-purple-deep">
                  name
                </span>
                .
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-ink-soft">
            {mode === "login"
              ? "Your handle and password. Logging in on a new device brings your posts, replies and inbox with you."
              : "Reading and Wait Check need no account. Writing does — so your questions have somewhere to come back to."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {mode === "login" ? (
            <LoginPanel onSwitch={() => openAccount("signup")} />
          ) : (
            <SignupPanel onSwitch={() => openAccount("login")} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
