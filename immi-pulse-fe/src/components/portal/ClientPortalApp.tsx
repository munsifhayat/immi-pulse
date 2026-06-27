"use client";

import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  PortalApplicationSummary,
  PortalOrgInfo,
  portalApi,
} from "@/lib/api/portal";
import { usePortalAuth } from "@/lib/portalAuth";

import { PortalApplicationDetail } from "./PortalApplicationDetail";
import { btnGhost, btnPrimary, FirmMark, PC, useToast } from "./_shared";

export function ClientPortalApp({ orgSlug }: { orgSlug: string }) {
  const { isLoading, isAuthenticated, mustReset, account } = usePortalAuth();
  const [org, setOrg] = useState<PortalOrgInfo | null>(null);
  const { notify, ToastHost } = useToast();

  useEffect(() => {
    portalApi.info(orgSlug).then(setOrg).catch(() => setOrg(null));
  }, [orgSlug]);

  const firmName = account?.firm_name || org?.firm_name || "Your migration agent";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: PC.purple }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen orgSlug={orgSlug} firmName={firmName} notify={notify} />
        {ToastHost}
      </>
    );
  }

  if (mustReset) {
    return (
      <>
        <SetPasswordScreen firmName={firmName} notify={notify} />
        {ToastHost}
      </>
    );
  }

  return (
    <>
      <Dashboard firmName={firmName} notify={notify} />
      {ToastHost}
    </>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({
  orgSlug,
  firmName,
  notify,
}: {
  orgSlug: string;
  firmName: string;
  notify: (m: string) => void;
}) {
  const { login } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (ex) {
      const ax = ex as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail || "Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  };

  const sendForgot = async () => {
    setBusy(true);
    try {
      await portalApi.forgotPassword(orgSlug, email.trim());
      notify("If that email has an account, we've sent a fresh password.");
      setForgot(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: `radial-gradient(1200px 600px at 20% -10%, ${PC.purpleMuted}, transparent), radial-gradient(1000px 500px at 100% 110%, ${PC.tealTint}, transparent), ${PC.soft}`,
      }}
    >
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-9 shadow-2xl">
        <div className="flex items-center gap-3">
          <FirmMark name={firmName} />
          <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
            {firmName}
          </span>
        </div>

        <h1 className="mt-6 text-[23px] font-semibold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
          {forgot ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          {forgot
            ? "Enter your email and we'll send a fresh temporary password."
            : "Sign in to track your applications, sign documents and upload what your agent needs."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: PC.ink }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-[11px] border px-3.5 py-3 text-sm outline-none focus:ring-2"
              style={{ borderColor: PC.line }}
            />
          </div>
          {!forgot && (
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: PC.ink }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-[11px] border px-3.5 py-3 text-sm outline-none"
                style={{ borderColor: PC.line }}
              />
            </div>
          )}

          {err && (
            <p className="text-[13px]" style={{ color: PC.rose }}>
              {err}
            </p>
          )}

          {forgot ? (
            <button
              type="button"
              onClick={sendForgot}
              disabled={busy || !email}
              className={btnPrimary("w-full !py-3")}
              style={{ background: PC.purple }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send reset email
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className={btnPrimary("w-full !py-3")}
              style={{ background: PC.purple }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          )}
        </form>

        <button
          onClick={() => {
            setForgot(!forgot);
            setErr(null);
          }}
          className="mt-3 text-[13px] font-medium"
          style={{ color: PC.purpleDeep }}
        >
          {forgot ? "← Back to sign in" : "Forgot your password?"}
        </button>

        {!forgot && (
          <div
            className="mt-5 flex items-start gap-2 rounded-[11px] px-3.5 py-3 text-[12.5px]"
            style={{ background: PC.purpleTint, color: PC.purpleDeep }}
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
            Your account was set up when your agent qualified your enquiry — one
            login for everything, no PIN codes to chase.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Forced password reset ────────────────────────────────────────────────────
function SetPasswordScreen({
  firmName,
  notify,
}: {
  firmName: string;
  notify: (m: string) => void;
}) {
  const { setPassword, logout } = usePortalAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      await setPassword(pw);
      notify("Password set — you're all set.");
    } catch (ex) {
      const ax = ex as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail || "Could not set password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: PC.soft }}>
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-9 shadow-2xl">
        <div className="flex items-center gap-3">
          <FirmMark name={firmName} />
          <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
            {firmName}
          </span>
        </div>
        <h1 className="mt-6 text-[22px] font-semibold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
          Set your password
        </h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          Choose a password you&apos;ll use to sign in from now on.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="w-full rounded-[11px] border px-3.5 py-3 text-sm outline-none"
            style={{ borderColor: PC.line }}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-[11px] border px-3.5 py-3 text-sm outline-none"
            style={{ borderColor: PC.line }}
          />
          {err && (
            <p className="text-[13px]" style={{ color: PC.rose }}>
              {err}
            </p>
          )}
          <button type="submit" disabled={busy} className={btnPrimary("w-full !py-3")} style={{ background: PC.purple }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save &amp; continue
          </button>
        </form>
        <button onClick={logout} className="mt-3 text-[13px] font-medium" style={{ color: PC.muted }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ firmName, notify }: { firmName: string; notify: (m: string) => void }) {
  const { account, logout } = usePortalAuth();
  const [apps, setApps] = useState<PortalApplicationSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      const list = await portalApi.listApplications();
      setApps(list);
      setSelected((cur) => cur || list[0]?.application_id || null);
    },
    []
  );

  useEffect(() => {
    // load() only setStates after an awaited fetch — not a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const activeCount = apps?.filter((a) => !a.is_complete).length ?? 0;
  const doneCount = apps?.filter((a) => a.is_complete).length ?? 0;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: PC.line2, background: "rgba(255,255,255,.9)" }}
      >
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <FirmMark name={firmName} size={30} />
            <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
              {firmName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] sm:block" style={{ color: PC.muted }}>
              {account?.name || account?.email}
            </span>
            <button
              onClick={logout}
              className={btnGhost("!px-3 !py-1.5 !text-[12.5px]")}
              style={{ borderColor: PC.line, color: PC.ink }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 py-7">
        <h1 className="text-[22px] font-semibold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
          Your applications
        </h1>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          Pick an application to see where it&apos;s up to and what&apos;s needed from you.
        </p>

        {!apps ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: PC.purple }} />
          </div>
        ) : apps.length === 0 ? (
          <div
            className="mt-8 rounded-2xl border p-10 text-center text-sm"
            style={{ borderColor: PC.line, color: PC.muted }}
          >
            Nothing here yet. Once your agent qualifies an enquiry, your
            application will appear here.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_1fr]">
            <div>
              <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: PC.faint }}>
                {activeCount} active · {doneCount} complete
              </div>
              <div className="space-y-2.5">
                {apps.map((a) => (
                  <AppCard
                    key={a.application_id}
                    app={a}
                    selected={selected === a.application_id}
                    onClick={() => setSelected(a.application_id)}
                  />
                ))}
              </div>
            </div>

            {selected && (
              <PortalApplicationDetail
                applicationId={selected}
                notify={notify}
                onChanged={load}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function AppCard({
  app,
  selected,
  onClick,
}: {
  app: PortalApplicationSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-2xl border p-4 text-left transition"
      style={{
        borderColor: selected ? PC.purple : PC.line,
        boxShadow: selected ? `0 0 0 3px ${PC.purpleMuted}` : "none",
        background: "#fff",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: app.is_complete ? PC.tealTint : PC.purpleTint,
            color: app.is_complete ? PC.teal : PC.purpleDeep,
            fontFamily: "var(--font-outfit), sans-serif",
          }}
        >
          {app.subclass || "—"}
        </span>
        {app.needs_count > 0 && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ background: PC.amberBg, color: PC.amber }}
          >
            {app.needs_count} to do
          </span>
        )}
      </div>
      <h4 className="mt-2.5 text-[14.5px] font-semibold leading-snug" style={{ color: PC.ink }}>
        {app.title}
      </h4>
      <div className="mt-0.5 text-[12px]" style={{ color: PC.muted }}>
        {app.stage_label}
      </div>
      <div className="mt-3 h-[7px] overflow-hidden rounded-md" style={{ background: PC.soft2 }}>
        <div
          className="h-full rounded-md"
          style={{
            width: `${app.progress_pct}%`,
            background: `linear-gradient(90deg, ${PC.purple}, ${PC.tealLight})`,
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px]">
        <span className="font-bold" style={{ color: PC.ink }}>
          {app.progress_pct}%
        </span>
        <span style={{ color: PC.faint }}>
          Step {app.step_index} of {app.step_total}
        </span>
      </div>
    </button>
  );
}
