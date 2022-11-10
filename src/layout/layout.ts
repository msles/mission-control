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

export function normalizeLayout(layout: Layout): Layout {
  const closest = closestToOrigin(layout);
  if (!closest) {
    return layout;
  }
  const [x, y] = closest;
  return layout.map(({display, position}) => ({display, position: [position[0] - x, position[1] - y]}));
}

function closestToOrigin(layout: Layout): Position | undefined {
  if (layout.length === 0) {
    return undefined;
  }
  let closestPos = layout[0].position;
  let closestDist = squaredDist(layout[0].position, [0, 0]);
  for (const {position} of layout.slice(1)) {
    const dist = squaredDist(position, [0, 0]);
    if (dist < closestDist) {
      closestPos = position;
      closestDist = dist;
    }
  }
  return closestPos;
}

function squaredDist(posA: Position, posB: Position): number {
  return Math.pow(posA[0] - posB[0], 2) + Math.pow(posA[1] - posB[1], 2);
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
export type Position = readonly [number, number];

export default Layout;