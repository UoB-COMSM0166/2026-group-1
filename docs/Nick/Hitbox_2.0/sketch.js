// implement aabb collison detection
// regular rectangle or square shapes

let mapSize = 32 * 15;

var player = {
  x : 0,
  y : 0,
  nextx : 200,
  nexty : 400,
  speed : [3, 3, 3, 3], //[right, left, up, down]
  size : 16,
}

// need to account for denominator of 0 which would result in an error when calculating gradient
function gradient(y2, y1, x2, x1){
  if((x2 - x1) === 0 || (y2 - y1) === 0){
    return 0;
  }else{
    return ((y2 - y1) / (x2 - x1));
  }
}

// need to account for straight vertical gradient
function intercept(y, g, x){
  if(g === 0){
    return x;
  }else{
    return (y - (g * x));
  }
}

// evaluate boundaries for player-hitbox collison
function evaluate(x1, x2, py, eq){
  if(x1 < x2){
     return py >= eq
  }
  if(x1 > x2){
     return py <= eq
  }
  // return for vertical gradient
}

function evalauteMoveBlock(bz, y2, y1, x2, x1){
  if(y1 < y2){bz[0] = true} // right
  if(y1 > y2){bz[1] = true} // left
  if(x1 < x2){bz[2] = true} // up
  if(x1 > x2){bz[3] = true} // down
}

function updateCollisions(bz){
  for(i = 0; i < 4; i++){
    if(bz[i] == true){
      player.speed[i] = 0;
    }
  }
}

/*
CREATE TRIANGLE SHAPED HITBOX
-----------------------------
- hitbox gradients and intercepts calculated at compile time during initialization
- hitbox zones and collisions calculated at runtime
- optimise further if framerate becomes a problem
- can be used to create rectangle and circle shaped hitboxes
- move drawHitbox elsewhere eventually to seperate graphics and calculations
*/
class hitbox{
  constructor(ax, ay, bx, by, cx, cy){
    this.xCoord = [ax, bx, cx];
    this.yCoord = [ay, by, cy];

    this.gBorders = [gradient(ay, (cy + by) / 2, ax, (cx + bx) / 2),
                     gradient(by, (ay + cy) / 2, bx, (ax + cx) / 2),
                     gradient(cy, (ay + by) / 2, cx, (ax + bx) / 2)]
    
    this.iBorders = [intercept(ay, this.gBorders[0], ax),
                     intercept(by, this.gBorders[1], bx),
                     intercept(cy, this.gBorders[2], cx)]
    
    this.zones = [false, false, false];
    
    this.gSlopes = [gradient(by, ay, bx, ax),
                    gradient(cy, by, cx, bx),
                    gradient(ay, cy, ax, cx)]
    
    this.iSlopes = [intercept(by, this.gSlopes[0], bx),
                    intercept(cy, this.gSlopes[1], cx),
                    intercept(ay, this.gSlopes[2], ax)]
  
    this.blockZone1 = [false, false, false, false];
    this.blockZone2 = [false, false, false, false];
    this.blockZone3 = [false, false, false, false];
  }
  drawHitbox(){
    fill(100, 100, 100, 100);
    triangle(this.xCoord[0], this.yCoord[0], this.xCoord[1], this.yCoord[1], this.xCoord[2], this.yCoord[2]);
  }
  updateZones(){
    let line1 =   [0, 1, 2];
    let line2 =   [1, 2, 0];
    let x2Line1 = [(this.xCoord[1] + this.xCoord[2]) / 2, (this.xCoord[2] + this.xCoord[0]) / 2, (this.xCoord[0] + this.xCoord[1]) / 2];
    let x2Line2 = [(this.xCoord[2] + this.xCoord[0]) / 2, (this.xCoord[0] + this.xCoord[1]) / 2, (this.xCoord[1] + this.xCoord[2]) / 2];
    
    for(let i in this.zones){
      var equation1 = (player.x * this.gBorders[line1[i]]) + this.iBorders[line1[i]];
      var equation2 = (player.x * this.gBorders[line2[i]]) + this.iBorders[line2[i]];
      if(evaluate(this.xCoord[line1[i]], x2Line1[i], player.nexty, equation1) == true && 
         evaluate(this.xCoord[line2[i]], x2Line2[i], player.nexty, equation2) == false){
        this.zones[i] = 1;
      }else{
        this.zones[i] = 0;
      }
    }
  }
  updateZoneBlock(){
    let coord1 = [0, 1, 2];
    let coord2 = [1, 2, 0];
    for(let i = 0; i < 3; i++){
      if(i == 0){
        evalauteMoveBlock(this.blockZone1, this.yCoord[1], this.yCoord[0], this.xCoord[1], this.xCoord[0]);
      }
      if(i == 1){
        evalauteMoveBlock(this.blockZone2, this.yCoord[2], this.yCoord[1], this.xCoord[2], this.xCoord[1]);
      }
      if(i == 2){
        evalauteMoveBlock(this.blockZone3, this.yCoord[0], this.yCoord[2], this.xCoord[0], this.xCoord[2]);
      }
    }
  }
  checkCollision(){
    let coord1 = [0, 1, 2];
    let coord2 = [1, 2, 0];
    for(let i = 0; i < 3; i++){
      var equation3 = (player.x * this.gSlopes[i]) + this.iSlopes[i];
      if(evaluate(this.xCoord[coord2[i]], this.xCoord[coord1[i]], player.nexty, equation3) == true){
        if(i == 0 && this.zones[i] == true){
          updateCollisions(this.blockZone1);
        }
        if(i == 1 && this.zones[i] == true){
          updateCollisions(this.blockZone2);
        }
        if(i == 2 && this.zones[i] == true){
          updateCollisions(this.blockZone3);
        }
      }
    }
  }
}

