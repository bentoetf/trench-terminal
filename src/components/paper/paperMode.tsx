"use client";

// Paper trading mode: client-side state + tiny API client for the
// trench-terminal-backend paper engine. Toggle persists in localStorage.
// If NEXT_PUBLIC_PAPER_API is unset, paper mode is hidden entirely.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const PAPER_API = process.env.NEXT_PUBLIC_PAPER_API ?? "";

const LS_KEY = "trench:paperMode";
const LS_WALLET = "trench:paperWallet";

// Paper accounts are keyed by EVM address. If no wallet is connected we mint
// a random local identity so anyone can paper trade with zero setup.
export function getPaperWallet(): string {
  if (typeof window === "undefined") return "0x0000000000000000000000000000000000000000";
  let w = window.localStorage.getItem(LS_WALLET);
  if (!w) {
    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    w = "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(LS_WALLET, w);
  }
  return w;
}

interface PaperModeCtx {
  available: boolean;
  enabled: boolean;
  setEnabled(v: boolean): void;
  wallet: string;
}

const Ctx = createContext<PaperModeCtx>({
  available: false,
  enabled: false,
  setEnabled: () => {},
  wallet: "",
});

export function PaperModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    setEnabledState(window.localStorage.getItem(LS_KEY) === "1");
    setWallet(getPaperWallet());
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    window.localStorage.setItem(LS_KEY, v ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ available: Boolean(PAPER_API), enabled: enabled && Boolean(PAPER_API), setEnabled, wallet }),
    [enabled, setEnabled, wallet],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePaperMode() {
  return useContext(Ctx);
}

// --- API client ---

export interface PaperPositionView {
  symbol: string;
  qty: number;
  entryPrice: number;
  leverage: number;
  margin: number;
  markPrice: number;
  unrealizedPnl: number;
  liqPrice: number;
  notional: number;
}

export interface PaperOrderView {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  price: number | null;
  qty: number;
  leverage: number;
  status: string;
  createdAt: number;
}

export interface PaperFillView {
  id: string;
  symbol: string;
  side: string;
  price: number;
  qty: number;
  fee: number;
  realizedPnl: number;
  reason: string;
  timestamp: number;
}

export interface PaperAccountView {
  wallet: string;
  balance: number;
  equity: number;
  marginLocked: number;
  unrealizedPnl: number;
  startBalance: number;
  pnlPercent: number;
  positions: PaperPositionView[];
  openOrders: PaperOrderView[];
  history: PaperFillView[];
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${PAPER_API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export const paperApi = {
  account: (wallet: string): Promise<PaperAccountView> =>
    req(`/paper/accounts`, { method: "POST", body: JSON.stringify({ wallet }) }),
  reset: (wallet: string): Promise<PaperAccountView> =>
    req(`/paper/accounts/${wallet}/reset`, { method: "POST" }),
  placeOrder: (p: {
    wallet: string;
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    qty: number;
    price?: number | null;
    leverage?: number;
  }): Promise<{ order: PaperOrderView; account: PaperAccountView }> =>
    req(`/paper/orders`, { method: "POST", body: JSON.stringify(p) }),
  cancelOrder: (wallet: string, id: string) =>
    req(`/paper/orders/${id}?wallet=${wallet}`, { method: "DELETE" }),
  closePosition: (wallet: string, symbol: string): Promise<{ fill: PaperFillView; account: PaperAccountView }> =>
    req(`/paper/positions/close`, { method: "POST", body: JSON.stringify({ wallet, symbol }) }),
};
