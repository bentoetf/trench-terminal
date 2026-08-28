"use client";

import React, { ReactNode } from "react";
import { BaseLayout } from "@/components/baseLayout";
import { PathEnum } from "@/constant";

export default function CompetitionLayout(props: { children: ReactNode }) {
  return (
    <BaseLayout initialMenu={PathEnum.Competition}>{props.children}</BaseLayout>
  );
}
