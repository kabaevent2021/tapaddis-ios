export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiFetch, adminApiJson } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";

type Settlement = {
  id: string;
  crew: { id: string; name: string | null; phone: string };
  shift: { id: string; startedAt: string; endedAt: string | null; vehicleId: string | null; status: string };
  grossCollected: number;
  cashCollected: number;
  walletCollected: number;
  status: string;
  createdAt: string;
  settledAt: string | null;
  settledBy: string | null;
};

type SettlementPayout = {
  id: string;
  crew: { id: string; name: string | null; phone: string };
  payoutAccount: { provider: string; accountName: string; maskedIdentifier: string };
  grossAmount: number;
  platformFeeAmount: number;
  expressFeeAmount: number;
  netAmount: number;
  status: string;
  provider: string | null;
  providerReference: string | null;
  failureReason: string | null;
  requestedAt: string;
  completedAt: string | null;
  transactionCount: number;
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getSettlements() {
  try {
    return await adminApiJson<Settlement[]>("/admin/crew-settlements");
  } catch {
    return [] as Settlement[];
  }
}

async function settleSettlement(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();

  try {
    const res = await adminApiFetch(`/admin/crew-settlements/${id}/settle`, {
      method: "POST",
    });
    if (!res.ok) throw new Error();
    revalidatePath("/settlements");
    redirect("/settlements?notice=Settlement%20marked%20as%20settled");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to settle shift");
    redirect(`/settlements?error=${encodeURIComponent(message)}`);
  }
}

async function updatePayoutStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const providerReference = String(formData.get("providerReference") ?? "").trim();
  const failureReason = String(formData.get("failureReason") ?? "").trim();

  try {
    const res = await adminApiFetch(`/admin/crew-settlement-payouts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        providerReference: providerReference || undefined,
        failureReason: failureReason || undefined,
      }),
    });
    if (!res.ok) throw new Error();
    revalidatePath("/settlements");
    redirect("/settlements?notice=Bank%20settlement%20updated");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to update bank settlement");
    redirect(`/settlements?error=${encodeURIComponent(message)}`);
  }
}

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const notice = normalize(params.notice);
  const error = normalize(params.error);
  const status = normalize(params.status);
  const query = normalize(params.q);
  const suffix = new URLSearchParams();
  if (status) suffix.set("status", status);
  if (query) suffix.set("q", query);
  const items = await (async () => {
    try {
      return await adminApiJson<Settlement[]>(`/admin/crew-settlements${suffix.toString() ? `?${suffix.toString()}` : ""}`);
    } catch {
      return [] as Settlement[];
    }
  })();
  const payoutItems = await (async () => {
    try {
      return await adminApiJson<SettlementPayout[]>("/admin/crew-settlement-payouts");
    } catch {
      return [] as SettlementPayout[];
    }
  })();
  const counts = items.reduce(
    (acc, item) => {
      if (item.status === "SETTLED") acc.settled += 1;
      else if (item.status === "READY") acc.ready += 1;
      else acc.open += 1;
      return acc;
    },
    { open: 0, ready: 0, settled: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Crew Settlements</h1>
        <p className="mt-1 text-sm text-slate-500">Back-office settlement ledger for collected fares. Crew does not see this in the mobile app.</p>
      </div>

      {notice && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Open" value={counts.open} />
        <SummaryCard label="Ready" value={counts.ready} />
        <SummaryCard label="Settled" value={counts.settled} />
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.4fr,1fr,auto]">
        <input name="q" defaultValue={query ?? ""} placeholder="Crew name, phone, or vehicle" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="READY">READY</option>
          <option value="SETTLED">SETTLED</option>
        </select>
        <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Crew</th>
              <th className="px-5 py-4 font-medium">Shift</th>
              <th className="px-5 py-4 font-medium">Gross</th>
              <th className="px-5 py-4 font-medium">Split</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{item.crew.name ?? "Unknown crew"}</div>
                  <div className="text-xs text-slate-500">{item.crew.phone}</div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <div>{item.shift.vehicleId ?? "No vehicle"}</div>
                  <div className="text-xs text-slate-500">{new Date(item.shift.startedAt).toLocaleString()}</div>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-900">{item.grossCollected.toFixed(2)} ETB</td>
                <td className="px-5 py-4 text-slate-600">
                  Cash {item.cashCollected.toFixed(2)} / Wallet {item.walletCollected.toFixed(2)}
                </td>
                <td className="px-5 py-4 text-slate-600">{item.status}</td>
                <td className="px-5 py-4">
                  {item.status === "SETTLED" ? (
                    <span className="text-xs font-semibold text-green-600">Settled</span>
                  ) : (
                    <form action={settleSettlement}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-xl bg-[#0B0B0D] px-3 py-2 text-xs font-semibold text-white">Mark settled</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No crew settlements are available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Bank settlement requests</h2>
        <p className="mt-1 text-sm text-slate-500">Manual review queue for Crew Settle to bank requests. No cash collection flow is added.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Crew</th>
              <th className="px-5 py-4 font-medium">Bank</th>
              <th className="px-5 py-4 font-medium">Amounts</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payoutItems.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{item.crew.name ?? "Unknown crew"}</div>
                  <div className="text-xs text-slate-500">{item.crew.phone}</div>
                  <div className="mt-1 text-xs text-slate-400">{new Date(item.requestedAt).toLocaleString()}</div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <div className="font-semibold text-slate-900">{item.payoutAccount.provider}</div>
                  <div>{item.payoutAccount.accountName}</div>
                  <div className="text-xs text-slate-500">{item.payoutAccount.maskedIdentifier}</div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <div>Gross {item.grossAmount.toFixed(2)} ETB</div>
                  <div>Platform fee {item.platformFeeAmount.toFixed(2)} ETB</div>
                  <div>Express fee {item.expressFeeAmount.toFixed(2)} ETB</div>
                  <div className="font-semibold text-slate-950">Net {item.netAmount.toFixed(2)} ETB</div>
                  <div className="text-xs text-slate-500">{item.transactionCount} fare transaction(s)</div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <div className="font-semibold text-slate-900">{item.status}</div>
                  {item.providerReference && <div className="text-xs text-slate-500">Ref: {item.providerReference}</div>}
                  {item.failureReason && <div className="text-xs text-red-600">{item.failureReason}</div>}
                </td>
                <td className="px-5 py-4">
                  <form action={updatePayoutStatus} className="grid min-w-64 gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <select name="status" defaultValue={item.status} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
                      <option value="PENDING_MANUAL_TRANSFER">PENDING_MANUAL_TRANSFER</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REVERSED">REVERSED</option>
                    </select>
                    <input name="providerReference" defaultValue={item.providerReference ?? ""} placeholder="Bank/manual reference" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                    <input name="failureReason" defaultValue={item.failureReason ?? ""} placeholder="Failure reason if needed" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                    <button type="submit" className="rounded-xl bg-[#0B0B0D] px-3 py-2 text-xs font-semibold text-white">Update request</button>
                  </form>
                </td>
              </tr>
            ))}
            {payoutItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">No bank settlement requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
