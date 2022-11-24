import DrawMode, { PaintCommand } from "../modes/draw";
import { LayoutState } from "../layout";
import { one64x64 } from "./examples/layout.examples";
import Channel from "../web/channel";
import { Privileges, User } from "../users";
import { matrix64x64 } from "./examples/display.examples";

test("painting pixels", () => {
  const state = new LayoutState(one64x64);
  const broadcast = jest.fn();
  const mode = DrawMode(broadcast, state);
  const api = mode.defineApi();
  const paintChannel = api.channels.find(ch => ch.name === 'paint');
  const user = new User<unknown>(0, Privileges.Player);
  expect(paintChannel).not.toBeUndefined();
  // refine the type for testing
  const paint = paintChannel as Channel<PaintCommand>;
  // paint a red pixel at (0, 0)
  paint.onReceived({
    pixels: [[0, 0]],
    color: [255, 0, 0]
  }, user);
  const frame = mode.render(state.get());
  const images = Array.from(frame.values());
  expect(images).toHaveLength(1);
  expect(frame.get(matrix64x64)).not.toBeUndefined();
  const imageData = frame.get(matrix64x64)!;
  // Pixel at (0, 0) should be red (with alpha=255)
  expect(Array.from(imageData.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
});