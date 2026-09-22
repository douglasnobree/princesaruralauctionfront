/** Accept Brazilian notation and ungrouped decimal dots, without dropping invalid characters. */
export function parseManagementAmount(value: string): string | null {
  const input = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(input) && !/^\d+\.\d{1,2}$/.test(input)) return null;
  const normalized = input.includes(",") ? input.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/.test(input) ? input.replace(/\./g, "") : input;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? String(cents) : null;
}
