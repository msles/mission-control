import { User as U } from "../../users";
type Context2D = CanvasRenderingContext2D;

class GameState<User=U> {

  /**
   * STAGES:
   * 
   * 1. Setup (handled outside of GameState)
   * accumulate users (and assign roles, either player or observer)
   * assign users to games (starting with one game per display)
   * -> use layout.length on start to know how many games there should be
   * -> must be a power of 2
   * start the game (create the GameStates)
   * 
   * 2. Gameplay
   * players can move the paddle
   * observers can place obstacles
   * -> how often? may have to broadcast when a new obstacle can be placed
   * ---
   * the game state will know when a player scores a goal
   * after a set number of goals (or a timer), the game ends
   * 
   * 3. Game end
   * merge games by taking the winner of each (and merge all observers)
   * on the last game, we end the entire thing
   */

  private readonly players: Players<User>;
  private readonly observers: Set<User>;
  private readonly size: Vec;
  private readonly paddles: Map<User,Paddle>;
  private readonly balls: Set<Ball>;
  private readonly obstacles: Set<Block>;

  constructor(players: readonly [User, User], observers: Set<User>, size: Vec) {
    this.players = this.createPlayers(players);
    this.observers = observers;
    this.size = size;
    this.paddles = this.createPaddles(players);
    this.balls = new Set([this.createBall()]);
    this.obstacles = new Set([this.createObstacle()]);
  }

  private createPlayers(users: readonly [User, User]): Players<User> {
    return [
      new Player(users[0], 0),
      new Player(users[1], 0)
    ];
  }

  private createPaddles(players: readonly [User, User]): Map<User,Paddle> {
    const y = this.size[1] / 2;
    const width = this.size[0] / 32;
    const height = this.size[1] / 4;
    return new Map([
      [players[0], new Paddle([1, y], [width, height], false)],
      [players[1], new Paddle([this.size[0] - 1, y], [width, height], true)]
    ]);
  }

  private createBall(): Ball {
    const x = this.size[0] / 2;
    const y = this.size[1] / 2;
    return new Ball([x, y], Math.min(x, y) / 32);
  }

  private createObstacle(): Block {
    return new Block([48, 32], [4,4], true);
  }

  movePaddle(player: User, y: number): void {
    this.paddles.get(player)?.move(([x, _]) => [x, Math.floor(y * this.size[1])]);
  }

  placeObstacle(obstacle: Obstacle): void {
    
  }

  mergeGames(otherGame: GameState<User>): GameState<User> {
    // just combine the players and observers into a new game
    return this;
  }

  tick(delta: number): User | undefined {
    // TODO: advance the game by one step
    this.balls.forEach(ball => ball.tick(delta));
    Array.from(this.paddles.values()).forEach(paddle => {
      this.balls.forEach(ball => paddle.collideWith(ball))
    });
    this.balls.forEach(ball => ball.checkVerticalBounds(this.size[1], this.size[1]));
    this.balls.forEach(ball => ball.checkVerticalBounds(0, this.size[1]));
    //check horizontal bounds based on size of the canvas
    this.balls.forEach(ball => ball.checkHorizontalBounds(0, this.size[0], this.players[0]));
    this.balls.forEach(ball => ball.checkHorizontalBounds(this.size[0], this.size[0], this.players[1]));
    //Check obstacle collision
    Array.from(this.obstacles.values()).forEach(Block => {
      this.balls.forEach(ball => Block.collideWithObstacle(ball))
    });
    return this.players.find(player => player.reachedScore(5))?.user;
  }

  render(context: Context2D): void {
    context.fillStyle = 'black';
    context.fillRect(0, 0, this.size[0], this.size[1]);
    context.fillStyle = 'white';
    context.fillText(this.players[0].getScore(), this.size[0] / 2 - 15, 10, 6);
    context.fillText(this.players[1].getScore(), this.size[0] / 2 + 7, 10, 6);
    Array.from(this.paddles.values()).forEach(paddle => paddle.render(context));
    this.balls.forEach(ball => ball.render(context));
    this.obstacles.forEach(Block => Block.render(context));
  }

}

interface Entity {

  tick(delta: number): Entity;

  render(ctx: Context2D): void;

}

abstract class Entity2D implements Entity {

  protected position: Vec;

  constructor(position: Vec) {
    this.position = position;
  }

  tick(_delta: number): Entity {
    return this;
  }

