# Concept

- It's a simple 2d driving game based on the Phaser 3 library.
- The app follows Vite project conventions (i.e. uses src/ directory for source code, src/assets/ for assets, src/components/ for components, etc.)
- There's a simple Vite based backend API serving and persisting data (mostly - JSON files)

## Tech stack

- React
- Vite
- Tailwind CSS
- Phaser 3
- Vite
- TypeScript

## Architecture

- There are two main features: Game and Track Builder.
- There's a top-level navigation bar with two links - Game and Track Builder.
- There's a client-side router with two routes - /game and /track-builder.
- There's a compatibility of types between game and track builder (i.e. same track definition is used for both)

## Track Builder

1) You can draw tracks by using three tools - outer border, inner border, car start point.
2) Borders are smoothed using cubic bezier curves.
3) You can save tracks to a file (backend API accepts track definition and stores it in a file)
4) Each track has a name.
5) You apply points by single-clicking. To complete outline, you double click and the process is done.

## Game

1) For now there's only full-screen default track.
2) Tracks are returned from backend API and displayed in the game.
3) Switching tracks restarts the game.
