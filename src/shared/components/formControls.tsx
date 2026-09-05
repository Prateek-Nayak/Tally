import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { COLORS_LIGHT as COLORS } from "../theme/colors";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: COLORS.inkSoft,
  marginBottom: 4,
  fontFamily: "Inter, sans-serif",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  busy,
  onClick,
  type = "submit",
}: {
  children: ReactNode;
  busy: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={busy}
      onClick={onClick}
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

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
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

export function Notice({ kind, children }: { kind: "error" | "info"; children: ReactNode }) {
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
