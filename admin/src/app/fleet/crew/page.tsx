import { adminApiJson, requireAdminSession } from "@/lib/admin-auth";
import { createFleetCrewAction, updateFleetCrewStatusAction } from "../actions";

type Operator = { id: string; name: string; code: string };
type FleetCrewUser = {
  id: string;
  phone: string;
  name: string | null;
  employeeId: string | null;
  status: string;
  mustChangePin: boolean;
  lastLoginAt: string | null;
  fleetOperatorId: string | null;
};

async function getData(isTapAddisAdmin: boolean, fleetOperatorId?: string) {
  const [operators, crew] = await Promise.all([
    isTapAddisAdmin
      ? adminApiJson<{ items: Operator[] }>("/fleet/operators")
      : Promise.resolve({ items: [] as Operator[] }),
    adminApiJson<{ items: FleetCrewUser[] }>(
      fleetOperatorId ? `/fleet/crew?fleetOperatorId=${encodeURIComponent(fleetOperatorId)}` : "/fleet/crew",
    ),
  ]);

  return {
    operators: operators.items,
    crew: crew.items,
  };
}

export default async function FleetCrewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = (await searchParams) ?? {};
  const fleetOperatorId = typeof params.fleetOperatorId === "string" ? params.fleetOperatorId : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const isTapAddisAdmin = session.user.role === "ADMIN";
  const { operators, crew } = await getData(isTapAddisAdmin, fleetOperatorId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">City bus staff</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Fleet crew</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Enterprise admins create city-bus driver accounts here, then assign them to buses from the assignments page.
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Create city-bus crew account</h2>
        <p className="mt-2 text-sm text-slate-500">
          New city-bus drivers get a temporary PIN here and must change it on their first sign-in.
        </p>
        <form action={createFleetCrewAction} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {isTapAddisAdmin ? (
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fleet operator</span>
              <select
                name="fleetOperatorId"
                required
                defaultValue={fleetOperatorId ?? ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">Choose operator</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field name="fullName" label="Full name" placeholder="Driver name" />
          <Field name="phone" label="Phone" placeholder="0912345678" />
          <Field name="employeeId" label="Employee ID" placeholder="ANB-DRV-010" />
          <Field name="pin" label="Temporary 4-digit PIN" placeholder="1234" type="password" maxLength={4} />
          <div className="md:col-span-2 xl:col-span-5">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Create fleet crew
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Fleet crew accounts</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {crew.map((member) => (
            <div key={member.id} className="grid grid-cols-1 gap-4 px-6 py-5 xl:grid-cols-[1.2fr_0.9fr_0.8fr]">
              <div>
                <p className="font-semibold text-slate-950">{member.name || member.phone}</p>
                <p className="mt-1 text-sm text-slate-500">{member.phone}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {member.employeeId || "No employee ID"} {member.mustChangePin ? "- PIN change required" : ""}
                </p>
              </div>
              <div className="text-sm text-slate-500">
                <p>Status: {member.status}</p>
                <p>Last login: {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : "Never"}</p>
              </div>
              <div>
                <form action={updateFleetCrewStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="fleetOperatorId" value={member.fleetOperatorId ?? fleetOperatorId ?? ""} />
                  <select
                    name="status"
                    defaultValue={member.status}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="FROZEN">Frozen</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    Save
                  </button>
                </form>
              </div>
            </div>
          ))}
          {crew.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No fleet crew accounts found yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  maxLength,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        inputMode={type === "password" ? "numeric" : undefined}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      />
    </label>
  );
}
