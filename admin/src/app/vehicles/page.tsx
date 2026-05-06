export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiFetch, adminApiJson, readBackendErrorMessage } from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";
import { PayCodeCopyButton } from "./PayCodeCopyButton";

type VehicleRecord = {
  vehicleId: string;
  label: string;
  registeredTaxi: {
    id: string;
    licensePlate: string;
    displayName: string | null;
    status: string;
    vehicleClass: string;
    vehicleClassLabel: string;
    approvedAt: string | null;
    linkedCrewCount: number;
    registeredByCrew: { id: string; name: string | null; phone: string } | null;
  } | null;
  qr: {
    id: string;
    token: string;
    payCode: string | null;
    qrPayload: string;
    label: string | null;
    active: boolean;
    createdAt: string;
    rotatedAt: string | null;
  } | null;
  activeShift: {
    id: string;
    startedAt: string;
    vehicleClass: string;
    vehicleClassLabel: string;
    route: { id: string; name: string; code: string } | null;
    crew: { id: string; name: string | null; phone: string };
  } | null;
  savedVehicleSummary: {
    totalSavedProfiles: number;
    lastUsed: {
      id: string;
      displayName: string | null;
      vehicleClass: string;
      vehicleClassLabel: string;
      updatedAt: string;
      crew: { id: string; name: string | null; phone: string };
      route: { id: string; name: string; code: string } | null;
    } | null;
  };
};

type RegisteredTaxiRecord = {
  id: string;
  vehicleId: string;
  licensePlate: string;
  displayName: string | null;
  vehicleClass: string;
  vehicleClassLabel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  registeredByCrew: { id: string; name: string | null; phone: string } | null;
  approvedByAdmin: { id: string; name: string | null; phone: string } | null;
  linkedCrew: Array<{
    id: string;
    name: string | null;
    phone: string;
    savedVehicleId: string;
    isLastUsed: boolean;
    updatedAt: string;
  }>;
};

function normalize(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatVehiclePayCode(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "Unavailable";
  return digits.length <= 3 ? digits : `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

async function getVehicles(query?: string) {
  try {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    return await adminApiJson<VehicleRecord[]>(`/admin/vehicles${suffix}`);
  } catch {
    return [] as VehicleRecord[];
  }
}

async function getRegisteredTaxis(query?: string, status?: string) {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return await adminApiJson<RegisteredTaxiRecord[]>(`/admin/registered-taxis${suffix}`);
  } catch {
    return [] as RegisteredTaxiRecord[];
  }
}

async function createVehicleQr(formData: FormData) {
  "use server";
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  try {
    const response = await adminApiFetch("/qr/admin/vehicle", {
      method: "POST",
      body: JSON.stringify({ vehicleId, label: label || undefined }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath("/vehicles");
    redirect("/vehicles?notice=Vehicle%20QR%20ready");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to save vehicle QR");
    redirect(`/vehicles?error=${encodeURIComponent(message)}`);
  }
}

async function rotateVehicleQr(formData: FormData) {
  "use server";
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();

  try {
    const response = await adminApiFetch(`/qr/admin/vehicle/${encodeURIComponent(vehicleId)}/rotate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath("/vehicles");
    redirect("/vehicles?notice=Vehicle%20QR%20rotated");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to rotate vehicle QR");
    redirect(`/vehicles?error=${encodeURIComponent(message)}`);
  }
}

