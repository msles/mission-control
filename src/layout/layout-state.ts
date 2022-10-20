import Display from "../display";
import { DisplayType } from "../display/display";
import Layout, { Position } from "./layout";

/**
 * A mutable layout state where displays can be added, removed, and moved.
 */
export interface LayoutStateWritable extends LayoutStateReadable {

  /**
   * Add a display to the layout at the given position.
   */
  addDisplay(display: Display, position: Position): void;

  /**
   * Remove the given display from the layout.
   */
  removeDisplay(display: Display): void;

  /**
   * Change the position of the given display to the given position.
   */
  moveDisplay(display: Display, position: Position): void;

}

/**
 * An observable layout state that notifies subscribers of layout changes.
 */
export interface LayoutStateReadable {

  /**
   * Subscribe the given handler to any future layout changes.
   */
  onLayoutChanged(handler: LayoutChangeHandler): LayoutChangeUnsubscribe;

  get(): Layout;

}

type LayoutChangeHandler = (layout: Layout) => void;
type LayoutChangeUnsubscribe = () => void;

/**
 * Manages the current display layout.
 */
class LayoutState implements LayoutStateWritable {

  private layout: Layout;
  private readonly handlers: Set<LayoutChangeHandler>;

  constructor(layout: Layout) {
    this.layout = layout;
    this.handlers = new Set();
  }

  addDisplay(display: Display, position: Position): void {
      this.updateLayout([...this.layout, {display, position}]);
  }

  removeDisplay(displayToRemove: Display<DisplayType>): void {
      this.updateLayout(this.layout.filter(({display}) => display !== displayToRemove));
  }

  moveDisplay(displayToMove: Display<DisplayType>, to: Position): void {
      this.updateLayout(this.layout.map(({display, position}) => display === displayToMove ?
        {display, position: to} : {display, position}));
  }

  private updateLayout(newLayout: Layout) {
    this.layout = newLayout;
    Array.from(this.handlers)
      .forEach(handler => handler(this.layout));
  }

  onLayoutChanged(handler: LayoutChangeHandler): LayoutChangeUnsubscribe {
      this.handlers.add(handler);
      return () => this.handlers.delete(handler);
  }

  get(): Layout {
    return this.layout;
  }

}

/**
 * A readable layout state that only emits changes when the condition
 * evaluates to true.
 */
export class LayoutStateConditional implements LayoutStateReadable {

  private readonly source: LayoutStateReadable;
  private readonly condition: () => boolean

  constructor(source: LayoutStateReadable, condition: () => boolean) {
    this.source = source;
    this.condition = condition;
  }

  onLayoutChanged(handler: LayoutChangeHandler): LayoutChangeUnsubscribe {
    return this.source.onLayoutChanged((...args) => {
      if (this.condition()) {
        handler(...args);
      }
    });
  }

  get() {
    return this.source.get();
  }

}

export default LayoutState;