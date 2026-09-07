import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanbAIn",
  description: "AI-first Kanban board that plans the work onto a board for you.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-dvh w-full min-w-0 overflow-hidden">{children}</body>
    </html>
  );
}
