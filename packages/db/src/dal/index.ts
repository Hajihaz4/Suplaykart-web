// Data-access layer (Phase-1B) — pure typed queries over the schema.
// Each function takes a `DB` instance (dependency injection) so it works with
// the app singleton and with isolated test/verification connections.
export * from "./health";
export * from "./users";
export * from "./store";
