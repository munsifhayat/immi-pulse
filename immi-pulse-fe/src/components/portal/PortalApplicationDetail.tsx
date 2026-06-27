"use client";

import {
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  PenLine,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  PortalApplicationDetail as Detail,
  PortalTodo,
  portalApi,
} from "@/lib/api/portal";

import {
  btnGhost,
  btnPrimary,
  PC,
  PortalModal,
  SignaturePad,
} from "./_shared";

const TABS = ["Overview", "Documents", "Timeline"] as const;
type Tab = (typeof TABS)[number];

export function PortalApplicationDetail({
  applicationId,
  notify,
  onChanged,
}: {
  applicationId: string;
  notify: (m: string) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [signOpen, setSignOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await portalApi.getApplication(applicationId));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    setTab("Overview");
    load();
  }, [load]);

  const onUploadFile = async (file: File) => {
    try {
      await portalApi.uploadDocument(applicationId, file);
      notify("Uploaded — your agent has been notified.");
      await load();
      onChanged();
    } catch {
      notify("Upload failed — please try again.");
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: PC.purple }} />
      </div>
    );
  }

  const docCount = detail.documents.length;
  const checklistTotal = detail.checklist.length;
  const uploadedCount = detail.checklist.filter((c) =>
    ["uploaded", "validated", "flagged"].includes(c.status)
  ).length;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: PC.line }}>
      {/* Header */}
      <div
        className="flex flex-wrap items-center gap-5 border-b px-6 py-6"
        style={{ borderColor: PC.line2 }}
      >
        <ProgressRing pct={detail.progress_pct} />
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold leading-tight"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {detail.title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]" style={{ color: PC.muted }}>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
              style={{ background: PC.purpleTint, color: PC.purpleDeep }}
            >
              {detail.stage_label}
            </span>
            <span>
              Step {detail.step_index} of {detail.step_total}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b px-6" style={{ borderColor: PC.line2 }}>
        {TABS.map((t) => {
          const count =
            t === "Documents" && checklistTotal
              ? `${uploadedCount}/${checklistTotal}`
              : null;
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="-mb-px border-b-2 px-3 py-3.5 text-[13.5px] font-semibold transition"
              style={{
                borderColor: on ? PC.purple : "transparent",
                color: on ? PC.purpleDeep : PC.muted,
              }}
            >
              {t}
              {count ? (
                <span
                  className="ml-1.5 rounded px-1.5 py-0.5 text-[11px]"
                  style={{ background: PC.amberBg, color: PC.amber }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-6">
        {tab === "Overview" && (
          <OverviewTab
            detail={detail}
            onSign={() => setSignOpen(true)}
            onUpload={() => fileInput.current?.click()}
          />
        )}
        {tab === "Documents" && (
          <DocumentsTab detail={detail} onUpload={() => fileInput.current?.click()} />
        )}
        {tab === "Timeline" && <TimelineTab detail={detail} />}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
          e.target.value = "";
        }}
      />

      {signOpen && detail.letter && (
        <SignModal
          detail={detail}
          onClose={() => setSignOpen(false)}
          onSigned={async () => {
            setSignOpen(false);
            notify("Agreement signed — thank you!");
            await load();
            onChanged();
          }}
        />
      )}

      {docCount === 0 && !detail.case_id && tab === "Documents" ? null : null}
    </div>
  );
}

// ── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  return (
    <div
      className="flex h-[74px] w-[74px] flex-none items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${PC.purple} ${pct}%, ${PC.purpleMuted} 0)`,
      }}
    >
      <div
        className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white text-[17px] font-bold"
        style={{ color: PC.purpleDeep, fontFamily: "var(--font-outfit), sans-serif" }}
      >
        {pct}%
      </div>
    </div>
  );
}

