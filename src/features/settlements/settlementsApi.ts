import { supabase } from "../../lib/api/supabaseClient";

export async function recordSettlement(
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
  amountPaise: number,
  note: string,
  idempotencyKey: string,
) {
  const { data, error } = await supabase.rpc("record_settlement", {
    p_group_id: groupId,
    p_from_member: fromMemberId,
    p_to_member: toMemberId,
    p_amount_paise: amountPaise,
    p_note: note,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}
