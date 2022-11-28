import { chunk } from "../modes/pong/utils";

test('chunk', () => {
  expect(chunk([1, 2, 3, 4], 1)).toEqual([[1], [2], [3], [4]]);
  expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  expect(chunk([1, 2, 3, 4], 3)).toEqual([[1, 2, 3], [4]]);
  expect(chunk([1, 2, 3, 4], 4)).toEqual([[1, 2, 3, 4]]);
  expect(chunk([1, 2, 3, 4], 5)).toEqual([[1, 2, 3, 4]]);
});