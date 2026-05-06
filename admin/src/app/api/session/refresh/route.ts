import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  BACKEND_API_BASE,
  buildAdminSessionCookieValue,
  getAdminSessionCookieOptions,
  getAdminSession,
  clearAdminSessionCookie,
} from "@/lib/admin-auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "No session" }, { status: 401 });
  }

  const backendResponse = await fetch(`${BACKEND_API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${session.token}` },
    cache: "no-store",
  });

  if (!backendResponse.ok) {
    await clearAdminSessionCookie();
    return NextResponse.json({ message: "Profile fetch failed" }, { status: 401 });
  }

  const user = await backendResponse.json();

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    buildAdminSessionCookieValue({
      token: session.token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        mustChangePin: user.mustChangePin,
        employeeId: user.employeeId,
        fleetOperatorId: user.fleetOperatorId,
        avatarUrl: user.avatarUrl,
      },
    }),
    getAdminSessionCookieOptions(),
  );

  return NextResponse.json({ success: true, user });
}
