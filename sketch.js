// ============================================================
//  CROSSY MIND — Euthymia Base Level  (First-Person Raycaster)
//  sketch.js (for use with index.html that loads p5.js + this file)
// ============================================================

const ROWS = 40,
  COLS = 40;
const MOVE_SPEED = 7.8;
const TURN_SPEED = 2.2;
const FRICTION = 0.95;
const GOAL_RADIUS = 1.2;

const GOAL_A = { x: 4.5, y: 4.5, label: "Community Centre" };
const GOAL_B = { x: 35.5, y: 35.5, label: "Hospital" };

let MAP = [];
let player;
let gameScreen = "intro";
let phase = "toB";
let pulse = 0;
let mmGfx;
const MM = 3;

// buttons (must be global because mousePressed uses them)
let startBtn = {};
let playAgainBtn = {};

// ── Build map ────────────────────────────────────────────────
function buildMap() {
  MAP = [];
  for (let r = 0; r < ROWS; r++) MAP.push(new Array(COLS).fill(1));

  // Carve open road lanes
  [3, 10, 18, 26, 34].forEach((r) => {
    for (let c = 0; c < COLS; c++) {
      MAP[r][c] = 0;
      if (r + 1 < ROWS) MAP[r + 1][c] = 0;
    }
  });
  [3, 10, 18, 26, 34].forEach((c) => {
    for (let r = 0; r < ROWS; r++) {
      MAP[r][c] = 0;
      if (c + 1 < COLS) MAP[r][c + 1] = 0;
    }
  });

  // Sidewalk border (type 2) around open tiles
  let sw = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] === 0) {
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].forEach(([dr, dc]) => {
          let nr = r + dr,
            nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && MAP[nr][nc] === 1)
            sw.add(nr + "," + nc);
        });
      }
    }
  sw.forEach((k) => {
    let [r, c] = k.split(",").map(Number);
    MAP[r][c] = 2;
  });
}

function isSolid(x, y) {
  let c = Math.floor(x),
    r = Math.floor(y);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
  return MAP[r][c] !== 0;
}

function buildMinimap() {
  mmGfx = createGraphics(COLS * MM, ROWS * MM);
  mmGfx.noStroke();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      let t = MAP[r][c];
      mmGfx.fill(t === 0 ? "#888" : t === 2 ? "#c4a882" : "#4a7c59");
      mmGfx.rect(c * MM, r * MM, MM, MM);
    }
  mmGfx.fill("#69db7c");
  mmGfx.circle(GOAL_A.x * MM, GOAL_A.y * MM, 7);
  mmGfx.fill("#ff8fab");
  mmGfx.circle(GOAL_B.x * MM, GOAL_B.y * MM, 7);
}

function resetGame() {
  player = { x: GOAL_A.x, y: GOAL_A.y, angle: -0.5, speed: 0 };
  phase = "toB";
  pulse = 0;
}

// ── p5 setup ─────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  buildMap();
  buildMinimap();
  resetGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ── Main draw loop ────────────────────────────────────────────
function draw() {
  if (gameScreen === "intro") {
    drawIntro();
    return;
  }
  if (gameScreen === "win") {
    drawWin();
    return;
  }

  let dt = min(deltaTime / 1000, 0.05);
  pulse += dt;

  updatePlayer(dt);
  checkGoal();

  drawSkyFloor();
  castRays();
  drawCompass();
  drawHUD();
  drawMinimap();
}

// ── Player update ─────────────────────────────────────────────
function updatePlayer(dt) {
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) player.angle -= TURN_SPEED * dt;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) player.angle += TURN_SPEED * dt;

  let accel = 0;
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) accel = MOVE_SPEED;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) accel = -MOVE_SPEED * 0.55;

  player.speed = (player.speed + accel * dt) * pow(FRICTION, dt * 60);
  if (abs(player.speed) < 0.005) player.speed = 0;
  player.speed = constrain(player.speed, -MOVE_SPEED * 0.55, MOVE_SPEED);

  let dx = cos(player.angle) * player.speed * dt;
  let dy = sin(player.angle) * player.speed * dt;
  let m = 0.22;

  if (!isSolid(player.x + dx + (dx >= 0 ? m : -m), player.y)) player.x += dx;
  if (!isSolid(player.x, player.y + dy + (dy >= 0 ? m : -m))) player.y += dy;

  player.x = constrain(player.x, 0.5, COLS - 0.5);
  player.y = constrain(player.y, 0.5, ROWS - 0.5);
}

function checkGoal() {
  let t = phase === "toB" ? GOAL_B : GOAL_A;
  if (dist(player.x, player.y, t.x, t.y) < GOAL_RADIUS) {
    if (phase === "toB") phase = "toA";
    else gameScreen = "win";
  }
}

