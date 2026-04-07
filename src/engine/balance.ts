// ── All tunable game constants live here ──

// Breeding
export const BREEDING_DURATION_MS = 30_000;
export const BREEDING_VARIATION_FACTOR = 0.01; // ±1% multiplicative noise per stat
export const MAX_CONCURRENT_BREEDS = 1;

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

// Rental market
export const RENTAL_SEARCH_BASE_COST = 20;
export const RENTAL_BATTLE_FLAT_FEE = 5;
export const RENTAL_BATTLE_WINNINGS_CUT = 0.25; // 25% of winnings taken as fee
export const RENTAL_STAT_BUDGET_MULTIPLIER = 0.8; // how much budget converts to stat quality (0-1 scale)
export const RENTAL_SEARCH_MIN_RESULTS = 1;
export const RENTAL_SEARCH_MAX_RESULTS = 5;

// Starting unit stats
export const STARTER_DAMAGE = 1;
export const STARTER_HP = 10;
export const STARTER_ATTACK_RATE_MS = 2000;

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
