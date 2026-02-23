// implement aabb collison detection
// regular rectangle or square shapes
// apply hitbox logic to player
// logic in one class
// call class through center of the object, define width and height ???
// new object(center, width, height)
// create fork called hitboxes including player and walls
// request merge


let mapSize = 16 * 32;

var player = {
  x : 0,
  y : 0,
  nextx : 200,
  nexty : 400,
  speed : [3, 3, 3, 3], //[right, left, up, down]
  size : 16,
}
/*
CREATE RECTANGLE SHAPED HITBOX
-----------------------------
- input opposite hitbox corners
- upper left corner start
- rotate clockwise around points (zones)

- 2 gradient calculations for corners
*/

class hitbox{
  constructor(ax, ay, bx, by){
    this.xCoord = [ax, bx, bx, ax]; 
    this.yCoord = [ay, ay, by, by];
    this.g1 = ((by - ay) / (bx - ax)); //(ax, ay) (bx, by) 
    this.g2 = ((by - ay) / (ax - bx)); //(bx, ay) (ax, by)
    this.c1 = ay - (this.g1 * ax);
    this.c2 = ay - (this.g2 * bx);
    this.zones = [false, false, false, false];
  }
  drawHitbox(){
    fill(255, 255, 255, 125);
    beginShape();
    vertex(this.xCoord[0], this.yCoord[0]);
    vertex(this.xCoord[1], this.yCoord[1]);
    vertex(this.xCoord[2], this.yCoord[2]);
    vertex(this.xCoord[3], this.yCoord[3]);
    endShape(CLOSE);

    fill(0);
    text(`${this.zones[0]}, ${this.zones[1]}, ${this.zones[2]}, ${this.zones[3]}`, 10, 30);
  }
  updateZones(){
    var eq1 = (this.g1 * player.x) + this.c1;
    var eq2 = (this.g2 * player.x) + this.c2;
    this.zones[0] = player.y <= eq1 && player.y <= eq2;
    this.zones[1] = player.y <= eq1 && player.y >= eq2;
    this.zones[2] = player.y >= eq1 && player.y >= eq2;
    this.zones[3] = player.y >= eq1 && player.y <= eq2;
  }
  updateCollisions(){
    if(this.zones[0] === true && player.nexty >= this.yCoord[0]){player.speed[3] = 0}
    if(this.zones[1] === true && player.nextx <= this.xCoord[1]){player.speed[1] = 0}
    if(this.zones[2] === true && player.nexty <= this.yCoord[2]){player.speed[2] = 0}
    if(this.zones[3] === true && player.nextx >= this.xCoord[3]){player.speed[0] = 0}
  }
}

function setup() {
  color(255, 255, 255);
  createCanvas(mapSize, mapSize);
  H2 = new hitbox(16 * 8, 16 * 11, 16 * 15, 16 * 17);
  H3 = new hitbox(16 * 15, 16 * 11, 16 * 18, 16 * 12);
}

function draw() {
  background(100);
  for(let i = 0; i <= mapSize; i += 16){
    line(i, 0, i, mapSize);
    line(0, i, mapSize, i);
  }
  H2.drawHitbox();
  H2.updateZones();
  H2.updateCollisions();
  H3.drawHitbox();
  H3.updateZones();
  H3.updateCollisions();
  
  movement();
  updateBounds();
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

//  fill(0);
//  text(`${H2.zones[0]}, ${H2.zones[1]}, ${H2.zones[2]}`, 10, 30);