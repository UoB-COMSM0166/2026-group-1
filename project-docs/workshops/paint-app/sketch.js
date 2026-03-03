let Size = 10;
let brushColour;

function setup() {
  createCanvas(800, 800);

  background(255, 255, 255);

  brushColour = "black";
}

function draw() {
  strokeWeight(5);
  stroke(0);

  fill(0);
  rect(0, 0, 100, 50);

  fill(255);
  rect(105, 0, 95, 50);

  fill("red");
  rect(205, 0, 95, 50);

  fill("green");
  rect(305, 0, 95, 50);

  fill("blue");
  rect(405, 0, 95, 50);

  fill("orange");
  rect(505, 0, 95, 50);

  fill("purple");
  rect(605, 0, 95, 50);

  fill("magenta");
  rect(705, 0, 95, 50);

  strokeWeight(5);
  line(0, 52, 800, 52);

  if (mouseIsPressed === true) {
    if (mouseY > 55) {
      noStroke();
      fill(brushColour);
      circle(mouseX, mouseY, Size);
    }
  }
  noStroke();
  fill(brushColour);
  if (keyIsDown(UP_ARROW) === true) {
    Size += 1;
  }

  if (keyIsDown(DOWN_ARROW) === true) {
    Size = max(1, Size - 1);
  }
}

function mousePressed() {
  if (mouseIsInRect(0, 0, 100, 50)) {
    brushColour = "black";
  }

  if (mouseIsInRect(105, 0, 95, 50)) {
    brushColour = "white";
  }

  if (mouseIsInRect(205, 0, 95, 50)) {
    brushColour = "red";
  }

  if (mouseIsInRect(305, 0, 95, 50)) {
    brushColour = "green";
  }

  if (mouseIsInRect(405, 0, 95, 50)) {
    brushColour = "blue";
  }

  if (mouseIsInRect(505, 0, 95, 50)) {
    brushColour = "orange";
  }

  if (mouseIsInRect(605, 0, 95, 50)) {
    brushColour = "purple";
  }

  if (mouseIsInRect(705, 0, 95, 50)) {
    brushColour = "magenta";
  }
}

function mouseIsInRect(x, y, w, h) {
  return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

function keyPressed() {
  if (key === "r") {
    clear();
    background(255);
  }
}
