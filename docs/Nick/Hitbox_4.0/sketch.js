/*

GROUP MEETING NOTES
===================
- implement aabb collison detection
- regular rectangle or square shapes
- apply hitbox logic to player
- logic in one class
- call class through center of the object, define width and height ???
- create fork called hitboxes including player and walls.
- request merge.
 
IMPROVEMENTS OVER OLDER PROTOTYPES
==================================
- all logic is contained in a class, code can be changed without affecting other files which call the class.
- other files can call X, Y, width, height ect. through get methods.
- all hitboxes contained in an array (eventually be moved to .json files).
- can create moving hitboxes (for example player) and check collison with each.

CURRENT ISSUES
==============
- player of 16 size can't fit into a 16 pixel wide gap going up, turning all >= and <= to > and < when calculating zones in hitboxes fixes this but allows the player to clip into hitbox corners.
- slight overlap of player and hitbox when rendering shapes, note: rendering here is temporary so this can be solved elsewhere as the logic here still works when nothing is rendered.

TO DO
=====
- implement thorough testing.
- improve zone calculation logic to allow rectangular player size and solve tight gap problem. (possible to solve it using y = x or y = -x instead of midpoints for zone calculation)
- move rendering elsewhere.
- add set methods to classes so can be modified by other files.
- move code to github by the end of this week.
- start thinking about enemy hitboxes.
- start thinking about potential changes when camera movement is implemented.

*/

let mapSize = 16 * 32;
var walls = [];

// create a square or rectangle hitbox starting from top left corner coordinates with width and height.
class hitbox {
  constructor(ax, ay, w, h){
    this.ax = ax;
    this.ay = ay;
    this.w = w;
    this.h = h;
    this.zones = [false, false, false, false];
  }
  // temporary render
  drawHitbox(){
    fill(150, 150, 150);
    rect(this.ax, this.ay, this.w, this.h);
  }
  updateZones(x, y){
    var gradient1 = ((this.ay + this.h) - this.ay) / ((this.ax + this.w) - this.ax);
    var gradient2 = -gradient1;
    var intercept1 = (this.ay + (this.h / 2)) - (gradient1 * (this.ax + (this.w / 2)));
    var intercept2 = (this.ay + (this.h / 2)) - (gradient2 * (this.ax + (this.w / 2)));
    var eq1 = (gradient1 * x) + intercept1;
    var eq2 = (gradient2 * x) + intercept2;
    this.zones[0] = (y <= eq1 && y <= eq2);
    this.zones[1] = (y <= eq1 && y >= eq2);
    this.zones[2] = (y >= eq1 && y >= eq2);
    this.zones[3] = (y >= eq1 && y <= eq2);
  }
  isColliding(h){
    if(this.getX() <= (h.getX() + h.getWidth()) &&
       this.getX() + this.getWidth() >= h.getX() &&
       this.getY() <= h.getY() + h.getHeight() &&
       this.getY() + this.getHeight() >= h.getY()){
      return true;
    }
    return false;
  }
  getWidth(){
    return this.w;
  }
  getHeight(){
    return this.h;
  }
  getX(){
    return this.ax;
  }
  getY(){
    return this.ay;
  }
  getMidX(){
    return this.ax + (this.w / 2);
  }
  getMidY(){
    return this.ay + (this.h / 2);
  }
  getZones(){
    return this.zones;
  }
}

// player is just a movable hitbox so inherits all hitbox properties, don't have to write methods and constructor twice
class c_player extends hitbox{
  constructor(ax, ay, w, h){
    super(ax, ay, w, h);
    this.speed = [3, 3, 3, 3];
  }
  movePlayer(){
    if(keyIsDown(DOWN_ARROW)){this.ay += this.speed[0];}  // down
    if(keyIsDown(LEFT_ARROW)){this.ax -= this.speed[1];}  // left
    if(keyIsDown(UP_ARROW)){this.ay -= this.speed[2];}    // up
    if(keyIsDown(RIGHT_ARROW)){this.ax += this.speed[3];} // right
    this.resetSpeed();
    // temporary render
    fill(255, 255, 255);
    rect(this.ax, this.ay, this.w, this.h);
  }
  resetSpeed(){
    for(let i = 0; i < 4; i++){
      this.speed[i] = 3;
    }
  }
  modifySpeed(z){
    for(let i = 0; i < 4; i++){
      if(z[i] === true){
        this.speed[i] = 0;
      }
    }
  }
}

// fill array with hitboxes, only needs to be done once
function setup() {
  color(255, 255, 255);
  createCanvas(mapSize, mapSize);
  player = new c_player(16 * 20, 16 * 20, 16 * 1, 16 * 1);
  walls[0] = new hitbox(16 * 6, 16 * 10, 16 * 3, 16 * 3);
  walls[1] = new hitbox(16 * 10, 16 * 10, 16 * 3, 16 * 3);
  walls[2] = new hitbox(16 * 6, 16 * 14, 16 * 3, 16 * 3);
  walls[3] = new hitbox(16 * 10, 16 * 14, 16 * 3, 16 * 3);
  walls[4] = new hitbox(16 * 15, 16 * 11, 16 * 3, 16 * 3);
  walls[5] = new hitbox(16 * 18, 16 * 11, 16 * 3, 16 * 3);
  walls[6] = new hitbox(16 * 18, 16 * 14, 16 * 3, 16 * 3);
  walls[7] = new hitbox(16 * 15, 16 * 14, 16 * 3, 16 * 3);
}

/*
- draw lines every 16 pixels across the screen to view grid hitboxes are placed on
- collision logic.
  |_ draw hitbox.
  |_ go through hitbox array, update zones player is in for each hitbox.
  |_ zones start from 0 and go clockwise starting from ax and ay.
  |_      
  |      \  0  /
  |       =====
  |     3 |box|  1
  |       =====
  |      /  2  \
  |
  |_ if hitbox collides with player (aabb collision) return true.
  |_ if true call player hitbox and modify speed based on zone collided with.
  |_ when hitbox array loop done then move player.
  |_ reset speed back to initial speed, then draw player on screen.
*/  
function draw() {
  background(100);
  for(let i = 0; i <= mapSize; i += 16){
    line(i, 0, i, mapSize);
    line(0, i, mapSize, i);
  }
  for(let i in walls){
    walls[i].drawHitbox(); // can be removed and logic still works
    walls[i].updateZones(player.getMidX(), player.getMidY());
    if(walls[i].isColliding(player) === true){
      player.modifySpeed(walls[i].getZones())
    }
  }
  player.movePlayer();
}
