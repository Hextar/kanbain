import type { ReactNode } from "react";
import CanvasDots from "@uiKit/CanvasDots";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <CanvasDots className="flex min-h-0 flex-1 items-center justify-center p-6">
        {children}
      </CanvasDots>
    </div>
  );
}
