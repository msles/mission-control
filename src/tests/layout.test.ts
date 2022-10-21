import { LayoutState, layoutBounds } from "../layout";
import { matrix64x64 } from "./examples/display.examples";
import { emptyLayout, one64x64, two64x64sHoriz, two64x64sVert } from "./examples/layout.examples";

test("layout bounds", () => {
  expect(layoutBounds(emptyLayout)).toEqual([0, 0]);
  expect(layoutBounds(one64x64)).toEqual([64, 64]);
  expect(layoutBounds(two64x64sHoriz)).toEqual([64*2, 64]);
  expect(layoutBounds(two64x64sVert)).toEqual([64, 64*2]);
});

test("layout state updates", () => {
  const state = new LayoutState(emptyLayout);
  const listener = jest.fn();
  state.onLayoutChanged(listener);
  state.addDisplay(matrix64x64, [32, 32]);
  expect(listener).toBeCalledWith([{display: matrix64x64, position: [32, 32]}]);
  state.addDisplay({...matrix64x64}, [32+64, 32+64]);
  state.moveDisplay(matrix64x64, [0, 0]);
  expect(listener).toBeCalledWith([
    {display: matrix64x64, position: [0, 0]},
    {display: matrix64x64, position: [96, 96]}
  ]);
});