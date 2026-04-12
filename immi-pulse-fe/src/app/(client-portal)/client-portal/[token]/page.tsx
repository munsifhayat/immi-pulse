"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { usePortalVerify } from "@/lib/api/hooks/portal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion";

export default function ClientPortalPinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const verify = usePortalVerify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("Please enter the 6-digit PIN your consultant shared with you.");
      return;
    }
    try {
      await verify.mutateAsync({ token, pin });
      router.push(`/client-portal/${token}/documents`);
    } catch (err) {
      const apiMsg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.detail?.message ??
        "Verification failed. Double-check the PIN and try again.";
      setError(apiMsg);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Upload your documents
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your consultant sent you a 6-digit PIN. Enter it below to access your
          secure checklist.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="pin"
              className="text-xs font-medium text-muted-foreground"
            >
              6-digit PIN
            </label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] outline-none focus:border-primary"
              placeholder="• • • • • •"
            />
            {error && (
              <p className="text-[12px] font-medium text-red-600">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={verify.isPending || pin.length !== 6}
          >
            {verify.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Unlock portal
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Your session expires after 15 minutes of inactivity.
          </p>
        </form>
      </Card>
    </motion.div>
  );
}
