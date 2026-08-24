import type { EngineLot } from "./engine-types";

const BRT_TIME_ZONE = "America/Sao_Paulo";
const INVALID_VALUE = "—";
const INVALID_DATE = "Data não informada";
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function safeCurrency(value: string) {
  return /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : "BRL";
}

function parseCents(value: string | number | bigint | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value >= BigInt(0) ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function formatEngineBrlCents(value: string | number | bigint | null | undefined, currency = "BRL") {
  const cents = parseCents(value);
  if (cents === null) return INVALID_VALUE;

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: safeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const integerPart = cents / BigInt(100);
  const fractionPart = (cents % BigInt(100)).toString().padStart(2, "0");
  return formatter
    .formatToParts(integerPart)
    .map((part) => (part.type === "fraction" ? fractionPart : part.value))
    .join("");
}

export function formatEngineBrtInstant(value?: string | null) {
  if (!value || !ISO_INSTANT_PATTERN.test(value)) return INVALID_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return INVALID_DATE;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BRT_TIME_ZONE,
  }).format(date);
}

export type EngineQuickBidOption = {
  value: string;
  label: "next" | "quick";
};

export function getEngineQuickBidOptions(
  lot: Pick<
    EngineLot,
    | "nextBidCents"
    | "incrementCents"
    | "currentIncrementCents"
  >,
): EngineQuickBidOption[] {
  const next = BigInt(lot.nextBidCents);
  const increment = BigInt(lot.currentIncrementCents ?? lot.incrementCents);
  return [0, 1, 2, 3].map((step) => ({
    value: (next + increment * BigInt(step)).toString(),
    label: step === 0 ? "next" : "quick",
  }));
}
