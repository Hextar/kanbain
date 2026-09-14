"use client";

import type { ReactNode } from "react";
import { format, type Locale } from "date-fns";
import { MessageSquare, Paperclip } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useDateLocale, useT, type TFunction } from "@/i18n";
import Badge from "@uiKit/Badge";
import Tooltip from "@uiKit/Tooltip";
import { useAssignees, useMilestones } from "../hooks/useCatalog";
import { compactTaskKey } from "../helpers/taskKey";
import { milestoneLabel } from "../helpers/milestoneLabel";
import {
  ESTIMATE_STYLE,
  labeledPriority,
  PRIORITY_STYLES,
  WORK_KIND_STYLES,
} from "../helpers/taskBadges";
import type { TaskItem } from "../types/Task";

type TaskCardBodyProps = {
  task: TaskItem;
  projectId: string;
  doneCount?: number;
  childCount?: number;
  interactive?: boolean;
};

function compactAgo(date: Date, t: TFunction, locale: Locale): string {
  const delta = Date.now() - date.getTime();
  if (!Number.isFinite(delta) || delta < 45_000) return t("task.justNow");
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return t("task.justNow");
  if (minutes < 60) return t("task.minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("task.hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("task.yesterday");
  if (days < 14) return t("task.daysAgo", { n: days });
  return format(date, "yyyy-MM-dd", { locale });
}

function TaskBadge({
  tooltip,
  className,
  children,
  interactive,
}: {
  tooltip: string;
  className?: string;
  children: ReactNode;
  interactive: boolean;
}) {
  const pill = <Badge className={className}>{children}</Badge>;
  if (!interactive) return pill;
  return <Tooltip content={tooltip}>{pill}</Tooltip>;
}

export default function TaskCardBody({
  task,
  projectId,
  doneCount = 0,
  childCount = 0,
  interactive = true,
}: TaskCardBodyProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { data: assignees = [] } = useAssignees();
  const { data: milestones = [] } = useMilestones(projectId);
  const keyLabel = compactTaskKey(task);
  const summary = task.description?.trim();
  const stamp = task.updatedAt ?? task.createdAt;
  const commentCount = task.comments?.length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;
  const assigneeName = assignees.find(
    (assignee) => assignee.id === task.assigneeId,
  )?.name;
  const milestone = milestones.find((item) => item.id === task.milestoneId);
  const milestoneName = milestone
    ? milestoneLabel(milestone, milestones)
    : null;
  const title = (
    <span className="line-clamp-2 text-sm leading-snug font-semibold text-zinc-50">
      {task.title}
    </span>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {keyLabel ? (
          <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-500">
            {keyLabel}
          </span>
        ) : null}
        {task.priority ? (
          <TaskBadge
            className={twMerge("uppercase", PRIORITY_STYLES[task.priority])}
            interactive={interactive}
            tooltip={labeledPriority(task.priority, t)}
          >
            {task.priority}
          </TaskBadge>
        ) : null}
        {task.estimateTshirt ? (
          <TaskBadge
            className={ESTIMATE_STYLE}
            interactive={interactive}
            tooltip={t("task.complexity", {
              size: task.estimateTshirt.toUpperCase(),
            })}
          >
            {task.estimateTshirt}
          </TaskBadge>
        ) : null}
        {task.workKind && task.workKind !== "task" ? (
          <TaskBadge
            className={twMerge("capitalize", WORK_KIND_STYLES[task.workKind])}
            interactive={interactive}
            tooltip={t("task.type", { kind: task.workKind })}
          >
            {task.workKind}
          </TaskBadge>
        ) : null}
        {task.isSaving ? (
          <span className="text-[11px] text-zinc-500">{t("common.saving")}</span>
        ) : null}
      </div>
      <h3 className="mt-1.5">
        {interactive ? (
          <Tooltip
            align="start"
            className="max-w-xs"
            content={task.title}
            wrapperClassName="min-w-0 w-full"
          >
            {title}
          </Tooltip>
        ) : (
          title
        )}
      </h3>
      {summary ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-zinc-500">
          {summary}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {assigneeName ? (
          <TaskBadge
            className="bg-zinc-800 text-zinc-200"
            interactive={interactive}
            tooltip={t("task.assigneeOf", { name: assigneeName })}
          >
            {assigneeName}
          </TaskBadge>
        ) : null}
        {milestoneName ? (
          <TaskBadge
            className="bg-zinc-800 text-zinc-400"
            interactive={interactive}
            tooltip={t("task.milestoneOf", { name: milestoneName })}
          >
            {milestoneName}
          </TaskBadge>
        ) : null}
        {task.dueDate ? (
          <TaskBadge
            className="bg-amber-500/10 text-amber-200"
            interactive={interactive}
            tooltip={t("task.due", {
              date: format(task.dueDate, "d MMM yyyy", { locale: dateLocale }),
            })}
          >
            {format(task.dueDate, "MMM d", { locale: dateLocale })}
          </TaskBadge>
        ) : null}
        {stamp ? (
          interactive ? (
            <Tooltip
              content={t("task.lastUpdated", {
                date: format(stamp, "d MMM yyyy 'at' HH:mm", {
                  locale: dateLocale,
                }),
              })}
            >
              <span
                className="text-[11px] text-zinc-500"
                suppressHydrationWarning
              >
                {compactAgo(stamp, t, dateLocale)}
              </span>
            </Tooltip>
          ) : (
            <span
              className="text-[11px] text-zinc-500"
              suppressHydrationWarning
            >
              {compactAgo(stamp, t, dateLocale)}
            </span>
          )
        ) : null}
        {childCount > 0 ? (
          <TaskBadge
            className="bg-zinc-800 text-zinc-400"
            interactive={interactive}
            tooltip={t("task.progressDone", {
              done: doneCount,
              total: childCount,
            })}
          >
            {doneCount}/{childCount}
          </TaskBadge>
        ) : null}
        {commentCount > 0 ? (
          <TaskBadge
            className="inline-flex items-center gap-0.5 text-zinc-400"
            interactive={interactive}
            tooltip={
              commentCount === 1
                ? t("task.oneComment")
                : t("task.nComments", { n: commentCount })
            }
          >
            <MessageSquare aria-hidden size={10} />
            {commentCount}
          </TaskBadge>
        ) : null}
        {attachmentCount > 0 ? (
          <TaskBadge
            className="inline-flex items-center gap-0.5 text-zinc-400"
            interactive={interactive}
            tooltip={
              attachmentCount === 1
                ? t("task.oneAttachment")
                : t("task.nAttachments", { n: attachmentCount })
            }
          >
            <Paperclip aria-hidden size={10} />
            {attachmentCount}
          </TaskBadge>
        ) : null}
      </div>
      {task.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <TaskBadge
              key={tag}
              className="rounded px-1.5 text-zinc-400 ring-1 ring-zinc-600/80"
              interactive={interactive}
              tooltip={t("task.tagOf", { tag })}
            >
              {tag}
            </TaskBadge>
          ))}
        </div>
      ) : null}
    </>
  );
}
