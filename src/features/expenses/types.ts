export interface ExpenseListItem {
  id: string;
  group_id: string;
  description: string;
  amount_paise: number;
  paid_by_name: string;
  created_at: string;
  split_count: number;
}

export interface ExpenseSplitDetail {
  member_id: string;
  member_name: string;
  share_paise: number;
}

export interface ExpenseDetail {
  id: string;
  group_id: string;
  description: string;
  amount_paise: number;
  paid_by: string;
  created_by: string;
  created_at: string;
  splits: ExpenseSplitDetail[];
}
