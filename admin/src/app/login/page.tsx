"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("0900000000");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        nextPath?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to sign in.");
      }

      router.replace(payload.nextPath || "/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">TapAddis Admin</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Use an admin or enterprise admin phone number and PIN to access the control panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              inputMode="numeric"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            PIN
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              inputMode="numeric"
              type="password"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <p className="text-xs text-slate-400">
            Fleet operators sign in here with their enterprise admin account after TapAddis sets up the operator.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#0B0B0D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#17171B] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
