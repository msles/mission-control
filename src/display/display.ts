/**
 * Represents lighting device.
 * @example 
 * // A 64x64 LED matrix
 * const matrix = {
 *  type: DisplayType.Matrix,
 *  resolution: [64, 64]
 * }
 */
type Display<T extends DisplayType = DisplayType> = {
  id: DisplayID,
  type: T, // is it a matix, led strip, or something else?
  resolution: readonly [number, number] // [width, height] in pixels
}

/**
 * The various types of lighting devices.
 */
enum DisplayType {
  Matrix, // An LED Matrix
  Strip   // A strip of LEDs (1xN)
}

export type DisplayID = string;

export default Display;
export {DisplayType};