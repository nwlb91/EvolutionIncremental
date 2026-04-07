# Evolution Incremental

An incremental web game about breeding combat units.

## Architecture

```
src/
  engine/        # Pure TypeScript game logic — no React, no DOM, no browser APIs
  persistence/   # Save/load behind a swappable SaveAdapter interface
  ui/            # React components — imports engine/, never the reverse
  App.tsx        # Root component wiring UI to engine
```

### Why this structure?

**Portability.** The `engine/` folder is a standalone TypeScript library with zero browser dependencies. It can run in Node, Deno, a web worker, or be compiled to another target. All game logic lives here so porting to a new renderer (Canvas, Unity via WASM, terminal) means rewriting `ui/` only.

**Testability.** Every engine module is unit-testable with Vitest in Node. No jsdom, no browser shims. The engine uses a seedable RNG (`engine/rng.ts`) so tests are deterministic.

**Separation of concerns.** React handles display and user input. The engine handles rules, combat resolution, breeding, and economy. The persistence layer is behind an interface (`SaveAdapter`) so localStorage can be swapped for IndexedDB, cloud sync, or a file system.

### Key design decisions

- **All randomness** flows through `engine/rng.ts` (mulberry32 PRNG). `Math.random()` is never called outside that file.
- **All balance constants** live in `engine/balance.ts` — one file to tune the entire game.
- **Combat** is tick-based with a fixed timestep (50ms), decoupled from render frame rate. The resolver returns a full tick log that the UI can replay or skip.
- **Combatant interface** is separate from Unit, so squad combat can be added without rewriting the resolver.
- **State management** uses a plain reducer (`engine/state.ts`) — framework-agnostic, could be driven by Redux, Zustand, or a game loop.

### Spheres & mutations

Spheres are permanent collectible items that replaced the rental market. Each Sphere references a mutation from the registry (`engine/mutations.ts`) and has a tier.

- **Prospecting** (`engine/spheres.ts`): spend money to discover Spheres. Budget controls a continuous rarity distribution (common → rare → legendary). Result count scales with budget.
- **Using a Sphere**: spawns a carrier unit with baseline stats and the Sphere's mutation pre-applied at the bottom of the tier's value range. Carriers are deliberately weak — introducing a new mutation comes with a stat regression cost that must be bred out.
- **Merging**: two same-mutation same-tier Spheres → one Sphere at tier+1. Higher tiers scale the mutation's value range linearly.
- **Mutation inheritance** (`engine/breeding.ts`): mutations are recessive. Single-parent inheritance has low probability; both parents sharing a mutation gives high probability. When parents have different tiers, the child rolls 50/50 which tier to inherit — downgrades are possible and intentional.
- **Mutation registry** (`engine/mutations.ts`): defines all mutations with id, name, rarity pool, base value range, and optional maxTier. Types live in `engine/units.ts` (`MutationDefinition`, `MutationInstance`, `Sphere`).
- **Save versioning**: `SAVE_VERSION` in `engine/state.ts` is bumped on schema changes; old saves are discarded on load mismatch.

## Development

```bash
npm install
npm run dev      # Start dev server
npm test         # Run engine tests
npm run build    # Production build
```

## Deployment

Configured for Netlify. Push to deploy, or:

```bash
npx netlify deploy --prod
```

## Tech stack

- Vite + TypeScript + React
- Vitest for testing
- No external game libraries — intentionally minimal for portability