function todoIcon(type: PortalTodo["type"]) {
  if (type === "sign") return <PenLine className="h-4 w-4" />;
  if (type === "upload") return <Upload className="h-4 w-4" />;
  if (type === "respond") return <MessageSquare className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({
  detail,
  onSign,
  onUpload,
}: {
  detail: Detail;
  onSign: () => void;
  onUpload: () => void;
}) {
  return (
    <div>
      {detail.summary_text && (
        <div
          className="rounded-2xl p-5"
          style={{ background: PC.soft, borderLeft: `3px solid ${PC.purpleLight}` }}
        >
          <h3 className="flex items-center gap-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
            <Info className="h-4 w-4" style={{ color: PC.purple }} />
            What this application is about
          </h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.body }}>
            {detail.summary_text}
          </p>
        </div>
      )}

      {detail.facts.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {detail.facts.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border p-3.5"
              style={{ borderColor: PC.line2 }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: PC.faint }}>
                {f.label}
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: PC.ink }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail.todos.length > 0 && (
        <>
          <div className="mt-6 mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide" style={{ color: PC.faint }}>
            Needs your attention
            <span
              className="rounded px-1.5 py-0.5 text-[11px]"
              style={{ background: PC.amberBg, color: PC.amber }}
            >
              {detail.todos.length}
            </span>
          </div>
          {detail.todos.map((t, i) => (
            <div
              key={i}
              className="mb-2.5 flex items-center gap-3.5 rounded-xl border p-4"
              style={{
                borderColor: "#FEDF89",
                background: `linear-gradient(180deg, ${PC.amberBg}, #fff)`,
              }}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px]"
                style={{ background: PC.amberBg, color: PC.amber }}
              >
                {todoIcon(t.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: PC.ink }}>
                  {t.title}
                </div>
                {t.subtitle && (
                  <div className="mt-0.5 text-[12.5px]" style={{ color: PC.muted }}>
                    {t.subtitle}
                  </div>
                )}
              </div>
              {t.type === "sign" && (
                <button onClick={onSign} className={btnPrimary()} style={{ background: PC.purple }}>
                  Review &amp; sign
                </button>
              )}
              {t.type === "upload" && (
                <button onClick={onUpload} className={btnPrimary()} style={{ background: PC.purple }}>
                  Upload
                </button>
              )}
            </div>
          ))}
        </>
      )}

      <div className="mt-6 mb-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PC.faint }}>
        Your documents
      </div>
      <DocumentChecklist detail={detail} onUpload={onUpload} />
    </div>
  );
}

