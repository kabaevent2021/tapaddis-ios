"use client";

import { useEffect, useState } from "react";

export function PayCodeCopyButton({ payCode }: { payCode: string | null }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timeout = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function handleCopy() {
    if (!payCode) return;
    try {
      await navigator.clipboard.writeText(payCode);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  if (!payCode) {
    return (
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400">
        No code
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        {state === "copied" ? "Copied" : "Copy"}
      </button>
      {state === "error" ? (
        <span className="text-xs font-medium text-red-600">Unable to copy code</span>
      ) : null}
    </div>
  );
}
