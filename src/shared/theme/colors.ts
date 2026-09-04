// Same palette family as ipo-tracker, so the two apps read as one product line.
// Keep this file as the single source of truth — no inline hex elsewhere.

export const COLORS_LIGHT = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  border: "#D4CFC3",
  ink: "#1C2333",
  inkSoft: "#3D4654",
  navy: "#1F3A5F",
  navyDeep: "#152A44",
  gold: "#B08D57",
  goldSoft: "#F7F0E3",
  green: "#266e43",
  greenSoft: "#E4F0E9",
  red: "#A13D3D",
  redSoft: "#F5E4E2",
  heading: "#152A44",
  action: "#1F3A5F",
  onAction: "#FFFFFF",
  field: "#FDFCFA",
  chip: "#EAEFF5",
} as const;

export const COLORS_DARK = {
  bg: "#000000",
  surface: "#0d0d0d",
  border: "#2C2F37",
  ink: "#fbfbfb",
  inkSoft: "#9A9CA4",
  navy: "#7BA7D9",
  navyDeep: "#101216",
  gold: "#D6A96A",
  goldSoft: "#33291A",
  green: "#6FBF8F",
  greenSoft: "#182A22",
  red: "#E0736B",
  redSoft: "#2E1C1C",
  heading: "#F5F3EE",
  action: "#634e30",
  onAction: "#ffffff",
  field: "#131417",
  chip: "#262A33",
} as const;

export type ThemeName = "light" | "dark";
export type Palette = typeof COLORS_LIGHT;
