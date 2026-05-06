export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiFetch, adminApiJson } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";

type CustomerLookup = {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  walletBalance: number;
  walletCode: string;
};

type PassengerSupportDetail = {
  cards: Array<{
    id: string;
    label: string;
    cardType: string;
    techType: string;
    status: string;
    last4: string | null;
    isDefault: boolean;
  }>;
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function lookupCustomer(query?: string) {
  if (!query) return null;
  try {
    return await adminApiJson<CustomerLookup>(`/agent/customer-lookup?q=${encodeURIComponent(query)}`);
  } catch {
    return null;
  }
}

async function getPassengerCards(customerId?: string) {
  if (!customerId) return null;
  try {
    const detail = await adminApiJson<PassengerSupportDetail>(`/admin/passengers/${customerId}`);
    return detail.cards;
  } catch {
    return null;
  }
}

async function createCashLoad(formData: FormData) {
  "use server";
  const customerQuery = String(formData.get("customerQuery") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);

  try {
    const res = await adminApiFetch(`/agent/cash-loads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerQuery, amount, actorId: "admin-kiosk" }),
    });
    if (!res.ok) throw new Error();
    revalidatePath("/kiosk");
    redirect(`/kiosk?q=${encodeURIComponent(customerQuery)}&notice=${encodeURIComponent("Cash load completed")}`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to complete cash load");
    redirect(`/kiosk?q=${encodeURIComponent(customerQuery)}&error=${encodeURIComponent(message)}`);
  }
}

async function archiveCard(formData: FormData) {
  "use server";
  const customerId = String(formData.get("customerId") ?? "").trim();
  const cardId = String(formData.get("cardId") ?? "").trim();

  try {
    const res = await adminApiFetch(`/agent/cards/${cardId}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed");
    revalidatePath("/kiosk");
    redirect(`/kiosk?q=${encodeURIComponent(customerId)}&notice=${encodeURIComponent("Card archived")}`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to archive card");
    redirect(`/kiosk?q=${encodeURIComponent(customerId)}&error=${encodeURIComponent(message)}`);
  }
}

async function reactivateCard(formData: FormData) {
  "use server";
  const customerId = String(formData.get("customerId") ?? "").trim();
  const cardId = String(formData.get("cardId") ?? "").trim();

  try {
    const res = await adminApiFetch(`/agent/cards/${cardId}/reactivate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed");
    revalidatePath("/kiosk");
    redirect(`/kiosk?q=${encodeURIComponent(customerId)}&notice=${encodeURIComponent("Card reactivated")}`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to reactivate card");
    redirect(`/kiosk?q=${encodeURIComponent(customerId)}&error=${encodeURIComponent(message)}`);
  }
}

export default async function KioskPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = normalize(searchParams?.q) ?? "";
  const notice = normalize(searchParams?.notice);
  const error = normalize(searchParams?.error);
  const customer = await lookupCustomer(query);
  const cards = await getPassengerCards(customer?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kiosk Cash Load</h1>
        <p className="mt-1 text-sm text-slate-500">Agent surface for cash-only wallet funding inside the closed-loop system.</p>
      </div>

      {notice && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <form className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">Lookup customer by phone or wallet code</label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input name="q" defaultValue={query} placeholder="0911111111 or TADD-..." className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Find customer</button>
        </div>
      </form>

      {customer ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Name:</span> {customer.name ?? "Unknown customer"}</p>
              <p><span className="font-medium text-slate-900">Phone:</span> {customer.phone}</p>
              <p><span className="font-medium text-slate-900">Wallet code:</span> {customer.walletCode}</p>
              <p><span className="font-medium text-slate-900">Balance:</span> {customer.walletBalance.toFixed(2)} ETB</p>
              <p><span className="font-medium text-slate-900">Status:</span> {customer.status}</p>
            </div>
          </div>

          <div className="space-y-5">
            <form action={createCashLoad} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Cash load</h2>
              <input type="hidden" name="customerQuery" value={customer.walletCode} />
              <input name="amount" type="number" min="1" step="1" placeholder="Amount (ETB)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">Confirm load-in</button>
            </form>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Linked cards</h2>
              {cards && cards.length > 0 ? cards.map((card) => (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    {card.label} {card.isDefault ? <span className="text-xs text-blue-600">Default</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {card.cardType} • {card.techType} • {card.last4 ? `•••• ${card.last4}` : "No last4"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {card.status === "ACTIVE" ? (
                      <form action={archiveCard}>
                        <input type="hidden" name="customerId" value={customer.id} />
                        <input type="hidden" name="cardId" value={card.id} />
                        <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Archive</button>
                      </form>
                    ) : (
                      <form action={reactivateCard}>
                        <input type="hidden" name="customerId" value={customer.id} />
                        <input type="hidden" name="cardId" value={card.id} />
                        <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Reactivate</button>
                      </form>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No cards linked yet.</p>}
            </div>
          </div>
        </div>
      ) : query ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No customer matched that phone number or wallet code.</div>
      ) : null}
    </div>
  );
}
