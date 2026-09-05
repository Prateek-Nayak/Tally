export interface InviteLink {
  id: string;
  group_id: string;
  code: string;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

export interface PendingInvite {
  id: string;
  group_id: string;
  group_name: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
}
