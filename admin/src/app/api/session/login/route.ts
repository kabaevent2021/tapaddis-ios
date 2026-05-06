import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  BACKEND_API_BASE,
  buildAdminSessionCookieValue,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";

type BackendLoginResponse = {
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { phone?: string; pin?: string }
    | null;

  if (!body?.phone || !body?.pin) {
    return NextResponse.json({ message: "Phone number and PIN are required." }, { status: 400 });
  }

  const backendResponse = await fetch(`${BACKEND_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: body.phone,
      pin: body.pin,
    }),
    cache: "no-store",
  });

  const payload = (await backendResponse.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    token?: string;
    user?: BackendLoginResponse["user"];
  };

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        message: payload.message || "Unable to sign in.",
        code: payload.code || "TOKEN_INVALID",
      },
      { status: backendResponse.status },
    );
  }

  if (!payload.token || !payload.user || !["ADMIN", "ENTERPRISE_ADMIN"].includes(payload.user.role)) {
    return NextResponse.json(
      {
        message: "Only admin and enterprise accounts can sign in here.",
        code: "ROLE_FORBIDDEN",
      },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    buildAdminSessionCookieValue({
      token: payload.token,
      user: {
        id: payload.user.id,
        name: payload.user.name,
        phone: payload.user.phone,
        role: payload.user.role,
        mustChangePin: payload.user.mustChangePin,
        employeeId: payload.user.employeeId,
        fleetOperatorId: payload.user.fleetOperatorId,
        avatarUrl: payload.user.avatarUrl,
      },
    }),
    getAdminSessionCookieOptions(),
  );

  return NextResponse.json({
    success: true,
    role: payload.user.role,
    nextPath: payload.user.role === "ENTERPRISE_ADMIN" ? "/fleet" : "/",
  });
}
