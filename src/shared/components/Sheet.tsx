import type { ReactNode } from "react";
import { COLORS_LIGHT as COLORS } from "../theme/colors";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A simple backdrop + slide-up panel. ipo-tracker's version adds real
 * swipe-to-dismiss touch handling on top of this same shape - worth
 * porting over once this feature set stabilizes, not blocking for now.
 */
export function Sheet({ title, onClose, children }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(21, 42, 68, 0.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: COLORS.surface,
          borderRadius: "18px 18px 0 0",
          padding: "10px 20px 24px",
          boxShadow: "0 -12px 40px rgba(0,0,0,.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: COLORS.border, borderRadius: 3, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 17,
              color: COLORS.heading,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              lineHeight: 1,
              color: COLORS.inkSoft,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
