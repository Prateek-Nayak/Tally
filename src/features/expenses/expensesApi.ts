import { supabase } from "../../lib/api/supabaseClient";
import type { ExpenseListItem } from "./types";

interface ExpenseRow {
  id: string;
  group_id: string;
  description: string;
  amount_paise: number;
  created_at: string;
  paid_by_member: { display_name: string | null; profile: { name: string } | null } | null;
  splits: { count: number }[];
}

export async function listGroupExpenses(groupId: string): Promise<ExpenseListItem[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, group_id, description, amount_paise, created_at, paid_by_member:group_members!paid_by(display_name, profile:profiles!user_id(name)), splits:expense_splits(count)",
    )
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as ExpenseRow[]).map((row) => ({
    id: row.id,
    group_id: row.group_id,
    description: row.description,
    amount_paise: row.amount_paise,
    created_at: row.created_at,
    paid_by_name: row.paid_by_member?.display_name ?? row.paid_by_member?.profile?.name ?? "Someone",
    split_count: row.splits?.[0]?.count ?? 0,
  }));
}

export async function addExpense(
  groupId: string,
  description: string,
  amountPaise: number,
  paidByMemberId: string,
  splitMemberIds: string[],
  idempotencyKey: string,
) {
  const { data, error } = await supabase.rpc("add_expense", {
    p_group_id: groupId,
    p_description: description,
    p_amount_paise: amountPaise,
    p_paid_by: paidByMemberId,
    p_member_ids: splitMemberIds,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}
