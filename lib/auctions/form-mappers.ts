import type { AuctionAdminCategory } from "@/types/auction-admin";
export function slugifyAuction(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120); }
export function categoryLabel(category?: AuctionAdminCategory | null) { return category === "ANIMAL" ? "Animais" : category === "MACHINE" ? "Máquinas" : "Sem categoria"; }
