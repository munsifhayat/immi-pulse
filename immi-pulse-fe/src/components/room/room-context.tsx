"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  useAllowance,
  useCommunityAccount,
  useIdentity,
  type AllowanceOut,
  type CommunityAccount,
  type CommunityIdentity,
} from "@/lib/api/hooks/community";

export type AccountDialogMode = "signup" | "login";

/** Which action family a write belongs to — mirrors the backend's three. */
export type WriteAction = "post" | "reply";

interface RoomContextValue {
  /** The signed-in member, or null for a visitor. */
  account: CommunityAccount | null;
  accountLoading: boolean;
  /** This browser's anonymous identity — the handle a signup would claim. */
  identity?: CommunityIdentity;
  allowance?: AllowanceOut;

  /** Left-rail queue filter, shared with the centre feed. */
  queue: string;
  setQueue: (id: string) => void;
  /** Right-rail search box, shared with the centre feed. */
  search: string;
  setSearch: (q: string) => void;

  accountDialog: AccountDialogMode | null;
  openAccount: (mode?: AccountDialogMode) => void;
  closeAccount: () => void;

  /**
   * Gate a write *before* it is attempted.
   *
   * Returns true when the member may go ahead. Otherwise it opens the right
   * prompt and returns false — so the caller never fires a request it already
   * knows will be refused. Being told "no" after you have finished typing is a
   * far worse experience than being told up front, which is the whole reason
   * the read-only allowance endpoint exists.
   */
  canWrite: (action: WriteAction) => boolean;
  /** Why a write is blocked right now, or null when it isn't. */
  writeBlock: (action: WriteAction) => "no-account" | "spent" | null;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { data: account = null, isLoading: accountLoading } =
    useCommunityAccount();
  const { data: identity } = useIdentity();
  // Only signed-in members have an allowance to read; a visitor is gated on
  // having no account at all, which needs no request to determine.
  const { data: allowance } = useAllowance(!!account);

  const [queue, setQueue] = useState("all");
  const [search, setSearch] = useState("");
  const [accountDialog, setAccountDialog] = useState<AccountDialogMode | null>(
    null
  );

  const openAccount = useCallback(
    (mode: AccountDialogMode = "signup") => setAccountDialog(mode),
    []
  );
  const closeAccount = useCallback(() => setAccountDialog(null), []);

  const writeBlock = useCallback(
    (action: WriteAction): "no-account" | "spent" | null => {
      if (!account) return "no-account";
      // No allowance loaded yet → let the write through. Guessing "blocked"
      // from missing data would lock out a member for a slow request.
      const left = allowance?.actions?.[action]?.remaining;
      if (left != null && left <= 0) return "spent";
      return null;
    },
    [account, allowance]
  );

  const canWrite = useCallback(
    (action: WriteAction) => {
      const block = writeBlock(action);
      if (block === "no-account") {
        openAccount("signup");
        return false;
      }
      return block === null;
    },
    [writeBlock, openAccount]
  );

  const value = useMemo<RoomContextValue>(
    () => ({
      account,
      accountLoading,
      identity,
      allowance,
      queue,
      setQueue,
      search,
      setSearch,
      accountDialog,
      openAccount,
      closeAccount,
      canWrite,
      writeBlock,
    }),
    [
      account,
      accountLoading,
      identity,
      allowance,
      queue,
      search,
      accountDialog,
      openAccount,
      closeAccount,
      canWrite,
      writeBlock,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}
