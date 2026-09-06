/**
 * `err instanceof Error` alone isn't reliable here: Supabase's
 * PostgrestError (what every RPC call in this app throws on failure) has
 * a `.message` string but doesn't reliably pass `instanceof Error` in
 * every environment. Checking `instanceof Error` first and falling back
 * to any object with a string `.message` covers both real Error objects
 * and Postgrest/Supabase error shapes, so the actual server error text
 * (e.g. a `raise exception` message from an RPC) reaches the user
 * instead of being silently replaced by a generic fallback.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
