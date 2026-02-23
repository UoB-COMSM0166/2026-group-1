/*
CLASS DESIGN
============
- will have 2 hitbox types to start of with
  |_ 1 - wall - static, not player controlled, no movement vector
  |_ 2 - player - movable, player controlled, movement vector
- all share similarities
  |_ made up of square or rectangular boundaries
  |_ created through x, y, width and height
  |_ contain an x, y midpoint (current position)
  |_ can be drawn
  |_ contain get methods for private data retrieval
- create a hitbox superclass that can be called in wall and player to reduce amount of code
 
CALCULATING BOUNDARIES
======================
Version 5.0 document - iteration of version 4.0 which should now be github
- [improving zone logic and classes]
- need to know which side of wall collided with player to properly resolve collision 
- 2 methods that come to mind, each using zones
  |_ 1 - corner gradient through midpoint
  |  |_    
  |  |     \  0  /
  |  |      \===/
  |  |    3 |\ /| 1
  |  |      |/ \|
  |  |      /===\
  |  |     /  2  \
  |  |
  |  |_ simple to implement
  |  |_ gradient2 = - gradient1 - simple calculation
  |  |_ intercept of both lines calculated through midpoint of hitbox
  |  |_ works with more square shaped hitboxes
  |  |_ does not work well with long and thin hitboxes
  |  |_ currently implemented
  |
  |_ 2 - corner gradient through y = x
     |_
     |     \   0   /
     |      \=====/
     |      |\   /|
     |      | \ / |
     |      |  |  |
     |    3 |  |  | 1
     |      |  |  |
     |      | / \ |
     |      |/   \|
     |      /=====\
     |     /   2   \
     |
     |_ y = x through corners
     |_ issue arises when hitbox is long and thin, boundaries leak into each other causing error
     |_ fix by adding condition that zone is above/below midpoint of hitbox to zone calculation
     |_ more complex to implement
     |_ should work with long and thin shapes as well as squares
     |_ not currently implemented
  
- zoning method has added benefit of stopping clipping under high (but not very high) speeds
  |_ in code below speed 1 works, speed 2 - some clipping, speed 3 - clipping
     |_ speed 1 is very fast so this shouldn't be an issue

Version 5.1 document
- [solving player size issue in corner zone transition]
  |_ note: at least 1 zone must be true else hitbox will not be active and clipping occurs
  |  |_ [zone 0, zone 1] ---> [true, false] -> [true, true] -> [false, true], zone equations must have >=, not >
  |_ at the moment midpoint of player determines current zone
  |_ leads to rectangular shaped players not crossing zones correctly
  |_ shown in example below M is midpoint of player
  |_              
  |                              =====
  |          ====/======         |  /|
  |          |  / M    |         | M |
  |          ==/========         |/  |
  |     ======/                  =====
  |     |     |            =====/
  |     |     |            |    |
  |     |     |            |    |
  |     =======            ======
  |
  |_ (right is supposed to be a square but you get the idea)
  |_ right image - normal, hitbox corner touches corner of player, player is in both zones as expected
  |_ left image - midpoint is in zone 1 but the bottom has not cleared top of the hitbox
  |_ this causes an awkward snap to the right of the hitbox that is quite noticeable when moving down
  |_ since the player is a submarine, which are not typically square, this is an important issue to fix

- how do we go about fixing this?
  |_ currently updateZones method calculated by player midpoint (vec is player center position vector)
  |_ 
  |    updateZones(vec){
  |      var eq1 = (this.gradient1 * vec.x) + this.intercept1;
  |      var eq2 = (this.gradient2 * vec.x) + this.intercept2;
  |      this.zones[0] = (vec.y <= eq1 && vec.y <= eq2);
  |      this.zones[1] = (vec.y <= eq1 && vec.y >= eq2);
  |      this.zones[2] = (vec.y >= eq1 && vec.y >= eq2);
  |      this.zones[3] = (vec.y >= eq1 && vec.y <= eq2);
  |    }
  |
  |_ change logic from midpoint to player edge
  |_ if player left x larger than hitbox right x then allow zone transition from 0 to 1, repeat for each side
  |_ use zone[0] as an example
  |_
  |  x, y = 0  eq1     eq2
  |             \   0  /
  |              \====/
  |              |\  /| 
  |           2  | \/ |  1
  |              | /\ |
  |              |/  \|
  |              /====\
  |             /      \     x, y = 100 (or something else)
  |
  |_ for zone 0
  |  |_ player up y can be ignored?
  |  |_ player down y needs to be less than hitbox up y
  |  |_ player right x needs to be less than hitbox left x 
  |  |_ player left x needs to be greater than hitbox right x
  |_ player up y can be ignored, we can remove the upper 2 corners and look at the lower 2 corners instead
  |_ implementing logic for this just didnt work as vec.x >= eq1 or vec.x < eq2 would not update zones
  |_ solution was to get rid of eq1 and eq2 which use player.x and focus logic calculation on sides of the hitbox
  |_
  |         |     |
  |     0/3 |  0  | 0/1 
  |     ----=======----
  |         |     |
  |       3 |     | 1
  |         |     |
  |     ----=======----
  |     2/3 |  2  | 1/2
  |         |     |
  |         
  |_ in this version for zone 0
  |  |_ player lower y <= hitbox upper y
  |  |_ player right x >= hitbox left x
  |  |_ player left x <= hitbox right x
  |  |_ in an equation this becomes
  |    |_ this.zones[0] = ((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |    |                   (vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |    |                   (vec.y + (player.getHeight() / 2)) <= this.position.y - (this.h / 2)));
  |    |_ this seems to work well when implemented (similar logic for zone 2 just look at top y instead)
  |_ zones 1 and 3 can be written as
  |  |_ this.zones[1] = (vec.x - (player.getWidth() / 2) >= this.position.x + (this.w / 2))
  |  |_ this.zones[3] = (vec.x + (player.getWidth() / 2) <= this.position.x - (this.w / 2))
  |_ implementing above logic seems to work perfectly for both non square and square shaped players
  |_ midpoint calculation no longer required and we can remove gradient and intercept variables
  |_ updated zone calculation method below
  |_
  |   updateZones(vec){
  |     this.zones[0] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |                     ((vec.y + (player.getHeight() / 2)) <= this.position.y - (this.h / 2)));
  |     this.zones[1] = ((vec.x - (player.getWidth() / 2)) >= this.position.x + (this.w / 2))
  |     this.zones[2] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |                     ((vec.y - (player.getHeight() / 2)) >= this.position.y - (this.h / 2)));
  |     this.zones[3] = ((vec.x + (player.getWidth() / 2)) <= this.position.x - (this.w / 2));
  |   }
  |_ no gradient and intercept needed
  |_ only needed to alter methods in class, everything outside of the method remains unchanged
  |_ one issue still remains which I was hoping was fixed - player still gets caught on edges where wall hitboxes touch
  |_ also need to introduce testing to make sure the hitbox corners are working as intended

  
FUTURE IMPLEMENTATIONS
======================
- experiment with other methods over next week to find best fit for our project
- need to be able to deal with rectangular shaped player instead of just square
- add enemy hitbox logic as well as barriers (if we add movable barriers)
- logic for wall hitboxes that are touching to prevent player getting caught on edges when moving
  |_ seen sometimes when moving against group of 4 hitboxes on the right 
- tidy up design, move to github so others can use it while I change logic (HIGH PRIORITY)
- have wall data eventually contained in a .json file
*/

