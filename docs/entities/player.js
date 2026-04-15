/*
========================================
VERSION: 2.4
ENTITY: PLAYER
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Player entity class: stores player state, movement moveIntent, and components
- Manages internal resources like torch and power

RULES:
- Player class does not handle physics or collision resolution
- Player class does not render itself; rendering is handled by renderSystem
- Player class does not directly manipulate other systems
========================================
DESIGN GOALS:
- Keep player logic separate from physics and rendering
- Treat input as moveIntent (left/right/jump/toggleTorch), not direct movement
- Encapsulate components like Torch and PowerSystem cleanly
========================================
RESPONSIBILITIES:
- Maintain player positional and state data (x, y, w, h, vy, onGround)
- Maintain runtime resources (power, torch, health, oxygen)
- Store and expose player moveIntent for systems to consume

DEPENDENCIES:
- config object: defines START_X, START_Y, WIDTH, HEIGHT, JUMP_POWER, TORCH settings
- PowerSystem for tracking energy usage (e.g., torch drain)
- Torch class for player-held light source

USAGE:
import { Player } from './entities/player.js';
const player = new Player(PLAYER_CONFIG);
engine.register(playerSystem); // playerSystem consumes this class
========================================
*/


//======================
// PLAYER CLASS
//======================
import { TORCH, LIGHTING, PLAYER } from '../config.js';
import { Torch } from './components/torch.js';  // torch class in same folder
import { PowerSystem } from '../systems/powerSystem.js';
import { Hitbox } from '../systems/hitboxSystem.js';

export class Player extends Hitbox{
   constructor(xOrConfig, y, w, h){
      const usingConfigObject = typeof xOrConfig === 'object' && xOrConfig !== null;
      const startX = usingConfigObject ? (xOrConfig.START_X ?? 0) : xOrConfig;
      const startY = usingConfigObject ? (xOrConfig.START_Y ?? 0) : y;
      const width = usingConfigObject ? (xOrConfig.WIDTH ?? PLAYER.WIDTH) : w;
      const height = usingConfigObject ? (xOrConfig.HEIGHT ?? PLAYER.HEIGHT) : h;

      // Hitbox expects corner coordinates; player start points are center-like in current room flow.
      const cornerX = (startX ?? 0) - (width ?? 0) / 2;
      const cornerY = (startY ?? 0) - (height ?? 0) / 2;

      super(cornerX, cornerY, width ?? PLAYER.WIDTH, height ?? PLAYER.HEIGHT);

      this.nextPos = createVector(this.position.x ?? 0, this.position.y ?? 0);
      this.velocity = createVector(0, 0);
     
      //==for interpolation in rendering==//
      this.previousPos = createVector(0, 0);
      this.previousVel = createVector(0, 0);
      // ================================ //

      this.size = PLAYER.SIZE;
      this.facing = 1; // 1 for right, -1 for left

      this.torch = new Torch(TORCH);
      this.power = new PowerSystem();
      this.health = null;
      this.oxygen = null;

      this.bubbles = [];

      this.moveIntent = {
         left: false,
         right: false,
         up: false,
         down: false,
      };
      this.actionIntent = {
         toggleTorch: false,
         emitSonar: false,
      };
   
   }
   get x(){
      return this.position.x;
   }
   set x(value){
      this.position.x = value;
   }
   get y(){
      return this.position.y;
   }
   set y(value){
      this.position.y = value;
   }
   setCurrentPosition(x, y){
      this.position.x = x;
      this.position.y = y;
      // Keep physics target in sync with teleports/spawn placement.
      this.nextPos.x = x;
      this.nextPos.y = y;
   }
   setVelocityX(x = 0){
      this.velocity.x = x;
   }
   setVelocityY(y = 0){
      this.velocity.y = y;
   }
   setNextPosition(){
      this.previousPos.x = this.position.x;
      this.previousPos.y = this.position.y;
      this.nextPos.x = this.position.x + this.velocity.x;
      this.nextPos.y = this.position.y + this.velocity.y;
   }
   movePlayer(){
      this.position.x = this.nextPos.x;
      this.position.y = this.nextPos.y;
   }
   getMoveIntent(){
      return this.moveIntent;
   }
   switchTorch(){
      this.actionIntent.toggleTorch = true;
   }
   requestAction(actionKey){
      if (!this.actionIntent || !(actionKey in this.actionIntent)) return;
      this.actionIntent[actionKey] = true;
   }
   consumeAction(actionKey){
      if (!this.actionIntent || !(actionKey in this.actionIntent)) return false;
      const requested = this.actionIntent[actionKey] === true;
      this.actionIntent[actionKey] = false;
      return requested;
   }
   getLightSources(){
      const powerPercent = this.power?.getPercent?.() ?? 0;
      const torchIntensity = this.torch?.getIntensity?.(powerPercent) ?? 0;
      const sources = [];

      if (torchIntensity > 0) {
         sources.push({
            x: this.x,
            y: this.y,
            radius: this.torch.radius,
            intensity: torchIntensity
         });
      }

      if (LIGHTING?.PLAYER_AMBIENT?.radius && LIGHTING?.PLAYER_AMBIENT?.brightness) {
         sources.push({
            x: this.x,
            y: this.y,
            radius: LIGHTING.PLAYER_AMBIENT.radius,
            intensity: LIGHTING.PLAYER_AMBIENT.brightness
         });
      }

      return sources;
   }
   resetMoveIntent(){
      for(let i in this.moveIntent){
         this.moveIntent[i] = false;
      }
   }
};

//======================================
// END
//======================================
