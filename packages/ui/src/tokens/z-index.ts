/** Z-index scale — layering from the legacy screens. */
export const zIndex = {
  base: 0,
  header: 30,
  bottomNav: 40,
  sticky: 50,
  overlay: 200,
  drawer: 250,
  dialog: 300,
  toast: 400,
} as const;

export type ZIndexToken = keyof typeof zIndex;
