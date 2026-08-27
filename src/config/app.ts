import type { NetworkId } from "@orderly.network/types";

/**
 * Central app configuration for Trench Terminal.
 *
 * Broker id: "orderly" is Orderly's public demo broker id, usable on testnet
 * without signup. After graduation (real broker id issued via Orderly One),
 * set NEXT_PUBLIC_ORDERLY_BROKER_ID / NEXT_PUBLIC_ORDERLY_BROKER_NAME in .env
 * or edit the fallbacks below, and flip network to "mainnet".
 */
export const APP_CONFIG = {
  brokerId: process.env.NEXT_PUBLIC_ORDERLY_BROKER_ID ?? "orderly",
  brokerName: process.env.NEXT_PUBLIC_ORDERLY_BROKER_NAME ?? "Trench Terminal",
  networkId: (process.env.NEXT_PUBLIC_ORDERLY_NETWORK ??
    "testnet") as NetworkId,
  appName: "Trench Terminal",
} as const;
