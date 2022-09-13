# API
The API will need to serve the following purposes:
* allows users to interact with the active mode (moving game pieces, drawing, etc.); we'll call these users "players"
* allow administrators to configure the layout of the lighting devices
* allow lighting devices to report sensor data (stretch goal)
* send control commands to the lighting devices (e.g. change brightness)
* stream what's being shown on the lighting devices (video stream)
  * we might need a separate mechanism to show this to users on the web app

So, splitting up the API into sections:

## Player API
* How users see which lighting devices are connected
* How players interact with the active mode
  * Joining the game
  * Moving game pieces
  * Drawing
* How players receive updates on the state of the active mode (if applicable)
  * Notify player that they lost

## Administrator API
* How admins change the layout of lighting devices
* How admins switch modes

## Lighting API
* How lighting devices connect to the control server
* How lighting devices receive info on what to display
* How players receive info on what's currently being displayed (may depend on mode)

```
┌─────────┐          ┌─────────┐
│ Mission │          │Lighting │
│ Control │          │ Device  │
└┬────────┘          └────────┬┘
 │    establish connection    │
 ◀─────send device type, ─────┤
 │         resolution         │
 │                            │
 ├────send link to video ─────▶
 │          stream            │
 ├───┐                        │
 │   ◀──────connect to ───────┤
 │   │     video stream       │
 │   │                        │
 │   ├────send frames of ─────▶
 │   │         video          │
 │   │                        │
 ◀───┼────send sensor ────────┤
 │   │       data             │
 │   │                        │
 ├───┼───send control ────────▶
 │   │     commands           │
 ▼   ▼                        ▼
```