  move(transformation: Transform<Vec>): this {
    this.position = transformation(this.position);
    return this;
  }

  abstract render(ctx: Context2D): void;

  static addVectors(vec1: Vec, vec2: Vec): Vec {
    return [vec1[0] + vec2[0], vec1[1] + vec2[1]];
  }

  static multiplyVec(vec: Vec, scalar: number): Vec {
    return [vec[0] * scalar, vec[1] * scalar];
  }

}

class Paddle extends Entity2D {

  private readonly size: Vec;
  private readonly side: boolean; // left=false, right=true

  constructor(position: Vec, size: Vec, side: boolean) {
    super(position);
    this.size = size;
    this.side = side;
  }

  render(ctx: Context2D): void {
    if (this.side) {
      ctx.fillStyle = 'red';
    }
    else {
      ctx.fillStyle = 'blue';
    }
    ctx.fillRect(
      this.position[0] - this.size[0]/2,
      this.position[1] - this.size[1]/2,
      this.size[0],
      this.size[1]
    );
  }

  
  private isCollidingWith(ball: Ball) {
    if (this.side) { // right
      return ball.rightPaddleCollision(this.position[0] - this.size[0]/2, this.position[1] - this.size[1] / 2, this.size[1]);
    }
    else { // left
      return ball.leftPaddleCollision(this.position[0] + this.size[0]/2, this.position[1] - this.size[1] / 2, this.size[1]);
    }
  }

  collideWith(ball: Ball) {
    if (this.isCollidingWith(ball)) {
      ball.transformVelocity(vel => [
        vel[0] * -1.06,
        vel[1]
      ]);
      //ball.changeXdir();
    }
  }

}

class Ball extends Entity2D {

  private velocity: Vec;
  private readonly radius: number;
  private xdir: boolean; //true = left, false = right
  private ydir: boolean; //true = up, false = down

  constructor(position: Vec, radius: number) {
    super(position);
    this.velocity = [-0.014, -.011]; //-0.01, 0 to start
    this.radius = radius;
    this.xdir = true;
    this.ydir = true;

  }

  render(ctx: Context2D): void {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.position[0], this.position[1], this.radius, 0, Math.PI * 2);
    ctx.fill();
    /*
    ctx.fillRect(
      this.position[0] - this.radius / 2,
      this.position[1] - this.radius / 2,
      this.radius * 2,
      this.radius * 2
    )*/
  }

  tick(delta: number): Entity {
      this.position = Entity2D.addVectors(
        this.position,
        Entity2D.multiplyVec(this.velocity, delta)
      );
      return this;
  }

  //Atempting to change so that it's in line with the paddle and not just its x position (this works for now)
  //I think the velocity check should be enough to distinguish when the checks are active
  leftPaddleCollision(x: number, y: number, size: number) {
    return ((this.position[0] - this.radius) <= x && (this.position[1] >= y && this.position[1] <= (y + size)) && this.velocity[0] < 0);
  }

  rightPaddleCollision(x: number, y: number, size: number) {
    return (this.position[0] + this.radius) >= x && ((this.position[1] >= y && this.position[1] <= (y + size)) && this.velocity[0] > 0);
  }

  //For it to collide it has to satisfy these requirements AND be on the right side of the block, or else infinitely collides after one collision
  obstHitRightSide(x: number, y: number, size: number, opposite: number) {
    return ((this.position[0] - this.radius) <= x && this.velocity[0] < 0 && (this.position[1] >= y && this.position[1] <= (y + size)) && (this.position[0] > opposite));
  }

  obstHitLeftSide(x: number, y: number, size: number, opposite: number) {
    return (this.position[0] + this.radius) >= x && this.velocity[0] > 0 && ((this.position[1] >= y && this.position[1] <= (y + size))) && (this.position[0] < opposite);
  }

  obstHitTop(x: number, y: number, size: number, opposite: number) {
    return this.position[0] >= x && this.position[0] <= (x + size) && (this.position[1] + this.radius) >= y && this.velocity[1] > 0 && this.position[1] < opposite;
  }

  obstHitBottom(x: number, y: number, size: number, opposite: number) {
    return this.position[0] >= x && this.position[0] <= (x + size) && (this.position[1] - this.radius) <= y && this.velocity[1] < 0 && this.position[1] > opposite;
  }


  transformVelocity(transformation: Transform<Vec>): void {
    this.velocity = transformation(this.velocity);
  }

  //added size to bounds
  checkVerticalBounds(y: number, size: number) {
    //lower bound of display
    if (this.position[1] + this.radius >= y && y != 0){
    this.transformVelocity(vel => [
      vel[0],
      vel[1] * -1
    ])
    }
    //upper bound of display
    if (this.position[1] - this.radius <= y && y != size){
    this.transformVelocity(vel => [
      vel[0],
      vel[1] * -1
    ])
    }
  }

  checkHorizontalBounds(x: number, size: number, player: Player<any>) {
    //score based on which side the ball is on + how to access these variables
    //should we change the velocity to go towards the other player here or somewhere else?
    if (this.position[0] + this.radius <= x && x != size){
      //add 1 to player 1 score
      this.position = [size/2, 32];
      this.velocity = [-.014, this.velocity[1]];
      player.addPoint();
    }
    else if (this.position[0] - this.radius >= x && x != 0){
      //add 1 to player 2 score
      this.position = [size/2, 32];
      this.velocity = [.014, this.velocity[1]]
      player.addPoint();
    }
  }

}