// ── Sky + floor ───────────────────────────────────────────────
function drawSkyFloor() {
  let h2 = height / 2;

  // Sky gradient
  for (let y = 0; y < h2; y++) {
    let t = y / h2;
    stroke(lerp(135, 180, t), lerp(206, 225, t), lerp(250, 255, t));
    line(0, y, width, y);
  }

  // Floor gradient
  for (let y = h2; y < height; y++) {
    let t = (y - h2) / (height - h2);
    stroke(lerp(120, 75, t), lerp(110, 70, t), lerp(100, 65, t));
    line(0, y, width, y);
  }

  noStroke();
}

// ── Raycaster (DDA) ───────────────────────────────────────────
function castRays() {
  let fov = PI / 3;
  let horizon = height / 2;
  let numRays = width;

  for (let col = 0; col < numRays; col++) {
    let rayA = player.angle - fov / 2 + (col / numRays) * fov;
    let rdx = cos(rayA),
      rdy = sin(rayA);

    let mc = Math.floor(player.x),
      mr = Math.floor(player.y);
    let ddx = abs(rdx) < 1e-10 ? 1e30 : abs(1 / rdx);
    let ddy = abs(rdy) < 1e-10 ? 1e30 : abs(1 / rdy);

    let sc, sr, sdx, sdy;
    if (rdx < 0) {
      sc = -1;
      sdx = (player.x - mc) * ddx;
    } else {
      sc = 1;
      sdx = (mc + 1 - player.x) * ddx;
    }
    if (rdy < 0) {
      sr = -1;
      sdy = (player.y - mr) * ddy;
    } else {
      sr = 1;
      sdy = (mr + 1 - player.y) * ddy;
    }

    let hit = false,
      ns = false,
      ttype = 1,
      safe = 0;
    while (!hit && safe++ < 100) {
      if (sdx < sdy) {
        sdx += ddx;
        mc += sc;
        ns = false;
      } else {
        sdy += ddy;
        mr += sr;
        ns = true;
      }

      if (mc < 0 || mc >= COLS || mr < 0 || mr >= ROWS) {
        hit = true;
        break;
      }
      if (MAP[mr][mc] !== 0) {
        hit = true;
        ttype = MAP[mr][mc];
      }
    }

    let pd = ns
      ? (mr - player.y + (1 - sr) / 2) / rdy
      : (mc - player.x + (1 - sc) / 2) / rdx;
    pd = max(pd, 0.01);

    let wallH = Math.floor(height / pd);
    let fog = constrain(1 - pd / 18, 0.05, 1.0);
    let dim = ns ? 0.72 : 1.0;

    let r, g, b;
    if (ttype === 1) {
      r = 126;
      g = 190;
      b = 140;
    } // grass
    else if (ttype === 2) {
      r = 210;
      g = 185;
      b = 145;
    } // sidewalk
    else {
      r = 190;
      g = 130;
      b = 100;
    }

    r = r * dim * fog;
    g = g * dim * fog;
    b = b * dim * fog;

    let top = Math.floor(horizon - wallH / 2);
    let bottom = Math.floor(horizon + wallH / 2);

    stroke(r, g, b);
    line(col, max(top, 0), col, min(bottom, height));
  }

  noStroke();
}

// ── Compass arrow toward goal ─────────────────────────────────
function drawCompass() {
  let target = phase === "toB" ? GOAL_B : GOAL_A;
  let col = phase === "toB" ? color(255, 139, 171) : color(105, 219, 124);
  let dx = target.x - player.x,
    dy = target.y - player.y;
  let rel = atan2(dy, dx) - player.angle;
  while (rel > PI) rel -= TWO_PI;
  while (rel < -PI) rel += TWO_PI;
  let d = dist(player.x, player.y, target.x, target.y);

  let cx = width / 2,
    cy = 50;
  fill(0, 0, 0, 130);
  noStroke();
  rect(cx - 80, cy - 34, 160, 50, 12);

  push();
  translate(cx, cy);
  rotate(rel);
  fill(col);
  noStroke();
  triangle(0, -24, -9, 10, 9, 10);
  fill(0, 0, 0, 100);
  circle(0, 0, 11);
  pop();

  fill(255);
  textSize(10);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text(target.label.toUpperCase(), cx, cy + 14);
  fill(180);
  textStyle(NORMAL);
  textSize(9);
  text(nf(d, 1, 1) + " units", cx, cy + 26);
}

