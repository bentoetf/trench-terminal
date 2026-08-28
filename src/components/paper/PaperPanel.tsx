"use client";

// PAPER MODE UI: header toggle, banner, and the trading panel that replaces
// the real order entry + positions area while paper mode is on.
// Talks only to our backend; never touches Orderly order flow.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  paperApi,
  usePaperMode,
  type PaperAccountView,
} from "./paperMode";

const PAPER_EVT = "tt-paper-updated";
const emitPaperUpdate = () => window.dispatchEvent(new Event(PAPER_EVT));

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PaperToggle() {
  const { available, enabled, setEnabled } = usePaperMode();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Mount the toggle INSIDE the SDK header's right-side flex cluster so it
  // occupies real layout space on every page (trade, portfolio, markets,
  // leaderboard) instead of floating over other header widgets.
  useEffect(() => {
    if (!available) return;
    let dead = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const mount = () => {
      if (dead) return;
      const header = document.querySelector<HTMLElement>(
        ".oui-scaffold-topNavbar header, .oui-scaffold-topNavbar",
      );
      const right = header?.lastElementChild as HTMLElement | null;
      if (right) {
        let s = right.querySelector<HTMLElement>(".tt-paper-toggle-slot");
        if (!s) {
          s = document.createElement("span");
          s.className = "tt-paper-toggle-slot";
          right.insertBefore(s, right.firstChild);
        }
        setSlot(s);
        return;
      }
      if (tries++ < 60) timer = setTimeout(mount, 500);
    };
    mount();
    // SDK may re-render the header on route changes; re-check periodically.
    const watch = setInterval(() => {
      const s = document.querySelector<HTMLElement>(".tt-paper-toggle-slot");
      if (!s || !s.isConnected) {
        tries = 0;
        mount();
      }
    }, 2000);
    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
      clearInterval(watch);
    };
  }, [available]);

  if (!available) return null;
  const btn = (
    <button
      className={`tt-paper-toggle${enabled ? " on" : ""}${slot ? " inline" : ""}`}
      onClick={() => setEnabled(!enabled)}
      title="Toggle paper trading mode (simulated 10,000 USDC, live prices, no real orders)"
    >
      PAPER MODE {enabled ? "ON" : "OFF"}
    </button>
  );
  // Fallback: fixed position until (or unless) the header slot exists.
  return slot ? createPortal(btn, slot) : btn;
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

// Overlays the SDK bottom positions pane with a tabbed paper view while
// paper mode is on, mirroring the live Orderly widget's tab bar. The SDK
// widget knows nothing about paper trades, so we cover it.

const DOCK_TABS = [
  "POSITIONS",
  "PENDING",
  "TP/SL",
  "FILLED",
  "POSITION HISTORY",
  "ORDER HISTORY",
  "LIQUIDATION",
  "ASSETS",
] as const;
type DockTab = (typeof DOCK_TABS)[number];

const sym = (s: string) => s.replace("PERP_", "").replace("_USDC", "");
const ts = (t: number) =>
  new Date(t).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function Empty({ label }: { label: string }) {
  return <div className="tt-paper-dock-empty">{label}</div>;
}

