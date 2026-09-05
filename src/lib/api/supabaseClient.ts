import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.",
  );
}

// The anon key is safe in client code by design — RLS (see GROUND_RULES.md
// rule #5) is what actually protects the data, not this key being secret.
export const supabase = createClient(url, anonKey);
