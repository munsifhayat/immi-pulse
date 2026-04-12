"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  EyeOff,
  Flag,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useActOnReport,
  useCommunityReports,
} from "@/lib/api/hooks/community";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeUp, stagger } from "@/lib/motion";

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misleading_advice: "Misleading advice",
  other: "Other",
};

export default function ModerationPage() {
  const reports = useCommunityReports();
  const actOnReport = useActOnReport();

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-foreground"
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Flag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Community moderation
            </h2>
            <p className="text-sm text-muted-foreground">
              Review user-submitted reports. Hide removes from the public feed
              but keeps the record; Remove tombstones the content entirely.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        {reports.isLoading ? (
          <Card className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading reports…
          </Card>
        ) : reports.isError ? (
          <Card className="p-10 text-center text-muted-foreground">
            Couldn&apos;t load the moderation queue.
          </Card>
        ) : (reports.data ?? []).length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium">All caught up.</p>
            <p className="text-xs text-muted-foreground">
              No open reports right now.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {(reports.data ?? []).map((report) => (
              <Card key={report.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {report.target_type}
                      </Badge>
                      <Badge variant="secondary">
                        {reasonLabels[report.reason] ?? report.reason}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Reported{" "}
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {report.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Target ID: <code>{report.target_id}</code>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 lg:w-40">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actOnReport.isPending}
                      onClick={() =>
                        actOnReport.mutate({
                          report_id: report.id,
                          action: "hide",
                        })
                      }
                    >
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actOnReport.isPending}
                      onClick={() =>
                        actOnReport.mutate({
                          report_id: report.id,
                          action: "remove",
                        })
                      }
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actOnReport.isPending}
                      onClick={() =>
                        actOnReport.mutate({
                          report_id: report.id,
                          action: "dismiss",
                        })
                      }
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
