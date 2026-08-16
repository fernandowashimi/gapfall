# Game core separated from Canvas renderer and React shell

Rules must stay simulable without the UI. A game core with no React, Canvas, or network owns state and commands; Canvas 2D draws that state; React owns screens, HUD, input, and pause.

Driving the loop through React re-renders, representing blocks as components, or starting on a game engine / WebGL were rejected: they couple rules to presentation and make the simulation hard to test or serialize.
