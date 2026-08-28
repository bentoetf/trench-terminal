"use client";

// COMPETITION page: brutalist comp cards fed by the trench-terminal-backend
// competition engine. Live comp hero with countdown + standings, upcoming
// pre-register, collapsed ended list, styled empty state.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
import { PAPER_API } from "@/components/paper/paperMode";

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

interface StandingRow {
  rank: number;
  wallet: string;
  pnlPercent: number;
  prize: number;
}

interface CompSummary {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  entryFee: number;
  prizeSplit: string;
  compType: string;
  prizePool: number;
  status: "upcoming" | "live" | "ended";
  participants: number;
}

interface CompDetail extends CompSummary {
  standings: StandingRow[];
  entries: { wallet: string }[];
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${PAPER_API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

function truncate(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return d > 0 ? `${d}D ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function Countdown({ target, label }: { target: number; label: string }) {
  const text = useCountdown(target);
  return (
    <div className="ttc-stat">
      <div className="ttc-stat-label">{label}</div>
      <div className="ttc-stat-value ttc-mono">{text}</div>
    </div>
  );
}

function CompCard({
  comp,
  wallet,
  onJoined,
}: {
  comp: CompDetail;
  wallet: string | null;
  onJoined: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = useMemo(
    () => !!wallet && comp.entries.some((e) => e.wallet === wallet.toLowerCase()),
    [wallet, comp.entries],
  );

  const join = useCallback(async () => {
    if (!wallet) return;
    setJoining(true);
    setError(null);
    try {
      await api(`/competitions/${comp.id}/entries`, {
        method: "POST",
        body: JSON.stringify({ wallet }),
      });
      onJoined();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  }, [wallet, comp.id, onJoined]);

  const isLive = comp.status === "live";
  const me = wallet?.toLowerCase();

  return (
    <section className="ttc-card">
      <div className="ttc-card-head">
        <div className={`ttc-badge ${isLive ? "ttc-badge-live" : "ttc-badge-soon"}`}>
          {isLive ? "● LIVE" : "UPCOMING"}
        </div>
        <div className="ttc-badge ttc-badge-type">
          {comp.compType === "paper" ? "PAPER" : "LIVE FUNDS"}
          {comp.entryFee > 0 ? ` · ENTRY ${fmtUsd(comp.entryFee)}` : " · FREE ENTRY"}
        </div>
      </div>

      <h2 className="ttc-name">{comp.name}</h2>

      <div className="ttc-hero-row">
        <div className="ttc-prize">
          <div className="ttc-stat-label">PRIZE POOL</div>
          <div className="ttc-prize-value">{fmtUsd(comp.prizePool)}</div>
        </div>
        <div className="ttc-stats">
          {isLive ? (
            <Countdown target={comp.endTime} label="ENDS IN" />
          ) : (
            <Countdown target={comp.startTime} label="STARTS IN" />
          )}
          <div className="ttc-stat">
            <div className="ttc-stat-label">TRADERS</div>
            <div className="ttc-stat-value">{comp.participants}</div>
          </div>
        </div>
      </div>

      <div className="ttc-join-row">
        {joined ? (
          <div className="ttc-joined">✓ YOU&apos;RE IN</div>
        ) : wallet ? (
          <button className="ttc-join-btn" onClick={join} disabled={joining}>
            {joining ? "JOINING…" : isLive ? "JOIN NOW ↗" : "PRE-REGISTER ↗"}
          </button>
        ) : (
          <div className="ttc-connect-hint">CONNECT WALLET TO JOIN</div>
        )}
        {error && <div className="ttc-error">{error}</div>}
      </div>

      {comp.standings.length > 0 && (
        <div className="ttc-table-wrap">
          <table className="ttc-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>TRADER</th>
                <th>PNL %</th>
                <th>PRIZE</th>
              </tr>
            </thead>
            <tbody>
              {comp.standings.map((r) => (
                <tr key={r.wallet} className={r.wallet === me ? "ttc-me" : ""}>
                  <td className="ttc-rank">{r.rank}</td>
                  <td className="ttc-mono">
                    {truncate(r.wallet)}
                    {r.wallet === me ? " (YOU)" : ""}
                  </td>
                  <td className={`ttc-mono ${r.pnlPercent >= 0 ? "ttc-pos" : "ttc-neg"}`}>
                    {r.pnlPercent >= 0 ? "+" : ""}
                    {r.pnlPercent.toFixed(2)}%
                  </td>
                  <td className="ttc-mono">{r.prize > 0 ? fmtUsd(r.prize) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {comp.standings.length === 0 && (
        <div className="ttc-empty-standings">NO ENTRIES YET. BE FIRST.</div>
      )}
    </section>
  );
}

function EndedList({ comps }: { comps: CompDetail[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (comps.length === 0) return null;
  return (
    <section className="ttc-ended">
      <h3 className="ttc-ended-head">PAST COMPETITIONS</h3>
      {comps.map((c) => (
        <div key={c.id} className="ttc-ended-item">
          <button className="ttc-ended-row" onClick={() => setOpen(open === c.id ? null : c.id)}>
            <span className="ttc-ended-name">{c.name}</span>
            <span className="ttc-mono">{fmtUsd(c.prizePool)}</span>
            <span className="ttc-mono">
              {c.standings[0] ? `🏆 ${truncate(c.standings[0].wallet)}` : "NO ENTRIES"}
            </span>
            <span>{open === c.id ? "−" : "+"}</span>
          </button>
          {open === c.id && c.standings.length > 0 && (
            <div className="ttc-ended-detail">
              {c.standings.slice(0, 3).map((r) => (
                <div key={r.wallet} className="ttc-ended-winner ttc-mono">
                  #{r.rank} {truncate(r.wallet)} · {r.pnlPercent >= 0 ? "+" : ""}
                  {r.pnlPercent.toFixed(2)}% · {r.prize > 0 ? fmtUsd(r.prize) : "—"}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

export default function CompetitionView() {
  const { state } = useAccount();
  const wallet =
    state?.address && EVM_ADDRESS.test(state.address) ? state.address.toLowerCase() : null;

  const [comps, setComps] = useState<CompDetail[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const { competitions } = (await api("/competitions")) as { competitions: CompSummary[] };
      const details = await Promise.all(
        competitions.map((c) => api(`/competitions/${c.id}`) as Promise<CompDetail>),
      );
      setComps(details);
      setFailed(false);
    } catch {
      setFailed(true);
      setComps((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const live = comps?.filter((c) => c.status === "live") ?? [];
  const upcoming = comps?.filter((c) => c.status === "upcoming") ?? [];
  const ended = comps?.filter((c) => c.status === "ended") ?? [];

  return (
    <div className="ttc-page">
      <h1 className="ttc-title">COMPETITION</h1>
      {comps === null ? (
        <div className="ttc-empty">LOADING…</div>
      ) : live.length === 0 && upcoming.length === 0 ? (
        <div className="ttc-empty">
          <div className="ttc-empty-big">NO LIVE COMPETITIONS</div>
          <div className="ttc-empty-sub">NEXT ONE SOON. SHARPEN YOUR ENTRIES.</div>
          {failed && <div className="ttc-error">COULD NOT REACH COMPETITION API</div>}
        </div>
      ) : (
        <>
          {live.map((c) => (
            <CompCard key={c.id} comp={c} wallet={wallet} onJoined={load} />
          ))}
          {upcoming.map((c) => (
            <CompCard key={c.id} comp={c} wallet={wallet} onJoined={load} />
          ))}
        </>
      )}
      <EndedList comps={ended} />

      <style>{`
        .ttc-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 16px 80px;
          font-family: var(--tt-cond);
          color: #000;
        }
        .ttc-title {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(44px, 6vw, 84px);
          line-height: 0.85;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          margin: 0 0 24px;
        }
        .ttc-card {
          background: var(--tt-panel);
          border: 4px solid #000;
          box-shadow: 7px 8px 0 #000;
          padding: 22px 24px 26px;
          margin-bottom: 32px;
        }
        .ttc-card-head {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .ttc-badge {
          font-weight: 800;
          font-size: 15px;
          text-transform: uppercase;
          border: 2px solid #000;
          padding: 4px 12px;
          background: var(--tt-muted-fill);
        }
        .ttc-badge-live {
          background: var(--tt-orange);
          color: #000;
        }
        .ttc-badge-soon {
          background: #000;
          color: #fff;
        }
        .ttc-name {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(34px, 4.6vw, 64px);
          line-height: 0.9;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          margin: 0 0 20px;
        }
        .ttc-hero-row {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          align-items: stretch;
          margin-bottom: 20px;
        }
        .ttc-prize {
          background: #000;
          color: #fff;
          border: 4px solid #000;
          padding: 14px 22px;
          flex: 1 1 260px;
        }
        .ttc-prize .ttc-stat-label {
          color: #fff;
        }
        .ttc-prize-value {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(52px, 7vw, 96px);
          line-height: 0.9;
          letter-spacing: -0.04em;
          color: var(--tt-orange);
        }
        .ttc-stats {
          display: flex;
          gap: 14px;
          flex: 1 1 300px;
        }
        .ttc-stat {
          border: 2px solid #000;
          background: var(--tt-row);
          box-shadow: 4px 4px 0 #000;
          padding: 12px 16px;
          flex: 1;
        }
        .ttc-stat-label {
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }
        .ttc-stat-value {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .ttc-mono {
          font-family: var(--tt-mono) !important;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
        }
        .ttc-join-row {
          margin-bottom: 22px;
        }
        .ttc-join-btn {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(24px, 3vw, 36px);
          text-transform: uppercase;
          letter-spacing: -0.03em;
          background: var(--tt-green-long);
          color: #000;
          border: 3px solid #000;
          box-shadow: 7px 7px 0 #000;
          padding: 12px 34px;
          cursor: pointer;
        }
        .ttc-join-btn:active {
          transform: translate(3px, 3px);
          box-shadow: 4px 4px 0 #000;
        }
        .ttc-join-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .ttc-joined {
          display: inline-block;
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(22px, 2.6vw, 32px);
          text-transform: uppercase;
          background: var(--tt-green-long);
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #000;
          padding: 8px 24px;
        }
        .ttc-connect-hint {
          display: inline-block;
          font-weight: 800;
          font-size: 18px;
          text-transform: uppercase;
          border: 2px dashed #000;
          padding: 10px 20px;
          background: var(--tt-muted-fill);
        }
        .ttc-error {
          margin-top: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--tt-orange);
        }
        .ttc-table-wrap {
          overflow-x: auto;
          border: 3px solid #000;
        }
        .ttc-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--tt-row);
        }
        .ttc-table th {
          background: #000;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          text-transform: uppercase;
          text-align: left;
          padding: 10px 14px;
        }
        .ttc-table td {
          border-top: 1px solid var(--tt-grid);
          padding: 10px 14px;
          font-size: 17px;
          font-weight: 700;
        }
        .ttc-table tbody tr:nth-child(even) {
          background: var(--tt-row-alt);
        }
        .ttc-table .ttc-me {
          background: var(--tt-orange) !important;
          color: #000;
        }
        .ttc-rank {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: 26px;
          line-height: 1;
        }
        .ttc-pos {
          color: #117a35;
        }
        .ttc-me .ttc-pos,
        .ttc-me .ttc-neg {
          color: #000;
        }
        .ttc-neg {
          color: var(--tt-orange);
        }
        .ttc-empty-standings {
          border: 2px dashed var(--tt-grid);
          padding: 24px;
          text-align: center;
          font-weight: 800;
          text-transform: uppercase;
          background: var(--tt-row);
        }
        .ttc-empty {
          border: 4px solid #000;
          box-shadow: 7px 8px 0 #000;
          background: var(--tt-panel);
          padding: 60px 24px;
          text-align: center;
        }
        .ttc-empty-big {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(30px, 4.5vw, 56px);
          line-height: 0.9;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ttc-empty-sub {
          font-weight: 800;
          font-size: 18px;
          text-transform: uppercase;
          color: #171717;
        }
        .ttc-ended {
          margin-top: 40px;
        }
        .ttc-ended-head {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: clamp(24px, 3vw, 38px);
          text-transform: uppercase;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
        }
        .ttc-ended-item {
          border: 3px solid #000;
          background: var(--tt-panel);
          box-shadow: 4px 4px 0 #000;
          margin-bottom: 14px;
        }
        .ttc-ended-row {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: 0;
          padding: 12px 16px;
          font-family: var(--tt-cond);
          font-weight: 800;
          font-size: 17px;
          text-transform: uppercase;
          cursor: pointer;
          text-align: left;
          flex-wrap: wrap;
        }
        .ttc-ended-name {
          font-family: var(--tt-display);
          font-weight: 900;
          font-size: 20px;
          letter-spacing: -0.02em;
        }
        .ttc-ended-detail {
          border-top: 2px solid #000;
          padding: 12px 16px;
          background: var(--tt-row);
        }
        .ttc-ended-winner {
          padding: 4px 0;
          font-size: 15px;
        }
        @media (max-width: 640px) {
          .ttc-stats {
            flex-direction: column;
          }
          .ttc-card {
            padding: 16px 14px 20px;
          }
          .ttc-table td,
          .ttc-table th {
            padding: 8px 8px;
            font-size: 14px;
          }
          .ttc-rank {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
