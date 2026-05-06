export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminApiFetch,
  readBackendErrorMessage,
  requireAdminSession,
} from "@/lib/admin-auth";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";
import {
  crewOnboardingTypeLabel,
  getCrewOnboardingRecord,
  normalizeQueryParam,
} from "../data";

async function reviewCrewOnboardingDetail(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  let errorMessage: string | null = null;

  try {
    const response = await adminApiFetch(`/crew-onboarding/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        decision,
        note: note || undefined,
      }),
    });

    if (!response.ok) {
      errorMessage = await readBackendErrorMessage(response);
    }
  } catch (error) {
    errorMessage = getAdminActionErrorMessage(error, "Unable to review onboarding");
  }

  if (errorMessage) {
    redirect(`/crew-onboarding/${id}?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/crew-onboarding");
  revalidatePath(`/crew-onboarding/${id}`);
  redirect(`/crew-onboarding/${id}?notice=${encodeURIComponent("Crew review saved")}`);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default async function CrewOnboardingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  if (session.user.role !== "ADMIN") {
    redirect("/fleet");
  }

  const { id } = await params;
  const search = (await searchParams) ?? {};
  const notice = normalizeQueryParam(search.notice);
  const error = normalizeQueryParam(search.error);
  const item = await getCrewOnboardingRecord(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/crew-onboarding"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            {"<-"} Back to queue
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Taxi onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {item.fullName || item.phone}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review the full taxi crew application, then approve or reject it with a clear note.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {item.status}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {crewOnboardingTypeLabel(item.onboardingType)}
          </span>
        </div>
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Applicant</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Full name" value={item.fullName || "Not provided"} />
              <Info label="Phone" value={item.phone} />
              <Info label="Government ID" value={item.governmentIdNumber} />
              <Info label="User status" value={item.user.status} />
              <Info
                label="Last login"
                value={item.user.lastLoginAt ? new Date(item.user.lastLoginAt).toLocaleString() : "Never"}
              />
              <Info label="Role" value={item.user.role} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Taxi request</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Taxi access choice" value={crewOnboardingTypeLabel(item.onboardingType)} />
              <Info label="Vehicle type" value={item.requestedVehicleClassLabel || "Not provided"} />
              <Info label="Vehicle ID" value={item.requestedVehicleId || "Not provided"} />
              <Info label="License plate" value={item.requestedLicensePlate || "Not provided"} />
              <Info label="Display name" value={item.requestedDisplayName || "Not provided"} />
              <Info label="Linked registered taxi" value={item.linkedRegisteredTaxi?.vehicleId || "None"} />
            </div>
            {item.linkedRegisteredTaxi ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {item.linkedRegisteredTaxi.displayName || item.linkedRegisteredTaxi.vehicleId}
                </p>
                <p className="mt-1">
                  {item.linkedRegisteredTaxi.licensePlate} - {item.linkedRegisteredTaxi.vehicleClassLabel}
                </p>
                <p className="mt-1">Taxi status: {item.linkedRegisteredTaxi.status}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Review history</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Submitted:</span>{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Last updated:</span>{" "}
                {new Date(item.updatedAt).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Reviewed by:</span>{" "}
                {item.reviewedByUser ? item.reviewedByUser.name || item.reviewedByUser.phone : "Not reviewed yet"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Reviewed at:</span>{" "}
                {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "Not reviewed yet"}
              </p>
            </div>
            {item.reviewNote ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Latest review note:</span> {item.reviewNote}
              </div>
            ) : null}
          </div>

          <form action={reviewCrewOnboardingDetail} className="rounded-3xl border border-slate-200 bg-white p-6">
            <input type="hidden" name="id" value={item.id} />
            <h2 className="text-lg font-semibold text-slate-950">Decision</h2>
            <p className="mt-2 text-sm text-slate-500">
              Save a clear note so the driver and operations team understand what changed.
            </p>
            <textarea
              name="note"
              defaultValue={item.reviewNote ?? ""}
              rows={5}
              placeholder="Add an approval or rejection note"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                name="decision"
                value="APPROVE"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Approve
              </button>
              <button
                name="decision"
                value="REJECT"
                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
              >
                Reject
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
