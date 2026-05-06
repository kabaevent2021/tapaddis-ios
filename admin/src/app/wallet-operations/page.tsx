export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiFetch, adminApiJson } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";

type WalletOperation = {
  id: string;
  user: { id: string; name: string | null; phone: string; role: string };
  type: string;
  direction: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, string>;
  createdAt: string;
};

async function getWalletOperations() {
  try {
    return await adminApiJson<WalletOperation[]>("/admin/wallet/operations");
  } catch {
    return [] as WalletOperation[];
  }
}

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function createRefund(formData: FormData) {
  "use server";
  const customerQuery = String(formData.get("customerQuery") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  try {
    const res = await adminApiFetch(`/admin/wallet/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerQuery, amount, note }),
    });
    if (!res.ok) throw new Error();
    revalidatePath("/wallet-operations");
    redirect("/wallet-operations?notice=Refund%20saved");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to save refund");
    redirect(`/wallet-operations?error=${encodeURIComponent(message)}`);
  }
}

async function createAdjustment(formData: FormData) {
  "use server";
  const customerQuery = String(formData.get("customerQuery") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "CREDIT");
  const note = String(formData.get("note") ?? "").trim();

  try {
    const res = await adminApiFetch(`/admin/wallet/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerQuery, amount, direction, note }),
    });
    if (!res.ok) throw new Error();
    revalidatePath("/wallet-operations");
    redirect("/wallet-operations?notice=Adjustment%20saved");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to save adjustment");
    redirect(`/wallet-operations?error=${encodeURIComponent(message)}`);
  }
}

export default async function WalletOperationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const notice = normalize(params.notice);
  const error = normalize(params.error);
  const q = normalize(params.q);
  const type = normalize(params.type);
  const direction = normalize(params.direction);
  const suffix = new URLSearchParams();
  if (q) suffix.set("q", q);
  if (type) suffix.set("type", type);
  if (direction) suffix.set("direction", direction);
  const items = await (async () => {
    try {
      return await adminApiJson<WalletOperation[]>(`/admin/wallet/operations${suffix.toString() ? `?${suffix.toString()}` : ""}`);
    } catch {
      return [] as WalletOperation[];
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet Operations</h1>
        <p className="mt-1 text-sm text-slate-500">Support-only actions for refunds, adjustments, and closed-loop ledger review.</p>
      </div>

      {notice && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.3fr,1fr,1fr,auto]">
        <input name="q" defaultValue={q ?? ""} placeholder="Phone, name, reference" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="type" defaultValue={type ?? ""} placeholder="Type e.g. REFUND" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="direction" defaultValue={direction ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All directions</option>
          <option value="CREDIT">CREDIT</option>
          <option value="DEBIT">DEBIT</option>
        </select>
        <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={createRefund} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Manual Refund</h2>
          <input name="customerQuery" placeholder="Phone or wallet code" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="amount" type="number" min="1" step="1" placeholder="Amount (ETB)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="note" placeholder="Reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Create refund</button>
        </form>

        <form action={createAdjustment} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Manual Adjustment</h2>
          <input name="customerQuery" placeholder="Phone or wallet code" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="amount" type="number" min="1" step="1" placeholder="Amount (ETB)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select name="direction" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="CREDIT">Credit wallet</option>
            <option value="DEBIT">Debit wallet</option>
          </select>
          <input name="note" placeholder="Reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Save adjustment</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Operation</th>
              <th className="px-5 py-4 font-medium">Amount</th>
              <th className="px-5 py-4 font-medium">Balance</th>
              <th className="px-5 py-4 font-medium">Reference</th>
              <th className="px-5 py-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{item.user.name ?? "Unknown user"}</div>
                  <div className="text-xs text-slate-500">{item.user.phone} - {item.user.role}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{item.type}</div>
                  <div className="text-xs text-slate-500">{item.direction}</div>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-900">{item.amount.toFixed(2)} ETB</td>
                <td className="px-5 py-4 text-slate-600">{item.balanceBefore.toFixed(2)} {"->"} {item.balanceAfter.toFixed(2)}</td>
                <td className="px-5 py-4 text-slate-600">{item.referenceType ?? "-"} / {item.referenceId ?? "-"}</td>
                <td className="px-5 py-4 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No wallet operations available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
