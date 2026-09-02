"use server";

import {
  createAuthenticatedRequester,
  type AuthenticatedRequestOptions,
} from "@/lib/auth/server/authenticated-request";
import {
  destroySession,
  getSession,
  refreshSessionResult,
} from "@/lib/auth/server/session";

const request = createAuthenticatedRequester({
  getSession,
  refreshSession: refreshSessionResult,
  clearSession: destroySession,
});

export async function authenticatedFetch(
  input: string | URL,
  init: RequestInit = {},
  options: AuthenticatedRequestOptions = {},
) {
  return request(input, init, options);
}
