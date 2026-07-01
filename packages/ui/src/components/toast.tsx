"use client";
import * as React from "react";
import { createPortal } from "react-dom";

type ToastItem = { id: number; message: string };
type ToastContextValue = { toast: (message: string) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  // Render the portal only after mount so the server and the client's first
  // (hydration) render both produce nothing — avoids a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const toast = React.useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[400] flex flex-col items-center gap-2 px-4">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="pointer-events-auto rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white shadow-pop"
                >
                  {t.message}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
