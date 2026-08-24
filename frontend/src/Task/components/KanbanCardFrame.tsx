import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const kanbanCardClassName =
    'rounded-xl border border-zinc-700/90 bg-zinc-950 p-2 shadow-md shadow-black/40';

type KanbanCardFrameProps = {
    children: ReactNode;
    className?: string;
};

export default function KanbanCardFrame({ children, className }: KanbanCardFrameProps) {
    return <div className={twMerge(kanbanCardClassName, className)}>{children}</div>;
}
