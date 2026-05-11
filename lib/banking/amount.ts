type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseCurrencyInput(
  raw: FormDataEntryValue | string | null | undefined,
  options?: { fieldLabel?: string }
): ParseResult {
  const label = options?.fieldLabel ?? "Amount";
  const str = (raw ?? "").toString().trim().replace(/^\$/, "").replace(/,/g, "");

  if (!str) {
    return { ok: false, error: `${label} is required.` };
  }

  const value = Number(str);

  if (isNaN(value)) {
    return { ok: false, error: `${label} must be a valid number.` };
  }

  if (value <= 0) {
    return { ok: false, error: `${label} must be greater than zero.` };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return { ok: false, error: `${label} must have at most 2 decimal places.` };
  }

  return { ok: true, value };
}
