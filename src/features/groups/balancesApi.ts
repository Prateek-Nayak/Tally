import { supabase } from "../../lib/api/supabaseClient";

export type BalanceMap = Record<string, number>;

export async function getGroupBalances(groupId: string): Promise<BalanceMap> {
  const { data, error } = await supabase.rpc("get_group_balances", { p_group_id: groupId });
  if (error) throw error;
  const rows = (data ?? []) as { member_id: string; balance_paise: number }[];
  return Object.fromEntries(rows.map((r) => [r.member_id, r.balance_paise]));
}

export async function removeMember(groupId: string, memberId: string, idempotencyKey: string) {
  const { data, error } = await supabase.rpc("remove_member", {
    p_group_id: groupId,
    p_member_id: memberId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}
