export const dynamic = "force-dynamic";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { adminApiJson } from "@/lib/admin-auth";

interface FailedTap {
  id: string;
  createdAt: string;
  failReason?: string | null;
  fare: number;
  customer?: {
    name: string;
    phone?: string | null;
  } | null;
  fareBand: {
    amountEtb: number;
    distanceLabel: string;
    label: string;
  };
  shift?: {
    vehicleId?: string;
    crew?: {
      name?: string;
    } | null;
  } | null;
}

async function getFailedTaps() {
  try {
    return await adminApiJson<FailedTap[]>("/admin/failed-taps");
  } catch {
    return [] as FailedTap[];
  }
}

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FailedTapsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const q = normalize(params.q);
  const reason = normalize(params.reason);
  const dateFrom = normalize(params.dateFrom);
  const dateTo = normalize(params.dateTo);
  const suffix = new URLSearchParams();
  if (q) suffix.set("q", q);
  if (reason) suffix.set("reason", reason);
  if (dateFrom) suffix.set("dateFrom", dateFrom);
  if (dateTo) suffix.set("dateTo", dateTo);
  const transactions = await (async () => {
    try {
      return await adminApiJson<FailedTap[]>(`/admin/failed-taps${suffix.toString() ? `?${suffix.toString()}` : ""}`);
    } catch {
      return [] as FailedTap[];
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <AlertTriangle className="text-red-500" /> Failed Taps
        </h1>
        <p className="mt-1 text-sm text-slate-500">Audit log of declined NFC collections by fare band</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.3fr,1fr,1fr,1fr,auto]">
        <input name="q" defaultValue={q ?? ""} placeholder="Passenger, phone, crew, vehicle" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="reason" defaultValue={reason ?? ""} placeholder="Reason code" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="dateFrom" type="date" defaultValue={dateFrom ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="dateTo" type="date" defaultValue={dateTo ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Reason</th>
              <th className="px-6 py-4 font-semibold">Passenger</th>
              <th className="px-6 py-4 font-semibold">Fare Band</th>
              <th className="px-6 py-4 font-semibold">Distance</th>
              <th className="px-6 py-4 font-semibold">Amount Attempted</th>
              <th className="px-6 py-4 font-semibold">Crew/Vehicle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transactions.map((tx: FailedTap) => (
              <tr key={tx.id} className="transition-colors hover:bg-slate-100">
                <td className="px-6 py-4 text-slate-600">
                  {new Date(tx.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-6 py-4">
                  <span className="flex w-max flex-wrap items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
                    <XCircle size={14} /> {tx.failReason || "UNKNOWN ERROR"}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  {tx.customer ? tx.customer.name : "Unknown"}
                  <br />
                  <span className="text-xs font-normal text-slate-500">{tx.customer?.phone}</span>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{tx.fareBand.label}</td>
                <td className="px-6 py-4 text-slate-600">{tx.fareBand.distanceLabel}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{tx.fare} ETB</td>
                <td className="px-6 py-4 text-slate-900">
                  {tx.shift?.crew?.name}
                  <br />
                  <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">{tx.shift?.vehicleId}</span>
                </td>
              </tr>
            ))}

            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-green-500" />
                  No failed taps recorded today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
