# OpenCode Agents Instructions

Vanilla JavaScript/HTML5 Canvas project. Zero dependencies.

## Development & Verification
- **Run**: Open `index.html` directly or use `npx serve .`.
- **Verification**: No automated tests. Changes must be verified manually in the browser.
- **Tools**: No linting or formatting config is present. Follow existing style in `game.js`.

## Architecture
- `game.js`: Contains all game logic, physics, and rendering.
- **Canvas**: Fixed 800x600 resolution (`W`, `H` constants).
- **World**: Toroidal (wrap-around) space using `wrap(val, max)`.
- **Game Loop**: `requestAnimationFrame` with a delta time (`dt`) capped at 0.05s to prevent jumps.
- **State**: Global state variables: `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`.

## Implementation Details
- **Input**: Held keys are in `keys`. Single-press events (like Space) use `pressed(code)` to consume from `justPressed`.
- **Collisions**: Simple distance-based circle collisions (`dist(a, b) < radii`).
- **Ship**: Uses `invincible` timer (seconds) for post-spawn protection.
- **Asteroids**: Multi-size (3, 2, 1). Large ones `split()` into two smaller ones.
