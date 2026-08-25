import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanbAIn",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh w-full">
        <Providers>
          <div className="flex min-h-dvh w-full flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