let tile = 16;
let mapSize = tile * 32;
let timescale = 1;
var walls = [];

const debugColor = {
  WALL : "wall",
  PLAYER : "player",
}

class Hitbox{
  constructor(x, y, w, h){
    this.position = createVector((x + (w / 2)), (y + (h / 2)));
    this.w = w;
    this.h = h;
  }
  isColliding(that){
    if(((this.position.x - (this.w / 2)) <= (that.nextPos.x + (that.w / 2))) &&
       ((this.position.x + (this.w / 2)) >= (that.nextPos.x - (that.w / 2))) &&
       ((this.position.y - (this.h / 2)) <= (that.nextPos.y + (that.h / 2))) &&
       ((this.position.y + (this.h / 2)) >= (that.nextPos.y - (that.h / 2)))){
      return true;
    }
    return false;
  }
  drawHitbox(thisColor){
    switch(thisColor){
      case debugColor.WALL:
        fill(255, 0, 0, 125);
        break;
      case debugColor.PLAYER:
        fill(0, 0, 255, 125);
        break;
    }
    rect(this.position.x - (this.w / 2), this.position.y - (this.h / 2), this.w, this.h);
  }
  getX(){
    return this.position.x;
  }
  getY(){
    return this.position.y;
  }
  getWidth(){
    return this.w;
  }
  getHeight(){
    return this.h;
  }
}

