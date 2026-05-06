export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiFetch, adminApiJson, readBackendErrorMessage } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";

type ManagedUser = {
  id: string;
  phone: string;
  name: string | null;
  role: "CREW" | "AGENT" | "ADMIN" | "ENTERPRISE_ADMIN";
  status: "ACTIVE" | "FROZEN" | "SUSPENDED";
  authVersion: number;
  failedLoginAttempts: number;
  loginLockedUntil: string | null;
  lastLoginAt: string | null;
  mustChangePin: boolean;
  employeeId: string | null;
  fleetOperatorId: string | null;
  fleetOperator: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
};

type FleetOperator = {
  id: string;
  name: string;
  code: string;
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getUsers() {
  try {
    return await adminApiJson<{ items: ManagedUser[] }>("/auth/admin/users");
  } catch {
    return { items: [] as ManagedUser[] };
  }
}

async function getFleetOperators() {
  try {
    return await adminApiJson<{ items: FleetOperator[] }>("/fleet/operators");
  } catch {
    return { items: [] as FleetOperator[] };
  }
}

async function createUser(formData: FormData) {
  "use server";
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "CREW").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const fleetOperatorId = String(formData.get("fleetOperatorId") ?? "").trim();

  try {
    const response = await adminApiFetch("/auth/admin/users", {
      method: "POST",
      body: JSON.stringify({
        phone,
        pin,
        name: name || undefined,
        role,
        employeeId: employeeId || undefined,
        fleetOperatorId: fleetOperatorId || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }

    revalidatePath("/users");
    redirect("/users?notice=Staff%20account%20created");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to create account");
    redirect(`/users?error=${encodeURIComponent(message)}`);
  }
}

async function resetPin(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "").trim();
  const newPin = String(formData.get("newPin") ?? "").trim();

  try {
    const response = await adminApiFetch("/auth/admin/reset-pin", {
      method: "POST",
      body: JSON.stringify({ userId, newPin }),
    });

    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }

    revalidatePath("/users");
    redirect("/users?notice=PIN%20reset%20saved");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to reset PIN");
    redirect(`/users?error=${encodeURIComponent(message)}`);
  }
}

async function updateStatus(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE").trim();

  try {
    const response = await adminApiFetch(`/auth/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }

    revalidatePath("/users");
    redirect("/users?notice=Account%20status%20updated");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to update status");
    redirect(`/users?error=${encodeURIComponent(message)}`);
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const notice = normalize(params.notice);
  const error = normalize(params.error);
  const [{ items }, { items: fleetOperators }] = await Promise.all([getUsers(), getFleetOperators()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create crew, kiosk, and admin accounts, then control account status, lockouts, and PIN resets from one place.
        </p>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form action={createUser} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input name="name" placeholder="Crew or operator name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <input name="phone" placeholder="0912345678" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">4-digit PIN</label>
          <input name="pin" type="password" inputMode="numeric" maxLength={4} placeholder="1234" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Role</label>
          <select name="role" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="CREW">Crew</option>
            <option value="AGENT">Agent</option>
            <option value="ADMIN">Admin</option>
            <option value="ENTERPRISE_ADMIN">Enterprise Admin</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Employee ID</label>
          <input name="employeeId" placeholder="For city-bus crew" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Fleet operator</label>
          <select name="fleetOperatorId" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">None</option>
            {fleetOperators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-xl bg-[#0B0B0D] px-4 py-2.5 text-sm font-semibold text-white">
            Create user
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Account</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Last Login</th>
              <th className="px-5 py-4 font-medium">PIN Reset</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((user) => (
              <tr key={user.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{user.name ?? "Unnamed staff member"}</div>
                  <div className="text-xs text-slate-500">{user.phone}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Created {new Date(user.createdAt).toLocaleDateString()} • Auth v{user.authVersion}
                    {user.mustChangePin ? " • PIN change required" : ""}
                    {user.loginLockedUntil ? ` • Locked until ${new Date(user.loginLockedUntil).toLocaleString()}` : ""}
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">
                  {user.role}
                  {user.fleetOperator ? (
                    <p className="mt-1 text-xs font-normal text-slate-400">{user.fleetOperator.name}</p>
                  ) : null}
                  {user.employeeId ? (
                    <p className="mt-1 text-xs font-normal text-slate-400">Employee {user.employeeId}</p>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <form action={updateStatus} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="status"
                      defaultValue={user.status}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="FROZEN">Frozen</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <button type="submit" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                  <p className="mt-1 text-xs text-slate-400">Failed attempts: {user.failedLoginAttempts}</p>
                </td>
                <td className="px-5 py-4">
                  <form action={resetPin} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      name="newPin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                      Reset
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                  No staff accounts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
