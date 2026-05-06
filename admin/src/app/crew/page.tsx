export const dynamic = "force-dynamic";

import { Briefcase, CheckCircle2, Phone, User } from "lucide-react";
import { adminApiJson } from "@/lib/admin-auth";

interface CrewStat {
  id: string;
  name: string;
  phone: string;
  status: string;
  totalShifts: number;
  totalTransactions: number;
  totalRevenue: number;
  nfcTransactions: number;
  cashTransactions: number;
  activeShift: {
    id: string;
    vehicleId: string | null;
    startedAt: string;
    route: { id: string; name: string; code: string } | null;
    vehicleClassLabel: string;
    selectedFareBands: Array<{ id: string; amountEtb: number; distanceLabel: string }>;
  } | null;
  latestSettlement: {
    status: string;
    netPayable: number;
  } | null;
}

async function getCrew() {
  try {
    return await adminApiJson<CrewStat[]>("/admin/crew/stats");
  } catch {
    return [] as CrewStat[];
  }
}

export default async function CrewPage() {
  const crew = await getCrew();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Crew Statistics</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {crew.map((c: CrewStat) => {
          const totalTender = c.nfcTransactions + c.cashTransactions;
          const nfcWidth = totalTender > 0 ? (c.nfcTransactions / totalTender) * 100 : 0;
          const cashWidth = totalTender > 0 ? (c.cashTransactions / totalTender) * 100 : 0;

          return (
            <div key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:flex-row">
              <div className="border-b border-slate-200 bg-slate-100 p-6 md:w-1/3 md:border-b-0 md:border-r">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                  <User size={30} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold leading-tight text-slate-900">{c.name}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={14} /> {c.phone}
                </p>

                <div className="mt-6">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-medium text-green-500">
                    <CheckCircle2 size={15} /> {c.status}
                  </p>
                </div>
              </div>

              <div className="p-6 md:w-2/3">
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    <Briefcase size={15} /> Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total Shifts</p>
                      <p className="text-xl font-bold text-slate-900">{c.totalShifts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Transactions</p>
                      <p className="text-xl font-bold text-slate-900">{c.totalTransactions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Revenue</p>
                      <p className="text-xl font-bold text-green-500">{c.totalRevenue}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Tender Split</h4>
                  <div className="mb-2 flex h-4 overflow-hidden rounded-full bg-slate-100">
                    {totalTender > 0 ? (
                      <>
                        <div className="h-full bg-blue-500" style={{ width: `${nfcWidth}%` }} />
                        <div className="h-full bg-slate-800" style={{ width: `${cashWidth}%` }} />
                      </>
                    ) : (
                      <div className="h-full w-full bg-slate-200" />
                    )}
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-medium">
                    <span className="text-blue-500">{c.nfcTransactions} NFC</span>
                    <span className="text-slate-700">{c.cashTransactions} Cash</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Shift</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {c.activeShift ? (c.activeShift.vehicleId ?? "No vehicle") : "No active shift"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {c.activeShift
                          ? `${c.activeShift.vehicleClassLabel} • ${c.activeShift.route?.name ?? "No route"}`
                          : "Crew member is currently offline"}
                      </p>
                    </div>
                    <a
                      href={`/settlements?q=${encodeURIComponent(c.phone)}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      View settlements
                    </a>
                  </div>
                  {c.activeShift?.selectedFareBands?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.activeShift.selectedFareBands.map((fareBand) => (
                        <span key={fareBand.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {fareBand.amountEtb} ETB • {fareBand.distanceLabel}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {c.latestSettlement ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Latest settlement: {c.latestSettlement.status} • {c.latestSettlement.netPayable.toFixed(2)} ETB payable
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
