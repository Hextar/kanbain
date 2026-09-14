"use client";

import Button from "@uiKit/Button";
import EmptyState from "@uiKit/EmptyState";
import { useT } from "@/i18n";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <EmptyState
      action={
        <Button type="button" onClick={reset}>
          {t("common.tryAgain")}
        </Button>
      }
      body={t("app.couldNotLoadProjectsBody")}
      size="compact"
      title={t("app.couldNotLoadProjects")}
    />
  );
}