// ── HUD (bottom-left) ─────────────────────────────────────────
function drawHUD() {
  let isToB = phase === "toB";
  let dest = isToB ? GOAL_B : GOAL_A;
  let spd = abs(player.speed);
  let x = 14,
    y = height - 120,
    w = 200,
    h = 108;

  fill(0, 0, 0, 160);
  noStroke();
  rect(x, y, w, h, 16);
  stroke(isToB ? color("#ff8fab") : color("#69db7c"));
  strokeWeight(1.5);
  rect(x, y, w, h, 16);
  noStroke();

  fill(192, 132, 252);
  textSize(9);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("🌿 EUTHYMIA · BASE LEVEL", x + 10, y + 10);

  // Speed bar
  fill(50, 50, 70);
  rect(x + 10, y + 26, w - 20, 6, 3);
  if (spd > 0) {
    fill(192, 132, 252);
    rect(x + 10, y + 26, (w - 20) * min(1, spd / MOVE_SPEED), 6, 3);
  }
  fill(160);
  textSize(8);
  textStyle(NORMAL);
  text(
    nf(spd, 1, 1) + " t/s  |  " + (player.speed >= 0 ? "FWD" : "REV"),
    x + 10,
    y + 36,
  );

  fill(isToB ? color("#ff8fab") : color("#69db7c"));
  textSize(9);
  textStyle(BOLD);
  text(
    isToB ? "STEP 1/2 — DRIVE TO:" : "STEP 2/2 — RETURN TO:",
    x + 10,
    y + 52,
  );
  fill(255);
  textSize(12);
  textStyle(BOLD);
  text(dest.label, x + 10, y + 65);
  fill(150);
  textStyle(NORMAL);
  textSize(9);
  text("↑↓ drive  ·  ←→ turn", x + 10, y + 84);
}

// ── Mini-map (bottom-right) ───────────────────────────────────
function drawMinimap() {
  let mmW = COLS * MM,
    mmH = ROWS * MM;
  let mx = width - mmW - 14,
    my = height - mmH - 14;

  fill(0, 0, 0, 160);
  noStroke();
  rect(mx - 6, my - 18, mmW + 12, mmH + 26, 10);

  image(mmGfx, mx, my);

  // Direction line
  stroke(255, 255, 100, 200);
  strokeWeight(1.5);
  let px = mx + player.x * MM,
    py = my + player.y * MM;
  line(px, py, px + cos(player.angle) * 9, py + sin(player.angle) * 9);

  // Player dot
  noStroke();
  fill(255);
  circle(px, py, 7);
  fill(232, 121, 249);
  circle(px, py, 4);

  fill(192, 132, 252);
  textSize(8);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("MAP", mx + mmW / 2, my - 13);

  // Legend
  textSize(7);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  fill("#69db7c");
  text("● A", mx, my + mmH + 4);
  fill("#ff8fab");
  text("● B", mx + 24, my + mmH + 4);
  fill("#e879f9");
  text("● You", mx + 48, my + mmH + 4);
}

// ── Intro screen ──────────────────────────────────────────────
function drawIntro() {
  background(18, 12, 28);

  // Stars
  noStroke();
  for (let i = 0; i < 80; i++) {
    let sx = (i * 137.5) % width,
      sy = (i * 97.3) % height;
    fill(150 + ((i * 53) % 105));
    circle(sx, sy, (i % 3) + 1);
  }

  let cx = width / 2,
    cy = height / 2;
  let pw = 360,
    ph = 430;

  fill(22, 12, 38, 245);
  stroke(140, 90, 210);
  strokeWeight(2);
  rect(cx - pw / 2, cy - ph / 2, pw, ph, 22);
  noStroke();

  // Mini road preview
  fill(80, 80, 100);
  rect(cx - pw / 2 + 4, cy - ph / 2 + 4, pw - 8, 64, 18, 18, 0, 0);
  stroke(255, 240, 100, 160);
  strokeWeight(2);
  for (let i = -2; i <= 2; i++)
    line(cx, cy - ph / 2 + 4, cx + i * 70, cy - ph / 2 + 68);
  stroke(135, 206, 250, 100);
  strokeWeight(1);
  line(cx - pw / 2 + 4, cy - ph / 2 + 10, cx + pw / 2 - 4, cy - ph / 2 + 10);
  noStroke();

  fill(240, 100, 180);
  textSize(28);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("Crossy Mind", cx, cy - ph / 2 + 78);
  fill(160, 120, 220);
  textSize(11);
  textStyle(NORMAL);
  text("☁  EUTHYMIA · FIRST PERSON VIEW  ☁", cx, cy - ph / 2 + 114);

  // Goal chips
  drawChip(
    cx - 115,
    cy - ph / 2 + 142,
    "🏫",
    "Community Centre",
    color("#69db7c"),
    "START",
  );
  fill(180, 150, 240);
  textSize(18);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("→", cx, cy - ph / 2 + 158);
  drawChip(
    cx + 28,
    cy - ph / 2 + 142,
    "🏥",
    "Hospital",
    color("#ff8fab"),
    "GOAL",
  );

  fill(170, 145, 210);
  textSize(12);
  textStyle(NORMAL);
  textAlign(CENTER, TOP);
  text("Drive A→B and back for a round trip!", cx, cy - ph / 2 + 218);
  text("Stay on the roads  🛣️", cx, cy - ph / 2 + 236);

  // Controls box
  let cbx = cx - 100,
    cby = cy - ph / 2 + 262;
  fill(38, 22, 60, 190);
  stroke(100, 65, 150);
  strokeWeight(1);
  rect(cbx, cby, 200, 90, 12);
  noStroke();
  fill(160, 120, 220);
  textSize(10);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("CONTROLS", cx, cby + 8);
  let rows = [
    ["↑ / W", "Drive forward"],
    ["↓ / S", "Reverse"],
    ["← → / A D", "Steer"],
  ];
  rows.forEach(([k, v], i) => {
    fill(220, 200, 255);
    textSize(10);
    textStyle(BOLD);
    textAlign(RIGHT, TOP);
    text(k, cx - 6, cby + 26 + i * 19);
    fill(155, 135, 195);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);
    text(v, cx + 8, cby + 26 + i * 19);
  });

  let bw = 190,
    bh = 46,
    bx = cx - bw / 2,
    by = cy + ph / 2 - 66;
  startBtn = { x: bx, y: by, w: bw, h: bh };
  cuteBtn(bx, by, bw, bh, "Start Driving  🚗💨");
}

