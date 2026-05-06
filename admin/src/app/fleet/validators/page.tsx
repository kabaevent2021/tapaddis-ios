import { adminApiJson, requireAdminSession } from "@/lib/admin-auth";
import { createFleetValidatorAction, updateFleetValidatorStatusAction } from "../actions";

type Operator = { id: string; name: string; code: string };
type FleetVehicle = { id: string; vehicleId: string; licensePlate: string; displayName: string | null; fleetOperator: Operator };
type Validator = {
  id: string;
  deviceId: string;
  label: string | null;
  status: string;
  fleetOperator: Operator;
  fleetVehicle: { id: string; vehicleId: string; licensePlate: string; displayName: string | null } | null;
};

async function getData() {
  const [operators, vehicles, validators] = await Promise.all([
    adminApiJson<{ items: Operator[] }>("/fleet/operators"),
    adminApiJson<{ items: FleetVehicle[] }>("/fleet/vehicles"),
    adminApiJson<{ items: Validator[] }>("/fleet/validators"),
  ]);
  return { operators: operators.items, vehicles: vehicles.items, validators: validators.items };
}

export default async function FleetValidatorsPage() {
  const session = await requireAdminSession();
  const { operators, vehicles, validators } = await getData();
  const isTapAddisAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Fleet hardware</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Validators</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Assign TapAddis validators/NFC machines to pre-registered city buses.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Add validator</h2>
        <form action={createFleetValidatorAction} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {isTapAddisAdmin ? <OperatorSelect operators={operators} /> : null}
          <Input name="deviceId" label="Device ID" placeholder="VAL-0001" required />
          <Input name="label" label="Label" placeholder="Front-door validator" />
          <VehicleSelect vehicles={vehicles} />
          <label className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
            <textarea
              name="notes"
              className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Save validator
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Validator inventory</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {validators.map((validator) => (
            <div key={validator.id} className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_0.8fr]">
              <div>
                <p className="font-semibold text-slate-950">{validator.label || validator.deviceId}</p>
                <p className="mt-1 text-sm text-slate-500">{validator.deviceId}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{validator.fleetOperator.name}</p>
                <p>
                  {validator.fleetVehicle
                    ? `${validator.fleetVehicle.displayName || validator.fleetVehicle.vehicleId} · ${validator.fleetVehicle.licensePlate}`
                    : "Not assigned to a bus"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {validator.status}
                </span>
                <form action={updateFleetValidatorStatusAction}>
                  <input type="hidden" name="id" value={validator.id} />
                  <input type="hidden" name="status" value={validator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} />
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    {validator.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
          {validators.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No validators registered yet.</div>
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

function VehicleSelect({ vehicles }: { vehicles: FleetVehicle[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign to bus</span>
      <select
        name="fleetVehicleId"
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      >
        <option value="">Leave unassigned</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.displayName || vehicle.vehicleId} · {vehicle.licensePlate}
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
