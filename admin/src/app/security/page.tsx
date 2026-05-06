export const dynamic = "force-dynamic";

import { adminApiJson } from "@/lib/admin-auth";

type AuthEventItem = {
  id: string;
  eventType: string;
  status: string;
  code: string | null;
  message: string | null;
  phone: string | null;
  role: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    phone: string;
    role: string;
    status: string;
    mustChangePin: boolean;
    failedLoginAttempts: number;
    loginLockedUntil: string | null;
  } | null;
};

type AuthEventFeed = {
  summary: {
    total: number;
    failures: number;
    locked: number;
    pinResets: number;
    statusChanges: number;
  };
  items: AuthEventItem[];
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getAuthEvents(params: URLSearchParams) {
  try {
    const query = params.toString();
    return await adminApiJson<AuthEventFeed>(`/admin/security/auth-events${query ? `?${query}` : ""}`);
  } catch {
    return {
      summary: { total: 0, failures: 0, locked: 0, pinResets: 0, statusChanges: 0 },
      items: [] as AuthEventItem[],
    };
  }
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const params = new URLSearchParams();
  const q = normalize(resolved.q);
  const eventType = normalize(resolved.eventType);
  const status = normalize(resolved.status);
  const role = normalize(resolved.role);
  const dateFrom = normalize(resolved.dateFrom);
  const dateTo = normalize(resolved.dateTo);
  if (q) params.set("q", q);
  if (eventType) params.set("eventType", eventType);
  if (status) params.set("status", status);
  if (role) params.set("role", role);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const feed = await getAuthEvents(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review auth events, account lockouts, recent PIN resets, and admin-driven status changes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard label="Events" value={feed.summary.total} />
        <SummaryCard label="Failures" value={feed.summary.failures} />
        <SummaryCard label="Locked" value={feed.summary.locked} />
        <SummaryCard label="PIN Resets" value={feed.summary.pinResets} />
        <SummaryCard label="Status Changes" value={feed.summary.statusChanges} />
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.2fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr,auto]">
        <input name="q" defaultValue={q ?? ""} placeholder="Phone, name, message" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="eventType" defaultValue={eventType ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All event types</option>
          <option value="LOGIN">LOGIN</option>
          <option value="REGISTER_CUSTOMER">REGISTER_CUSTOMER</option>
          <option value="PIN_CHANGE">PIN_CHANGE</option>
          <option value="PIN_RESET">PIN_RESET</option>
          <option value="ACCOUNT_STATUS_CHANGED">ACCOUNT_STATUS_CHANGED</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="STAFF_ACCOUNT_CREATED">STAFF_ACCOUNT_CREATED</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
          <option value="LOCKED">LOCKED</option>
        </select>
        <select name="role" defaultValue={role ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="CREW">CREW</option>
          <option value="AGENT">AGENT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input name="dateFrom" type="date" defaultValue={dateFrom ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="dateTo" type="date" defaultValue={dateTo ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Time</th>
              <th className="px-5 py-4 font-medium">Event</th>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">State</th>
              <th className="px-5 py-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {feed.items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4 text-slate-600">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{item.eventType}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.code ?? "No code"}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{item.user?.name ?? "Unknown user"}</div>
                  <div className="text-xs text-slate-500">{item.user?.phone ?? item.phone ?? "No phone"}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {(item.user?.role ?? item.role ?? "UNKNOWN")} • {item.user?.status ?? "N/A"}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "SUCCESS"
                        ? "bg-green-50 text-green-700"
                        : item.status === "LOCKED"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.user?.loginLockedUntil ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Locked until {new Date(item.user.loginLockedUntil).toLocaleString()}
                    </p>
                  ) : null}
                  {item.user?.mustChangePin ? (
                    <p className="mt-1 text-xs text-slate-500">PIN reset required</p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <p>{item.message ?? "No message"}</p>
                  {Object.keys(item.metadata).length > 0 ? (
                    <div className="mt-2 text-xs text-slate-400">
                      {Object.entries(item.metadata).map(([key, value]) => (
                        <div key={`${item.id}-${key}`}>{key}: {value}</div>
                      ))}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {feed.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                  No auth events matched this filter.
                </td>
              </tr>
            ) : null}
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
