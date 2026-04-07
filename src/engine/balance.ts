// ── All tunable game constants live here ──

// Breeding
export const BREEDING_DURATION_MS = 30_000;
export const BREEDING_VARIATION_FACTOR = 0.01; // ±1% multiplicative noise per stat
export const MAX_CONCURRENT_BREEDS = 1;

// Mutation inheritance (breeding)
export const MUTATION_SINGLE_PARENT_PROBABILITY = 0.1; // 10% chance child inherits when only one parent has it
export const MUTATION_BOTH_PARENTS_PROBABILITY = 0.9;  // 1 - SINGLE_PARENT — used when both parents carry it

// Stat natural limits (hard caps for breeding)
export const STAT_MIN_DAMAGE = 1;
export const STAT_MAX_DAMAGE = 10;
export const STAT_MIN_HP = 10;
export const STAT_MAX_HP = 100;
export const STAT_MIN_ATTACK_RATE_MS = 200; // fastest possible (lower = faster)
export const STAT_MAX_ATTACK_RATE_MS = 2000; // slowest possible

// Combat
export const COMBAT_TICK_MS = 50; // fixed timestep for battle simulation
export const COMBAT_MAX_TICKS = 10_000; // safety cap to prevent infinite battles

// Economy
export const STARTING_MONEY = 100;
export const ENEMY_BASE_REWARD = 10; // reward = base + (enemyIndex * scaling)
export const ENEMY_REWARD_SCALING = 5;

// Starting unit stats
export const STARTER_DAMAGE = 1;
export const STARTER_HP = 10;
export const STARTER_ATTACK_RATE_MS = 2000;

// Carrier baseline stats (deliberately weak — Sphere-spawned units)
export const CARRIER_DAMAGE = 1;
export const CARRIER_HP = 10;
export const CARRIER_ATTACK_RATE_MS = 2000;

// ── Spheres & Prospecting ──

// Rarity pool weights at zero budget (cheap prospect)
// These define the baseline probability of rolling each rarity.
// Budget shifts weight toward rarer pools via PROSPECT_BUDGET_RARE_SHIFT.
export const PROSPECT_BASE_WEIGHT_COMMON    = 0.85;
export const PROSPECT_BASE_WEIGHT_RARE      = 0.13;
export const PROSPECT_BASE_WEIGHT_LEGENDARY = 0.02;

// How much each unit of budget shifts probability toward rarer pools.
// At budget B, common weight = base - B * shift, rare/legendary gain proportionally.
export const PROSPECT_BUDGET_RARE_SHIFT = 0.002; // per dollar of budget

// Prospect result count: floor(1 + budget * multiplier), capped
export const PROSPECT_RESULT_COUNT_MULTIPLIER = 0.02; // 1 Sphere per $50 of budget
export const PROSPECT_RESULT_COUNT_MIN = 1;
export const PROSPECT_RESULT_COUNT_MAX = 10;

// Mutation value: tier scales the base range linearly (tier * baseRange)
// Carrier spawns at the bottom of the tier's value range (deterministic).

// Enemy ladder
export const ENEMY_COUNT = 10;
export const ENEMY_BASE_DAMAGE = 1;
export const ENEMY_DAMAGE_SCALING = 1; // 1..10 across 10 tiers
export const ENEMY_BASE_HP = 10;
export const ENEMY_HP_SCALING = 10; // 10..100 across 10 tiers
export const ENEMY_BASE_ATTACK_RATE_MS = 2000;
export const ENEMY_ATTACK_RATE_DECAY = 200; // 2000..200 across 10 tiers

// Combat playback (UI-side, but balance-tunable)
export const COMBAT_PLAYBACK_SPEED = 1; // 1 = real-time, 2 = 2x speed, etc.

// Persistence
export const AUTOSAVE_INTERVAL_MS = 5_000;
