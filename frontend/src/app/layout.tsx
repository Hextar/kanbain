import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SettingsProvider } from "@modules/Settings/components/SettingsProvider";
import AppShell from "./AppShell";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanbAIn",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh w-full min-w-0 overflow-x-clip">
        <Providers>
          <SettingsProvider>
            <AppShell>{children}</AppShell>
          </SettingsProvider>
        </Providers>
      </body>
    </html>
  );
}