// ── Documents tab ────────────────────────────────────────────────────────────
function DocumentsTab({ detail, onUpload }: { detail: Detail; onUpload: () => void }) {
  if (!detail.case_id) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: PC.line, color: PC.muted }}>
        Your document checklist will appear here once your agent opens your case.
      </div>
    );
  }
  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: PC.body }}>
        Upload each document below. Clear photos or PDFs are fine — your agent
        reviews everything before anything is lodged.
      </p>
      <DocumentChecklist detail={detail} onUpload={onUpload} />
      {detail.documents.length > 0 && (
        <>
          <div className="mt-6 mb-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PC.faint }}>
            Uploaded files
          </div>
          {detail.documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 border-b py-3 last:border-0"
              style={{ borderColor: PC.line2 }}
            >
              <FileText className="h-4 w-4 flex-none" style={{ color: PC.teal }} />
              <div className="min-w-0 flex-1 truncate text-sm" style={{ color: PC.ink }}>
                {d.file_name}
              </div>
              <span className="text-[11px] capitalize" style={{ color: PC.muted }}>
                {d.status}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function DocumentChecklist({ detail, onUpload }: { detail: Detail; onUpload: () => void }) {
  if (detail.checklist.length === 0) {
    return (
      <div className="text-sm" style={{ color: PC.muted }}>
        {detail.case_id
          ? "No checklist items yet."
          : "Your checklist will be ready once your case is opened."}
      </div>
    );
  }
  return (
    <div>
      {detail.checklist.map((c) => {
        const up = ["uploaded", "validated", "flagged"].includes(c.status);
        return (
          <div
            key={c.id}
            className="flex items-center gap-3.5 border-b py-3.5 last:border-0"
            style={{ borderColor: PC.line2 }}
          >
            <span
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px]"
              style={{
                background: up ? PC.tealTint : PC.soft2,
                color: up ? PC.teal : PC.muted,
              }}
            >
              {up ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold" style={{ color: PC.ink }}>
                {c.label}
                {c.required && (
                  <span className="ml-2 text-[11px] font-medium" style={{ color: PC.faint }}>
                    Required
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: PC.muted }}>
                {up ? "Received — your agent will review it." : c.description || "Not uploaded yet"}
              </div>
            </div>
            {up ? (
              <span className="text-[11px] font-semibold" style={{ color: PC.teal }}>
                Uploaded
              </span>
            ) : (
              <button
                onClick={onUpload}
                className={btnGhost("!px-3 !py-1.5 !text-[12.5px]")}
                style={{ borderColor: PC.line, color: PC.ink }}
              >
                Upload
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline ─────────────────────────────────────────────────────────────────
function TimelineTab({ detail }: { detail: Detail }) {
  return (
    <div className="pl-1.5">
      {detail.timeline.map((t, i) => {
        const last = i === detail.timeline.length - 1;
        const color =
          t.state === "done" ? PC.teal : t.state === "now" ? PC.purple : "#fff";
        return (
          <div key={t.key} className="grid grid-cols-[30px_1fr]">
            <div className="flex flex-col items-center">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: color,
                  color: t.state === "future" ? PC.faint : "#fff",
                  border: t.state === "future" ? `2px solid ${PC.line}` : "none",
                  boxShadow: t.state === "now" ? `0 0 0 4px ${PC.purpleMuted}` : "none",
                }}
              >
                {t.state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {!last && (
                <span className="my-1 w-0.5 flex-1" style={{ background: PC.line2, minHeight: 26 }} />
              )}
            </div>
            <div className="pb-5">
              <div
                className="text-sm font-semibold"
                style={{ color: t.state === "future" ? PC.faint : PC.ink }}
              >
                {t.title}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px]" style={{ color: PC.muted }}>
                {t.state !== "done" && t.state === "now" && <Clock className="h-3 w-3" />}
                {t.date
                  ? new Date(t.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : t.hint || (t.state === "now" ? "In progress" : "Upcoming")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sign modal ───────────────────────────────────────────────────────────────
function SignModal({
  detail,
  onClose,
  onSigned,
}: {
  detail: Detail;
  onClose: () => void;
  onSigned: () => void;
}) {
  const letter = detail.letter!;
  const [method, setMethod] = useState<"typed_name" | "drawn">("typed_name");
  const [name, setName] = useState("");
  const [drawn, setDrawn] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ready =
    consent &&
    ((method === "typed_name" && name.trim().length > 1) ||
      (method === "drawn" && !!drawn && name.trim().length > 1));

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await portalApi.sign(detail.application_id, {
        signer_name: name.trim(),
        method,
        signature_image_b64: method === "drawn" ? drawn || undefined : undefined,
        consent_given: consent,
      });
      onSigned();
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail || "Could not sign — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalModal
      title="Your engagement letter"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnGhost()} style={{ borderColor: PC.line, color: PC.ink }}>
            Close
          </button>
          <button
            onClick={submit}
            disabled={!ready || busy}
            className={btnPrimary()}
            style={{ background: PC.purple }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign agreement
          </button>
        </>
      }
    >
      <div
        className="prose prose-sm max-w-none rounded-xl border p-4 text-[13.5px] leading-relaxed"
        style={{ borderColor: PC.line2, background: PC.soft, color: PC.body }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {letter.rendered_body_md || "_No letter content._"}
        </ReactMarkdown>
        {letter.fee_lines.length > 0 && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: PC.line }}>
            {letter.fee_lines.map((f, i) => (
              <div key={i} className="flex justify-between py-1 text-[13px]">
                <span>{String((f as Record<string, unknown>).label ?? "")}</span>
                <span className="font-semibold">
                  A${String((f as Record<string, unknown>).amount_aud ?? "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: PC.ink }}>
          Type your full legal name to sign
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya Sharma"
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: PC.line }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        {(["typed_name", "drawn"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className="flex-1 rounded-[10px] border px-3 py-2 text-[13px] font-semibold"
            style={{
              borderColor: method === m ? PC.purple : PC.line,
              background: method === m ? PC.purpleTint : "#fff",
              color: method === m ? PC.purpleDeep : PC.muted,
            }}
          >
            {m === "typed_name" ? "Type my name" : "Draw signature"}
          </button>
        ))}
      </div>

      {method === "drawn" && (
        <div className="mt-3">
          <SignaturePad onChange={setDrawn} />
        </div>
      )}

      <label className="mt-4 flex items-start gap-2 text-[12.5px]" style={{ color: PC.muted }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        I have read and agree to this engagement agreement, and I&apos;m signing it
        electronically under the Electronic Transactions Act 1999 (Cth).
      </label>

      {err && (
        <p className="mt-3 text-[13px]" style={{ color: PC.rose }}>
          {err}
        </p>
      )}
    </PortalModal>
  );
}
