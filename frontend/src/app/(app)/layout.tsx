import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { UnauthorizedError } from "@api/env";
import { getSession } from "@modules/Auth/api/session";
import AuthProvider from "@modules/Auth/components/AuthProvider";
import { SettingsProvider } from "@modules/Settings/components/SettingsProvider";
import { RealtimeProvider } from "@libraries/realtime/RealtimeProvider";
import AppShell from "../AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let session;
  try {
    session = await getSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <AuthProvider initial={session}>
      <SettingsProvider>
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
        </RealtimeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
