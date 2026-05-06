import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "tapaddis_admin_session";
export const BACKEND_API_BASE = process.env.TAPADDIS_API_BASE ?? "http://localhost:3000/api";

export type AdminSession = {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    mustChangePin?: boolean;
    employeeId?: string | null;
    fleetOperatorId?: string | null;
    avatarUrl?: string | null;
  };
};

export function isAdminConsoleRole(role?: string | null) {
  return role === "ADMIN" || role === "ENTERPRISE_ADMIN";
}

export function buildAdminSessionCookieValue(session: AdminSession) {
  return JSON.stringify(session);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.token || !isAdminConsoleRole(parsed.user?.role)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    await clearAdminSessionCookie();
    redirect("/login");
  }
  return session;
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
}

export async function adminApiFetch(path: string, init: RequestInit = {}) {
  const session = await requireAdminSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BACKEND_API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    await clearAdminSessionCookie();
    redirect("/login");
  }

  return response;
}

export async function adminApiJson<T>(path: string, init: RequestInit = {}) {
  const response = await adminApiFetch(path, init);
  if (!response.ok) {
    throw new Error(await readBackendErrorMessage(response));
  }
  return (await response.json()) as T;
}

export async function readBackendErrorMessage(response: Response) {
  const payload = await response.text();
  try {
    const json = JSON.parse(payload) as { message?: string };
    return json.message || `Request failed (${response.status})`;
  } catch {
    return payload || `Request failed (${response.status})`;
  }
}
