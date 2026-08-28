"use client";

/**
 * Shim for "@orderly.network/ui-tradingview".
 *
 * next.config.ts aliases the real package to this file so the Orderly
 * trading page renders our open-source lightweight-charts candlestick
 * chart instead of the unlicensed TradingView advanced charting
 * placeholder. Props from the SDK (classNames for fullscreen mode, the
 * current symbol) are honored; the rest of the TradingView config is
 * ignored. To revert: delete the alias in next.config.ts.
 */
import React from "react";
import LightweightChart from "./LightweightChart";

type AnyProps = {
  symbol?: string;
  classNames?: { root?: string; content?: string };
  [key: string]: unknown;
};

export const TradingviewWidget: React.FC<AnyProps> = (props) => {
  return (
    <div
      className={props.classNames?.root}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <div
        className={props.classNames?.content}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <LightweightChart symbol={props.symbol ?? "PERP_BTC_USDC"} />
      </div>
    </div>
  );
};

export const TradingviewUI: React.FC<AnyProps> = (props) => (
  <TradingviewWidget {...props} />
);

export const useTradingviewScript = (props: AnyProps) => props;

export default { TradingviewWidget, TradingviewUI, useTradingviewScript };
