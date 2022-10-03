import Display from "../display";

/**
 * Represents an arrangment of Displays in 2D space.
 */
type Layout = readonly DisplayPosition[];

/**
 * Represents a Display in 2D space.
 */
type DisplayPosition = {
  display: Display,
  position: Position
};

/**
 * Represents an (x,y) coordinate in 2D space.
 */
type Position = readonly [number, number];

export default Layout;