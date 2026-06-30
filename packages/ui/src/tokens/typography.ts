/** Typography tokens — Poppins, with the legacy size/weight scale. */
export const typography = {
  fontFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif',
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  /** font-size / line-height */
  sizes: {
    "2xs": ["9px", "1.3"],
    xs: ["11px", "1.4"],
    sm: ["13px", "1.4"],
    base: ["14px", "1.5"],
    md: ["15px", "1.4"],
    lg: ["17px", "1.3"],
    xl: ["20px", "1.2"],
    "2xl": ["22px", "1.15"],
    "3xl": ["28px", "1.1"],
  },
} as const;

export type FontWeight = keyof typeof typography.weights;
export type FontSize = keyof typeof typography.sizes;
