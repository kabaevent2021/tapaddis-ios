import { adminApiJson, requireAdminSession } from "@/lib/admin-auth";
import { createFleetAssignmentAction, updateFleetAssignmentStatusAction } from "../actions";

type Operator = { id: string; name: string; code: string };
type CrewUser = {
  id: string;
  phone: string;
  name: string | null;
  employeeId: string | null;
  role?: string;
  fleetOperatorId?: string | null;
};
type FleetVehicle = { id: string; vehicleId: string; licensePlate: string; displayName: string | null; fleetOperator: Operator };
type Validator = { id: string; deviceId: string; label: string | null; fleetOperator: Operator };
type Assignment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  fleetOperator: Operator;
  crew: CrewUser;
  fleetVehicle: { id: string; vehicleId: string; licensePlate: string; displayName: string | null };
  validator: { id: string; deviceId: string; label: string | null; status: string } | null;
};

async function getData(isTapAddisAdmin: boolean) {
  const [operators, vehicles, validators, assignments] = await Promise.all([
    adminApiJson<{ items: Operator[] }>("/fleet/operators"),
    adminApiJson<{ items: FleetVehicle[] }>("/fleet/vehicles"),
    adminApiJson<{ items: Validator[] }>("/fleet/validators"),
    adminApiJson<{ items: Assignment[] }>("/fleet/assignments"),
  ]);
  const crew = isTapAddisAdmin
    ? (await adminApiJson<{ items: CrewUser[] }>("/auth/admin/users")).items.filter(
        (user) => user.role === "CREW" && user.fleetOperatorId,
      )
    : (await adminApiJson<{ items: CrewUser[] }>("/fleet/crew")).items;

  return {
    operators: operators.items,
    vehicles: vehicles.items,
    validators: validators.items,
    assignments: assignments.items,
    crew,
  };
}

export default async function FleetAssignmentsPage() {
  const session = await requireAdminSession();
  const isTapAddisAdmin = session.user.role === "ADMIN";
  const { operators, vehicles, validators, assignments, crew } = await getData(isTapAddisAdmin);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Driver scheduling</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Driver assignments</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          City-bus drivers do not register buses. The fleet office assigns them to a pre-registered bus and optional validator.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Create assignment</h2>
        <form action={createFleetAssignmentAction} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {isTapAddisAdmin ? <OperatorSelect operators={operators} /> : null}
          <CrewSelect crew={crew} />
          <VehicleSelect vehicles={vehicles} />
          <ValidatorSelect validators={validators} />
          <Input name="startsAt" label="Starts at" type="datetime-local" />
          <Input name="endsAt" label="Ends at" type="datetime-local" />
          <label className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
            <textarea
              name="notes"
              className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Assign driver
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Assignments</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="grid grid-cols-1 gap-4 px-6 py-5 xl:grid-cols-[1.1fr_1fr_1fr_0.8fr]">
              <div>
                <p className="font-semibold text-slate-950">
                  {assignment.crew.name || assignment.crew.employeeId || assignment.crew.phone}
                </p>
                <p className="mt-1 text-sm text-slate-500">{assignment.crew.employeeId || assignment.crew.phone}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{assignment.fleetVehicle.displayName || assignment.fleetVehicle.vehicleId}</p>
                <p>{assignment.fleetVehicle.licensePlate}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>{assignment.fleetOperator.name}</p>
                <p>{assignment.validator ? assignment.validator.label || assignment.validator.deviceId : "No validator"}</p>
                <p>{new Date(assignment.startsAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {assignment.status}
                </span>
                {assignment.status === "ACTIVE" ? (
                  <form action={updateFleetAssignmentStatusAction}>
                    <input type="hidden" name="id" value={assignment.id} />
                    <input type="hidden" name="status" value="COMPLETED" />
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      Complete
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
          {assignments.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No city-bus assignments yet.</div>
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

function CrewSelect({ crew }: { crew: CrewUser[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver / crew</span>
      <select
        name="crewId"
        required
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      >
        <option value="">Choose driver</option>
        {crew.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.employeeId || user.phone} · {user.phone}
          </option>
        ))}
      </select>
    </label>
  );
}

function VehicleSelect({ vehicles }: { vehicles: FleetVehicle[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">City bus</span>
      <select
        name="fleetVehicleId"
        required
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      >
        <option value="">Choose bus</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.displayName || vehicle.vehicleId} · {vehicle.licensePlate}
          </option>
        ))}
      </select>
    </label>
  );
}

function ValidatorSelect({ validators }: { validators: Validator[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validator</span>
      <select
        name="validatorId"
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      >
        <option value="">Optional validator</option>
        {validators.map((validator) => (
          <option key={validator.id} value={validator.id}>
            {validator.label || validator.deviceId}
          </option>
        ))}
      </select>
    </label>
  );
}

function Input({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      />
    </label>
  );
}
