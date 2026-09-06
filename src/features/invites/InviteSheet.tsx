import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { useActiveInviteLink, useCreateInviteLink, useRevokeInviteLink, useInviteByEmail } from "./useInvites";

export function InviteSheet({
  groupId,
  isAdmin,
  onClose,
}: {
  groupId: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const { data: link, isLoading: linkLoading, error: linkError } = useActiveInviteLink(groupId);
  const createLink = useCreateInviteLink(groupId);
  const revokeLink = useRevokeInviteLink(groupId);
  const inviteByEmail = useInviteByEmail(groupId);
  const [linkActionError, setLinkActionError] = useState("");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailKey, setEmailKey] = useState(newIdempotencyKey);

  const inviteUrl = link ? `${window.location.origin}/?invite=${link.code}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context); the link
      // text is still selectable/visible, so this isn't a dead end.
    }
  }

  async function handleGenerateLink() {
    setLinkActionError("");
    try {
      await createLink.mutateAsync(newIdempotencyKey());
    } catch (err) {
      setLinkActionError(err instanceof Error ? err.message : "Could not generate the link.");
    }
  }

  async function handleRevokeLink() {
    setLinkActionError("");
    try {
      await revokeLink.mutateAsync(newIdempotencyKey());
    } catch (err) {
      setLinkActionError(err instanceof Error ? err.message : "Could not revoke the link.");
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSent("");
    if (!email.trim()) return setEmailError("Enter an email address.");
    try {
      await inviteByEmail.mutateAsync({ email: email.trim(), idempotencyKey: emailKey });
      setEmailSent(`Invite sent to ${email.trim()}.`);
      setEmail("");
      setEmailKey(newIdempotencyKey()); // fresh key for the next invite
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not send the invite.");
    }
  }

  return (
    <Sheet title="Invite people" onClose={onClose}>
      {isAdmin && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 6 }}>Shareable link</div>
          {linkActionError && <Notice kind="error">{linkActionError}</Notice>}
          {linkLoading ? (
            <p style={{ fontSize: 13, color: COLORS.inkSoft }}>Loading…</p>
          ) : linkError ? (
            <p style={{ fontSize: 13, color: COLORS.red }}>Couldn't check the invite link. Try again.</p>
          ) : link ? (
            <div>
              <div
                style={{
                  ...inputStyle,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  wordBreak: "break-all",
                  minHeight: "auto",
                  padding: "10px 12px",
                }}
              >
                {inviteUrl}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  style={{
                    flex: 1,
                    background: COLORS.action,
                    color: COLORS.onAction,
                    border: "none",
                    borderRadius: 8,
                    padding: "9px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRevokeLink()}
                  disabled={revokeLink.isPending}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: COLORS.red,
                    border: `1px solid ${COLORS.red}`,
                    borderRadius: 8,
                    padding: "9px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {revokeLink.isPending ? "Revoking…" : "Revoke"}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 6 }}>
                Anyone with this link can join. Revoking it stops new joins immediately.
              </p>
            </div>
          ) : (
            <PrimaryButton type="button" busy={createLink.isPending} onClick={() => void handleGenerateLink()}>
              {createLink.isPending ? "Generating…" : "Generate invite link"}
            </PrimaryButton>
          )}
        </div>
      )}

      <div style={{ paddingTop: isAdmin ? 16 : 0, borderTop: isAdmin ? `1px solid ${COLORS.border}` : "none" }}>
        <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 6 }}>Invite by email</div>
        <p style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 0, marginBottom: 10 }}>
          Only works for someone who already has a Tally account. They'll see it waiting when they open the app.
        </p>
        <form onSubmit={handleEmailSubmit}>
          {emailError && <Notice kind="error">{emailError}</Notice>}
          {emailSent && <Notice kind="info">{emailSent}</Notice>}
          <Field label="Email">
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
            />
          </Field>
          <PrimaryButton busy={inviteByEmail.isPending}>
            {inviteByEmail.isPending ? "Sending…" : "Send invite"}
          </PrimaryButton>
        </form>
      </div>
    </Sheet>
  );
}
