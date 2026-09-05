export interface ExpenseListItem {
  id: string;
  group_id: string;
  description: string;
  amount_paise: number;
  paid_by_name: string;
  created_at: string;
  split_count: number;
}
