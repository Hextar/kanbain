import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Script from "next/script";
import { translate } from "@/i18n/translate";
import StoreProvider from "@/store/StoreProvider";
import { parsePrefsCookie } from "@/store/persist";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const prefs = parsePrefsCookie(
    (await cookies()).get("kanbain_prefs")?.value,
  );

  return {
    title: "KanbAIn",
    description: translate(prefs.locale, "meta.description"),
    icons: {
      icon: "/favicon.svg",
      apple: "/apple-touch-icon.svg",
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const prefs = parsePrefsCookie(
    (await cookies()).get("kanbain_prefs")?.value,
  );

  return (
    <html
      lang={prefs.locale}
      data-density={prefs.density}
      data-theme={prefs.theme === "light" ? "light" : "dark"}
      suppressHydrationWarning
    >
      <body className="h-dvh w-full min-w-0 overflow-hidden">
        <Script src="/prefs-boot.js" strategy="beforeInteractive" />
        <StoreProvider initialPrefs={prefs}>{children}</StoreProvider>
      </body>
    </html>
  );
}
