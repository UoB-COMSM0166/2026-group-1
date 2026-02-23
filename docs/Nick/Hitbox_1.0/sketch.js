let DEBUG = 0;
let mapSize = 32 * 15;

var player = {
  x : 40,
  y : 20,
  nextx : 40,
  nexty : 20,
  speedLeft : 0,
  speedRight : 0,
  speedUp : 0,
  speedDown : 0,
  size : 16,
}

var hitbox = [
  {xStart : 32 * 4, yStart : 32 * 2, xEnd : 32 * 14, yEnd : 32 * 4},
  {xStart : 32 * 3, yStart : 32 * 2, xEnd : 32 * 4, yEnd : 32 * 4},
  {xStart : 32 * 0, yStart : 32 * 0, xEnd : 32 * 1, yEnd : 32 * 15},
  {xStart : 32 * 1, yStart : 32 * 10, xEnd : 32 * 13, yEnd : 32 * 15},
  {xStart : 32 * 14, yStart : 32 * 0, xEnd : 32 * 15, yEnd : 32 * 15},
  {xStart : 32 * 2, yStart : 32 * 5, xEnd : 32 * 5, yEnd : 32 * 9},
  {xStart : 32 * 10, yStart : 32 * 5, xEnd : 32 * 13, yEnd : 32 * 9},
  {xStart : 32 * 6, yStart : 32 * 5, xEnd : 32 * 9, yEnd : 32 * 9},
]

var enemy = {
  x : 32 * 2,
  y : 32 * 4,
  hit : false,
  move : 0,
}

function setup() {
  color(255, 255, 255);
  createCanvas(mapSize, mapSize);
}

function draw() {
  background(175);
  movement();
  drawHitbox();
  extraText();
  enemyhit();
  updateBounds();
}

function enemyhit(){
  fill(255, 0, 0);
  rect(enemy.x, enemy.y, 32, 32);
  if((player.nextx >= enemy.x - player.size) && 
     (player.nextx <= enemy.x + 32) &&
     (player.nexty <= enemy.y + 32) && 
     (player.nexty >= enemy.y - player.size)){
    enemy.hit = true;
  }
  switch(enemy.move){
    case 0:
      enemy.x += 10;
      if(enemy.x >= 32 * 13){
        ++enemy.move;
        enemy.x = 32 * 13;
      }
      break;
    case 1:
      enemy.y += 10;
      if(enemy.y >= 32 * 9){
        ++enemy.move;
        enemy.y = 32 * 9;
      }
      break;
    case 2:
      enemy.x -= 10;
      if(enemy.x <= 32 * 1){
        enemy.move = 3;
        enemy.x = 32 * 1;
      }
      break;
    case 3:
      enemy.y -= 10;
      if(enemy.y <= 32 * 4){
        enemy.move = 0;
        enemy.y = 32 * 4;
      }
  }
}

function updateBounds(){
  fill(0, 200, 255);
  rect(player.nextx, player.nexty, player.size, player.size);
  if(enemy.hit === false){
    player.x = player.nextx;
    player.y = player.nexty;
  }else{
    player.nextx = 40;
    player.nexty = 20;
  }
  enemy.hit = false;
}

function drawHitbox(){
  fill(125, 125, 125);
  for(let i in hitbox){
    rect(hitbox[i].xStart, 
         hitbox[i].yStart, 
         hitbox[i].xEnd - hitbox[i].xStart, 
         hitbox[i].yEnd - hitbox[i].yStart
        );
    
    let upHit = hitbox[i].yStart - player.size;
    let downHit = hitbox[i].yEnd;
    let leftHit = hitbox[i].xStart - player.size;
    let rightHit = hitbox[i].xEnd;

    if((player.x >= leftHit) && 
       (player.x <= leftHit + 10) &&
       (player.y >= upHit) && 
       (player.y <= downHit)){
       player.speedRight = 0;
    }
    if((player.x >= rightHit - 10) && 
       (player.x <= rightHit) && 
       (player.y >= upHit) && 
       (player.y <= downHit)){
      player.speedLeft = 0;
    }
    if((player.y >= upHit) && 
       (player.y <= upHit + 10) && 
       (player.x >= leftHit) && 
       (player.x <= rightHit)){
      player.speedDown = 0;
    }
    if((player.y >= downHit - 10) && 
       (player.y <= downHit) && 
       (player.x >= leftHit) && 
       (player.x <= rightHit)){
      player.speedUp = 0;
    }
  }
}

function extraText(){
  fill(0);
  textSize(16);
  text(`${player.x}, ${player.y}`, 5, 16);
}

function movement(){
  if((keyIsDown(LEFT_ARROW)) && (player.x >= 0)){
    player.nextx -= player.speedLeft;
  }
  if((keyIsDown(RIGHT_ARROW)) && (player.x <= (mapSize - player.size))){
    player.nextx += player.speedRight;
  }
  if(keyIsDown(UP_ARROW) && player.y >= 0){
    player.nexty -= player.speedUp;
  }
  if(keyIsDown(DOWN_ARROW) && player.y <= (mapSize - player.size)){
    player.nexty += player.speedDown;
  }
  player.speedLeft = 3;
  player.speedRight = 3;
  player.speedUp = 3;
  player.speedDown = 3;
} 