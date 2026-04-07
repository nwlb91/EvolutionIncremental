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
register({ id: "thick_hide",   name: "Thick Hide",   description: "Toughened skin reduces incoming damage by a percentage.",                    rarity: "common", baseRange: [0.001, 0.01] });
register({ id: "quick_twitch", name: "Quick Twitch", description: "Faster muscle reflexes reduce attack cooldown by a percentage.",             rarity: "common", baseRange: [0.001, 0.01] });
register({ id: "iron_jaw",     name: "Iron Jaw",     description: "A reinforced jaw increases maximum HP by a percentage.",                     rarity: "common", baseRange: [0.001, 0.01] });
register({ id: "sharp_claws",  name: "Sharp Claws",  description: "Razor-sharp claws increase base damage by a percentage.",                    rarity: "common", baseRange: [0.001, 0.01] });
register({ id: "endurance",    name: "Endurance",    description: "Superior stamina grants a percentage boost to both HP and damage.",           rarity: "common", baseRange: [0.001, 0.01] });

// Rare pool
register({ id: "regeneration", name: "Regeneration", description: "Passive healing restores a percentage of max HP each combat tick.",           rarity: "rare", baseRange: [0.001, 0.01] });
register({ id: "berserk",      name: "Berserk",      description: "Damage increases by a percentage as HP drops below half.",                   rarity: "rare", baseRange: [0.001, 0.01] });
register({ id: "fortify",      name: "Fortify",      description: "Each hit taken reduces subsequent damage by a stacking percentage.",          rarity: "rare", baseRange: [0.001, 0.01] });

// Legendary pool
register({ id: "apex_predator", name: "Apex Predator", description: "All stats gain a percentage bonus. The ultimate generalist mutation.", rarity: "legendary", baseRange: [0.001, 0.01], maxTier: 5 });
register({ id: "phoenix_blood", name: "Phoenix Blood", description: "On defeat, revive once with a percentage of max HP restored.",        rarity: "legendary", baseRange: [0.001, 0.01], maxTier: 5 });
