export const dynamic = "force-dynamic";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { adminApiJson } from "@/lib/admin-auth";

interface Passenger {
  id: string;
  name: string | null;
  phone: string;
  walletCode: string;
  createdAt: string;
  walletBalance: number;
  status: string;
  lastLoginAt: string | null;
  transactions?: unknown[];
}

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getPassengers(query?: string) {
  try {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    return await adminApiJson<Passenger[]>(`/admin/passengers${suffix}`);
  } catch {
    return [] as Passenger[];
  }
}

export default async function PassengersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = normalize(params.q) ?? "";
  const passengers = await getPassengers(query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Passengers Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search riders, inspect wallet state, and open full support detail without touching the database.
        </p>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name, phone, or wallet code"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Passenger Name</th>
              <th className="px-6 py-4 font-medium">Phone Number</th>
              <th className="px-6 py-4 font-medium">Wallet Code</th>
              <th className="px-6 py-4 font-medium">Joined Date</th>
              <th className="px-6 py-4 font-medium">Wallet Balance</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Rides Taken</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {passengers.map((p: Passenger) => (
              <tr key={p.id} className="transition-colors hover:bg-slate-100">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-900">
                      {(p.name ?? "P").charAt(0)}
                    </div>
                    {p.name ?? "Unknown passenger"}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{p.phone}</td>
                <td className="px-6 py-4 text-slate-600">{p.walletCode}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className="flex w-max items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 font-bold text-green-500">
                    <Wallet size={14} /> {p.walletBalance.toFixed(2)} ETB
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{p.status}</td>
                <td className="px-6 py-4 font-semibold text-slate-700">{p.transactions?.length || 0}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/passengers/${p.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Open support view
                  </Link>
                </td>
              </tr>
            ))}
            {passengers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                  No passengers matched this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
