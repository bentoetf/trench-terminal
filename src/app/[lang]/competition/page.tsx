import React from "react";
import { Metadata } from "next";
import { PageTitleMap, PathEnum } from "@/constant";
import { generatePageTitle } from "@/utils";
import CompetitionView from "./view";

export const metadata: Metadata = {
  title: generatePageTitle(PageTitleMap[PathEnum.Competition]),
};

export default function CompetitionPage() {
  return <CompetitionView />;
}
