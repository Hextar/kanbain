import type { ReactNode } from "react";
import CanvasSurface from "@uiKit/CanvasSurface";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <CanvasSurface className="flex min-h-0 flex-1 items-center justify-center p-6">
        {children}
      </CanvasSurface>
    </div>
  );
}
