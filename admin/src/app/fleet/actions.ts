"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminActionErrorMessage } from "@/lib/admin-action-errors";
import { adminApiJson } from "@/lib/admin-auth";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : undefined;
}

async function postFleet(path: string, body: Record<string, unknown>, revalidate: string) {
  await adminApiJson(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  revalidatePath(revalidate);
}

async function patchFleet(path: string, body: Record<string, unknown>, revalidate: string) {
  await adminApiJson(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  revalidatePath(revalidate);
}

function fleetCrewRedirectPath(formData: FormData, messageKey: "notice" | "error", message: string) {
  const params = new URLSearchParams();
  const fleetOperatorId = optionalString(formData.get("fleetOperatorId"));
  if (fleetOperatorId) {
    params.set("fleetOperatorId", fleetOperatorId);
  }
  params.set(messageKey, message);
  return `/fleet/crew?${params.toString()}`;
}

export async function createFleetOperatorAction(formData: FormData) {
  await postFleet(
    "/fleet/operators",
    {
      name: optionalString(formData.get("name")),
      code: optionalString(formData.get("code")),
      contactName: optionalString(formData.get("contactName")),
      contactPhone: optionalString(formData.get("contactPhone")),
      notes: optionalString(formData.get("notes")),
    },
    "/fleet",
  );
}

export async function createFleetVehicleAction(formData: FormData) {
  await postFleet(
    "/fleet/vehicles",
    {
      fleetOperatorId: optionalString(formData.get("fleetOperatorId")),
      vehicleId: optionalString(formData.get("vehicleId")),
      licensePlate: optionalString(formData.get("licensePlate")),
      displayName: optionalString(formData.get("displayName")),
      depot: optionalString(formData.get("depot")),
      notes: optionalString(formData.get("notes")),
    },
    "/fleet/vehicles",
  );
}

export async function importFleetVehiclesAction(formData: FormData) {
  const file = formData.get("csvFile");
  const pastedCsv = optionalString(formData.get("csv"));
  const fileCsv = file instanceof File && file.size > 0 ? await file.text() : undefined;
  await postFleet(
    "/fleet/vehicles/import",
    {
      fleetOperatorId: optionalString(formData.get("fleetOperatorId")),
      csv: fileCsv || pastedCsv,
    },
    "/fleet/vehicles",
  );
}

export async function updateFleetVehicleStatusAction(formData: FormData) {
  const id = optionalString(formData.get("id"));
  if (!id) {
    return;
  }
  await patchFleet(
    `/fleet/vehicles/${id}`,
    { status: optionalString(formData.get("status")) },
    "/fleet/vehicles",
  );
}

export async function createFleetValidatorAction(formData: FormData) {
  await postFleet(
    "/fleet/validators",
    {
      fleetOperatorId: optionalString(formData.get("fleetOperatorId")),
      deviceId: optionalString(formData.get("deviceId")),
      label: optionalString(formData.get("label")),
      fleetVehicleId: optionalString(formData.get("fleetVehicleId")),
      notes: optionalString(formData.get("notes")),
    },
    "/fleet/validators",
  );
}

export async function updateFleetValidatorStatusAction(formData: FormData) {
  const id = optionalString(formData.get("id"));
  if (!id) {
    return;
  }
  await patchFleet(
    `/fleet/validators/${id}`,
    { status: optionalString(formData.get("status")) },
    "/fleet/validators",
  );
}

export async function createFleetAssignmentAction(formData: FormData) {
  await postFleet(
    "/fleet/assignments",
    {
      fleetOperatorId: optionalString(formData.get("fleetOperatorId")),
      crewId: optionalString(formData.get("crewId")),
      fleetVehicleId: optionalString(formData.get("fleetVehicleId")),
      validatorId: optionalString(formData.get("validatorId")),
      startsAt: optionalString(formData.get("startsAt")),
      endsAt: optionalString(formData.get("endsAt")),
      notes: optionalString(formData.get("notes")),
    },
    "/fleet/assignments",
  );
}

export async function createFleetCrewAction(formData: FormData) {
  try {
    await postFleet(
      "/fleet/crew",
      {
        fleetOperatorId: optionalString(formData.get("fleetOperatorId")),
        phone: optionalString(formData.get("phone")),
        fullName: optionalString(formData.get("fullName")),
        employeeId: optionalString(formData.get("employeeId")),
        pin: optionalString(formData.get("pin")),
      },
      "/fleet/crew",
    );
    redirect(fleetCrewRedirectPath(formData, "notice", "Fleet crew created"));
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to create fleet crew");
    redirect(fleetCrewRedirectPath(formData, "error", message));
  }
}

export async function updateFleetCrewStatusAction(formData: FormData) {
  const id = optionalString(formData.get("id"));
  if (!id) {
    return;
  }
  try {
    await patchFleet(
      `/fleet/crew/${id}/status`,
      { status: optionalString(formData.get("status")) },
      "/fleet/crew",
    );
    redirect(fleetCrewRedirectPath(formData, "notice", "Fleet crew status updated"));
  } catch (error) {
    const message = getAdminActionErrorMessage(error, "Unable to update fleet crew status");
    redirect(fleetCrewRedirectPath(formData, "error", message));
  }
}

export async function updateFleetAssignmentStatusAction(formData: FormData) {
  const id = optionalString(formData.get("id"));
  if (!id) {
    return;
  }
  await patchFleet(
    `/fleet/assignments/${id}`,
    { status: optionalString(formData.get("status")) },
    "/fleet/assignments",
  );
}