// ── Win screen ────────────────────────────────────────────────
function drawWin() {
  background(12, 24, 12);
  let cols = ["#69db7c", "#ff8fab", "#c084fc", "#fff176"];
  noStroke();
  for (let i = 0; i < 60; i++) {
    fill(cols[i % cols.length]);
    rect((i * 173.7) % width, (i * 89.3 + frameCount * 0.9) % height, 5, 5, 1);
  }

  let cx = width / 2,
    cy = height / 2,
    pw = 320,
    ph = 310;
  fill(18, 34, 18, 245);
  stroke("#69db7c");
  strokeWeight(2);
  rect(cx - pw / 2, cy - ph / 2, pw, ph, 22);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(58);
  text("🎉", cx, cy - ph / 2 + 16);
  fill("#69db7c");
  textSize(24);
  textStyle(BOLD);
  text("Route Complete!", cx, cy - ph / 2 + 84);
  textSize(26);
  textStyle(NORMAL);
  text("🏫 → 🏥 → 🏫", cx, cy - ph / 2 + 120);
  fill(170, 215, 170);
  textSize(12);
  text("Round trip finished!", cx, cy - ph / 2 + 162);
  textSize(22);
  text("🌟✨🌟", cx, cy - ph / 2 + 188);

  let bw = 160,
    bh = 46,
    bx = cx - bw / 2,
    by = cy + ph / 2 - 64;
  playAgainBtn = { x: bx, y: by, w: bw, h: bh };
  cuteBtn(bx, by, bw, bh, "Play Again 🔄");
}

// ── Shared helpers ────────────────────────────────────────────
function cuteBtn(x, y, w, h, label) {
  let hov = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  let oy = hov ? -2 : 0;

  fill(hov ? color(232, 121, 249) : color(217, 70, 239));
  noStroke();
  drawingContext.shadowColor = "rgba(217,70,239,0.5)";
  drawingContext.shadowBlur = hov ? 22 : 12;
  drawingContext.shadowOffsetY = hov ? 5 : 3;

  rect(x, y + oy, w, h, h / 2);

  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetY = 0;

  fill(255);
  textSize(14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 + oy);
}

function drawChip(x, y, emoji, label, col, note) {
  fill(red(col), green(col), blue(col), 40);
  stroke(col);
  strokeWeight(1.5);
  rect(x, y, 108, 66, 12);
  noStroke();
  fill(col);
  textSize(8);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(note, x + 8, y + 7);
  textSize(20);
  text(emoji, x + 8, y + 18);
  fill(210);
  textSize(9);
  textStyle(BOLD);
  text(label, x + 8, y + 46);
}

// ── Input ─────────────────────────────────────────────────────
function mousePressed() {
  if (gameScreen === "intro") {
    let b = startBtn;
    if (
      b.w &&
      mouseX > b.x &&
      mouseX < b.x + b.w &&
      mouseY > b.y &&
      mouseY < b.y + b.h
    ) {
      resetGame();
      gameScreen = "playing";
    }
  } else if (gameScreen === "win") {
    let b = playAgainBtn;
    if (
      b.w &&
      mouseX > b.x &&
      mouseX < b.x + b.w &&
      mouseY > b.y &&
      mouseY < b.y + b.h
    ) {
      resetGame();
      gameScreen = "intro";
    }
  }
}

function keyPressed() {
  if (
    [UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW, 87, 65, 83, 68].includes(
      keyCode,
    )
  )
    return false;
}
