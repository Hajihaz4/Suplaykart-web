/** Border-radius tokens — from the legacy 6–20px radii. */
export const radius = {
  sm: "6px",
  md: "10px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;
