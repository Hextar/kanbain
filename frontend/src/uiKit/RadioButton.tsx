import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type RadioButtonProps = {
    selected?: boolean;
    kind?: 'outline' | 'filled';
} & ComponentProps<'input'>;

export default function RadioButton({ kind = 'filled', selected, children, className, ...props }: RadioButtonProps) {

    const selectedBackgroundColor = kind === 'outline' ? 'outline-2 outline-purple-500 hover:outline-purple-600' : 'bg-purple-500 hover:bg-purple-600';
    const unselectedBackgroundColor = kind === 'outline' ? 'outline-2 outline-zinc-500 hover:outline-zinc-600' : 'bg-zinc-900 hover:bg-zinc-700';   
    const backgroundColor = selected ? selectedBackgroundColor : unselectedBackgroundColor;
    const selectedTextColor = kind === 'outline' ? 'text-purple-500' : 'text-white';
    const unselectedTextColor = kind === 'outline' ? 'text-zinc-400' : 'text-zinc-600';
    const textColor = selected ? selectedTextColor : unselectedTextColor;
    const reactiveStyles =
        props.disabled ? 'opacity-50 pointer-events-none' : 'transition-colors cursor-pointer'

    return (
        <label className={twMerge(`px-4 py-2 rounded-md ${backgroundColor} ${textColor} ${reactiveStyles}`, className)}>
            <input
                {...props}
                type="radio"
                name="day-select"
                className="peer sr-only w-0 h-0 pointer-events-none"
                checked={selected}
                readOnly
            />
            <span className={`flex flex-1 ${textColor} ${reactiveStyles}`}>
                {children}
            </span>
        </label>
    );
}
