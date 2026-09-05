export interface Member {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string | null;
  is_ghost: boolean;
  role: "admin" | "member";
  joined_at: string;
  /** Resolved client-side: display_name for ghosts, profile name for real members. */
  name: string;
}
