export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  crewOnboardingTypeLabel,
  getCrewOnboardingQueue,
  normalizeQueryParam,
} from "./data";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default async function CrewOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  if (session.user.role !== "ADMIN") {
    redirect("/fleet");
  }

  const params = (await searchParams) ?? {};
  const query = normalizeQueryParam(params.q);
  const status = normalizeQueryParam(params.status);
  const notice = normalizeQueryParam(params.notice);
  const error = normalizeQueryParam(params.error);
  const { items } = await getCrewOnboardingQueue(query, status);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Taxi onboarding
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Crew onboarding queue</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Browse taxi crew applications, filter the queue quickly, and open a full detail page
          when you are ready to approve or reject one record.
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

      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_220px_auto]">
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Phone, applicant, plate, or vehicle ID"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="">All statuses</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="ACTIVE">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Filter queue
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {items.map((item) => (
          <section key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-950">{item.fullName || item.phone}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.status}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {crewOnboardingTypeLabel(item.onboardingType)}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {item.phone} - ID {item.governmentIdNumber}
                </p>
                <p className="text-sm text-slate-500">
                  Submitted {new Date(item.createdAt).toLocaleString()} - Updated{" "}
                  {new Date(item.updatedAt).toLocaleString()}
                </p>
                {item.reviewedByUser ? (
                  <p className="text-sm text-slate-500">
                    Reviewed by {item.reviewedByUser.name || item.reviewedByUser.phone}
                    {item.reviewedAt ? ` - ${new Date(item.reviewedAt).toLocaleString()}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2 xl:min-w-[420px]">
                <Info
                  label="Taxi"
                  value={item.requestedDisplayName || item.requestedVehicleId || "Not provided"}
                />
                <Info label="Plate" value={item.requestedLicensePlate || "Not provided"} />
                <Info label="Vehicle type" value={item.requestedVehicleClassLabel || "Not provided"} />
                <Info label="User status" value={item.user.status} />
                <Info label="Linked taxi" value={item.linkedRegisteredTaxi?.vehicleId || "None"} />
                <Info label="Taxi status" value={item.linkedRegisteredTaxi?.status || "None"} />
              </div>
            </div>

            {item.reviewNote ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Latest review note:</span> {item.reviewNote}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Open the detail page to review applicant identity, taxi context, and final decision.
              </p>
              <Link
                href={`/crew-onboarding/${item.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open details
              </Link>
            </div>
          </section>
        ))}

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No taxi crew applications match this queue right now.
          </div>
        ) : null}
      </div>
    </div>
  );
}
