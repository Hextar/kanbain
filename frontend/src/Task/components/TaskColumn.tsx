import { useState } from 'react';
import { Plus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import IconButton from '@/uiKit/IconButton';
import { useTasks } from '../hooks/useTasks';
import type { ColumnItem } from '../types/Column';
import KanbanNewCard from './KanbanNewCard';
import TaskCard from './TaskCard';

type TaskColumnProps = {
    className?: string;
    column: ColumnItem;
};

export default function TaskColumn({ className, column }: TaskColumnProps) {
    const [isComposing, setIsComposing] = useState(false);
    const { tasks, createTask, updateTask, deleteTask } = useTasks({ columnId: column.id });

    return (
        <div
            className={twMerge(
                'flex min-w-[260px] flex-col gap-3 rounded-lg bg-zinc-800 p-4',
                column.isSaving && 'opacity-70',
                className,
            )}
        >
            <div className="flex w-full flex-row items-center justify-between">
                <h2 className="text-lg font-bold text-white">{column.title}</h2>
                <IconButton
                    aria-label={`Add card to ${column.title}`}
                    size="xs"
                    variant="secondary"
                    onClick={() => setIsComposing(true)}
                >
                    <Plus size={16} />
                </IconButton>
            </div>
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onDelete={deleteTask} onUpdate={updateTask} />
            ))}
            {isComposing ? (
                <KanbanNewCard onCancel={() => setIsComposing(false)} onSubmit={(title) => createTask({ title })} />
            ) : null}
        </div>
    );
}
