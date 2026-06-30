import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { shadows } from "./shadows";
import { radius } from "./radius";
import { breakpoints } from "./breakpoints";
import { zIndex } from "./z-index";

export * from "./colors";
export * from "./spacing";
export * from "./typography";
export * from "./shadows";
export * from "./radius";
export * from "./breakpoints";
export * from "./z-index";

/** Centralized theme object — the canonical token source for the design system. */
export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  radius,
  breakpoints,
  zIndex,
} as const;

export type Theme = typeof theme;