class Wall extends Hitbox{
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.zones = [false, false, false, false];
  }
  getZones(){
    return this.zones;
  }
  updateZones(vec){
    this.zones[0] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
                     ((vec.y + (player.getHeight() / 2)) <= this.position.y - (this.h / 2)));
    this.zones[1] = ((vec.x - (player.getWidth() / 2)) >= this.position.x + (this.w / 2))
    this.zones[2] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
                     ((vec.y - (player.getHeight() / 2)) >= this.position.y - (this.h / 2)));
    this.zones[3] = ((vec.x + (player.getWidth() / 2)) <= this.position.x - (this.w / 2));
  }
}

class Player extends Hitbox{
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.nextPos = createVector(this.position.x, this.position.y);
    this.velocity = createVector(0, 0);
  }
  setNextPosition(){
    if(keyIsDown(DOWN_ARROW)){this.nextPos.y += this.velocity.y}
    if(keyIsDown(LEFT_ARROW)){this.nextPos.x -= this.velocity.x}
    if(keyIsDown(UP_ARROW)){this.nextPos.y -= this.velocity.y}
    if(keyIsDown(RIGHT_ARROW)){this.nextPos.x += this.velocity.x}
  }
  resolveCollision(that){
    if(that.zones[0]){this.nextPos.y = (that.position.y - (that.h / 2)) - (this.h / 2) - 1}
    if(that.zones[1]){this.nextPos.x = (that.position.x + (that.w / 2)) + (this.w / 2) + 1}
    if(that.zones[2]){this.nextPos.y = (that.position.y + (that.h / 2)) + (this.h / 2) + 1}
    if(that.zones[3]){this.nextPos.x = (that.position.x - (that.w / 2)) - (this.w / 2) - 1}
  }
  movePlayer(){
    this.position.x = this.nextPos.x
    this.position.y = this.nextPos.y
  }
  setVelocity(x=0, y=0){  // default parameters, calling setVelocity() defaults to 0
    this.velocity.x = x; 
    this.velocity.y = y; 
  }
}

/*
[setup]
- create canvas
- set framerate to current monitor refresh rate (can be adjusted in settings tab later)
  |_ my monitor uses 75 Hz, p5js uses 60 Hz so I had to change the frameRate, change it to match your monitor settings to create a smoother picture
- create new player class with x, y, w, h
- create wall classes with x, y, w, h, place in walls array
*/
function setup() {
  createCanvas(mapSize, mapSize);
  frameRate(75);
  player = new Player(0, 0, tile * 3 - 2 , tile * 2 - 2);
  walls[0] = new Wall(tile * 6 , tile * 10, tile * 3 , tile * 3);
  walls[1] = new Wall(tile * 10, tile * 10, tile * 3 , tile * 3);
  walls[2] = new Wall(tile * 6 , tile * 14, tile * 3 , tile * 3);
  walls[3] = new Wall(tile * 10, tile * 14, tile * 3 , tile * 3);
  walls[4] = new Wall(tile * 15, tile * 11, tile * 3 , tile * 3);
  walls[5] = new Wall(tile * 18, tile * 11, tile * 3 , tile * 3);
  walls[6] = new Wall(tile * 18, tile * 14, tile * 3 , tile * 3);
  walls[7] = new Wall(tile * 15, tile * 14, tile * 3 , tile * 3);
  walls[8] = new Wall(tile * 0 , tile * 31, tile * 32, tile * 1);
}

/*
- can set timescale to 0 to 'pause' the game

[draw loop] - 1 frame
  - draw grid (optional)
  - set player velocity variable
  - get player input key, adjust velocity based on player input
  - add velocity to next x, y position
    - [wall loop]
      - draw wall hitbox (optional)
      - update wall zones for current x, y position
      - check wall collision with next x, y position
      - resolve collision if true
- move current x, y to next x, y position
- draw player hitbox (optional)

*/
function draw(){
  background(100);
  debugDrawGrid(true);
  var playerVelocity = 0.15 * deltaTime * timescale;
  player.setVelocity(playerVelocity, playerVelocity);
  player.setNextPosition();
  for(let i in walls){
    walls[i].drawHitbox(debugColor.WALL);
    walls[i].updateZones(player.position);
    if(walls[i].isColliding(player)){
      player.resolveCollision(walls[i]);
    }
  }
  player.movePlayer();
  player.drawHitbox(debugColor.PLAYER);
}

function debugDrawGrid(grid){
  if(grid){
     noStroke();
    for(let i = 0; i <= mapSize; i += 16){
      line(i, 0, i, mapSize);
      line(0, i, mapSize, i);
    }
  }
}
