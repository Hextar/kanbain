"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getToasts, subscribeToasts } from "@libraries/toast";

export default function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof node.showPopover !== "function") return;
    try {
      if (toasts.length > 0) node.showPopover();
      else node.hidePopover();
    } catch {
      /* already open or closed */
    }
  }, [toasts]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 bottom-6 top-auto mx-auto flex w-full max-w-sm flex-col items-center gap-2 border-0 bg-transparent p-0"
      popover="manual"
    >
      {toasts.map((toast) => (
        <p
          key={toast.id}
          className="pointer-events-auto w-full rounded-xl border border-white/8 bg-[#181b24] px-4 py-2.5 text-center text-sm text-zinc-100 shadow-xl shadow-black/40"
          role="status"
        >
          {toast.message}
        </p>
      ))}
    </div>
  );
}
