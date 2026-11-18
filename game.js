const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let selectedFighterId = "01_plumber";
let matchStocks = 3;
let currentStage = "battlefield";
let soloCpuEnabled = true;

// Stage Definitions
const STAGES = {
  battlefield: [
    { x: 200, y: 420, w: 600, h: 24, solid: true },
    { x: 250, y: 310, w: 140, h: 10, solid: false },
    { x: 610, y: 310, w: 140, h: 10, solid: false },
    { x: 430, y: 210, w: 140, h: 10, solid: false }
  ],
  final: [
    { x: 180, y: 420, w: 640, h: 28, solid: true }
  ],
  towers: [
    { x: 200, y: 430, w: 600, h: 24, solid: true },
    { x: 240, y: 310, w: 120, h: 10, solid: false },
    { x: 240, y: 200, w: 120, h: 10, solid: false },
    { x: 640, y: 310, w: 120, h: 10, solid: false },
    { x: 640, y: 200, w: 120, h: 10, solid: false }
  ]
};

// Build Fighter Smash Grid UI
const rosterGrid = document.getElementById("rosterGrid");
Object.entries(FIGHTERS).forEach(([id, data]) => {
  const tile = document.createElement("div");
  tile.className = "fighter-tile" + (id === selectedFighterId ? " selected" : "");
  tile.dataset.id = id;

  const parts = data.name.split(". ");
  const num = parts[0] || "00";
  const shortName = parts[1] || data.name;

  tile.innerHTML = `
    <span class="tile-num">#${num}</span>
    <div class="tile-swatch" style="background:${data.color}"></div>
    <span class="tile-name">${shortName}</span>
  `;

  tile.onclick = () => {
    document.querySelectorAll(".fighter-tile").forEach(t => t.classList.remove("selected"));
    tile.classList.add("selected");
    selectedFighterId = id;
    document.getElementById("selectedName").textContent = data.name;
    document.getElementById("selectedStats").textContent =
      `Speed: ${data.speed} | Weight: ${data.weight} | Jumps: ${data.maxJumps} | Special: ${data.specialType.toUpperCase()}`;
  };

  rosterGrid.appendChild(tile);
});

class StickFighter {
  constructor(id, x, isPlayer1) {
    this.isPlayer1 = isPlayer1;
    this.setFighter(id);
    this.spawnX = x;
    this.reset(true);
  }

  setFighter(id) {
    this.fighterId = id;
    this.stats = FIGHTERS[id] || FIGHTERS["01_plumber"];
  }

  reset(fullReset = false) {
    this.x = this.spawnX;
    this.y = 120;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.isPlayer1 ? 1 : -1;
    this.jumpsLeft = this.stats.maxJumps;
    this.grounded = false;
    this.percent = 0;
    this.hitstun = 0;
    this.attackTimer = 0;
    this.attackType = null;
    this.shielding = false;
    this.counterTimer = 0;
    this.animFrame = 0;
    if (fullReset) this.stocks = matchStocks;
  }

  applyInput(keys) {
    if (this.hitstun > 0) {
      this.hitstun--;
      return;
    }

    this.shielding = !!keys.down && this.grounded;
    if (this.shielding) {
      this.vx *= 0.7;
      return;
    }

    if (keys.left) {
      this.vx = -this.stats.speed;
      this.facing = -1;
      this.animFrame += 0.25;
    } else if (keys.right) {
      this.vx = this.stats.speed;
      this.facing = 1;
      this.animFrame += 0.25;
    } else {
      this.vx *= 0.78;
    }

    if (keys.jumpPressed && this.jumpsLeft > 0) {
      this.vy = -this.stats.jumpForce;
      this.jumpsLeft--;
      this.grounded = false;
    }

    if (keys.normalPressed && this.attackTimer <= 0) {
      this.attackTimer = 14;
      this.attackType = "normal";
    }

    if (keys.specialPressed && this.attackTimer <= 0) {
      this.attackTimer = 20;
      this.attackType = "special";
      this.triggerSpecial();
    }
  }

  triggerSpecial() {
    const type = this.stats.specialType;
    if (type === "projectile") {
      projectiles.push({
        owner: this,
        x: this.x + this.facing * 28,
        y: this.y - 32,
        vx: this.facing * 10,
        color: this.stats.specialColor,
        damage: this.stats.specialDamage,
        life: 75
      });
    } else if (type === "dash") {
      this.vx = this.facing * 16;
    } else if (type === "uppercut") {
      this.vy = -16;
      this.vx = this.facing * 5;
    } else if (type === "counter") {
      this.counterTimer = 24;
    }
  }

