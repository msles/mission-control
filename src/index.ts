import MissionControl from "./mission-control";
import DrawMode from "./modes/draw";
import PongMode from "./modes/pong";

new MissionControl([
  ["pong", PongMode],
  ["draw", DrawMode]
]).start()
  .then(() => console.log('mission control started.'))
  .catch(() => console.warn('failed to start mission control.'));