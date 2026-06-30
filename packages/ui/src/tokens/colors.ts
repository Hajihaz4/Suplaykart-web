/**
 * Suplaykart color tokens — extracted from the legacy `old-html` `:root`
 * variables (consistent across all 16 prototypes).
 */
export const colors = {
  brand: "#0C831F",
  brandDark: "#085316",
  brandLight: "#E8F5E9",
  brandBg: "#F1FAF2",

  accent: "#FF6B00", // orange (Pick & promos)
  accentLight: "#FFF3E8",
  danger: "#E23744", // red (cart badge, errors)
  dangerLight: "#FEE7E9",
  info: "#1565C0", // blue (tags)
  infoLight: "#E3F2FD",
  warning: "#F9A825",
  warningLight: "#FFF8E1",
  whatsapp: "#25D366",

  ink: "#1C1C1C",
  muted: "#6B6B6B",
  mutedLight: "#9CA3AF",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F5",
  border: "#E8E8E8",
  borderLight: "#F0F0F0",
} as const;

export type ColorToken = keyof typeof colors;
