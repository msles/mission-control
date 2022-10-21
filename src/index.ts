import MissionControl from "./mission-control";
import DrawMode from "./modes/draw";

new MissionControl([
  ["draw", DrawMode]
]).start()
  .then(() => console.log('mission control started.'))
  .catch(() => console.warn('failed to start mission control.'));