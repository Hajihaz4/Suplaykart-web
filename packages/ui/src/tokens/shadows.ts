/** Shadow tokens — from the legacy card/nav/brand elevations. */
export const shadows = {
  card: "0 1px 6px rgba(0,0,0,.06)",
  pop: "0 4px 12px rgba(0,0,0,.10)",
  nav: "0 -4px 20px rgba(0,0,0,.05)",
  brand: "0 4px 12px rgba(12,131,31,.22)",
  sheet: "0 -6px 20px rgba(0,0,0,.06)",
} as const;

export type ShadowToken = keyof typeof shadows;
