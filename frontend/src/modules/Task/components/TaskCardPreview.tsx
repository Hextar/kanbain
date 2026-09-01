import { twMerge } from "tailwind-merge";
import type { TaskItem } from "../types/Task";
import TaskCardBody from "./TaskCardBody";
import TaskCardFrame from "./TaskCardFrame";

type TaskCardPreviewProps = {
  task: TaskItem;
  projectId: string;
  accentBar?: string;
};

export default function TaskCardPreview({
  task,
  projectId,
  accentBar,
}: TaskCardPreviewProps) {
  return (
    <TaskCardFrame className="relative w-[260px] cursor-default shadow-xl shadow-black/50">
      {accentBar ? (
        <div
          aria-hidden
          className={twMerge(
            "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-lg",
            accentBar,
          )}
        />
      ) : null}
      <TaskCardBody interactive={false} projectId={projectId} task={task} />
    </TaskCardFrame>
  );
}
