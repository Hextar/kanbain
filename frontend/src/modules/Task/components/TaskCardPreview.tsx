import { twMerge } from "tailwind-merge";
import Card from "@uiKit/Card";
import type { TaskItem } from "../types/Task";
import TaskCardBody from "./TaskCardBody";

type TaskCardPreviewProps = {
  task: TaskItem;
  projectId: string;
  accentBar?: string;
  accentColor?: string;
};

export default function TaskCardPreview({
  task,
  projectId,
  accentBar,
  accentColor,
}: TaskCardPreviewProps) {
  return (
    <Card className="relative w-[260px] cursor-default shadow-xl shadow-black/50">
      {accentBar || accentColor ? (
        <div
          aria-hidden
          className={twMerge(
            "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-lg",
            accentBar,
          )}
          style={accentColor ? { backgroundColor: accentColor } : undefined}
        />
      ) : null}
      <TaskCardBody interactive={false} projectId={projectId} task={task} />
    </Card>
  );
}
