import { adminApiJson } from "@/lib/admin-auth";

export type CrewOnboardingItem = {
  id: string;
  phone: string;
  fullName: string | null;
  governmentIdNumber: string;
  onboardingType: "CLAIM_EXISTING_TAXI" | "REGISTER_NEW_TAXI";
  requestedVehicleClass: string | null;
  requestedVehicleClassLabel: string | null;
  requestedVehicleId: string | null;
  requestedLicensePlate: string | null;
  requestedDisplayName: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    status: string;
    lastLoginAt: string | null;
  };
  reviewedByUser: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  linkedRegisteredTaxi: {
    id: string;
    vehicleId: string;
    licensePlate: string;
    displayName: string | null;
    vehicleClass: string;
    vehicleClassLabel: string;
    status: string;
  } | null;
};

export function normalizeQueryParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function crewOnboardingTypeLabel(type: CrewOnboardingItem["onboardingType"]) {
  return type === "CLAIM_EXISTING_TAXI" ? "Use registered taxi" : "Register new taxi";
}

export async function getCrewOnboardingQueue(query?: string, status?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  const search = params.toString();
  return adminApiJson<{ items: CrewOnboardingItem[] }>(
    `/crew-onboarding${search ? `?${search}` : ""}`,
  );
}

export async function getCrewOnboardingRecord(id: string) {
  return adminApiJson<CrewOnboardingItem>(`/crew-onboarding/${id}`);
}
