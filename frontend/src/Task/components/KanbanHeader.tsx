type HeaderProps = {
    className?: string
}

export default function Header({ className }: HeaderProps) {
    return (
        <div className={`flex items-center justify-between p-4 ${className}`}>
            <div className="flex flex-col items-start gap-4">
                <h1 className="text-3xl font-bold text-white">KanbAIn</h1>
            </div>
        </div>
    )
}
