"use client";

import { useSyncExternalStore } from "react";
import { getToasts, subscribeToasts } from "@libraries/toast";

export default function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <p
          key={toast.id}
          className="max-w-sm rounded-xl border border-white/8 bg-[#181b24] px-4 py-2.5 text-center text-sm text-zinc-100 shadow-xl shadow-black/40"
          role="status"
        >
          {toast.message}
        </p>
      ))}
    </div>
  );
}
