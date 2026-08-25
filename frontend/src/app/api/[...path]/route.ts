import { NextResponse } from "next/server";
import { apiOrigin, isMockApi } from "@/api/env";
import { handleMock } from "@/api/mockDb";

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

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
