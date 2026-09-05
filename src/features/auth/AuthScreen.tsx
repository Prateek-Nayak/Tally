import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { signIn, signUp, requestPasswordReset, updatePassword } from "./authApi";
import { validateEmail, validatePassword, validateName } from "./validators";

type Mode = "login" | "signup" | "forgot";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
  padding: "10px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  color: COLORS.ink,
  background: COLORS.field,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: COLORS.inkSoft,
  marginBottom: 4,
  fontFamily: "Inter, sans-serif",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({ children, busy }: { children: React.ReactNode; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      style={{
        width: "100%",
        minHeight: 44,
        padding: "13px 16px",
        borderRadius: 10,
        border: "none",
        background: COLORS.action,
        color: COLORS.onAction,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: 15,
        marginTop: 6,
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        margin: "14px auto 0",
        background: "transparent",
        border: "none",
        color: COLORS.navy,
        fontWeight: 600,
        fontSize: 12.5,
        fontFamily: "Inter, sans-serif",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function Notice({ kind, children }: { kind: "error" | "info"; children: React.ReactNode }) {
  const isError = kind === "error";
  const color = isError ? COLORS.red : COLORS.green;
  const bg = isError ? COLORS.redSoft : COLORS.greenSoft;
  const Icon = isError ? AlertTriangle : CheckCircle2;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 16,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 12.5, color: COLORS.ink, fontFamily: "Inter, sans-serif" }}>{children}</div>
    </div>
  );
}

interface Props {
  /** True when the user arrived via a password-reset email link. */
  isRecovery: boolean;
}

export function AuthScreen({ isRecovery }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  function resetNotices() {
    setError("");
    setInfo("");
  }

  async function handleRecoverySubmit(e: FormEvent) {
    e.preventDefault();
    resetNotices();
    const pwErr = validatePassword(newPassword);
    if (pwErr) return setError(pwErr);
    if (newPassword !== confirmNewPassword) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await updatePassword(newPassword);
      setInfo("Password updated. You're signed in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    resetNotices();
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setInfo("Check your email for a password reset link.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetNotices();

    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);

    if (mode === "signup") {
      const nameErr = validateName(name);
      if (nameErr) return setError(nameErr);
      const pwErr = validatePassword(password);
      if (pwErr) return setError(pwErr);
      if (password !== confirmPassword) return setError("Passwords don't match.");
    } else if (!password) {
      return setError("Enter your password.");
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, name.trim());
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const description = isRecovery
    ? "Enter your new password below."
    : mode === "forgot"
      ? "Enter your email and we'll send you a reset link."
      : mode === "signup"
        ? "You'll show up under this name in your groups."
        : "Sign in to see your groups and balances.";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: COLORS.bg,
        display: "grid",
        placeItems: "center",
        padding: 20,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: COLORS.surface,
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 12px 40px rgba(0,0,0,.10)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: COLORS.heading }}>
          Tally
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            color: COLORS.gold,
            letterSpacing: 0.5,
            marginTop: 2,
            marginBottom: 20,
          }}
        >
          SHARED EXPENSES
        </div>

        <div style={{ color: COLORS.inkSoft, fontSize: 13.5, marginBottom: 20 }}>{description}</div>

        {error && <Notice kind="error">{error}</Notice>}
        {info && <Notice kind="info">{info}</Notice>}

        {isRecovery ? (
          <form onSubmit={handleRecoverySubmit}>
            <Field label="New password">
              <input
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters, 1 uppercase, 1 number"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </Field>
            <PrimaryButton busy={busy}>{busy ? "Please wait…" : "Update password"}</PrimaryButton>
          </form>
        ) : mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit}>
            <Field label="Email">
              <input
                style={inputStyle}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <PrimaryButton busy={busy}>{busy ? "Please wait…" : "Send reset link"}</PrimaryButton>
            <LinkButton
              onClick={() => {
                setMode("login");
                resetNotices();
              }}
            >
              Back to sign in
            </LinkButton>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <Field label="Name">
                <input
                  style={inputStyle}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How you'll appear in your groups"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                style={inputStyle}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                style={inputStyle}
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 chars, 1 uppercase, 1 number" : "Enter your password"}
              />
            </Field>
            {mode === "signup" && (
              <Field label="Confirm password">
                <input
                  style={inputStyle}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </Field>
            )}

            <PrimaryButton busy={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </PrimaryButton>

            {mode === "login" && (
              <LinkButton
                onClick={() => {
                  setMode("forgot");
                  resetNotices();
                }}
              >
                Forgot password?
              </LinkButton>
            )}

            <div
              style={{
                textAlign: "center",
                marginTop: 18,
                paddingTop: 16,
                borderTop: `1px solid ${COLORS.border}`,
                fontSize: 12.5,
                fontFamily: "Inter, sans-serif",
                color: COLORS.inkSoft,
              }}
            >
              {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  resetNotices();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.navy,
                  fontWeight: 600,
                  fontSize: 12.5,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
