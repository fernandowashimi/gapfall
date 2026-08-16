# Gapfall

A game where a packed stream of generated lines falls toward the player. Each line has one empty slot — fill it by launching shots upward before the stream reaches the death line.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

| Input                | Action                          |
| -------------------- | ------------------------------- |
| `A` `S` `K` `L`      | Launch a shot in columns 1–4    |
| Tap / click a column | Same as the matching key        |
| Tab away / blur      | Pause (resume from the overlay) |

Survive as long as you can. Score rises as you clear lines; the local high score is stored in the browser.

## How it works

- A **continuous stream** of four-column rows falls from the top. Each **generated line** has three filled cells and one gap.
- Shots travel upward at a fixed speed, independent of fall speed.
- Completing the **frontline** (lowest unresolved row) removes it; clearances can **cascade**. Gaps stay empty — the board does not compact downward.
- **Fall speed** starts at one block-height per second and ramps linearly with playing time until a speed cap, so longer runs get harder without opening gaps in the stream.

Domain terms and decisions live in [`CONTEXT.md`](./CONTEXT.md) and [`docs/adr/`](./docs/adr/).

## Stack

- **React** shell (HUD, overlays, input wiring)
- **Canvas 2D** renderer
- Pure **TypeScript** game core (`src/game/game-core.ts`) — no React, Canvas, or DOM — so rules stay unit-testable

```
src/
├── game/          # Simulation: state, commands, scoring
├── ui/            # React app + Canvas draw loop + sprites
└── assets/        # Sprite sheets
```

## Scripts

| Command            | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Local Vite dev server                    |
| `npm run build`    | Typecheck and production build → `dist/` |
| `npm test`         | Vitest in watch mode                     |
| `npm run test:run` | Vitest once (CI-friendly)                |

## Requirements

- Node.js 20+ recommended
- npm (lockfile is committed)

## Contributing notes

Agent/workflow conventions for this repo are in [`AGENTS.md`](./AGENTS.md). Issues are tracked as markdown under `.scratch/<feature>/`.
