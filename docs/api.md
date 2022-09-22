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

Some ideas for the data present in this API (shown in TypeScript):

```ts
/**
 * Represents lighting device.
 * @example A 64x64 LED matrix
 * const matrix = {
 *  type: DisplayType.Matrix,
 *  resolution: [64, 64]
 * }
 */
type Display<T extends DisplayType> = {
  type: T, // is it a matix, led strip, or something else?
  resolution: [number, number] // [width, height] in pixels
}

/**
 * The various types of lighting devices.
 */
enum DisplayType {
  Matrix, // An LED Matrix
  Strip   // A strip of LEDs (1xN)
}

/**
 * A URL used to connect to a RIST video stream.
 * Has the format rist://SERVER:PORT.
 */
type VideoStreamLink = string;

/**
 * Commands sent by mission control to control the lighting device.
 * @example A command to set brightness to 25%
 * const brightness25 = {
 *  type: ControlCommandType.Brightness
 *  level: 0.25
 * }
 * @example A command to power off the device
 * const poweroff = {
 *  type: ControlCommandType.PowerOff
 * }
 */
type ControlCommand =
    BrightnessCommand
  | PowerOffCommand

/**
 * The various types of control commands.
 */
enum ControlCommandType {
  Brightness, // change the brightness of the display
  PowerOff // turn of the device completely (as an example)
}

/**
 * A command for changing the display brightness.
 */
interface BrightnessCommand extends BaseCommand<ControlCommandType.Brightness> {
  level: number // brightness level between 0 and 1.
}

interface PowerOffCommand extends BaseCommand<ControlCommandType.PowerOff> {};

interface BaseCommand<T extends ControlCommandType> {
  type: T
}
```