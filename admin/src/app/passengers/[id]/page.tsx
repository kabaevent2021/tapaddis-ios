export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { adminApiFetch, adminApiJson, readBackendErrorMessage } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";

type PassengerDetail = {
  id: string;
  name: string | null;
  phone: string;
  walletCode: string;
  walletBalance: number;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePin: boolean;
  failedLoginAttempts: number;
  loginLockedUntil: string | null;
  cards: Array<{
    id: string;
    label: string;
    cardType: string;
    fingerprintVersion: string;
    techType: string;
    last4: string | null;
    brandHint: string | null;
    isDefault: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
    createdByAgent: { id: string; name: string | null; phone: string } | null;
  }>;
  transactions: Array<{
    id: string;
    createdAt: string;
    fare: number;
    type: string;
    status: string;
    failReason: string | null;
    shift: { id: string; vehicleId: string | null; crew: { id: string; name: string | null; phone: string } | null } | null;
    fareBand: { label: string; distanceLabel: string };
  }>;
  walletMovements: Array<{
    id: string;
    type: string;
    direction: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType: string | null;
    referenceId: string | null;
    metadata: Record<string, string>;
    createdAt: string;
  }>;
  topUps: Array<{
    id: string;
    channel: string;
    amount: number;
    status: string;
    providerReference: string | null;
    providerStatus: string | null;
    failureReason: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
  transfers: Array<{
    id: string;
    amount: number;
    status: string;
    reference: string;
    createdAt: string;
    sender: { id: string; name: string | null; phone: string };
    recipient: { id: string; name: string | null; phone: string };
  }>;
  activity: Array<{
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    direction: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    readAt: string | null;
  }>;
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getPassenger(id: string) {
  try {
    return await adminApiJson<PassengerDetail>(`/admin/passengers/${id}`);
  } catch {
    return null;
  }
}

async function updatePassengerStatus(formData: FormData) {
  "use server";
  const passengerId = String(formData.get("passengerId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE").trim();

  try {
    const response = await adminApiFetch(`/admin/passengers/${passengerId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath(`/passengers/${passengerId}`);
    revalidatePath("/passengers");
    redirect(`/passengers/${passengerId}?notice=Passenger%20status%20updated`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to update passenger");
    redirect(`/passengers/${passengerId}?error=${encodeURIComponent(message)}`);
  }
}

async function createPassengerRefund(formData: FormData) {
  "use server";
  const passengerId = String(formData.get("passengerId") ?? "").trim();
  const customerQuery = String(formData.get("customerQuery") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  try {
    const response = await adminApiFetch("/admin/wallet/refunds", {
      method: "POST",
      body: JSON.stringify({ customerQuery, amount, note }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath(`/passengers/${passengerId}`);
    revalidatePath("/wallet-operations");
    redirect(`/passengers/${passengerId}?notice=Refund%20saved`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to save refund");
    redirect(`/passengers/${passengerId}?error=${encodeURIComponent(message)}`);
  }
}

async function createPassengerAdjustment(formData: FormData) {
  "use server";
  const passengerId = String(formData.get("passengerId") ?? "").trim();
  const customerQuery = String(formData.get("customerQuery") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "CREDIT").trim();
  const note = String(formData.get("note") ?? "").trim();

  try {
    const response = await adminApiFetch("/admin/wallet/adjustments", {
      method: "POST",
      body: JSON.stringify({ customerQuery, amount, direction, note }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath(`/passengers/${passengerId}`);
    revalidatePath("/wallet-operations");
    redirect(`/passengers/${passengerId}?notice=Adjustment%20saved`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to save adjustment");
    redirect(`/passengers/${passengerId}?error=${encodeURIComponent(message)}`);
  }
}

async function archiveCard(formData: FormData) {
  "use server";
  const passengerId = String(formData.get("passengerId") ?? "").trim();
  const cardId = String(formData.get("cardId") ?? "").trim();

  try {
    const response = await adminApiFetch(`/agent/cards/${cardId}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath(`/passengers/${passengerId}`);
    redirect(`/passengers/${passengerId}?notice=Card%20archived`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to archive card");
    redirect(`/passengers/${passengerId}?error=${encodeURIComponent(message)}`);
  }
}

async function reactivateCard(formData: FormData) {
  "use server";
  const passengerId = String(formData.get("passengerId") ?? "").trim();
  const cardId = String(formData.get("cardId") ?? "").trim();

  try {
    const response = await adminApiFetch(`/agent/cards/${cardId}/reactivate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath(`/passengers/${passengerId}`);
    redirect(`/passengers/${passengerId}?notice=Card%20reactivated`);
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to reactivate card");
    redirect(`/passengers/${passengerId}?error=${encodeURIComponent(message)}`);
  }
}

export default async function PassengerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const passenger = await getPassenger(id);
  if (!passenger) {
    notFound();
  }

  const resolvedSearch = (await searchParams) ?? {};
  const notice = normalize(resolvedSearch.notice);
  const error = normalize(resolvedSearch.error);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/passengers" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            ← Back to passengers
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{passenger.name ?? "Unknown passenger"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {passenger.phone} • {passenger.walletCode}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${passenger.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          {passenger.status}
        </span>
      </div>

      {notice ? <Banner tone="success" message={notice} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Wallet Balance" value={`${passenger.walletBalance.toFixed(2)} ETB`} />
            <StatCard label="Cards" value={String(passenger.cards.length)} />
            <StatCard label="Failed Login Attempts" value={String(passenger.failedLoginAttempts)} />
            <StatCard label="Last Login" value={passenger.lastLoginAt ? new Date(passenger.lastLoginAt).toLocaleString() : "Never"} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Account Control</h2>
            <form action={updatePassengerStatus} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="passengerId" value={passenger.id} />
              <select name="status" defaultValue={passenger.status} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="ACTIVE">Active</option>
                <option value="FROZEN">Frozen</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
                Save status
              </button>
            </form>
            <div className="mt-4 text-sm text-slate-500">
              {passenger.loginLockedUntil ? (
                <p>Locked until {new Date(passenger.loginLockedUntil).toLocaleString()}</p>
              ) : (
                <p>No active login lockout.</p>
              )}
              {passenger.mustChangePin ? <p className="mt-1">PIN reset required on next sign-in.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Linked NFC Cards</h2>
            <div className="mt-4 space-y-3">
              {passenger.cards.length > 0 ? passenger.cards.map((card) => (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {card.label} {card.isDefault ? <span className="text-xs text-blue-600">Default</span> : null}
                      </p>
                      <p className="text-sm text-slate-500">
                        {card.cardType} • {card.techType} • {card.last4 ? `•••• ${card.last4}` : "No last4"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${card.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {card.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Added {new Date(card.createdAt).toLocaleString()} by {card.createdByAgent?.name ?? "Unknown agent"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {card.status === "ACTIVE" ? (
                      <form action={archiveCard}>
                        <input type="hidden" name="passengerId" value={passenger.id} />
                        <input type="hidden" name="cardId" value={card.id} />
                        <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                          Archive
                        </button>
                      </form>
                    ) : (
                      <form action={reactivateCard}>
                        <input type="hidden" name="passengerId" value={passenger.id} />
                        <input type="hidden" name="cardId" value={card.id} />
                        <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                          Reactivate
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No NFC cards linked yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <form action={createPassengerRefund} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Manual Refund</h2>
              <input type="hidden" name="passengerId" value={passenger.id} />
              <input type="hidden" name="customerQuery" value={passenger.phone} />
              <input name="amount" type="number" min="1" step="1" placeholder="Amount (ETB)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input name="note" placeholder="Reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
                Save refund
              </button>
            </form>

            <form action={createPassengerAdjustment} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Manual Adjustment</h2>
              <input type="hidden" name="passengerId" value={passenger.id} />
              <input type="hidden" name="customerQuery" value={passenger.phone} />
              <input name="amount" type="number" min="1" step="1" placeholder="Amount (ETB)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <select name="direction" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="CREDIT">Credit wallet</option>
                <option value="DEBIT">Debit wallet</option>
              </select>
              <input name="note" placeholder="Reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
                Save adjustment
              </button>
            </form>
          </div>

          <Section title="Recent Notifications">
            {passenger.notifications.length > 0 ? passenger.notifications.map((item) => (
              <FeedRow
                key={item.id}
                title={`${item.title} - ${item.status}`}
                subtitle={item.body}
                meta={new Date(item.createdAt).toLocaleString()}
                value={item.type.replace(/_/g, " ")}
              />
            )) : <p className="text-sm text-slate-500">No notifications sent yet.</p>}
          </Section>

          <Section title="Recent Activity">
            {passenger.activity.map((item) => (
              <FeedRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                meta={new Date(item.createdAt).toLocaleString()}
                value={`${item.direction === "DEBIT" ? "-" : "+"}${item.amount.toFixed(2)} ETB`}
              />
            ))}
          </Section>

          <Section title="Recent Transit Payments">
            {passenger.transactions.map((item) => (
              <FeedRow
                key={item.id}
                title={`${item.fareBand.label} • ${item.type}`}
                subtitle={`${item.fareBand.distanceLabel} • ${item.shift?.vehicleId ?? "No vehicle"}`}
                meta={new Date(item.createdAt).toLocaleString()}
                value={`${item.fare.toFixed(2)} ETB`}
              />
            ))}
          </Section>

          <Section title="Top-Ups & Transfers">
            {passenger.topUps.slice(0, 8).map((item) => (
              <FeedRow
                key={`topup-${item.id}`}
                title={`${item.channel} • ${item.amount.toFixed(2)} ETB`}
                subtitle={item.status}
                meta={new Date(item.createdAt).toLocaleString()}
              />
            ))}
            {passenger.transfers.slice(0, 8).map((item) => (
              <FeedRow
                key={`transfer-${item.id}`}
                title={`${item.amount.toFixed(2)} ETB • ${item.status}`}
                subtitle={`${item.sender.phone} → ${item.recipient.phone}`}
                meta={new Date(item.createdAt).toLocaleString()}
              />
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
        tone === "success"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function FeedRow({
  title,
  subtitle,
  meta,
  value,
}: {
  title: string;
  subtitle: string;
  meta: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <p className="mt-1 text-xs text-slate-400">{meta}</p>
        </div>
        {value ? <p className="text-sm font-semibold text-slate-900">{value}</p> : null}
      </div>
    </div>
  );
}
