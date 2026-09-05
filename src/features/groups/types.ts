export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface GroupWithMemberCount extends Group {
  member_count: number;
}
