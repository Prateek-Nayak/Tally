import { useState } from "react";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { formatPaise } from "../../shared/lib/money";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { getErrorMessage } from "../../shared/lib/errors";
import { useRemoveMember } from "./useBalances";
import type { Member } from "./memberTypes";

export function MemberRow({
  groupId,
  member,
  balancePaise,
  isAdmin,
}: {
  groupId: string;
  member: Member;
  balancePaise: number | undefined;
  isAdmin: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const removeMember = useRemoveMember(groupId);

  const settled = balancePaise === 0 || balancePaise === undefined;
  const canRemove = isAdmin && settled;

  async function handleConfirmRemove() {
    setError("");
    try {
      await removeMember.mutateAsync({ memberId: member.id, idempotencyKey: newIdempotencyKey() });
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove them."));
      setConfirming(false);
    }
  }

  return (
    <div
      style={{
        background: member.is_ghost ? COLORS.goldSoft : COLORS.surface,
        border: `1px solid ${member.is_ghost ? COLORS.gold : COLORS.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{member.name}</span>
          {member.is_ghost && <span style={{ color: COLORS.gold, fontSize: 11.5 }}> · no account</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {balancePaise !== undefined && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12.5,
                fontWeight: 700,
                color: balancePaise > 0 ? COLORS.green : balancePaise < 0 ? COLORS.red : COLORS.inkSoft,
              }}
            >
              {balancePaise === 0
                ? "settled up"
                : balancePaise > 0
                  ? `gets back ${formatPaise(balancePaise)}`
                  : `owes ${formatPaise(-balancePaise)}`}
            </span>
          )}
          {isAdmin && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canRemove}
              title={canRemove ? "Remove from group" : "They have an unsettled balance"}
              style={{
                background: "transparent",
                border: "none",
                color: canRemove ? COLORS.red : COLORS.border,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: canRemove ? "pointer" : "default",
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.inkSoft }}>Remove {member.name} from this group?</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => void handleConfirmRemove()}
              disabled={removeMember.isPending}
              style={{
                background: COLORS.red,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {removeMember.isPending ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <span style={{ fontSize: 11.5, color: COLORS.red }}>{error}</span>}
    </div>
  );
}
