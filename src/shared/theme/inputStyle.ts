import { COLORS_LIGHT as COLORS } from "./colors";

export const inputStyle: React.CSSProperties = {
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
