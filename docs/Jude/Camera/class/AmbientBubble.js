class AmbientBubble extends Bubble {
  constructor(x, y) {
    super(x, y); // Inherit the base setup
    
    this.size = random(30, 50); 
    this.vy = random(-0.1, -0.4); 
    this.life = random(300, 400);
    
    // Remember the starting life for the alpha math
    this.maxLife = this.life; 
    
    // Sine Wave properties
    this.angle = random(TWO_PI);
    this.wiggleSpeed = random(0.02, 0.05);
    this.wiggleWidth = random(0.5, 1.5);
  }
  
  update(dt) {
    super.update(dt); 

    this.angle += this.wiggleSpeed;
    this.x += sin(this.angle) * this.wiggleWidth; 
  }
  
  show() {
    push();
    noStroke();
    
    // fades from 60 (very ghost-like) down to 0.
    let alpha = map(this.life, 0, this.maxLife, 0, 150); 
    
    fill(255, 255, 255, alpha);
    circle(this.x, this.y, this.size);
    pop();
  }
}

