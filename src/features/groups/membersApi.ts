import { supabase } from "../../lib/api/supabaseClient";
import type { Member } from "./memberTypes";

interface MemberRow {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string | null;
  role: "admin" | "member";
  joined_at: string;
  profile: { name: string } | null;
}

export async function listGroupMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("id, group_id, user_id, display_name, role, joined_at, profile:profiles(name)")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as MemberRow[]).map((row) => ({
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    display_name: row.display_name,
    is_ghost: row.user_id === null,
    role: row.role,
    joined_at: row.joined_at,
    name: row.display_name ?? row.profile?.name ?? "Unknown",
  }));
}

export async function addGhostMember(groupId: string, name: string, idempotencyKey: string) {
  const { data, error } = await supabase.rpc("add_ghost_member", {
    p_group_id: groupId,
    p_display_name: name,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}
