import { Building2, BusFront, QrCode, Users } from "lucide-react";
import { adminApiJson, requireAdminSession } from "@/lib/admin-auth";
import { createFleetOperatorAction } from "./actions";

type FleetOperator = {
  id: string;
  name: string;
  code: string;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  _count?: {
    vehicles: number;
    validators: number;
    assignments: number;
  };
};

async function getOperators() {
  return adminApiJson<{ items: FleetOperator[] }>("/fleet/operators");
}

export default async function FleetOperatorsPage() {
  const session = await requireAdminSession();
  const data = await getOperators();
  const isTapAddisAdmin = session.user.role === "ADMIN";
  const totals = data.items.reduce(
    (acc, operator) => ({
      vehicles: acc.vehicles + (operator._count?.vehicles ?? 0),
      validators: acc.validators + (operator._count?.validators ?? 0),
      assignments: acc.assignments + (operator._count?.assignments ?? 0),
    }),
    { vehicles: 0, validators: 0, assignments: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Enterprise fleet</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {isTapAddisAdmin ? "Fleet operators" : data.items[0]?.name || "Your fleet"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Corporate city-bus operators register buses here. Minibus and mid-bus taxis still use the crew-led saved taxi flow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard icon={<Building2 size={18} />} label="Operators" value={data.items.length} />
        <MetricCard icon={<BusFront size={18} />} label="City buses" value={totals.vehicles} />
        <MetricCard icon={<QrCode size={18} />} label="Validators" value={totals.validators} />
        <MetricCard icon={<Users size={18} />} label="Assignments" value={totals.assignments} />
      </div>

      {isTapAddisAdmin ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Create fleet operator</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add corporate city-bus companies such as Anbessa or Alliance, then create an enterprise admin scoped to the company.
          </p>
          <form action={createFleetOperatorAction} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="name" label="Company name" placeholder="Anbessa City Bus" required />
            <Input name="code" label="Operator code" placeholder="ANBESSA" required />
            <Input name="contactName" label="Contact name" placeholder="Fleet operations lead" />
            <Input name="contactPhone" label="Contact phone" placeholder="09..." />
            <label className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
              <textarea
                name="notes"
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Contract notes, depot coverage, rollout phase..."
              />
            </label>
            <div className="md:col-span-2">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create operator
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Operator directory</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.items.map((operator) => (
            <div key={operator.id} className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div>
                <p className="font-semibold text-slate-950">{operator.name}</p>
                <p className="mt-1 text-sm text-slate-500">{operator.code}</p>
                {operator.notes ? <p className="mt-2 text-sm text-slate-500">{operator.notes}</p> : null}
              </div>
              <div className="text-sm text-slate-500">
                <p>{operator.contactName || "No contact name"}</p>
                <p>{operator.contactPhone || "No contact phone"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">{operator._count?.vehicles ?? 0} buses</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{operator._count?.validators ?? 0} validators</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{operator.status}</span>
              </div>
            </div>
          ))}
          {data.items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No fleet operators yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="rounded-2xl bg-slate-100 p-2 text-slate-950">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Input({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
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
