"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { SettingsButton } from "@modules/Settings/components/SettingsProvider";
import { projectKeys } from "@modules/Project/api/projectKeys";
import type { Project } from "@modules/Project/types/Project";
import AppHeader, { HeaderProvider } from "@uiKit/AppHeader";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <HeaderProvider>
      <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden">
        <AppHeaderHost />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </HeaderProvider>
  );
}

function AppHeaderHost() {
  const projectName = useCachedProjectName(useProjectIdFromPath());

  return (
    <AppHeader projectName={projectName}>
      <SettingsButton size="xs" />
    </AppHeader>
  );
}

function useProjectIdFromPath() {
  const pathname = usePathname();
  if (!pathname.startsWith("/project/")) return undefined;
  const id = pathname.slice("/project/".length).split("/")[0];
  return id || undefined;
}

function useCachedProjectName(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (!projectId) return;
        const key = event.query.queryKey;
        if (
          keysEqual(key, projectKeys.detail(projectId)) ||
          keysEqual(key, projectKeys.list())
        ) {
          onChange();
        }
      }),
    () => readProjectName(queryClient, projectId),
    () => readProjectName(queryClient, projectId),
  );
}

function readProjectName(
  queryClient: QueryClient,
  projectId: string | undefined,
) {
  if (!projectId) return undefined;
  return (
    queryClient.getQueryData<Project>(projectKeys.detail(projectId))?.name ??
    queryClient
      .getQueryData<Project[]>(projectKeys.list())
      ?.find((project) => project.id === projectId)?.name
  );
}

function keysEqual(left: readonly unknown[], right: readonly unknown[]) {
  if (left.length !== right.length) return false;
  return left.every((part, index) => part === right[index]);
}
