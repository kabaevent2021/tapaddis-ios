export const dynamic = "force-dynamic";

import { BarChart3, MapPin } from "lucide-react";
import { adminApiJson } from "@/lib/admin-auth";

interface FareBandStat {
  id: string;
  amountEtb: number;
  distanceLabel: string;
  label: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalRevenue: number;
  shareOfCollections: number;
}

async function getFareBands() {
  try {
    return await adminApiJson<FareBandStat[]>("/admin/fare-bands/stats");
  } catch {
    return [] as FareBandStat[];
  }
}

export default async function RoutesPage() {
  const fareBands = await getFareBands();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fare Band Statistics</h1>
        <p className="mt-1 text-sm text-slate-500">Performance and revenue by amount and distance band</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {fareBands.map((fareBand: FareBandStat) => (
          <div key={fareBand.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-900">{fareBand.label}</span>
              <MapPin size={18} className="text-slate-500" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">{fareBand.distanceLabel}</h3>
            <p className="mt-1 text-sm text-slate-500">Official city fare band</p>

            <div className="mb-6 mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Transactions</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{fareBand.totalTransactions}</p>
              </div>
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <p className="text-xs font-medium text-green-500">Revenue</p>
                <p className="mt-1 text-xl font-bold text-green-500">
                  {fareBand.totalRevenue} <span className="text-sm">ETB</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Successful</span>
                <span className="font-semibold text-slate-900">{fareBand.successfulTransactions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Failed</span>
                <span className="font-semibold text-slate-900">{fareBand.failedTransactions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-slate-500">
                  <BarChart3 size={14} />
                  Share of collections
                </span>
                <span className="font-semibold text-slate-900">{fareBand.shareOfCollections}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
