# Bowling Mechanics

- Phone displays a virtual Wii remote UI with buttons
- Player holds the button while swinging the phone (motion samples buffered on the phone, not streamed)
- Player releases the button to release the ball
- Phone computes throw parameters (speed, angle, spin) and sends them to the player's own desktop, which broadcasts them to the lobby
- Every client simulates the same throw locally with deterministic Rapier, so all players see the ball rolling down the lane in real time with identical results
- Pins knocked down realistically using Rapier physics
- Strike and spare animations, plus matching sound effects
- Results screen shows player rankings from first to last after the game ends
- Only the host can choose to play again or quit
