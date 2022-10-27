import { ImageData, createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Display from "../../display";
import Mode, { BroadcastFn, ModeBuilder } from "../mode";
import WebAPI from "../../web/api";
import { Privileges } from "../../users";
import Layout, {layoutBounds, LayoutStateReadable} from "../../layout";
import { z } from "zod";
import { createZodParser } from "../../web/parse";

// A Zod Schema for a natural number
const Natural = z.number().int().gte(0);
// A Zod Schema for a positive 8-bit integer (0-255).
const PosInt8 = Natural.lt(256);

//We could have an array similar to this for the ball and the paddles (separate for each player or no?)
const PaintPixel = z.object({
  coordinates: z.tuple([Natural, Natural]),
  color: z.tuple([PosInt8, PosInt8, PosInt8])
});

const ObstacleCommand = z.array(PaintPixel);
const PaddleCommand = z.array(PaintPixel);

export type ObstacleCommand = z.infer<typeof ObstacleCommand>;
export type PaddleCommand = z.infer<typeof PaddleCommand>;

//TO DO: How do the w, h, x, y connect to the PaintPixel commands?
class PongComponent{
  width:number; //dimensions
  height:number;
  x:number; //positions on the plane
  y:number;
  ballVel:number = 0;
  yVel:number = 0;
  constructor(w:number,h:number,x:number,y:number){       
      this.width = w;
      this.height = h;
      this.x = x;
      this.y = y;
  }
  //call draw mode for this maybe? not sure how we want the two modes to interact, this might be fine bc the system does it not the user
  draw(context){
      context.fillStyle = "#fff";
      context.fillRect(this.x,this.y,this.width,this.height);
  }
}

//Class for user paddle controlled by Admin
class Paddle extends PongComponent{
    
  private speed:number = 10;
  
  constructor(w:number,h:number,x:number,y:number){
      super(w,h,x,y);
  }
  
  update(canvas){
    //Determined by input through channel on Web app
    //Any "Game" inputs need to be dealt with via channel requests from the Admin Paddle users
   if( Game.keysPressed[KeyBindings.UP] ){
      this.yVel = -1;
      if(this.y <= 20){
          this.yVel = 0
      }
   }else if(Game.keysPressed[KeyBindings.DOWN]){
       this.yVel = 1;
       if(this.y + this.height >= canvas.height - 20){
           this.yVel = 0;
       }
   }else{
       this.yVel = 0;
   }
   
   this.y += this.yVel * this.speed;
   
  }
}

//Ball class, direction influenced by the paddle inputs from the user
class Ball extends PongComponent{
    
  private speed:number = 5;
  
  constructor(w:number,h:number,x:number,y:number){
      super(w,h,x,y);
      var randomDirection = Math.floor(Math.random() * 2) + 1; 
      if(randomDirection % 2){
          this.ballVel = 1;
      }else{
          this.ballVel = -1;
      }
      this.yVel = 1;
  }
  
  //TO DO: change computer values to player2 values
  update(player:Paddle,player2:Paddle,canvas){
     
      //check top canvas bounds
      if(this.y <= 10){
          this.yVel = 1;
      }
      
      //check bottom canvas bounds
      if(this.y + this.height >= canvas.height - 10){
          this.yVel = -1;
      }
      
      //check left canvas bounds
      if(this.x <= 0){  
          this.x = canvas.width / 2 - this.width / 2;
          Game.computerScore += 1;
      }
      
      //check right canvas bounds
      if(this.x + this.width >= canvas.width){
          this.x = canvas.width / 2 - this.width / 2;
          Game.playerScore += 1;
      }
      
      
      //check player collision
      if(this.x <= player.x + player.width){
          if(this.y >= player.y && this.y + this.height <= player.y + player.height){
              this.ballVel = 1;
          }
      }
      
      //check computer collision
      if(this.x + this.width >= player2.x){
          if(this.y >= player2.y && this.y + this.height <= player2.y + player2.height){
              this.ballVel = -1;
          }
      }
     
      this.x += this.ballVel * this.speed;
      this.y += this.ballVel * this.speed;
  }
}

//TO DO: Update all collision code to include cases where it hits an obstacle
//Class for obstacles to be placed by user
class PongMode implements Mode {
  

  private readonly broadcast: BroadcastFn;
  private canvas: Context2D;
  // Starts as mapping of GameState -> Display?

  // broadcast: obstacle positions, game over (to specific players)

  defineApi(): WebAPI {
    //Channel for pong paddles to join
    //Do we need two separate channels for each player?
    const paddleChannel = {
        name: 'pong paddle',
        privileges: Privileges.Admin, //Admin for now right?

    }
    //Channel for spectators to join
    const spectatorChannel = {
      name: 'spectator',
      privileges: Privileges.Player,
    }

    const movePaddle = {
      name: 'move paddle',
      privileges: Privileges.Admin,
      parse: createZodParser(PaddleCommand),
      onReceived: (pixels: PaddleCommand) => this.PaddleMovement(pixels) 
    }
    const placeObstacle = {
      name: 'place obstacle',
      privileges: Privileges.Player,
      parse: createZodParser(ObstacleCommand),
      onReceived: (pixels: ObstacleCommand) => this.ObstaclePlace(pixels)
    }
    return {
      // * endpoint / channel for users to join a game
      // * endpoint / channel for admins to start a game
      // * channel for moving a paddle
      // * channel for placing an obstacle
      endpoints: [],
      channels: [movePaddle, placeObstacle]
    }
  }

  //This might be where we add all of the pong code I just wasn't sure whether it should be in the mode or out of the mode
  //Code for user moving the paddle on the display
  private PaddleMovement(pixels: PaddleCommand) : void
  {

  }
  
  //Code for user placing an obstacle on the display
  private ObstaclePlace(pixels: ObstacleCommand) : void{

  }

  start(layout: Layout): void {
    // Initalize the game state(s)
    // This creates the bounds of the board. Should we use draw mode to set the visual board up?
    const [width, height] = layoutBounds(layout);
    this.canvas = createCanvas(
      Math.max(width, 1),
      Math.max(height, 1)
    ).getContext('2d');
    //Under here we could implement the drawBoardDetails part of the original pong code
  }

  stop(): void {
    // Free any resources
  }

  render(layout: Layout): Frame {
    // Something like: new PongRenderer(this.gameState).render()
    throw new Error("Method not implemented.");
  }

  static builder(): ModeBuilder {
    return () => new PongMode();
  }

}

export default PongMode.builder();