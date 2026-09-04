/*
 * Ground rule #1: idempotency everywhere, not just where it seemed to
 * matter. Every mutating call (create expense, record settlement, restore
 * from trash, etc.) must pass an Idempotency-Key so a retry or a double-tap
 * on a slow connection can never create the action twice.
 *
 * Usage: call `newIdempotencyKey()` once when the user action begins (e.g.
 * on form open, or on first tap), reuse the SAME key across retries of that
 * one logical action, and throw it away once the action succeeds.
 */

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function withIdempotencyKey(key: string, headers: HeadersInit = {}): HeadersInit {
  return { ...headers, "Idempotency-Key": key };
}
