import { NextResponse } from "next/server";
import { apiOrigin, isMockApi } from "@api/env";
import { handleMock } from "@api/mockDb";
import { REALTIME_CLIENT_HEADER } from "@libraries/realtime/session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const apiPath = `/api/${path.join("/")}`;
  if (isMockApi()) {
    return handleMock(request, apiPath);
  }

  const upstream = new URL(apiPath, apiOrigin());
  upstream.search = new URL(request.url).search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  headers.set("x-forwarded-for", clientIp);
  const realtimeClient = request.headers.get(REALTIME_CLIENT_HEADER);
  if (realtimeClient) headers.set(REALTIME_CLIENT_HEADER, realtimeClient);

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });

  const out = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) out.set("content-type", responseType);
  const location = response.headers.get("location");
  if (location) out.set("location", location);
  for (const cookieValue of response.headers.getSetCookie()) {
    out.append("set-cookie", cookieValue);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: out,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