function setup() {
  color(255, 255, 255);
  createCanvas(mapSize, mapSize);
  H2 = new hitbox(32 * 4, 32 * 5, 32 * 5, 32 * 10, 32 * 6, 32 * 10);
//  H3 = new hitbox(32 * 10, 32 * 4, 32 * 3, 32 * 10, 32 * 10, 32 * 10);
}

function draw() {
  background(150);
  movement();
  updateBounds();
  
  H2.drawHitbox();
  H2.updateZones();
  H2.updateZoneBlock();
  H2.checkCollision();
  
//  H3.drawHitbox();
//  H3.updateZones();
//  H3.checkCollisions();
  
  fill(0);
  text(`${H2.zones[0]}, ${H2.zones[1]}, ${H2.zones[2]}`, 10, 30);

  fill(0);
  text(`${H2.blockZone1[0]}, ${H2.blockZone1[1]}, ${H2.blockZone1[2]}, ${H2.blockZone1[3]}`, 10, 50);
  text(`${H2.blockZone2[0]}, ${H2.blockZone2[1]}, ${H2.blockZone2[2]}, ${H2.blockZone2[3]}`, 10, 70);
  text(`${H2.blockZone3[0]}, ${H2.blockZone3[1]}, ${H2.blockZone3[2]}, ${H2.blockZone3[3]}`, 10, 90);
  text(`${player.speed[0]}, ${player.speed[1]}, ${player.speed[2]}, ${player.speed[3]}`, 10, 110);

}

function updateBounds(){
  fill(255, 255, 255);
  rect(player.nextx - (player.size / 2), player.nexty - (player.size / 2), player.size, player.size);
    player.x = player.nextx;
    player.y = player.nexty;
}

function movement(){
  if((keyIsDown(RIGHT_ARROW)) && (player.x <= (mapSize - (player.size / 2)))){
    player.nextx += player.speed[0];
  }
  if((keyIsDown(LEFT_ARROW)) && (player.x >= 0 + (player.size / 2))){
    player.nextx -= player.speed[1];
  }
  if(keyIsDown(UP_ARROW) && player.y >= 0 + (player.size / 2)){
    player.nexty -= player.speed[2];
  }
  if(keyIsDown(DOWN_ARROW) && player.y <= (mapSize - (player.size / 2))){
    player.nexty += player.speed[3];
  }
  for(let i in player.speed){
    player.speed[i] = 3;
  }
} 
