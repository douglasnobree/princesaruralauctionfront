const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const DEFAULT_AUCTION_INCREMENT_CENTS = 10_000;

export function centsToBrlInput(value?: number | null) {
  if (value === undefined || value === null) return "";
  return (value / 100).toFixed(2).replace(".", ",");
}

export function formatBrlCents(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return BRL_FORMATTER.format(value / 100);
}

function normalizeBrlValue(value: string) {
  return value
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .trim();
}

export function brlToCents(value: string) {
  const normalized = normalizeBrlValue(value);
  if (!normalized) return undefined;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  let integerPart = normalized;
  let decimalPart = "";

  if (hasComma) {
    const parts = normalized.split(",");
    decimalPart = parts.pop() ?? "";
    integerPart = parts.join("");
  } else if (hasDot && normalized.split(".").length === 2) {
    const [whole, decimals] = normalized.split(".");
    if (decimals.length <= 2) {
      integerPart = whole;
      decimalPart = decimals;
    } else {
      integerPart = normalized.replace(/\./g, "");
    }
  } else {
    integerPart = normalized.replace(/\./g, "");
  }

  const cleanInteger = integerPart.replace(/\D/g, "") || "0";
  const cleanDecimals = decimalPart.replace(/\D/g, "").slice(0, 2).padEnd(2, "0");
  const cents = Number(`${cleanInteger}${cleanDecimals}`);

  return Number.isSafeInteger(cents) ? cents : undefined;
}

export function formatBrlInput(value: string) {
  const cents = brlToCents(value);
  return cents === undefined ? "" : centsToBrlInput(cents);
}
