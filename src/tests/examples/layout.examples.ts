import Layout from "../../layout";
import { matrix64x64 } from "./display.examples";

export const emptyLayout: Layout = [];

export const one64x64: Layout = [
  {display: matrix64x64, position: [0, 0]}
]

export const two64x64sHoriz: Layout = [
  {display: matrix64x64, position: [0, 0]},
  {display: {...matrix64x64}, position: [64, 0]}
]

export const two64x64sVert: Layout = [
  {display: matrix64x64, position: [0, 0]},
  {display: {...matrix64x64}, position: [0, 64]}
]