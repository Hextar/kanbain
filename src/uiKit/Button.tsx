import type { ComponentProps, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

type ButtonProps = {
    children: ReactNode;
    ariaLabel?: string;
    kind?: 'outline' | 'filled';
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
} & ComponentProps<'button'>;

function _onClick(disabled: boolean | undefined, onClick?: () => void) {
    if (disabled) return
    onClick?.()
}

export default function Button({ variant = 'primary', size = 'md', kind = 'filled', onClick, className, ...props }: ButtonProps) {
    let colorStyles = '';
    switch (variant) {
        case 'primary':
            colorStyles = kind === 'outline'
                ? 'border border-purple-500 text-purple-500 bg-transparent hover:bg-purple-500 hover:text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white';
            break;
        case 'secondary':
            colorStyles = kind === 'outline'
                ? 'border border-gray-500 text-gray-500 bg-transparent hover:bg-gray-500 hover:text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white';
            break;
        case 'danger':
        default:
            colorStyles = kind === 'outline'
                ? 'border border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-white'
                : 'bg-red-500 hover:bg-red-600 text-white';
            break;
    }

    const reactiveStyles =
        props.disabled
            ? 'pointer-events-none opacity-50'
            : 'transition-colors cursor-pointer';

    let sizeStyles = '';
    switch (size) {
        case 'xs':
            sizeStyles = 'text-xs px-2 py-1';
            break;
        case 'sm':
            sizeStyles = 'text-sm px-3 py-2';
            break;
        case 'md':
            sizeStyles = 'text-md px-4 py-2';
            break;
        case 'lg':
        default:
            sizeStyles = 'text-lg px-5 py-3';
            break;
    }

    return <button  
        {...props}
        className={twMerge(`text-white rounded-md ${sizeStyles} ${colorStyles} ${reactiveStyles}`, className)}
        onClick={() => _onClick(props.disabled, onClick)}
    />  
}