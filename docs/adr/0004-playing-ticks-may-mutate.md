# Playing ticks may mutate GameState

A quiet playing tick was allocating a new object per Generated Line every animation frame, which showed up as steady chop on a mid-range Android in Chrome. `advanceGame` may now move existing rows and Shots in place so that tick can hold 60 Hz under Canvas 2D.

Copy-on-write every frame was rejected because it _is_ the cost. WebGL was rejected because it does not remove that main-thread allocation, and ADR-0002 already keeps Canvas 2D. Callers that need a previous board (cue diffs) snapshot first. `launchBlock`, pause, and resume stay copy-on-write. Pause, game-over, and a later ranking snapshot remain a plain `GameState`.
