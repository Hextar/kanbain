"use client";

import { useT } from "@/i18n";
import ProgressBar from "@uiKit/ProgressBar";

type PlanningStatusProps = {
  message: string;
  progress: number;
};

export default function PlanningStatus({
  message,
  progress,
}: PlanningStatusProps) {
  const t = useT();
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p
        aria-live="polite"
        className="min-w-0 text-sm leading-5 text-purple-200/90"
      >
        {message}
      </p>
      <ProgressBar label={t("project.planningProgress")} percent={percent} />
    </div>
  );
}
