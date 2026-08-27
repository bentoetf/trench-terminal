"use client";

import React, { ReactNode } from "react";
import { BaseLayout } from "@/components/baseLayout";

export default function PerpLayout(props: { children: ReactNode }) {
  return <BaseLayout>{props.children}</BaseLayout>;
}
