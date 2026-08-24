import { redirect } from "next/navigation";

export default function RegisterRedirectPage() {
  const marketplaceUrl = (process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000").replace(/\/$/, "");
  redirect(`${marketplaceUrl}/cadastro`);
}
