import { supabase } from "../../lib/api/supabaseClient";
import type { InviteLink, PendingInvite } from "./types";

export async function createInviteLink(groupId: string, idempotencyKey: string): Promise<InviteLink> {
  const { data, error } = await supabase.rpc("create_invite_link", {
    p_group_id: groupId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as InviteLink;
}

export async function revokeInviteLink(groupId: string, idempotencyKey: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_invite_link", {
    p_group_id: groupId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
}

/** The currently active (non-revoked) invite link for a group, if any. */
export async function getActiveInviteLink(groupId: string): Promise<InviteLink | null> {
  const { data, error } = await supabase
    .from("group_invite_links")
    .select("*")
    .eq("group_id", groupId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as InviteLink | null;
}

export async function previewInviteLink(code: string): Promise<{ group_name: string }> {
  const { data, error } = await supabase.rpc("preview_invite_link", { p_code: code });
  if (error) throw error;
  return data as { group_name: string };
}

export async function joinGroupViaLink(code: string, idempotencyKey: string) {
  const { data, error } = await supabase.rpc("join_group_via_link", {
    p_code: code,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function inviteByEmail(groupId: string, email: string, idempotencyKey: string) {
  const { data, error } = await supabase.rpc("invite_by_email", {
    p_group_id: groupId,
    p_email: email,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function listMyPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from("group_invites")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PendingInvite[];
}

export async function respondToInvite(inviteId: string, accept: boolean, idempotencyKey: string): Promise<void> {
  const { error } = await supabase.rpc("respond_to_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
}
