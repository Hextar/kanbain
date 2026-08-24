import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/uiKit/Button';
import Input from '@/uiKit/Input';

type KanbanNewColumnProps = {
    className?: string;
    onCreate: (title: string) => void;
};

export default function KanbanNewColumn({ className, onCreate }: KanbanNewColumnProps) {
    const [isComposing, setIsComposing] = useState(false);
    const [title, setTitle] = useState('');
    const trimmedTitle = title.trim();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!trimmedTitle) return;

        onCreate(trimmedTitle);
        setTitle('');
        setIsComposing(false);
    }

    if (!isComposing) {
        return (
            <div className={`flex h-[60px] min-w-[240px] flex-col rounded-lg border border-zinc-700 ${className ?? ''}`}>
                <Button
                    className="flex h-full items-center justify-center gap-2"
                    kind="outline"
                    size="lg"
                    variant="secondary"
                    onClick={() => setIsComposing(true)}
                >
                    <Plus size={20} />
                    Add new column
                </Button>
            </div>
        );
    }

    return (
        <form
            className={`flex min-w-[240px] flex-col gap-2 rounded-lg bg-zinc-800 p-4 ${className ?? ''}`}
            onSubmit={handleSubmit}
        >
            <Input
                autoFocus
                className="bg-zinc-900"
                placeholder="Column name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setIsComposing(false);
                }}
            />
            <div className="flex flex-row items-center gap-2">
                <Button disabled={!trimmedTitle} size="xs" type="submit">
                    Add column
                </Button>
                <Button
                    kind="outline"
                    size="xs"
                    type="button"
                    variant="secondary"
                    onClick={() => setIsComposing(false)}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
