import { redirect } from "next/navigation";
import { PathEnum } from "@/constant";

export default async function RewardsIndexPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  redirect(`/${lang}${PathEnum.RewardsTrading}`);
}
