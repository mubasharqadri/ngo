"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { clsx } from "clsx";

type Toast = { id: number; title: string; desc?: string; tone: "success" | "error" | "info" };
type Ctx = { push: (t: { title: string; desc?: string; tone?: Toast["tone"] }) => void };

const ToastCtx = createContext<Ctx>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: { title: string; desc?: string; tone?: Toast["tone"] }) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, title: t.title, desc: t.desc, tone: t.tone ?? "success" }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "card p-3.5 shadow-lg flex items-start gap-3 animate-[toastIn_.25s_ease]",
              t.tone === "success" && "border-emerald-200",
              t.tone === "error" && "border-rose-200",
              t.tone === "info" && "border-sky-200"
            )}
            style={{ animation: "toastIn .25s ease" }}
          >
            {t.tone === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.tone === "error" && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.tone === "info" && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.desc && <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>}
            </div>
            <button className="text-gray-400 hover:text-gray-700" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn { from { transform: translateX(16px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </ToastCtx.Provider>
  );
}
