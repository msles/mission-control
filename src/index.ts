import MissionControl from "./mission-control";
import DrawMode from "./modes/draw";

new MissionControl([
  ["draw", DrawMode]
]).start();