async function deactivateVehicleQr(formData: FormData) {
  "use server";
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();

  try {
    const response = await adminApiFetch(`/qr/admin/vehicle/${encodeURIComponent(vehicleId)}/deactivate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath("/vehicles");
    redirect("/vehicles?notice=Vehicle%20QR%20deactivated");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to deactivate vehicle QR");
    redirect(`/vehicles?error=${encodeURIComponent(message)}`);
  }
}

async function updateRegisteredTaxiStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  try {
    const response = await adminApiFetch(`/admin/registered-taxis/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath("/vehicles");
    redirect("/vehicles?notice=Registered%20taxi%20updated");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to update registered taxi");
    redirect(`/vehicles?error=${encodeURIComponent(message)}`);
  }
}

async function resetRegisteredTaxiCode(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const accessCode = String(formData.get("accessCode") ?? "").trim();

  try {
    const response = await adminApiFetch(`/admin/registered-taxis/${encodeURIComponent(id)}/reset-code`, {
      method: "POST",
      body: JSON.stringify({ accessCode }),
    });
    if (!response.ok) {
      throw new Error(await readBackendErrorMessage(response));
    }
    revalidatePath("/vehicles");
    redirect("/vehicles?notice=Vehicle%20access%20code%20reset");
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to reset vehicle access code");
    redirect(`/vehicles?error=${encodeURIComponent(message)}`);
  }
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = normalize(params.q) ?? "";
  const status = normalize(params.status) ?? "";
  const notice = normalize(params.notice);
  const error = normalize(params.error);
  const [vehicles, registeredTaxis] = await Promise.all([
    getVehicles(query),
    getRegisteredTaxis(query, status),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vehicles & QR</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor registered taxis, active shift binding, approvals, and the QR lifecycle for every known vehicle.
        </p>
      </div>

      {notice ? <Banner tone="success" message={notice} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
        <form action={createVehicleQr} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Create or reuse vehicle QR</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="vehicleId" placeholder="Vehicle ID" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="label" placeholder="Label (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-xl bg-[#0B0B0D] px-4 py-2 text-sm font-semibold text-white">
            Save vehicle QR
          </button>
        </form>

        <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Search vehicles</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Vehicle ID, plate, label, crew phone"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All taxi statuses</option>
              <option value="PENDING_VERIFICATION">Pending verification</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <button type="submit" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Filter
          </button>
        </form>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registered taxi queue</h2>
            <p className="mt-1 text-sm text-slate-500">
              Approve, reject, suspend, and reset access codes for minibus and mid-bus registrations.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {registeredTaxis.length} taxi record(s)
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {registeredTaxis.map((taxi) => (
            <div key={taxi.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{taxi.displayName || taxi.vehicleId}</h3>
                  <p className="mt-1 text-sm text-slate-500">{taxi.vehicleId} • {taxi.licensePlate}</p>
                </div>
                <StatusBadge status={taxi.status} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBlock
                  title="Registration"
                  lines={[
                    taxi.vehicleClassLabel,
                    taxi.registeredByCrew ? `${taxi.registeredByCrew.name ?? "Crew"} • ${taxi.registeredByCrew.phone}` : "No crew linked",
                    taxi.approvedAt ? `Approved ${new Date(taxi.approvedAt).toLocaleString()}` : "Awaiting approval",
                  ]}
                />
                <InfoBlock
                  title="Usage"
                  lines={
                    taxi.linkedCrew.length > 0
                      ? [
                          `${taxi.linkedCrew.length} linked crew account(s)`,
                          taxi.linkedCrew[0].name ?? taxi.linkedCrew[0].phone,
                          taxi.linkedCrew[0].isLastUsed ? "Last used on this crew" : "Saved on crew account",
                        ]
                      : ["No crew has used this taxi yet", "It will appear here after claim"]
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {taxi.status !== "ACTIVE" ? (
                  <form action={updateRegisteredTaxiStatus}>
                    <input type="hidden" name="id" value={taxi.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <button type="submit" className="rounded-xl bg-[#0B0B0D] px-3 py-2 text-xs font-semibold text-white">
                      Approve taxi
                    </button>
                  </form>
                ) : null}
                {taxi.status !== "REJECTED" ? (
                  <form action={updateRegisteredTaxiStatus}>
                    <input type="hidden" name="id" value={taxi.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Reject
                    </button>
                  </form>
                ) : null}
                {taxi.status !== "SUSPENDED" ? (
                  <form action={updateRegisteredTaxiStatus}>
                    <input type="hidden" name="id" value={taxi.id} />
                    <input type="hidden" name="status" value="SUSPENDED" />
                    <button type="submit" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Suspend
                    </button>
                  </form>
                ) : (
                  <form action={updateRegisteredTaxiStatus}>
                    <input type="hidden" name="id" value={taxi.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Reactivate
                    </button>
                  </form>
                )}
              </div>

              <form action={resetRegisteredTaxiCode} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={taxi.id} />
                <input
                  name="accessCode"
                  placeholder="New access code"
                  minLength={6}
                  className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  Reset access code
                </button>
              </form>
            </div>
          ))}
          {registeredTaxis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 xl:col-span-2">
              No registered taxis matched this filter.
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {vehicles.map((vehicle) => (
          <div key={vehicle.vehicleId} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{vehicle.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{vehicle.vehicleId}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicle.qr?.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {vehicle.qr?.active ? "QR active" : "QR inactive"}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoBlock
                title="Current shift"
                lines={
                  vehicle.activeShift
                    ? [
                        `${vehicle.activeShift.vehicleClassLabel}`,
                        vehicle.activeShift.route?.name ?? "No route",
                        `${vehicle.activeShift.crew.name ?? "Unknown crew"} • ${vehicle.activeShift.crew.phone}`,
                      ]
                    : ["No active shift bound", "Vehicle not currently collecting"]
                }
              />
              <InfoBlock
                title="Saved vehicle usage"
                lines={
                  vehicle.savedVehicleSummary.lastUsed
                    ? [
                        vehicle.savedVehicleSummary.lastUsed.displayName ?? "No display name",
                        vehicle.savedVehicleSummary.lastUsed.vehicleClassLabel,
                        `${vehicle.savedVehicleSummary.totalSavedProfiles} saved profile(s)`,
                      ]
                    : ["No saved profile yet", "QR can still be created manually"]
                }
              />
            </div>

            {vehicle.qr ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vehicle pay code</p>
                    <p className="mt-2 font-mono text-2xl font-bold tracking-[0.28em] text-slate-900">{formatVehiclePayCode(vehicle.qr.payCode)}</p>
                    <p className="mt-1 text-xs text-slate-500">Can&apos;t scan? Enter vehicle code.</p>
                  </div>
                  <PayCodeCopyButton payCode={vehicle.qr.payCode} />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR payload</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">{vehicle.qr.qrPayload}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Token ends with {vehicle.qr.token.slice(-8)} • Created {new Date(vehicle.qr.createdAt).toLocaleString()}
                  {vehicle.qr.rotatedAt ? ` • Rotated ${new Date(vehicle.qr.rotatedAt).toLocaleString()}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={rotateVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.vehicleId} />
                    <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Rotate QR
                    </button>
                  </form>
                  <form action={deactivateVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.vehicleId} />
                    <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Deactivate QR
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                This vehicle does not have a QR token yet.
              </div>
            )}
          </div>
        ))}

        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">
            No vehicles matched this filter.
          </div>
        ) : null}
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

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "ACTIVE"
      ? "bg-green-50 text-green-700"
      : status === "PENDING_VERIFICATION"
        ? "bg-blue-50 text-blue-700"
        : status === "SUSPENDED"
          ? "bg-amber-50 text-amber-700"
          : "bg-red-50 text-red-700";

  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status.replaceAll("_", " ")}
    </div>
  );
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        {lines.map((line) => (
          <p key={`${title}-${line}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}
