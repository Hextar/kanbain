import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type HeaderProps = {
  className?: string;
  projectName: string;
};

export default function Header({ className, projectName }: HeaderProps) {
  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      <div className="flex flex-col items-start gap-1">
        <Link
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
          href="/"
        >
          <ChevronLeft size={16} />
          Projects
        </Link>
        <h1 className="text-3xl font-bold text-white">{projectName}</h1>
      </div>
    </div>
  );
}
