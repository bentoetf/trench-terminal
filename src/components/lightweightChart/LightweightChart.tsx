"use client";

/**
 * Trench Terminal lightweight-charts candlestick chart.
 *
 * Stand-in for the TradingView advanced charting library (which needs a
 * license). Wired in by aliasing "@orderly.network/ui-tradingview" to the
 * shim in this folder (see next.config.ts). To revert to TradingView
 * advanced: remove the webpack alias and restore TRADING_VIEW_CONFIG in
 * useOrderlyConfig.tsx (see SETUP-NOTES.md).
 *
 * Data: Orderly public TV UDF history endpoint (no auth), polled every 5s.
 *   GET {api}/v1/tv/history?symbol=...&resolution=...&from=...&to=...
 * 4h is aggregated client-side from 1h (testnet returns no_data for 240).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { paperApi, usePaperMode } from "../paper/paperMode";

const API_BASE = "https://testnet-api.orderly.org";

const THEME = {
  bg: "#F4EFE5",
  up: "#111111",
  down: "#FF3D0A",
  grid: "#CFC8BC",
  text: "#000000",
  font: '"IBM Plex Mono", "Roboto Mono", monospace',
};

type TF = { label: string; resolution: string; seconds: number; agg?: number };

const TIMEFRAMES: TF[] = [
  { label: "1M", resolution: "1", seconds: 60 },
  { label: "5M", resolution: "5", seconds: 300 },
  { label: "15M", resolution: "15", seconds: 900 },
  { label: "1H", resolution: "60", seconds: 3600 },
  // testnet has no 240 data; aggregate 4x 1h bars client-side
  { label: "4H", resolution: "60", seconds: 14400, agg: 4 },
  { label: "1D", resolution: "1D", seconds: 86400 },
];

type Bar = CandlestickData<UTCTimestamp> & { volume: number };

async function fetchBars(symbol: string, tf: TF): Promise<Bar[]> {
  const now = Math.floor(Date.now() / 1000);
  const span = tf.seconds * 500 * (tf.agg ?? 1);
  const url = `${API_BASE}/v1/tv/history?symbol=${symbol}&resolution=${tf.resolution}&from=${now - span}&to=${now}`;
  const res = await fetch(url);
  const j = await res.json();
  if (j.s !== "ok" || !Array.isArray(j.t)) return [];
  let bars: Bar[] = j.t.map((t: number, i: number) => ({
    time: t as UTCTimestamp,
    open: j.o[i],
    high: j.h[i],
    low: j.l[i],
    close: j.c[i],
    volume: j.v[i] ?? 0,
  }));
  if (tf.agg && tf.agg > 1) {
    const out: Bar[] = [];
    for (const b of bars) {
      const bucket = (Math.floor((b.time as number) / tf.seconds) *
        tf.seconds) as UTCTimestamp;
      const last = out[out.length - 1];
      if (last && last.time === bucket) {
        last.high = Math.max(last.high, b.high);
        last.low = Math.min(last.low, b.low);
        last.close = b.close;
        last.volume += b.volume;
      } else {
        out.push({ ...b, time: bucket });
      }
    }
    bars = out;
  }
  return bars;
}

function fmt(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "-";
  return n >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : String(n);
}

export const LightweightChart: React.FC<{ symbol: string }> = ({ symbol }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [tf, setTf] = useState<TF>(TIMEFRAMES[2]);
  const [ohlc, setOhlc] = useState<Bar | null>(null);
  const barsRef = useRef<Bar[]>([]);
  const paperLinesRef = useRef<IPriceLine[]>([]);
  const paper = usePaperMode();

  // create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: THEME.bg },
        textColor: THEME.text,
        fontFamily: THEME.font,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: THEME.grid, style: 1 },
        horzLines: { color: THEME.grid, style: 1 },
      },
      rightPriceScale: { borderColor: THEME.text },
      timeScale: { borderColor: THEME.text, timeVisible: true },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: THEME.up,
      downColor: THEME.down,
      borderUpColor: THEME.up,
      borderDownColor: THEME.down,
      wickUpColor: THEME.up,
      wickDownColor: THEME.down,
    });
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setOhlc(barsRef.current[barsRef.current.length - 1] ?? null);
        return;
      }
      const b = barsRef.current.find((x) => x.time === param.time);
      if (b) setOhlc(b);
    });
    chartRef.current = chart;
    candleRef.current = candles;
    volRef.current = vol;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // load + poll on symbol/timeframe change
  useEffect(() => {
    let cancelled = false;
    let firstLoad = true;
    const load = async () => {
      try {
        const bars = await fetchBars(symbol, tf);
        if (cancelled || !candleRef.current || !volRef.current) return;
        barsRef.current = bars;
        candleRef.current.setData(bars);
        volRef.current.setData(
          bars.map(
            (b): HistogramData<UTCTimestamp> => ({
              time: b.time,
              value: b.volume,
              color: b.close >= b.open ? "#11111155" : "#FF3D0A55",
            }),
          ),
        );
        setOhlc(bars[bars.length - 1] ?? null);
        if (firstLoad) {
          chartRef.current?.timeScale().fitContent();
          firstLoad = false;
        }
      } catch {
        /* transient fetch error, next poll retries */
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, tf]);

  // Paper mode: draw entry + liquidation price lines for an open paper
  // position on this symbol. Lines clear when paper mode is off, no
  // position exists, or the symbol changes. Live mode untouched.
  useEffect(() => {
    const clearLines = () => {
      const s = candleRef.current;
      if (s) for (const l of paperLinesRef.current) s.removePriceLine(l);
      paperLinesRef.current = [];
    };
    if (!paper.enabled || !paper.wallet) {
      clearLines();
      return;
    }
    let cancelled = false;
    let lastKey = "";
    const sync = async () => {
      try {
        const acct = await paperApi.account(paper.wallet);
        if (cancelled || !candleRef.current) return;
        const pos = acct?.positions.find(
          (p) => p.symbol === symbol && p.qty !== 0,
        );
        const key = pos
          ? `${pos.qty}|${pos.entryPrice}|${pos.liqPrice}`
          : "";
        if (key === lastKey) return;
        lastKey = key;
        clearLines();
        if (!pos) return;
        const long = pos.qty > 0;
        const sideColor = long ? "#3FA462" : "#FF3D0A";
        const s = candleRef.current;
        paperLinesRef.current.push(
          s.createPriceLine({
            price: pos.entryPrice,
            color: sideColor,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `PAPER ENTRY ${long ? "LONG" : "SHORT"}`,
          }),
        );
        if (pos.liqPrice > 0) {
          paperLinesRef.current.push(
            s.createPriceLine({
              price: pos.liqPrice,
              color: "#FF3D0A",
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: "PAPER LIQ",
            }),
          );
        }
      } catch {
        /* transient fetch error, next poll retries */
      }
    };
    void sync();
    const id = setInterval(() => void sync(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearLines();
    };
  }, [paper.enabled, paper.wallet, symbol]);

  const pair = useMemo(
    () => symbol.replace(/^PERP_/, "").replace(/_/g, "-"),
    [symbol],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: THEME.bg,
        fontFamily: THEME.font,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderBottom: `2px solid ${THEME.text}`,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: THEME.text,
            letterSpacing: "-0.02em",
          }}
        >
          {pair}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {TIMEFRAMES.map((t) => (
            <button
              key={t.label}
              onClick={() => setTf(t)}
              style={{
                fontFamily: THEME.font,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                cursor: "pointer",
                border: `1.5px solid ${THEME.text}`,
                borderRadius: 0,
                background: t.label === tf.label ? THEME.text : THEME.bg,
                color: t.label === tf.label ? "#FFFFFF" : THEME.text,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {ohlc && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.text,
              marginLeft: "auto",
              whiteSpace: "nowrap",
            }}
          >
            O {fmt(ohlc.open)} H {fmt(ohlc.high)} L {fmt(ohlc.low)}{" "}
            <span
              style={{
                color: ohlc.close >= ohlc.open ? THEME.up : THEME.down,
              }}
            >
              C {fmt(ohlc.close)}
            </span>
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
};

export default LightweightChart;
