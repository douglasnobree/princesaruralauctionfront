import { NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await authenticatedFetch(
    `${API_URL}/auctions/manage/${encodeURIComponent(id)}/report/pdf`,
    { cache: "no-store" },
  );
  const headers = new Headers();
  headers.set(
    "content-type",
    response.headers.get("content-type") || "application/pdf",
  );
  const disposition = response.headers.get("content-disposition");
  if (disposition) headers.set("content-disposition", disposition);
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
