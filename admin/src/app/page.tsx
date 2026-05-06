import { Activity, BarChart3, Users, XOctagon } from "lucide-react";
import { DashboardCharts, type DashboardData } from "./components/DashboardCharts";
import { adminApiJson } from "@/lib/admin-auth";

async function getDashboardData() {
  try {
    return await adminApiJson<DashboardData & {
      totalTapsToday: number;
      tapSuccessRate: number;
      activeShifts: number;
      failedTapsToday: number;
      digitalPercentage: number;
      totalCustomers: number;
      pendingSync: number;
      averageFare: string;
      liability: {
        currentLiabilityEtb: number;
        liabilityCapEtb: number;
        remainingLiabilityEtb: number;
        walletCapEtb: number;
      };
      telebirrSummary: {
        pending: number;
        completed: number;
        failed: number;
      };
      settlementCounts: {
        open: number;
        ready: number;
        settled: number;
      };
      recentCashLoads: Array<{
        id: string;
        amount: number;
        status: string;
        createdAt: string;
        customer: { id: string; name: string | null; phone: string };
        agent: { id: string; name: string | null; phone: string } | null;
      }>;
      recentCardRegistrations: Array<{
        id: string;
        label: string;
        cardType: string;
        techType: string;
        createdAt: string;
        customer: { id: string; name: string | null; phone: string };
        agent: { id: string; name: string | null; phone: string } | null;
      }>;
      activeShiftRows: Array<{
        id: string;
        startedAt: string;
        vehicleId: string | null;
        vehicleClassLabel: string;
        route: { id: string; name: string; code: string } | null;
        crew: { id: string; name: string | null; phone: string };
      }>;
      pendingSyncTransactions: Array<{
        id: string;
        createdAt: string;
        fare: number;
        type: string;
        status: string;
        customer: { id: string; name: string | null; phone: string } | null;
        shift: { id: string; vehicleId: string | null; crew: { id: string; name: string | null; phone: string } | null } | null;
        fareBand: { label: string; distanceLabel: string };
      }>;
      failedTapReasons: Record<string, number>;
    }>("/admin/dashboard");
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        <p>Could not connect to backend API.</p>
        <p className="mt-2 text-sm">Make sure the NestJS server is running on port 3000.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="NFC Taps"
          value={data.totalTapsToday}
          icon={<Activity size={20} className="text-slate-900" />}
          trend={`${data.tapSuccessRate}% Success`}
        />
        <KpiCard
          title="Total Revenue"
          value={`${data.totalRevenueToday} ETB`}
          icon={<BarChart3 size={20} className="text-green-500" />}
          trend={`${data.digitalPercentage}% Digital`}
        />
        <KpiCard
          title="Active Shifts"
          value={data.activeShifts}
          icon={<Users size={20} className="text-slate-900" />}
          trend={`${data.pendingSync} Pending Sync`}
        />
        <KpiCard
          title="Failed Taps"
          value={data.failedTapsToday}
          icon={<XOctagon size={20} className="text-red-500" />}
          trend={`Avg Fare ${data.averageFare} ETB`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Revenue by Fare Band</h3>
          <div className="h-72">
            <DashboardCharts type="revenue" data={data} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Cash vs Digital</h3>
          <div className="h-72">
            <DashboardCharts type="split" data={data} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Active Shifts</h3>
          <div className="mt-4 space-y-3">
            {data.activeShiftRows.length > 0 ? data.activeShiftRows.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{shift.vehicleId ?? "No vehicle"}</p>
                    <p className="text-sm text-slate-500">
                      {shift.vehicleClassLabel} • {shift.route?.name ?? "No route"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(shift.startedAt).toLocaleTimeString()}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{shift.crew.name ?? "Unknown crew"} • {shift.crew.phone}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No active shifts right now.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <StatPanel title="Liability & Float">
            <StatLine label="Current liability" value={`${data.liability.currentLiabilityEtb.toFixed(2)} ETB`} />
            <StatLine label="Cap" value={`${data.liability.liabilityCapEtb.toFixed(2)} ETB`} />
            <StatLine label="Remaining" value={`${data.liability.remainingLiabilityEtb.toFixed(2)} ETB`} />
            <StatLine label="Per wallet cap" value={`${data.liability.walletCapEtb.toFixed(2)} ETB`} />
          </StatPanel>

          <StatPanel title="Settlement Status">
            <StatLine label="Open" value={String(data.settlementCounts.open)} />
            <StatLine label="Ready" value={String(data.settlementCounts.ready)} />
            <StatLine label="Settled" value={String(data.settlementCounts.settled)} />
          </StatPanel>

          <StatPanel title="Telebirr Summary">
            <StatLine label="Pending" value={String(data.telebirrSummary.pending)} />
            <StatLine label="Completed" value={String(data.telebirrSummary.completed)} />
            <StatLine label="Failed" value={String(data.telebirrSummary.failed)} />
          </StatPanel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FeedPanel
          title="Recent Cash Loads"
          items={data.recentCashLoads.map((item) => ({
            id: item.id,
            title: `${item.amount.toFixed(2)} ETB`,
            subtitle: `${item.customer.name ?? "Unknown customer"} • ${item.customer.phone}`,
            meta: `${item.agent?.name ?? "Unknown agent"} • ${new Date(item.createdAt).toLocaleString()}`,
          }))}
        />
        <FeedPanel
          title="Recent Card Registrations"
          items={data.recentCardRegistrations.map((item) => ({
            id: item.id,
            title: item.label,
            subtitle: `${item.customer.name ?? "Unknown customer"} • ${item.cardType}`,
            meta: `${item.agent?.name ?? "Unknown agent"} • ${new Date(item.createdAt).toLocaleString()}`,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <FeedPanel
          title="Pending Sync Queue"
          items={data.pendingSyncTransactions.map((item) => ({
            id: item.id,
            title: `${item.fareBand.label} • ${item.fare.toFixed(2)} ETB`,
            subtitle: `${item.shift?.vehicleId ?? "No vehicle"} • ${item.customer?.name ?? "Unknown customer"}`,
            meta: new Date(item.createdAt).toLocaleString(),
          }))}
          emptyText="No pending sync transactions."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Failed Tap Reasons</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(data.failedTapReasons).length > 0 ? Object.entries(data.failedTapReasons).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-700">{reason}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
            )) : <p className="text-sm text-slate-500">No failed tap reasons recorded today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5">{icon}</div>
      </div>
      {trend && <p className="mt-4 text-sm font-medium text-slate-500">{trend}</p>}
    </div>
  );
}

function StatPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function FeedPanel({
  title,
  items,
  emptyText = "No recent records.",
}: {
  title: string;
  items: Array<{ id: string; title: string; subtitle: string; meta: string }>;
  emptyText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
            <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
          </div>
        )) : <p className="text-sm text-slate-500">{emptyText}</p>}
      </div>
    </div>
  );
}
