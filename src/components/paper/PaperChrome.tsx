"use client";

// Body class + toggle/banner mount, kept separate so layout stays server-side.

import { useEffect } from "react";
import { usePaperMode } from "./paperMode";
import { PaperBanner, PaperToggle } from "./PaperPanel";

export function PaperChrome() {
  const { enabled } = usePaperMode();
  useEffect(() => {
    document.body.classList.toggle("tt-paper-on", enabled);
    // Tag the order-entry column (last pane of the OUTERMOST horizontal
    // split) so CSS can dim just that pane, not nested splits like the
    // orderbook column.
    const tagged: HTMLElement[] = [];
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tag = () => {
      const split = document.querySelector<HTMLElement>(".w-split-horizontal");
      const pane = split?.querySelector<HTMLElement>(":scope > .w-split-pane:last-of-type");
      if (pane) {
        pane.classList.add("tt-paper-dim");
        tagged.push(pane);
      } else if (tries++ < 40) {
        timer = setTimeout(tag, 500);
      }
    };
    if (enabled) tag();
    return () => {
      if (timer) clearTimeout(timer);
      tagged.forEach((el) => el.classList.remove("tt-paper-dim"));
    };
  }, [enabled]);
  return (
    <>
      <PaperToggle />
      <PaperBanner />
    </>
  );
}
