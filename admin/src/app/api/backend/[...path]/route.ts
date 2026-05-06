import { clearAdminSessionCookie, getAdminSession, BACKEND_API_BASE } from "@/lib/admin-auth";

async function proxy(request: Request, params: { path?: string[] }) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ message: "Admin session required." }, { status: 401 });
  }

  const path = params.path?.join("/") ?? "";
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${BACKEND_API_BASE}/${path}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("Authorization", `Bearer ${session.token}`);

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    cache: "no-store",
    // @ts-ignore
    duplex: "half",
  });

  if (backendResponse.status === 401 || backendResponse.status === 403) {
    await clearAdminSessionCookie();
  }

  const responseHeaders = new Headers();
  const contentType = backendResponse.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, await params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, await params);
}
