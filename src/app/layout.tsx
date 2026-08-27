import type { Metadata } from "next";
import OrderlyProvider from "@/components/orderlyProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trench Terminal",
  description: "Trench Terminal, perps DEX powered by Orderly",
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
