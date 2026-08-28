"use client";

// PAPER MODE UI: header toggle, banner, and the trading panel that replaces
// the real order entry + positions area while paper mode is on.
// Talks only to our backend; never touches Orderly order flow.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  paperApi,
  usePaperMode,
  type PaperAccountView,
} from "./paperMode";

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PaperToggle() {
  const { available, enabled, setEnabled } = usePaperMode();
  if (!available) return null;
  return (
    <button
      className={`tt-paper-toggle${enabled ? " on" : ""}`}
      onClick={() => setEnabled(!enabled)}
      title="Toggle paper trading mode (simulated 10,000 USDC, live prices, no real orders)"
    >
      PAPER MODE {enabled ? "ON" : "OFF"}
    </button>
  );
}

export function PaperBanner() {
  const { enabled } = usePaperMode();
  if (!enabled) return null;
  return (
    <div className="tt-paper-banner">
      PAPER TRADING: SIMULATED FUNDS, LIVE PRICES. NO REAL ORDERS ARE SENT.
    </div>
  );
}

export function PaperPanel({ symbol }: { symbol: string }) {
  const { enabled, wallet } = usePaperMode();
  const [account, setAccount] = useState<PaperAccountView | null>(null);
  const [offline, setOffline] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    try {
      const a = await paperApi.account(wallet);
      setAccount(a);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [wallet]);

  useEffect(() => {
    if (!enabled || !wallet) return;
    void refresh();
    timer.current = setInterval(() => void refresh(), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled, wallet, refresh]);

  if (!enabled) return null;

  if (offline) {
    return (
      <div className="tt-paper-panel">
        <div className="tt-paper-head">PAPER TRADING</div>
        <div className="tt-paper-offline">PAPER API OFFLINE. TRY AGAIN LATER.</div>
      </div>
    );
  }

  const submit = async () => {
    setMsg(null);
    const q = Number(qty);
    if (!(q > 0)) return setMsg("ENTER A QUANTITY");
    if (type === "LIMIT" && !(Number(price) > 0)) return setMsg("ENTER A LIMIT PRICE");
    setBusy(true);
    try {
      const r = await paperApi.placeOrder({
        wallet,
        symbol,
        side,
        type,
        qty: q,
        price: type === "LIMIT" ? Number(price) : null,
        leverage,
      });
      setAccount(r.account);
      setMsg(
        r.order.status === "FILLED"
          ? `FILLED @ ${fmt(Number((r.order as any).filledPrice ?? 0))}`
          : "LIMIT ORDER PLACED",
      );
      setQty("");
    } catch (e) {
      setMsg(String((e as Error).message).toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const close = async (sym: string) => {
    setBusy(true);
    try {
      const r = await paperApi.closePosition(wallet, sym);
      setAccount(r.account);
      setMsg(`CLOSED ${sym.replace("PERP_", "").replace("_USDC", "")} PNL ${fmt(r.fill.realizedPnl)}`);
    } catch (e) {
      setMsg(String((e as Error).message).toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await paperApi.cancelOrder(wallet, id);
      void refresh();
    } catch {}
  };

  const reset = async () => {
    if (!window.confirm("Reset paper account to 10,000 USDC? All positions and history wiped.")) return;
    const a = await paperApi.reset(wallet).catch(() => null);
    if (a) setAccount(a);
  };

  const pair = symbol.replace("PERP_", "").replace("_USDC", "/USDC");

  return (
    <div className="tt-paper-panel">
      <div className="tt-paper-head">
        <span>PAPER TRADING</span>
        <button className="tt-paper-reset" onClick={reset}>RESET</button>
      </div>

      <div className="tt-paper-stats">
        <div>
          <label>BALANCE</label>
          <b>${account ? fmt(account.balance) : "…"}</b>
        </div>
        <div>
          <label>EQUITY</label>
          <b>${account ? fmt(account.equity) : "…"}</b>
        </div>
        <div>
          <label>PNL %</label>
          <b className={account && account.pnlPercent < 0 ? "neg" : "pos"}>
            {account ? `${account.pnlPercent >= 0 ? "+" : ""}${fmt(account.pnlPercent)}%` : "…"}
          </b>
        </div>
      </div>

      <div className="tt-paper-tabs">
        {(["MARKET", "LIMIT"] as const).map((t) => (
          <button key={t} className={type === t ? "active" : ""} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="tt-paper-sides">
        <button className={`long${side === "BUY" ? " active" : ""}`} onClick={() => setSide("BUY")}>
          LONG
        </button>
        <button className={`short${side === "SELL" ? " active" : ""}`} onClick={() => setSide("SELL")}>
          SHORT
        </button>
      </div>

      <label className="tt-paper-label">SIZE ({pair.split("/")[0]})</label>
      <input
        className="tt-paper-input"
        inputMode="decimal"
        placeholder="0.00"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
      {type === "LIMIT" && (
        <>
          <label className="tt-paper-label">LIMIT PRICE (USDC)</label>
          <input
            className="tt-paper-input"
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </>
      )}
      <label className="tt-paper-label">LEVERAGE: {leverage}X</label>
      <input
        type="range"
        min={1}
        max={50}
        value={leverage}
        onChange={(e) => setLeverage(Number(e.target.value))}
        className="tt-paper-slider"
      />

      <button
        className={`tt-paper-submit ${side === "BUY" ? "long" : "short"}`}
        disabled={busy}
        onClick={submit}
      >
        {side === "BUY" ? "LONG" : "SHORT"} {pair.split("/")[0]} ({type})
      </button>

      {msg && <div className="tt-paper-msg">{msg}</div>}

      {account && account.positions.length > 0 && (
        <div className="tt-paper-section">
          <div className="tt-paper-subhead">POSITIONS</div>
          {account.positions.map((p) => (
            <div className="tt-paper-pos" key={p.symbol}>
              <div className="row1">
                <b>{p.symbol.replace("PERP_", "").replace("_USDC", "")}</b>
                <span className={p.qty > 0 ? "pos" : "neg"}>
                  {p.qty > 0 ? "LONG" : "SHORT"} {fmt(Math.abs(p.qty), 4)} @ {fmt(p.entryPrice)}
                </span>
              </div>
              <div className="row2">
                <span>MARK {fmt(p.markPrice)}</span>
                <span>LIQ {fmt(p.liqPrice)}</span>
                <span className={p.unrealizedPnl >= 0 ? "pos" : "neg"}>
                  UPNL {p.unrealizedPnl >= 0 ? "+" : ""}
                  {fmt(p.unrealizedPnl)}
                </span>
                <button onClick={() => close(p.symbol)} disabled={busy}>CLOSE</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {account && account.openOrders.length > 0 && (
        <div className="tt-paper-section">
          <div className="tt-paper-subhead">OPEN ORDERS</div>
          {account.openOrders.map((o) => (
            <div className="tt-paper-pos" key={o.id}>
              <div className="row2">
                <span>
                  {o.side} {fmt(o.qty, 4)} {o.symbol.replace("PERP_", "").replace("_USDC", "")} @ {o.price != null ? fmt(o.price) : "MKT"}
                </span>
                <button onClick={() => cancel(o.id)}>CANCEL</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {account && account.history.length > 0 && (
        <div className="tt-paper-section">
          <div className="tt-paper-subhead">HISTORY</div>
          {account.history.slice(0, 8).map((f) => (
            <div className="tt-paper-hist" key={f.id}>
              <span>{f.side}</span>
              <span>{f.symbol.replace("PERP_", "").replace("_USDC", "")}</span>
              <span>{fmt(f.qty, 4)} @ {fmt(f.price)}</span>
              <span className={f.realizedPnl >= 0 ? "pos" : "neg"}>
                {f.reason === "LIQUIDATION" ? "LIQ " : ""}
                {f.realizedPnl !== 0 ? fmt(f.realizedPnl) : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
