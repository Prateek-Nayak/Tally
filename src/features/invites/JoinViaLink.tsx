import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { PrimaryButton, Notice } from "../../shared/components/formControls";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { previewInviteLink, joinGroupViaLink } from "./invitesApi";
import { getErrorMessage } from "../../shared/lib/errors";

export function JoinViaLink({
  code,
  onJoined,
  onCancel,
}: {
  code: string;
  onJoined: (groupId: string, groupName: string) => void;
  onCancel: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: () => previewInviteLink(code),
    retry: false,
  });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  async function handleJoin() {
    setJoinError("");
    setJoining(true);
    try {
      const member = (await joinGroupViaLink(code, idempotencyKey)) as { group_id: string };
      onJoined(member.group_id, data?.group_name ?? "");
    } catch (err) {
      setJoinError(getErrorMessage(err, "Could not join the group."));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: COLORS.bg, display: "grid", placeItems: "center", padding: 20 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: COLORS.surface,
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 12px 40px rgba(0,0,0,.10)",
          border: `1px solid ${COLORS.border}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: COLORS.heading, marginBottom: 16 }}>
          Tally
        </div>

        {isLoading && <p style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>Checking invite…</p>}

        {error && (
          <>
            <Notice kind="error">{getErrorMessage(error, "This invite link isn't valid.")}</Notice>
            <PrimaryButton busy={false} onClick={onCancel} type="button">
              Back to my groups
            </PrimaryButton>
          </>
        )}

        {data && (
          <>
            <p style={{ fontSize: 14, color: COLORS.ink, marginBottom: 20 }}>
              You've been invited to join <strong>{data.group_name}</strong>.
            </p>
            {joinError && <Notice kind="error">{joinError}</Notice>}
            <PrimaryButton busy={joining} onClick={() => void handleJoin()} type="button">
              {joining ? "Joining…" : `Join ${data.group_name}`}
            </PrimaryButton>
            <button
              type="button"
              onClick={onCancel}
              style={{
                display: "block",
                margin: "12px auto 0",
                background: "transparent",
                border: "none",
                color: COLORS.inkSoft,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
