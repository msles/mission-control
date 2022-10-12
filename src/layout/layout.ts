import Display from "../display";

/**
 * Represents an arrangment of Displays in 2D space.
 */
type Layout = readonly DisplayPosition[];

/**
 * Determine the dimensions of the smallest rectangle that would enclose all displays
 * in the given layout.
 */
export function layoutBounds(layout: Layout): readonly [number, number] {
  const width = Math.max(
    ...layout.map(({display, position}) => position[0] + display.resolution[0]),
    0
  );
  const height = Math.max(
    ...layout.map(({display, position}) => position[1] + display.resolution[1]),
    0
  );
  return [width, height];
}

/**
 * Represents a Display in 2D space.
 * The origin is in the top-left.
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