  update(opponent) {
    if (this.counterTimer > 0) this.counterTimer--;

    // Gravity
    this.vy += 0.65;
    this.x += this.vx;
    this.y += this.vy;
    this.grounded = false;

    // Platform Collisions
    const platforms = STAGES[currentStage] || STAGES.battlefield;
    for (const p of platforms) {
      if (
        this.vy >= 0 &&
        this.x >= p.x &&
        this.x <= p.x + p.w &&
        this.y >= p.y &&
        this.y - this.vy <= p.y + 12
      ) {
        this.y = p.y;
        this.vy = 0;
        this.grounded = true;
        this.jumpsLeft = this.stats.maxJumps;
      }
    }

    // Active Melee Hitbox Check
    if (this.attackTimer > 0) {
      this.attackTimer--;
      if (this.attackTimer === 8 && this.stats.specialType !== "counter") {
        const reach = this.stats.weapon === "sword" ? 68 : 48;
        const hitX = this.x + this.facing * (reach * 0.6);
        const dx = Math.abs(hitX - opponent.x);
        const dy = Math.abs(this.y - 30 - (opponent.y - 30));

        if (dx < reach && dy < 45) {
          const dmg = this.attackType === "special" ? this.stats.specialDamage : this.stats.normalDamage;
          applySmashKnockback(opponent, dmg, this.facing, this);
        }
      }
    }

    // Blast Zone KO Check
    if (this.x < -120 || this.x > canvas.width + 120 || this.y > canvas.height + 120 || this.y < -200) {
      this.stocks--;
      if (this.stocks > 0) {
        this.reset(false);
      } else {
        gameRunning = false;
        const winner = this.isPlayer1 ? "PLAYER 2 WINS!" : "PLAYER 1 WINS!";
        document.getElementById("winnerText").textContent = winner;
        document.getElementById("resultsScreen").classList.remove("hidden");
      }
    }
  }

  draw() {
    ctx.save();
    ctx.strokeStyle = this.stats.color;
    ctx.fillStyle = this.stats.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    const headY = this.y - 54;
    const shoulderY = this.y - 40;
    const hipY = this.y - 20;
    const stride = Math.sin(this.animFrame) * 10;

    // Head
    ctx.beginPath();
    ctx.arc(this.x, headY, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Hats & Gear
    if (this.stats.hat === "cap") {
      ctx.fillRect(this.x - 9, headY - 12, 18 + this.facing * 5, 5);
    } else if (this.stats.hat === "visor") {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(this.x + (this.facing === 1 ? 1 : -9), headY - 4, 8, 4);
    } else if (this.stats.hat === "pointy") {
      ctx.beginPath();
      ctx.moveTo(this.x - 9, headY - 7);
      ctx.lineTo(this.x + 9, headY - 7);
      ctx.lineTo(this.x - this.facing * 12, headY - 22);
      ctx.closePath();
      ctx.fill();
    } else if (this.stats.hat === "tie") {
      ctx.fillStyle = "#ff3b3b";
      ctx.fillRect(this.x + this.facing * 2 - 2, shoulderY + 2, 4, 12);
    }

    // Torso
    ctx.beginPath();
    ctx.moveTo(this.x, shoulderY - 5);
    ctx.lineTo(this.x, hipY);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(this.x, hipY);
    ctx.lineTo(this.x - stride, this.y);
    ctx.moveTo(this.x, hipY);
    ctx.lineTo(this.x + stride, this.y);
    ctx.stroke();

    // Arms & Attack Pose
    const punchReach = this.attackTimer > 0 ? 32 : 12;
    ctx.beginPath();
    ctx.moveTo(this.x, shoulderY);
    ctx.lineTo(this.x + this.facing * punchReach, shoulderY + (this.attackTimer > 0 ? -4 : 10));
    ctx.stroke();

    // Weapons
    if (this.stats.weapon === "sword") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x + this.facing * punchReach, shoulderY);
      ctx.lineTo(this.x + this.facing * (punchReach + 26), shoulderY - 18);
      ctx.stroke();
    } else if (this.stats.weapon === "blaster") {
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(this.x + this.facing * punchReach - 4, shoulderY - 6, 12 * this.facing, 7);
    }

    // Shield Bubble
    if (this.shielding) {
      ctx.fillStyle = this.isPlayer1 ? "rgba(255, 60, 60, 0.35)" : "rgba(60, 160, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(this.x, this.y - 32, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Counter Aura
    if (this.counterTimer > 0) {
      ctx.strokeStyle = this.stats.specialColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 32, 38, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Smash Bros. Knockback Formula
function applySmashKnockback(target, damage, direction, attacker = null) {
  if (target.counterTimer > 0 && attacker) {
    target.counterTimer = 0;
    applySmashKnockback(attacker, Math.round(damage * 1.4), -direction, null);
    return;
  }

  if (target.shielding) {
    target.vx = direction * 4;
    return;
  }

  target.percent += damage;
  const launchForce = ((target.percent / 10 + (target.percent * damage) / 20) * (1.4 / target.stats.weight)) + 4.5;
  target.vx = direction * launchForce * 0.85;
  target.vy = -launchForce * 0.65;
  target.hitstun = Math.min(35, Math.floor(launchForce * 1.4));
}

const p1 = new StickFighter("01_plumber", 350, true);
const p2 = new StickFighter("03_hero", 650, false);
let projectiles = [];
let gameRunning = false;

// Keyboard Controls
const inputState = { left: false, right: false, down: false, jumpPressed: false, normalPressed: false, specialPressed: false };
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "a" || e.key === "ArrowLeft") inputState.left = true;
  if (k === "d" || e.key === "ArrowRight") inputState.right = true;
  if (k === "s" || e.key === "ArrowDown") inputState.down = true;
  if (k === "w" || e.key === "ArrowUp" || k === " ") inputState.jumpPressed = true;
  if (k === "j" || k === "z") inputState.normalPressed = true;
  if (k === "k" || k === "x") inputState.specialPressed = true;
});
window.addEventListener("keyup", (e) => {
