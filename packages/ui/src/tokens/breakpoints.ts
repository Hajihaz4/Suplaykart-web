/**
 * Breakpoints — mobile-first. The legacy app is a 390px phone shell; tablet and
 * desktop layouts are added in the rebuild. `tablet`/`desktop` map to Tailwind's
 * default `md`/`lg`, so components use `md:` / `lg:` variants.
 */
export const breakpoints = {
  mobile: "390px",
  tablet: "768px", // Tailwind `md`
  desktop: "1024px", // Tailwind `lg`
} as const;

export type Breakpoint = keyof typeof breakpoints;
