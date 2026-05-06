import { adminApiJson } from "@/lib/admin-auth";

type FleetTransaction = {
  id: string;
  createdAt: string;
  fare: number;
  type: string;
  status: string;
  customer: { id: string; phone: string; name: string | null } | null;
  fareBand: { label: string; distanceLabel: string; vehicleClassLabel: string } | null;
  shift: {
    vehicleId: string | null;
    crew: { id: string; phone: string; name: string | null; employeeId: string | null } | null;
    fleetOperator: { id: string; name: string; code: string } | null;
    fleetVehicle: { id: string; vehicleId: string; licensePlate: string; displayName: string | null } | null;
  } | null;
};

async function getTransactions() {
  return adminApiJson<{ items: FleetTransaction[] }>("/fleet/transactions");
}

export default async function FleetTransactionsPage() {
  const data = await getTransactions();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">City-bus audit</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Fleet transactions</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Scoped city-bus payments for enterprise operators. TapAddis admins can see all city-bus fleet transactions.
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Recent city-bus payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Time</th>
                <th className="px-5 py-4 font-medium">Bus</th>
                <th className="px-5 py-4 font-medium">Driver</th>
                <th className="px-5 py-4 font-medium">Passenger</th>
                <th className="px-5 py-4 font-medium">Fare</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.items.map((transaction) => (
                <tr key={transaction.id} className="align-top hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-600">{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {transaction.shift?.fleetVehicle?.displayName || transaction.shift?.vehicleId || "City bus"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {transaction.shift?.fleetVehicle?.licensePlate || transaction.shift?.fleetOperator?.name || "Fleet"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {transaction.shift?.crew?.name || transaction.shift?.crew?.employeeId || transaction.shift?.crew?.phone || "Unknown"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {transaction.customer?.name || transaction.customer?.phone || "Cash / unknown"}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{transaction.fare.toFixed(2)} ETB</p>
                    <p className="text-xs text-slate-500">{transaction.fareBand?.distanceLabel || "Legacy fare"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{transaction.type}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No city-bus transactions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
