import { supabase } from "../../lib/api/supabaseClient";
import type { Group, GroupWithMemberCount } from "./types";

/**
 * No manual filtering needed here - RLS (groups_select policy) already
 * restricts this to groups the signed-in user belongs to. If this ever
 * returns someone else's group, that's a database bug, not a missing
 * `.eq()` in this file.
 */
export async function listMyGroups(): Promise<GroupWithMemberCount[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*, member_count:group_members(count)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    // PostgREST's embedded-count shape: member_count comes back as
    // [{ count: N }]. Defensive fallback to 0 if that ever changes shape.
    const raw = row as Group & { member_count: unknown };
    const countArr = Array.isArray(raw.member_count) ? raw.member_count : [];
    const count = (countArr[0] as { count?: number } | undefined)?.count ?? 0;
    return { ...raw, member_count: count } as GroupWithMemberCount;
  });
}

/** Creates a group with the caller as its first member, role 'admin'. Idempotent. */
export async function createGroup(name: string, idempotencyKey: string): Promise<Group> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as Group;
}
