export function isAuctionAuthenticationError(errorCode?: string) {
  return errorCode === "AUTH_REQUIRED" || errorCode === "UNAUTHORIZED";
}
