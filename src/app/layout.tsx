import type { Metadata } from "next";
import OrderlyProvider from "@/components/orderlyProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRENCH TERMINAL",
  description: "TRENCH TERMINAL. Perps. No KYC. Pure edge.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout(props: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/images/favicon.png" />
      </head>
      <body>
        <OrderlyProvider>{props.children}</OrderlyProvider>
      </body>
    </html>
  );
}
