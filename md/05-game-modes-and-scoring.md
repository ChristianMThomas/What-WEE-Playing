# Bowling Game Modes & Scoring

## Game Modes
- **Swift Play** — 5 frames
- **Standard** — 10 frames

## Scoring Systems
- **Standard scoring** — actual bowling rules, strikes/spares carry over to next frame
- **Basic scoring** — just counts pins knocked down per frame, no carry-over

Players can mix and match (e.g., Swift Play + Basic, Standard + Standard, etc.)

## Final Frame
- With Standard scoring, the **last frame** (frame 5 in Swift Play, frame 10 in Standard) follows real 10th-frame rules: a strike or spare earns bonus rolls (up to 3 rolls in the frame)
- With Basic scoring, there are no bonuses, so the last frame is a normal 2-roll frame

## Implementation
- Scores are never stored per frame; only rolls are stored (see 09-database-schema.md)
- One pure scoring function takes (rolls, frame count, scoring mode) and returns per-frame and running totals; used by the live scoreboard, results screen, and final total
- Frame count and scoring mode stay decoupled: "last frame" means `frameCount`, never a hardcoded 10