export function PaperPositionsDock() {
  const { enabled, wallet } = usePaperMode();
  const [account, setAccount] = useState<PaperAccountView | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DockTab>("POSITIONS");

  const refresh = useCallback(async () => {
    if (!wallet) return;
    try {
      const a = await paperApi.account(wallet);
      if (a) setAccount(a);
    } catch {}
  }, [wallet]);

  useEffect(() => {
    if (!enabled || !wallet) return;
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    const onEvt = () => void refresh();
    window.addEventListener(PAPER_EVT, onEvt);
    return () => {
      clearInterval(t);
      window.removeEventListener(PAPER_EVT, onEvt);
    };
  }, [enabled, wallet, refresh]);

  // Locate the SDK bottom pane (desktop vertical split, last pane). Retry
  // briefly because the SDK renders async.
  useEffect(() => {
    if (!enabled) {
      setHost(null);
      return;
    }
    let tries = 0;
    const find = () => {
      if (window.innerWidth <= 768) return; // desktop-only dock
      const el = document.querySelector<HTMLElement>(
        ".w-split-vertical > .w-split-pane:last-of-type",
      );
      if (el) {
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        setHost(el);
        return;
      }
      if (tries++ < 40) setTimeout(find, 500);
    };
    find();
  }, [enabled]);

  if (!enabled || !host) return null;

  const close = async (symbolFull: string) => {
    setBusy(true);
    try {
      const r = await paperApi.closePosition(wallet, symbolFull);
      setAccount(r.account);
      emitPaperUpdate();
    } catch {} finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    try {
      await paperApi.cancelOrder(wallet, id);
      await refresh();
      emitPaperUpdate();
    } catch {} finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Reset paper account to 10,000 USDC? All positions and history wiped.")) return;
    setBusy(true);
    try {
      const a = await paperApi.reset(wallet);
      setAccount(a);
      emitPaperUpdate();
    } catch (e) {
      window.alert(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const positions = account?.positions ?? [];
  const openOrders = account?.openOrders ?? [];
  const fills = account?.history ?? [];
  const orders = account?.orders ?? [];
  const closedPositions = account?.closedPositions ?? [];
  const liquidations = closedPositions.filter((c) => c.reason === "LIQUIDATION");

  const posneg = (n: number) => (n >= 0 ? "pos" : "neg");
  const signed = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${fmt(n, d)}`;

  let body: ReactNode;
  switch (tab) {
    case "POSITIONS":
      body = positions.length === 0 ? (
        <Empty label="NO OPEN PAPER POSITIONS." />
      ) : (
        <table>
          <thead>
            <tr>
              <th>MARKET</th><th>SIDE</th><th>QTY</th><th>ENTRY</th><th>MARK</th><th>LIQ</th><th>NOTIONAL</th><th>UPNL</th><th />
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.symbol}>
                <td><b>{sym(p.symbol)}</b></td>
                <td className={p.qty > 0 ? "pos" : "neg"}>{p.qty > 0 ? "LONG" : "SHORT"} {p.leverage}X</td>
                <td>{fmt(Math.abs(p.qty), 4)}</td>
                <td>{fmt(p.entryPrice)}</td>
                <td>{fmt(p.markPrice)}</td>
                <td>{fmt(p.liqPrice)}</td>
                <td>{fmt(p.notional)}</td>
                <td className={posneg(p.unrealizedPnl)}>{signed(p.unrealizedPnl)}</td>
                <td><button onClick={() => close(p.symbol)} disabled={busy}>CLOSE</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "PENDING":
      body = openOrders.length === 0 ? (
        <Empty label="NO PENDING PAPER ORDERS." />
      ) : (
        <table>
          <thead>
            <tr><th>MARKET</th><th>SIDE</th><th>QTY</th><th>LIMIT PRICE</th><th>CREATED</th><th /></tr>
          </thead>
          <tbody>
            {openOrders.map((o) => (
              <tr key={o.id}>
                <td><b>{sym(o.symbol)}</b></td>
                <td className={o.side === "BUY" ? "pos" : "neg"}>{o.side} {o.leverage}X</td>
                <td>{fmt(o.qty, 4)}</td>
                <td>{o.price != null ? fmt(o.price) : "MKT"}</td>
                <td>{ts(o.createdAt)}</td>
                <td><button onClick={() => cancel(o.id)} disabled={busy}>CANCEL</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "TP/SL":
      body = <Empty label="TP/SL ORDERS: COMING SOON TO PAPER MODE." />;
      break;
    case "FILLED":
      body = fills.length === 0 ? (
        <Empty label="NO PAPER FILLS YET." />
      ) : (
        <table>
          <thead>
            <tr><th>MARKET</th><th>SIDE</th><th>QTY</th><th>FILL PRICE</th><th>FEE</th><th>REALIZED PNL</th><th>TYPE</th><th>TIME</th></tr>
          </thead>
          <tbody>
            {fills.map((f) => (
              <tr key={f.id}>
                <td><b>{sym(f.symbol)}</b></td>
                <td className={f.side === "BUY" ? "pos" : "neg"}>{f.side}</td>
                <td>{fmt(f.qty, 4)}</td>
                <td>{fmt(f.price)}</td>
                <td>{fmt(f.fee, 4)}</td>
                <td className={posneg(f.realizedPnl)}>{f.realizedPnl !== 0 ? signed(f.realizedPnl) : "-"}</td>
                <td>{f.reason}</td>
                <td>{ts(f.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "POSITION HISTORY":
      body = closedPositions.length === 0 ? (
        <Empty label="NO CLOSED PAPER POSITIONS YET." />
      ) : (
        <table>
          <thead>
            <tr><th>MARKET</th><th>SIDE</th><th>QTY</th><th>ENTRY</th><th>EXIT</th><th>REALIZED PNL</th><th>REASON</th><th>OPENED</th><th>CLOSED</th></tr>
          </thead>
          <tbody>
            {closedPositions.map((c) => (
              <tr key={c.id}>
                <td><b>{sym(c.symbol)}</b></td>
                <td className={c.side === "LONG" ? "pos" : "neg"}>{c.side}</td>
                <td>{fmt(c.qty, 4)}</td>
                <td>{fmt(c.entryPrice)}</td>
                <td>{fmt(c.exitPrice)}</td>
                <td className={posneg(c.realizedPnl)}>{signed(c.realizedPnl)}</td>
                <td>{c.reason}</td>
                <td>{ts(c.openedAt)}</td>
                <td>{ts(c.closedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "ORDER HISTORY":
      body = orders.length === 0 ? (
        <Empty label="NO PAPER ORDERS YET." />
      ) : (
        <table>
          <thead>
            <tr><th>MARKET</th><th>SIDE</th><th>TYPE</th><th>QTY</th><th>PRICE</th><th>FILL PRICE</th><th>STATUS</th><th>CREATED</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><b>{sym(o.symbol)}</b></td>
                <td className={o.side === "BUY" ? "pos" : "neg"}>{o.side} {o.leverage}X</td>
                <td>{o.type}</td>
                <td>{fmt(o.qty, 4)}</td>
                <td>{o.price != null ? fmt(o.price) : "MKT"}</td>
                <td>{o.filledPrice != null ? fmt(o.filledPrice) : "-"}</td>
                <td>{o.status}</td>
                <td>{ts(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "LIQUIDATION":
      body = liquidations.length === 0 ? (
        <Empty label="NO PAPER LIQUIDATIONS. KEEP IT THAT WAY." />
      ) : (
        <table>
          <thead>
            <tr><th>MARKET</th><th>SIDE</th><th>QTY</th><th>ENTRY</th><th>LIQ PRICE</th><th>LOSS</th><th>TIME</th></tr>
          </thead>
          <tbody>
            {liquidations.map((c) => (
              <tr key={c.id}>
                <td><b>{sym(c.symbol)}</b></td>
                <td className={c.side === "LONG" ? "pos" : "neg"}>{c.side}</td>
                <td>{fmt(c.qty, 4)}</td>
                <td>{fmt(c.entryPrice)}</td>
                <td>{fmt(c.exitPrice)}</td>
                <td className="neg">{fmt(c.realizedPnl)}</td>
                <td>{ts(c.closedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "ASSETS":
      body = account ? (
        <div className="tt-paper-assets">
          <div className="tt-paper-assets-grid">
            <div><label>BALANCE (FREE COLLATERAL)</label><b>${fmt(account.balance)}</b></div>
            <div><label>EQUITY</label><b>${fmt(account.equity)}</b></div>
            <div><label>UNREALIZED PNL</label><b className={posneg(account.unrealizedPnl)}>{signed(account.unrealizedPnl)}</b></div>
            <div><label>MARGIN USED</label><b>${fmt(account.marginLocked)}</b></div>
            <div><label>START BALANCE</label><b>${fmt(account.startBalance)}</b></div>
            <div><label>PNL %</label><b className={posneg(account.pnlPercent)}>{signed(account.pnlPercent)}%</b></div>
          </div>
          <button className="tt-paper-assets-reset" onClick={reset} disabled={busy}>
            RESET ACCOUNT TO 10,000 USDC
          </button>
          <div className="tt-paper-assets-note">1 RESET PER 24H. RESETS LOCKED DURING ACTIVE COMPETITIONS.</div>
        </div>
      ) : (
        <Empty label="LOADING ACCOUNT..." />
      );
      break;
  }

  const counts: Partial<Record<DockTab, number>> = {
    POSITIONS: positions.length,
    PENDING: openOrders.length,
  };

  return createPortal(
    <div className="tt-paper-dock">
      <div className="tt-paper-dock-head">
        <span>PAPER</span>
        <span className="bal">
          BAL ${account ? fmt(account.balance) : "…"} · EQUITY ${account ? fmt(account.equity) : "…"} ·{" "}
          <span className={account && account.unrealizedPnl < 0 ? "neg" : "pos"}>
            UPNL {account && account.unrealizedPnl >= 0 ? "+" : ""}
            {account ? fmt(account.unrealizedPnl) : "…"}
          </span>
        </span>
      </div>
      <div className="tt-paper-dock-tabs" role="tablist">
        {DOCK_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {counts[t] ? ` (${counts[t]})` : ""}
          </button>
        ))}
      </div>
      <div className="tt-paper-dock-body">{body}</div>
    </div>,
    host,
  );
}

// Live mark price straight from Orderly's public endpoint so the paper
// ticket can do qty<->total linking and est. liq math without SDK hooks.
function useMark(symbol: string, enabled: boolean) {
  const [mark, setMark] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    const pull = async () => {
      try {
        const r = await fetch(`https://api.orderly.org/v1/public/futures/${symbol}`);
        const j = await r.json();
        const p = Number(j?.data?.mark_price);
        if (!dead && Number.isFinite(p) && p > 0) setMark(p);
      } catch {}
    };
    void pull();
    const t = setInterval(() => void pull(), 5000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [symbol, enabled]);
  return mark;
}

const TAKER_PCT = 0.05; // matches backend TAKER_FEE_BPS = 5
const MAKER_PCT = 0.05;
const MMR = 0.005; // backend MAINT_MARGIN_RATE

export function PaperPanel({ symbol }: { symbol: string }) {
  const { enabled, wallet } = usePaperMode();
  const [account, setAccount] = useState<PaperAccountView | null>(null);
  const [offline, setOffline] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("LIMIT");
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [price, setPrice] = useState("");
  const [pct, setPct] = useState(0);
  const [leverage, setLeverage] = useState(10);
  const [levOpen, setLevOpen] = useState(false);
  const [orderConfirm, setOrderConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mark = useMark(symbol, enabled);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    try {
      const a = await paperApi.account(wallet);
      if (a) setAccount(a);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [wallet]);

  useEffect(() => {
    // Small screens: start collapsed so the sheet doesn't bury the chart.
    if (typeof window !== "undefined" && window.innerWidth <= 768) setCollapsed(true);
  }, []);

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
      emitPaperUpdate();
      setMsg(
        r.order.status === "FILLED"
          ? `FILLED @ ${fmt(Number((r.order as any).filledPrice ?? 0))}`
          : "LIMIT ORDER PLACED",
      );
      setQty("");
      setTotal("");
      setPct(0);
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
      emitPaperUpdate();
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
      emitPaperUpdate();
    } catch {}
  };

  const reset = async () => {
    if (!window.confirm("Reset paper account to 10,000 USDC? All positions and history wiped.")) return;
    setMsg(null);
    setBusy(true);
    try {
      const a = await paperApi.reset(wallet);
      setAccount(a);
      emitPaperUpdate();
      setMsg("ACCOUNT RESET TO 10,000 USDC");
    } catch (e) {
      setMsg(String((e as Error).message).toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const pair = symbol.replace("PERP_", "").replace("_USDC", "/USDC");
  const base = pair.split("/")[0];

  // Effective price for calcs: limit price if set in LIMIT mode, else mark.
  const calcPrice = type === "LIMIT" && Number(price) > 0 ? Number(price) : mark;

  const linkQty = (v: string) => {
    setQty(v);
    const q = Number(v);
    setTotal(q > 0 && calcPrice > 0 ? (q * calcPrice).toFixed(2) : "");
    setPct(0);
  };
  const linkTotal = (v: string) => {
    setTotal(v);
    const t = Number(v);
    setQty(t > 0 && calcPrice > 0 ? (t / calcPrice).toFixed(4) : "");
    setPct(0);
  };

  const free = account?.balance ?? 0;
  // Max qty: free collateral * leverage / price, with a fee haircut.
  const maxQty =
    calcPrice > 0 ? Math.max(0, (free * leverage) / calcPrice / (1 + (TAKER_PCT / 100) * leverage)) : 0;

  const applyPct = (p: number) => {
    setPct(p);
    if (maxQty <= 0) return;
    const q = (maxQty * p) / 100;
    setQty(q > 0 ? q.toFixed(4) : "");
    setTotal(q > 0 && calcPrice > 0 ? (q * calcPrice).toFixed(2) : "");
  };

  const qn = Number(qty) || 0;
  const estMargin = calcPrice > 0 && qn > 0 ? (qn * calcPrice) / leverage : 0;
  const estFee = calcPrice > 0 && qn > 0 ? qn * calcPrice * (TAKER_PCT / 100) : 0;
  const d = 1 / leverage - MMR;
  const entryEst = calcPrice;
  const estLiq =
    qn > 0 && entryEst > 0
      ? side === "BUY"
        ? entryEst * (1 - d)
        : entryEst * (1 + d)
      : 0;

  if (collapsed) {
    return (
      <div className="tt-paper-panel collapsed">
        <div className="tt-paper-head">
          <span>PAPER TRADING</span>
          <span className="tt-paper-head-summary">
            {account ? `$${fmt(account.equity)}` : ""}
          </span>
          <button className="tt-paper-collapse" onClick={() => setCollapsed(false)}>
            OPEN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-paper-panel">
      <div className="tt-paper-head">
        <span>PAPER TRADING</span>
        <span style={{ marginLeft: "auto" }} />
        <button className="tt-paper-reset" onClick={reset} disabled={busy}>RESET</button>
        <button className="tt-paper-collapse" onClick={() => setCollapsed(true)}>HIDE</button>
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

      {/* BUY / SELL tabs, mirrors the live Orderly ticket */}
      <div className="tt-ticket-sides">
        <button
          className={`buy${side === "BUY" ? " active" : ""}`}
          onClick={() => setSide("BUY")}
        >
          BUY
        </button>
        <button
          className={`sell${side === "SELL" ? " active" : ""}`}
          onClick={() => setSide("SELL")}
        >
          SELL
        </button>
      </div>

      {/* Order type + leverage row */}
      <div className="tt-ticket-typerow">
        <select
          className="tt-ticket-type"
          value={type}
          onChange={(e) => setType(e.target.value as "MARKET" | "LIMIT")}
        >
          <option value="LIMIT">Limit</option>
          <option value="MARKET">Market</option>
          <option disabled>Stop limit</option>
          <option disabled>Stop market</option>
        </select>
        <button className="tt-ticket-lev" onClick={() => setLevOpen(!levOpen)}>
          Isolated {leverage}X
        </button>
      </div>
      {levOpen && (
        <div className="tt-ticket-levpop">
          <label className="tt-paper-label">LEVERAGE: {leverage}X</label>
          <input
            type="range"
            min={1}
            max={50}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="tt-paper-slider"
          />
        </div>
      )}

      {/* Available row */}
      <div className="tt-ticket-avail">
        <span>Available</span>
        <span>
          <b>{account ? fmt(account.balance) : "0"}</b> USDC
        </span>
      </div>

      {/* Price input (LIMIT only active; MARKET shows mark, disabled) */}
      <div className={`tt-ticket-input${type === "MARKET" ? " disabled" : ""}`}>
        <div className="lab">
          <span>Price</span>
          <span>USDC</span>
        </div>
        <div className="valrow">
          <input
            inputMode="decimal"
            placeholder="0"
            disabled={type === "MARKET"}
            value={type === "MARKET" ? (mark > 0 ? fmt(mark) : "Market") : price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {type === "LIMIT" && (
            <span className="chips">
              <button className="bbo off" disabled title="BBO not available in paper mode">
                BBO
              </button>
              {mark > 0 && (
                <button className="mid" onClick={() => setPrice(String(mark))}>
                  Mid
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Qty + Total, linked */}
      <div className="tt-ticket-qtyrow">
        <div className="tt-ticket-input half">
          <div className="lab">
            <span>Qty</span>
            <span>{base}</span>
          </div>
          <div className="valrow">
            <input
              inputMode="decimal"
              placeholder="0"
              value={qty}
              onChange={(e) => linkQty(e.target.value)}
            />
          </div>
        </div>
        <div className="tt-ticket-input half">
          <div className="lab">
            <span>Order size</span>
            <span>USDC</span>
          </div>
          <div className="valrow">
            <input
              inputMode="decimal"
              placeholder="0"
              value={total}
              onChange={(e) => linkTotal(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Percentage slider vs free collateral */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => applyPct(Number(e.target.value))}
        className="tt-ticket-pct"
        list="tt-pct-ticks"
      />
      <datalist id="tt-pct-ticks">
        <option value="0" />
        <option value="25" />
        <option value="50" />
        <option value="75" />
        <option value="100" />
      </datalist>
      <div className="tt-ticket-pctrow">
        <span>{pct}%</span>
        <span>
          Max {side === "BUY" ? "buy" : "sell"} {maxQty > 0 ? fmt(maxQty, 4) : "0"}
        </span>
      </div>

      <button
        className={`tt-paper-submit ${side === "BUY" ? "long" : "short"}`}
        disabled={busy}
        onClick={() => {
          if (orderConfirm && qn > 0) {
            if (!window.confirm(`${side} ${qty} ${base} (${type}) at ${type === "LIMIT" ? price : "market"}?`)) return;
          }
          void submit();
        }}
      >
        {side === "BUY" ? "BUY / LONG" : "SELL / SHORT"}
      </button>

      {/* Info rows, same as live ticket */}
      <div className="tt-ticket-info">
        <span>Est. margin</span>
        <span>{estMargin > 0 ? `${fmt(estMargin)} USDC` : "-- USDC"}</span>
      </div>
      <div className="tt-ticket-info">
        <span>Est. liq. price</span>
        <span>{estLiq > 0 ? `${fmt(estLiq)} USDC` : "-- USDC"}</span>
      </div>
      <div className="tt-ticket-info">
        <span>Fees</span>
        <span>
          Taker: {TAKER_PCT}% / Maker: {MAKER_PCT}%{estFee > 0 ? ` (${fmt(estFee, 4)})` : ""}
        </span>
      </div>

      <div className="tt-ticket-divider" />

      {/* TP/SL + Reduce only rows, greyed (not yet in paper engine) */}
      <div className="tt-ticket-toggle off" title="TP/SL coming soon to paper mode">
        <span className="sw" />
        <span>TP/SL</span>
      </div>
      <div className="tt-ticket-toggle off" title="Reduce only coming soon to paper mode">
        <span className="sw" />
        <span>Reduce only</span>
      </div>

      {/* Advanced options box; unsupported ones greyed out like live */}
      <div className="tt-ticket-opts">
        <label className="off" title="Not available in paper mode yet">
          <input type="checkbox" disabled /> Post only
        </label>
        <label className="off" title="Not available in paper mode yet">
          <input type="checkbox" disabled /> IOC
        </label>
        <label className="off" title="Not available in paper mode yet">
          <input type="checkbox" disabled /> FOK
        </label>
        <label>
          <input
            type="checkbox"
            checked={orderConfirm}
            onChange={(e) => setOrderConfirm(e.target.checked)}
          />{" "}
          Order confirm
        </label>
        <label className="off" title="Not available in paper mode yet">
          <input type="checkbox" disabled /> Hidden
        </label>
      </div>

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
