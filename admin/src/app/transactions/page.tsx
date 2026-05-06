export const dynamic = "force-dynamic";

import { Banknote, CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { adminApiJson } from "@/lib/admin-auth";

interface TransactionItem {
  id: string;
  createdAt: string;
  fare: number;
  type: "NFC" | "CASH" | string;
  status: "SUCCESS" | "FAILED" | string;
  failReason?: string | null;
  customer?: {
    name: string;
    phone?: string | null;
  } | null;
  shift?: {
    vehicleId?: string | null;
    crew?: {
      name?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  fareBand: {
    amountEtb: number;
    distanceLabel: string;
    label: string;
    vehicleClassLabel?: string;
    legacyRouteCode?: string | null;
  };
}

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getTransactions(params: URLSearchParams) {
  try {
    const query = params.toString();
    return await adminApiJson<TransactionItem[]>(`/admin/transactions?limit=100${query ? `&${query}` : ""}`);
  } catch {
    return [] as TransactionItem[];
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const params = new URLSearchParams();
  const q = normalize(resolved.q);
  const status = normalize(resolved.status);
  const type = normalize(resolved.type);
  const vehicleClass = normalize(resolved.vehicleClass);
  const dateFrom = normalize(resolved.dateFrom);
  const dateTo = normalize(resolved.dateTo);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  if (vehicleClass) params.set("vehicleClass", vehicleClass);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const transactions = await getTransactions(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transaction Feed</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time view of collections by fare band and distance</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.2fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr,auto]">
        <input name="q" defaultValue={q ?? ""} placeholder="Passenger, crew, phone, vehicle" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="PENDING">PENDING</option>
        </select>
        <select name="type" defaultValue={type ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All payment types</option>
          <option value="NFC">NFC</option>
          <option value="QR">QR</option>
          <option value="CASH">CASH</option>
          <option value="MANUAL">MANUAL</option>
        </select>
        <select name="vehicleClass" defaultValue={vehicleClass ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All vehicle classes</option>
          <option value="MINIBUS">MINIBUS</option>
          <option value="MID_BUS">MID_BUS</option>
          <option value="CITY_BUS">CITY_BUS</option>
        </select>
        <input name="dateFrom" type="date" defaultValue={dateFrom ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="dateTo" type="date" defaultValue={dateTo ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Tx ID</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Passenger</th>
                <th className="px-6 py-4 font-medium">Fare Band</th>
                <th className="px-6 py-4 font-medium">Distance</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Vehicle</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((tx: TransactionItem) => (
                <tr key={tx.id} className="transition-colors hover:bg-slate-100">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500" title={tx.id}>
                      {tx.id.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={14} />
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {tx.customer ? tx.customer.name : <span className="italic text-slate-400">Walk-in</span>}
                    {tx.customer?.phone ? <p className="text-xs font-normal text-slate-500">{tx.customer.phone}</p> : null}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{tx.fareBand.label}</td>
                  <td className="px-6 py-4 text-slate-600">{tx.fareBand.distanceLabel}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{tx.fare} ETB</td>
                  <td className="px-6 py-4">
                    {tx.type === "NFC" ? (
                      <span className="flex w-max items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-500">
                        <CreditCard size={14} /> Digital
                      </span>
                    ) : (
                      <span className="flex w-max items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        <Banknote size={14} /> Cash
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <p>{tx.shift?.vehicleId ?? "No vehicle"}</p>
                    <p className="text-xs text-slate-500">
                      {tx.shift?.crew?.name ?? "Unknown crew"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {tx.status === "SUCCESS" ? (
                      <span className="flex items-center gap-1 font-medium text-green-500">
                        <CheckCircle2 size={16} /> OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-red-500" title={tx.failReason ?? undefined}>
                        <XCircle size={16} /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
