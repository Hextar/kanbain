import KanbanHeader from './components/KanbanHeader';
import KanbanNewColumn from './components/KanbanNewColumn';
import TaskColumn from './components/TaskColumn';
import { useColumns } from './hooks/useColumns';

export default function KanbanBoard() {
    const { columns, createColumn } = useColumns();

    return (
        <div className="flex h-full w-full max-w-full flex-col items-start justify-center">
            <KanbanHeader className="w-full" />
            <div className="flex h-full max-w-full flex-row items-start justify-start gap-4 overflow-x-auto p-4 pt-0">
                {columns.map((column) => (
                    <TaskColumn key={column.id} column={column} />
                ))}
                <KanbanNewColumn onCreate={(title) => createColumn({ title })} />
            </div>
        </div>
    );
}
