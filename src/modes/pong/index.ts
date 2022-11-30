import { createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Mode, { Frame, ModeBuilder } from "../mode";
import WebAPI from "../../web/api";
import { Privileges, User } from "../../users";
import Layout, {layoutBounds, LayoutStateReadable, normalizeLayout} from "../../layout";
import { z } from "zod";
import { acceptAny, createZodParser } from "../../web/parse";
import GameState from "./game-state";
import Channel from "../../web/channel";
import { chunk, delayMilliseconds } from "./utils";

const PaddleMoveCommand = z.number().gte(0).lte(1);
type PaddleMoveCommand = z.infer<typeof PaddleMoveCommand>;

const JoinGameCommand = z.union([z.literal("player"), z.literal("observer")]);
type JoinGameCommand = z.infer<typeof JoinGameCommand>;

class PongMode implements Mode {

  private readonly layout: LayoutStateReadable;
  private readonly games: Map<User, GameRunner>;
  private readonly players: Set<User>;
  private readonly observers: Set<User>;
  private readonly runners: Set<GameRunner>;

  constructor(layout: LayoutStateReadable) {
    this.layout = layout;
    this.games = new Map();
    this.players = new Set();
    this.observers = new Set();
    this.runners = new Set();
  }

  start() {
    // Nothing to do
  }

  stop() {
    // Stop all active games and clear out users.
    this.runners.forEach(runner => runner.stop());
    this.runners.clear();
    this.games.clear();
    this.players.clear();
    this.observers.clear();
  }

  private startGame(): void {
    this.runTournament(Array.from(this.players), 1)
      .then(winner => winner ? console.log('Winner!') : console.log('Tournament exited.'))
      .catch(err => console.warn('Failed to run tournament to completion', err))
      .finally(() => this.players.clear());
  }

  private async runTournament(players: readonly User[], displaysPerGame: number): Promise<User|undefined> {
    if (players.length <= 1) {
      return players[0];
    }
    console.log('Running round with', players.length, 'players and', displaysPerGame, 'displays per game.');
    const layouts = chunk(this.layout.get(), displaysPerGame);
    console.dir(layouts);
    const runners = this.createGames(layouts, players, Array.from(this.observers));
    console.log('Number of games:', runners.length);
    const winners = await this.runGames(runners);
    return await this.runTournament(winners, displaysPerGame + 1);
  }

  private createGames(layouts: readonly Layout[], players: readonly User[], observers: readonly User[]): GameRunner[] {
    const numGames = Math.min(Math.floor(players.length / 2), layouts.length);
    if (numGames === 0) {
      return [];
    }
    const observerGroups = chunk(Array.from(observers), numGames);
    return layouts
      .slice(0, numGames)
      .map((layout, index) => {
        const [p1, p2] = players.slice(index, index + 2);
        return new GameRunner([p1, p2], new Set(observerGroups[index]), layout);
      });
  }

  private async runGames(runners: GameRunner[]): Promise<readonly User[]> {
    runners.forEach(runner => {
      this.runners.add(runner);
      runner.players.forEach(player => this.games.set(player, runner));
      runner.observers.forEach(observer => this.games.set(observer, runner));
    });
    const results = await Promise.allSettled(runners.map(runner => runner.start()));
    await delayMilliseconds(1_000);
    this.runners.clear();
    const winners: User[] = [];
    results.forEach(res => res.status === 'fulfilled' && winners.push(res.value));
    return winners;
  }

  private stopGame(game: GameRunner): void {
    game.stop();
    this.runners.delete(game);
    const players = Array.from(this.games.entries()).filter(([player, g]) => g === game);
    for (const [player] of players) {
      this.games.delete(player);
    }
  }

  defineApi(): WebAPI {
    return {
      channels: [
        this.joinGameChannel(),
        this.startGameChannel(),
        this.stopGameChannel(),
        this.paddleChannel()
      ],
      endpoints: []
    }
  }

  private joinGameChannel(): Channel<JoinGameCommand> {
    return {
      name: 'join',
      privileges: Privileges.Player,
      parse: createZodParser(JoinGameCommand),
      onReceived: (type, user) => {
        if (type === 'player' && !this.observers.has(user)) {
          this.players.add(user);
        }
        else if (type === 'observer' && !this.players.has(user)) {
          this.observers.add(user);
        }
      }
    }
  }

  private startGameChannel(): Channel<undefined> {
    return {
      name: 'start',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: () => this.startGame()
    }
  }

  private stopGameChannel(): Channel<undefined> {
    return {
      name: 'stop',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: (_, user) => {
        const game = this.games.get(user);
        if (game) {
          this.stopGame(game);
        }
      }
    }
  }

  private paddleChannel(): Channel<PaddleMoveCommand> {
    return {
      name: 'paddle',
      privileges: Privileges.Player,
      parse: createZodParser(PaddleMoveCommand),
      onReceived: (y, user) => {
        this.games.get(user)?.movePaddle(user, y);
      }
    }
  }

  render(): Frame {
    const frame: Frame = new Map();
    this.runners.forEach(runner => {
      for (const [display, image] of runner.render().entries()) {
        frame.set(display, image);
      }
    });
    return frame;
  }

  static builder(): ModeBuilder {
    return (broadcast, layoutState) => new PongMode(layoutState);
  }

}

class GameRunner {

  public readonly players: readonly [User, User];
  public readonly observers: Set<User>;
  private readonly game: GameState;
  private readonly size: readonly [number, number];
  private readonly layout: Layout;
  private readonly canvas: Context2D;
  private stopRunning: () => void;

  constructor(players: readonly [User, User], observers: Set<User>, layout: Layout) {
    this.players = players;
    this.observers = observers;
    this.layout = normalizeLayout(layout);
    this.size = layoutBounds(this.layout);
    this.game = new GameState(this.players, this.observers, this.size);
    this.canvas = createCanvas(this.size[0], this.size[1]).getContext('2d');
    this.stopRunning = () => {};
  }

  /**
   * Start the game loop. This method restarts the game loop
   * if it was already started.
   */
  start(): Promise<User> {
    this.stopRunning();
    return new Promise((resolve, reject) => {
      const tickInterval = setInterval(() => {
        const winner = this.game.tick(33);
        if (winner) {
          clearInterval(tickInterval);
          resolve(winner);
        }
      }, 33);
      const obstacleInterval = setInterval(() => {
        this.game.placeObstacle(Math.random(), Math.random());
      }, 4_000);
      this.stopRunning = () => {
        clearInterval(obstacleInterval);
        clearInterval(tickInterval);
        reject(new Error("Game interrupted"));
      };
    });
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this.stopRunning();
  }

  /**
   * Move the player's paddle if it within the bounds of the board size.
   */
  movePaddle(player: User, y: number) {
    this.game.movePaddle(player, y);
  }

  /**
   * Render the game using the layout this runner was created with.
   */
  render(): Frame {
    this.game.render(this.canvas);
    const frame: Frame = new Map();
    for (const {display, position} of this.layout) {
      frame.set(display, this.canvas.getImageData(
        position[0], position[1], display.resolution[0], display.resolution[1]
      ));
    }
    return frame;
  }

}

export default PongMode.builder();
