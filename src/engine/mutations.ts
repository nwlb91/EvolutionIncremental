import type { MutationDefinition, MutationRarity } from "./units";

// ── Mutation registry ──

/** All known mutations, keyed by id. */
const MUTATION_REGISTRY: Map<string, MutationDefinition> = new Map();

function register(def: MutationDefinition): MutationDefinition {
  MUTATION_REGISTRY.set(def.id, def);
  return def;
}

/** Look up a mutation definition by id. Throws if not found. */
export function getMutation(id: string): MutationDefinition {
  const def = MUTATION_REGISTRY.get(id);
  if (!def) throw new Error(`Unknown mutation: ${id}`);
  return def;
}

/** All registered mutation definitions. */
export function allMutations(): MutationDefinition[] {
  return Array.from(MUTATION_REGISTRY.values());
}

/** All mutations in a given rarity pool. */
export function mutationsByRarity(rarity: MutationRarity): MutationDefinition[] {
  return allMutations().filter((m) => m.rarity === rarity);
}

// ── Placeholder mutation definitions ──
// These exist so prospecting has something to roll from.
// Effects are not implemented yet — only the registry structure matters.

// Common pool
register({ id: "thick_hide",   name: "Thick Hide",   rarity: "common",    baseRange: [0.001, 0.01] });
register({ id: "quick_twitch", name: "Quick Twitch", rarity: "common",    baseRange: [0.001, 0.01] });
register({ id: "iron_jaw",     name: "Iron Jaw",     rarity: "common",    baseRange: [0.001, 0.01] });
register({ id: "sharp_claws",  name: "Sharp Claws",  rarity: "common",    baseRange: [0.001, 0.01] });
register({ id: "endurance",    name: "Endurance",    rarity: "common",    baseRange: [0.001, 0.01] });

// Rare pool
register({ id: "regeneration", name: "Regeneration", rarity: "rare",      baseRange: [0.001, 0.01] });
register({ id: "berserk",      name: "Berserk",      rarity: "rare",      baseRange: [0.001, 0.01] });
register({ id: "fortify",      name: "Fortify",      rarity: "rare",      baseRange: [0.001, 0.01] });

// Legendary pool
register({ id: "apex_predator", name: "Apex Predator", rarity: "legendary", baseRange: [0.001, 0.01], maxTier: 5 });
register({ id: "phoenix_blood", name: "Phoenix Blood", rarity: "legendary", baseRange: [0.001, 0.01], maxTier: 5 });
