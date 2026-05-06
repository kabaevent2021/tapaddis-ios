import { adminApiJson, requireAdminSession } from "@/lib/admin-auth";
import {
  createFleetVehicleAction,
  importFleetVehiclesAction,
  updateFleetVehicleStatusAction,
} from "../actions";

type Operator = { id: string; name: string; code: string };
type FleetVehicle = {
  id: string;
  vehicleId: string;
  licensePlate: string;
  displayName: string | null;
  depot: string | null;
  status: string;
  vehicleClassLabel: string;
  fleetOperator: Operator;
  validators: Array<{ id: string; deviceId: string; label: string | null; status: string }>;
  assignments: Array<{ crew: { id: string; phone: string; name: string | null; employeeId: string | null } }>;
  qr: { active: boolean; token: string; label: string | null } | null;
};

async function getData() {
  const [operators, vehicles] = await Promise.all([
    adminApiJson<{ items: Operator[] }>("/fleet/operators"),
    adminApiJson<{ items: FleetVehicle[] }>("/fleet/vehicles"),
  ]);
  return { operators: operators.items, vehicles: vehicles.items };
}

export default async function FleetVehiclesPage() {
  const session = await requireAdminSession();
  const { operators, vehicles } = await getData();
  const isTapAddisAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">City bus inventory</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Fleet vehicles</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Register corporate city buses here. Each bus is pre-owned by the fleet operator and always uses the City Bus tariff.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Add city bus</h2>
          <form action={createFleetVehicleAction} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {isTapAddisAdmin ? <OperatorSelect operators={operators} /> : null}
            <Input name="vehicleId" label="Vehicle ID" placeholder="ANB-001" required />
            <Input name="licensePlate" label="License plate" placeholder="AA-3-12345" required />
            <Input name="displayName" label="Display name" placeholder="Anbessa Bus 001" />
            <Input name="depot" label="Depot" placeholder="Kality depot" />
            <label className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
              <textarea
                name="notes"
                className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
            <div className="md:col-span-2">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Save city bus
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Bulk import CSV</h2>
          <p className="mt-1 text-sm text-slate-500">
            Required columns: vehicleId, licensePlate, displayName. Optional columns: depot, notes.
          </p>
          <form action={importFleetVehiclesAction} className="mt-5 space-y-4">
            {isTapAddisAdmin ? <OperatorSelect operators={operators} /> : null}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">CSV file</span>
              <input
                name="csvFile"
                type="file"
                accept=".csv,text/csv"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Or paste CSV</span>
              <textarea
                name="csv"
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none transition focus:border-slate-400"
                placeholder={"vehicleId,licensePlate,displayName,depot,notes\nANB-001,AA-3-12345,Anbessa 001,Kality,Phase 1"}
              />
            </label>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Import vehicles
            </button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Registered city buses</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="grid grid-cols-1 gap-4 px-6 py-5 xl:grid-cols-[1.3fr_1fr_0.8fr_0.8fr]">
              <div>
                <p className="font-semibold text-slate-950">{vehicle.displayName || vehicle.vehicleId}</p>
                <p className="mt-1 text-sm text-slate-500">{vehicle.vehicleId} · {vehicle.licensePlate}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{vehicle.vehicleClassLabel}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{vehicle.fleetOperator.name}</p>
                <p>{vehicle.depot || "No depot set"}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{vehicle.validators.length} validator(s)</p>
                <p>{vehicle.qr?.active ? "QR active" : "QR not active"}</p>
                <p>{vehicle.assignments[0]?.crew ? `Assigned: ${vehicle.assignments[0].crew.employeeId || vehicle.assignments[0].crew.phone}` : "No active assignment"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={vehicle.status} />
                <form action={updateFleetVehicleStatusAction}>
                  <input type="hidden" name="id" value={vehicle.id} />
                  <input type="hidden" name="status" value={vehicle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} />
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    {vehicle.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
          {vehicles.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No city buses registered yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function OperatorSelect({ operators }: { operators: Operator[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fleet operator</span>
      <select
        name="fleetOperatorId"
        required
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
  );
}

function Input({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {status}
    </span>
  );
}
