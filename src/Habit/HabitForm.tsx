import Button from '@/uiKit/Button';
import Input from '@/uiKit/Input';
import { useState, type SubmitEvent } from 'react';
import { useHabitActions } from './context/useHabits';

type FormProps = {
    className?: string;
}

export default function Form({ className }: FormProps) {
    const [name, setName] = useState('')
    const { addHabit } = useHabitActions();

    const isDisabled = name.trim() === ''

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()

        if (isDisabled) return

        setName('');
        addHabit({ id: crypto.randomUUID(), name, completedMap: new Map<string, boolean>() })
    }

    return <form className={`${className}`} onSubmit={handleSubmit}>
        <div className="flex flex-row items-start gap-4 pt-0 p-4">
            <Input type="text" id="habit" name="habit" placeholder="New habit" value={name} onChange={(e) => setName(e.target.value)} />
            <Button className="flex" kind="filled" aria-label="Add habit" type="submit" disabled={isDisabled}>Add</Button>
        </div>
    </form >
}
