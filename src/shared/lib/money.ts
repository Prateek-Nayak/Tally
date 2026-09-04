/*
 * Ground rule #3: rupees only, no multi-currency. Amounts are stored and
 * passed around the app as integer paise (never float rupees) so rounding
 * errors can't creep into split math. Convert to a display string only at
 * the last step, in the UI.
 */

export type Paise = number; // always an integer

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

export function formatPaise(paise: Paise): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Splits `totalPaise` evenly across `count` shares with no lost or invented
 * paise. Remainder paise are handed to the first N shares, one each, which
 * is the same "who eats the odd cent" rule most ledger apps use.
 */
export function splitEvenly(totalPaise: Paise, count: number): Paise[] {
  if (count <= 0) throw new Error("splitEvenly: count must be positive");
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
