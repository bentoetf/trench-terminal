"use client";

// Body class + toggle/banner mount, kept separate so layout stays server-side.

import { useEffect } from "react";
import { usePaperMode } from "./paperMode";
import { PaperBanner, PaperToggle } from "./PaperPanel";

export function PaperChrome() {
  const { enabled } = usePaperMode();
  useEffect(() => {
    document.body.classList.toggle("tt-paper-on", enabled);
  }, [enabled]);
  return (
    <>
      <PaperToggle />
      <PaperBanner />
    </>
  );
}