// Represents an obstruction on the pong "board"
interface Obstacle {

}
class Block extends Entity2D implements Obstacle
{
  private readonly size: Vec;
  private readonly side: boolean;

  constructor(position: Vec, size: Vec, side: boolean) {
    super(position);
    this.size = size;
    this.side = side;
  }

  render(ctx: Context2D): void {
    if (this.position[0] <= 32 ) {
      ctx.fillStyle = 'blue';
    }
    else {
      ctx.fillStyle = 'red';
    }
    ctx.fillRect(
      //this might be wrong
      this.position[0] - this.size[0]/2,
      this.position[1] - this.size[1]/2,
      this.size[0],
      this.size[1]
    );
  }

  //Will return that it is colliding if it is hit either horizontally or vertically
  private isCollidingWithObstacle(ball: Ball) {
    return ball.obstHitRightSide(this.position[0] + this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[1], this.position[0] - this.size[0] / 2) ||
    ball.obstHitLeftSide(this.position[0] - this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[1], this.position[0] + this.size[0] / 2) ||
    ball.obstHitTop(this.position[0] - this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[0], this.position[1] + this.size[1] / 2) ||
    ball.obstHitBottom(this.position[0] - this.size[0] / 2, this.position[1] + this.size[1] / 2, this.size[0], this.position[1] - this.size[1] / 2);
  }
  
  //From here should add both forms of collision detection as one function as they can be hit from either side
  collideWithObstacle(ball: Ball) {
    //for if left or right is true
    if (this.isCollidingWithObstacle(ball) && (ball.obstHitTop(this.position[0] - this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[0], this.position[1] + this.size[1] / 2) ||
    ball.obstHitBottom(this.position[0] - this.size[0] / 2, this.position[1] + this.size[1] / 2, this.size[0], this.position[1] - this.size[1] / 2))) {
      ball.transformVelocity(vel => [
        vel[0],
        vel[1] * -1
      ]);
      
    }
    //for if top or bottom is true
    else if (this.isCollidingWithObstacle(ball) && ball.obstHitRightSide(this.position[0] + this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[1], this.position[0] - this.size[0] / 2) ||
    ball.obstHitLeftSide(this.position[0] - this.size[0] / 2, this.position[1] - this.size[1] / 2, this.size[1], this.position[0] + this.size[0] / 2)) {
      ball.transformVelocity(vel => [
        vel[0] * -1,
        vel[1]
      ]);
    }
}

//return position values for obst in upper left corner (so you can like do vec[0] * size, vec[1] * size for display. size is constant so no need to pass it to display) 
returnObstValues(): Vec {
  return [this.position[0] - this.position[0] / 2, this.position[1] - this.position[1] / 2];   
}

}

class Player<User> {

  private score: number;
  public readonly user: User;

  constructor(user: User, score: number) {
    this.user = user;
    this.score = score;
  }

  addPoint(): this {
    this.score++;
    return this;
  }

  reachedScore(minScore: number): boolean {
    return this.score >= minScore;
  }

  getScore() {
    return this.score.toString();
  }


}

type Vec = readonly [number, number];
type Transform<T>  = (value: T) => T;
type Players<User> = readonly [Player<User>, Player<User>];

export default GameState;