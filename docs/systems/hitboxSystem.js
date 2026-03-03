import { DEBUG_COLOR } from "../config.js";

export class Hitbox{
  constructor(x, y, w, h){
    this.position = createVector((x + (w / 2)), (y + (h / 2)));
    this.w = w;
    this.h = h;
  }
  debugDrawHitbox(thisColor){
    switch(thisColor){
      case DEBUG_COLOR.WALL:
        fill(255, 0, 0, 125);
        break;
      case DEBUG_COLOR.PLAYER:
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
  getCornerX(){
    return this.position.x - (this.w / 2); 
  }
  getCornerY(){
    return this.position.y - (this.h / 2);
  }
  getWidth(){
    return this.w;
  }
  getHeight(){
    return this.h;
  }
}

export class Wall extends Hitbox{
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.zones = [false, false, false, false];
  }
  getZones(){
    return this.zones;
  }
  updateZones(entity){
    var vec = entity.position;
    this.zones[0] = (((vec.x + (entity.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
                     ((vec.x - (entity.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
                     ((vec.y + (entity.getHeight() / 2)) <= this.position.y - (this.h / 2)));
    this.zones[1] = ((vec.x - (entity.getWidth() / 2)) >= this.position.x + (this.w / 2))
    this.zones[2] = (((vec.x + (entity.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
                     ((vec.x - (entity.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
                     ((vec.y - (entity.getHeight() / 2)) >= this.position.y - (this.h / 2)));
    this.zones[3] = ((vec.x + (entity.getWidth() / 2)) <= this.position.x - (this.w / 2));
  }
}

// functions that handle collision between hitboxes

// aabb collision resolution 
export function isColliding(hitbox1, hitbox2){
    return(((hitbox1.position.x - (hitbox1.w / 2)) <= (hitbox2.nextPos.x + (hitbox2.w / 2))) &&
           ((hitbox1.position.x + (hitbox1.w / 2)) >= (hitbox2.nextPos.x - (hitbox2.w / 2))) &&
           ((hitbox1.position.y - (hitbox1.h / 2)) <= (hitbox2.nextPos.y + (hitbox2.h / 2))) &&
           ((hitbox1.position.y + (hitbox1.h / 2)) >= (hitbox2.nextPos.y - (hitbox2.h / 2))));
}

export function resolveWallCollision(entity, wall){
    if(wall.zones[0]){entity.nextPos.y = (wall.position.y - (wall.h / 2)) - (entity.h / 2) - 1}
    if(wall.zones[1]){entity.nextPos.x = (wall.position.x + (wall.w / 2)) + (entity.w / 2) + 1}
    if(wall.zones[2]){entity.nextPos.y = (wall.position.y + (wall.h / 2)) + (entity.h / 2) + 1}
    if(wall.zones[3]){entity.nextPos.x = (wall.position.x - (wall.w / 2)) - (entity.w / 2) - 1}
}
