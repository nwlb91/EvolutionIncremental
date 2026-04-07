// ── All tunable game constants live here ──

// Breeding
export const BREEDING_DURATION_MS = 30_000;
export const BREEDING_VARIATION_FACTOR = 0.05; // ±5% multiplicative noise per stat
export const MAX_CONCURRENT_BREEDS = 1;

// Combat
export const COMBAT_TICK_MS = 50; // fixed timestep for battle simulation
export const COMBAT_MAX_TICKS = 10_000; // safety cap to prevent infinite battles

// Economy
export const STARTING_MONEY = 100;
export const ENEMY_BASE_REWARD = 10; // reward = base + (enemyIndex * scaling)
export const ENEMY_REWARD_SCALING = 5;

// Rental market
export const RENTAL_SEARCH_BASE_COST = 20;
export const RENTAL_BATTLE_FLAT_FEE = 5;
export const RENTAL_BATTLE_WINNINGS_CUT = 0.25; // 25% of winnings taken as fee
export const RENTAL_STAT_BUDGET_MULTIPLIER = 0.8; // how much budget converts to stat quality (0-1 scale)
export const RENTAL_SEARCH_MIN_RESULTS = 1;
export const RENTAL_SEARCH_MAX_RESULTS = 5;

// Starting unit stats
export const STARTER_DAMAGE = 10;
export const STARTER_HP = 100;
export const STARTER_ATTACK_RATE_MS = 1000; // 1 attack per second

// Enemy ladder
export const ENEMY_COUNT = 10;
export const ENEMY_BASE_DAMAGE = 8;
export const ENEMY_DAMAGE_SCALING = 4;
export const ENEMY_BASE_HP = 80;
export const ENEMY_HP_SCALING = 40;
export const ENEMY_BASE_ATTACK_RATE_MS = 1200;
export const ENEMY_ATTACK_RATE_DECAY = 50; // gets faster per tier (lower = faster)

// Persistence
export const AUTOSAVE_INTERVAL_MS = 5_000;
