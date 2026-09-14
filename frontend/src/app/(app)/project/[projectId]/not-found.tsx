"use client";

import Link from "next/link";
import EmptyState from "@uiKit/EmptyState";
import { useT } from "@/i18n";

export default function NotFound() {
  const t = useT();

  return (
    <EmptyState
      action={
        <Link
          className="text-purple-400 underline-offset-4 hover:underline"
          href="/"
        >
          {t("project.backToProjects")}
        </Link>
      }
      size="compact"
      title={t("app.projectNotFound")}
    />
  );
}
