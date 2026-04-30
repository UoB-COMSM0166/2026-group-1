/*
=======================================
VERSION: 1.2
SYSTEM: Controsl Page
AUTHOR: Monal Gupta
DESCRIPTION:
- control instructions screen
- between story and menu pages
=======================================
*/

import { CANVAS, CONTROLS, keyLabel } from "../config.js";

export function createControlsPageSystem(){
    const boxWidth = CANVAS.WIDTH * 0.88;
    const boxHeight = CANVAS.HEIGHT * 0.76;
    const boxX = CANVAS.WIDTH / 2 - boxWidth / 2;
    const boxY = CANVAS.HEIGHT / 2 - boxHeight / 2 + 20;

    const keyW = 58;
    const colGap = 44;
    const labelSize = 27;

    const clusterW = keyW * 3;
    const labelColW = 215;
    const rowW = clusterW + colGap + labelColW;

    const contentLeft = CANVAS.WIDTH / 2 - rowW / 2;
    const labelX = contentLeft + clusterW + colGap;

    const btnWidth = 130;
    const btnHeight = 45;
    const gap = 20;
    const totalW = btnWidth * 2 + gap;
    const btnY = CANVAS.HEIGHT - btnHeight - 50;
    const backX = CANVAS.WIDTH / 2 - totalW / 2;
    const nextX = backX + btnWidth + gap;
    const singleBtnX = CANVAS.WIDTH / 2 - btnWidth / 2;

    function isHover(x, y, w, h) {
        return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
    }

    function drawButton(x, y, w, h, label) {
        const hover = isHover(x, y, w, h);

        noStroke();
        fill(0, 0, 0, 120);
        rect(x + 3, y + 4, w, h, 10);

        fill(hover ? color(0, 210, 190) : color(0, 140, 130));
        rect(x, y, w, h, 10);

        fill(255, 255, 255, 40);
        rect(x, y, w, h * 0.35, 10);

        fill(255);
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(18);
        text(label, x + w / 2, y + h / 2);
        textStyle(NORMAL);
    }

    function drawKey(x, y, keyLabel) {
        const w = 58;
        const h = 58;
        const r = 10;

        noStroke();
        fill(0, 0, 0, 120);
        rect(x + 3, y + 4, w, h, r);

        fill(235);
        rect(x, y, w, h, r);

        fill(255, 255, 255, 180);
        rect(x, y, w, h * 0.4, r);

        noFill();
        stroke(120);
        strokeWeight(2);
        rect(x, y, w, h, r);

        noStroke();
        fill(30);
        textStyle(BOLD);
        textSize(15);
        textAlign(CENTER, CENTER);
        text(keyLabel, x + w / 2, y + h / 2 + 1);
        textStyle(NORMAL);
    }

    return {
        draw(bg, standalone = false) {
            if (bg) image(bg, 0, 0, width, height);
            else background(0);

            fill(255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(48);
            text("CONTROLS", width / 2, 90);
            textStyle(NORMAL);

            fill(0, 0, 0, 185);
            noStroke();
            rect(boxX, boxY, boxWidth, boxHeight, 20);

            let y = boxY + 55;
            const rowH = 60; 
            const midKey = keyW / 2;

            //keys
            drawKey(contentLeft + keyW, y, "W");
            drawKey(contentLeft,        y + keyW + 4, "A");
            drawKey(contentLeft + keyW, y + keyW + 4, "S");
            drawKey(contentLeft + keyW * 2, y + keyW + 4, "D");

            fill(255);
            noStroke();
            textAlign(LEFT, CENTER);
            textStyle(BOLD);
            textSize(labelSize);
            text("Move", labelX, y + keyW + 4 + midKey);

            y += keyW * 2 + 4 + 22;

            drawKey(contentLeft+ keyW, y, "SHIFT");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Move Slow", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft + keyW, y, "E");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Sonar Pulse", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, "F");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Torch", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, "SPACE");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Missile", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, keyLabel(CONTROLS.MODES[CONTROLS.DEFAULT_MODE].TOGGLE_WORKSHOP));
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Workshop", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, "C");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Show Controls", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, "`");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Toggle Full Screen", labelX, y + midKey);
            y += rowH;

            drawKey(contentLeft+ keyW, y, "ESC");
            fill(255); noStroke();
            textAlign(LEFT, CENTER); textStyle(BOLD); textSize(labelSize);
            text("Pause / Settings", labelX, y + midKey);

            textStyle(NORMAL);

            fill(210);
            noStroke();
            textAlign(CENTER, CENTER);
            textStyle(NORMAL);
            textSize(15);
            text("(Movement keys can be changed to Arrows in settings)", width / 2, btnY - 40);

            if (standalone) {
                drawButton(singleBtnX, btnY, btnWidth, btnHeight, "BACK");
            } else {
                drawButton(backX, btnY, btnWidth, btnHeight, "BACK");
                drawButton(nextX, btnY, btnWidth, btnHeight, "NEXT");
            }
        },

        checkClick(standalone = false) {
            const bx = standalone ? singleBtnX : backX;
            if (mouseX > bx && mouseX < bx + btnWidth && mouseY > btnY && mouseY < btnY + btnHeight) return "BACK";

            if (!standalone && mouseX > nextX && mouseX < nextX + btnWidth && mouseY > btnY && mouseY < btnY + btnHeight) return "NEXT";

            return null;
        },
    };
}
