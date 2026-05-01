"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { orgApi, type SeatRow } from "@/lib/api/services";

export default function TeamPage() {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("consultant");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setSeats(await orgApi.listSeats());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendInvite = async () => {
    setBusy(true);
    try {
      const result = await orgApi.invite(email, role);
      setInviteLink(result.invite_link);
      setEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (seatId: string) => {
    if (!confirm("Remove this seat?")) return;
    await orgApi.removeSeat(seatId);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage seats and invite new team members.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setInviteLink(null); }}>
          <DialogTrigger asChild>
            <Button>+ Invite member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
            </DialogHeader>
            {inviteLink ? (
              <div className="space-y-3">
                <p className="text-sm">Invite created. Share this link:</p>
                <Input readOnly value={inviteLink} onClick={(e) => (e.target as HTMLInputElement).select()} />
                <p className="text-xs text-muted-foreground">
                  (Email delivery via Resend — coming soon. For now copy the link.)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              {inviteLink ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <Button onClick={sendInvite} disabled={busy || !email.trim()}>
                  {busy ? "Creating…" : "Create invite"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seats ({seats.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : seats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seats yet.</p>
          ) : (
            <div className="divide-y">
              {seats.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {s.user_name || s.invited_email || s.user_email || "(unknown)"}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.user_email || s.invited_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.role}</Badge>
                    <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                    {s.role !== "owner" && (
                      <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
