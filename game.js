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
  }  draw() {
    ctx.save();

    const c = this.stats.color;
    const f = this.facing;

    // 1. Ground Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, this.grounded ? 18 : 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic lean & squash/stretch
    const tilt = this.hitstun > 0 ? -f * 0.35 : (this.vx * 0.035);
    const bounce = this.grounded ? Math.abs(Math.sin(this.animFrame)) * 3 : 0;

    ctx.translate(this.x, this.y);
    ctx.rotate(tilt);

    const hipY = -22 + bounce;
    const shoulderY = -42 + bounce;
    const headY = -57 + bounce;
    const stride = this.grounded ? Math.sin(this.animFrame) * 11 : 7;

    // Helper to draw outlined, shaded limb
    const drawLimb = (x1, y1, x2, y2, width, color) => {
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = width + 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // 2. Back Arm
    const backArmX = -f * (this.attackTimer > 0 ? 12 : 8 + stride * 0.4);
    drawLimb(0, shoulderY + 2, backArmX, shoulderY + 13, 6, c);

    // 3. Back & Front Legs + Boots
    const backFootX = -stride;
    const frontFootX = stride;
    const backFootY = this.grounded ? 0 : -5;
    const frontFootY = this.grounded ? 0 : -2;

    drawLimb(-2, hipY, backFootX, backFootY - 3, 7, c);
    drawLimb(2, hipY, frontFootX, frontFootY - 3, 7, c);

    // Boots / Shoes
    ctx.fillStyle = "#1e2436";
    ctx.strokeStyle = "#0b0d14";
    ctx.lineWidth = 2;
    [backFootX, frontFootX].forEach((fx, idx) => {
      const fy = idx === 0 ? backFootY : frontFootY;
      ctx.beginPath();
      ctx.ellipse(fx + f * 3, fy - 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 4. Muscular / Armored Torso
    ctx.fillStyle = c;
    ctx.strokeStyle = "#0b0d14";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, shoulderY - 2);
    ctx.lineTo(9, shoulderY - 2);
    ctx.lineTo(6, hipY + 2);
    ctx.lineTo(-6, hipY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chest Highlight Stripe
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(-4, shoulderY);
    ctx.lineTo(2, shoulderY);
    ctx.lineTo(0, hipY);
    ctx.lineTo(-3, hipY);
    ctx.closePath();
    ctx.fill();

    // Tie Gear
    if (this.stats.hat === "tie") {
      ctx.fillStyle = "#ff2e2e";
      ctx.beginPath();
      ctx.moveTo(f * 2, shoulderY + 1);
      ctx.lineTo(f * 6, shoulderY + 12);
      ctx.lineTo(f * 2, shoulderY + 16);
      ctx.lineTo(-f * 2, shoulderY + 12);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Shaded Head & Expressive Eyes
    const headGrad = ctx.createRadialGradient(-3, headY - 4, 2, 0, headY, 12);
    headGrad.addColorStop(0, "#ffffff");
    headGrad.addColorStop(0.25, c);
    headGrad.addColorStop(1, "#111522");

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = "#0b0d14";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, headY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes (or Visor)
    if (this.stats.hat === "visor") {
      ctx.fillStyle = "#00f7ff";
      ctx.shadowColor = "#00f7ff";
      ctx.shadowBlur = 8;
      ctx.fillRect(f === 1 ? 1 : -10, headY - 4, 9, 5);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(f * 5, headY - 1, 2.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hats & Helmets
    if (this.stats.hat === "cap") {
      ctx.fillStyle = c;
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headY - 3, 11, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(f === 1 ? -2 : -14, headY - 5, 16, 4);
    } else if (this.stats.hat === "pointy") {
      ctx.fillStyle = c;
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, headY - 6);
      ctx.lineTo(10, headY - 6);
      ctx.lineTo(-f * 16, headY - 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 6. Front Arm, Gloves & Weapons
    const punchReach = this.attackTimer > 0 ? 30 : 11;
    const handX = f * punchReach;
    const handY = shoulderY + (this.attackTimer > 0 ? -3 : 11);
    drawLimb(0, shoulderY + 2, handX, handY, 6, c);

    // Glove / Fist
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#0b0d14";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handX, handY, this.attackTimer > 0 ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Punch Shockwave Effect
    if (this.attackTimer > 6 && this.stats.weapon === "none") {
      ctx.strokeStyle = this.stats.specialColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(handX + f * 6, handY, 12, -0.8, 0.8);
      ctx.stroke();
    }

    // Glowing Energy Sword & Slash Arc
    if (this.stats.weapon === "sword") {
      const tipX = handX + f * 28;
      const tipY = handY - 24;

      // Sword Blade
      ctx.strokeStyle = "#74b9ff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Hilt
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(handX - f * 3, handY - 4);
      ctx.lineTo(handX + f * 3, handY + 4);
      ctx.stroke();

      // Slash Crescent when swinging
      if (this.attackTimer > 4) {
        ctx.strokeStyle = this.stats.specialColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(handX, handY, 34, f === 1 ? -1.1 : 2.0, f === 1 ? 0.5 : 3.6);
        ctx.stroke();
      }
    } else if (this.stats.weapon === "blaster") {
      ctx.fillStyle = "#2d3436";
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = 2;
      ctx.fillRect(f === 1 ? handX - 2 : handX - 16, handY - 6, 18, 9);
      ctx.strokeRect(f === 1 ? handX - 2 : handX - 16, handY - 6, 18, 9);

      // Barrel Glow
      ctx.fillStyle = this.stats.specialColor;
      ctx.fillRect(f === 1 ? handX + 14 : handX - 18, handY - 4, 4, 5);
    }

    // 7. Glossy Smash Shield Bubble
    if (this.shielding) {
      const shieldGrad = ctx.createRadialGradient(0, -32, 6, 0, -32, 36);
      shieldGrad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
      shieldGrad.addColorStop(0.75, this.isPlayer1 ? "rgba(255, 59, 59, 0.35)" : "rgba(59, 158, 255, 0.35)");
      shieldGrad.addColorStop(1, this.isPlayer1 ? "rgba(255, 120, 120, 0.8)" : "rgba(120, 200, 255, 0.8)");

      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, -32, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Counter Aura Ring
    if (this.counterTimer > 0) {
      ctx.strokeStyle = this.stats.specialColor;
      ctx.shadowColor = this.stats.specialColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -32, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
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
  const k = e.key.toLowerCase();
  if (k === "a" || e.key === "ArrowLeft") inputState.left = false;
  if (k === "d" || e.key === "ArrowRight") inputState.right = false;
  if (k === "s" || e.key === "ArrowDown") inputState.down = false;
});

// Simple CPU AI for Solo Mode
function getCpuKeys(bot, target) {
  const keys = { left: false, right: false, down: false, jumpPressed: false, normalPressed: false, specialPressed: false };
  if (!soloCpuEnabled) return keys;

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;

  // Recover if falling off stage
  if (bot.x < 220) keys.right = true;
  else if (bot.x > 780) keys.left = true;
  else if (Math.abs(dx) > 55) {
    if (dx > 0) keys.right = true;
    else keys.left = true;
  }

  if ((bot.y > 410 || dy < -60) && Math.random() < 0.08) keys.jumpPressed = true;
  if (Math.abs(dx) < 65 && Math.abs(dy) < 45 && Math.random() < 0.08) keys.normalPressed = true;
  if (Math.abs(dx) >= 140 && Math.abs(dx) < 350 && Math.random() < 0.03) keys.specialPressed = true;

  return keys;
}
// Webcam & Copy ID Buttons
let localStream = null;
document.getElementById("camBtn").onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById("localVideo").srcObject = localStream;
    document.getElementById("camBtn").textContent = "Webcam Active";
  } catch (err) {
    alert("Could not access Chromebook camera. Check browser permissions.");
  }
};

document.getElementById("copyBtn").onclick = () => {
  const idText = document.getElementById("myId").textContent;
  navigator.clipboard.writeText(idText);
  document.getElementById("copyBtn").textContent = "Copied!";
  setTimeout(() => (document.getElementById("copyBtn").textContent = "Copy ID"), 1500);
};

// PeerJS Chromebook Multiplayer (Safe Offline Fallback)
let peer = null;
let conn = null;
let isHost = true;
let isMultiplayer = false;

try {
  if (typeof Peer !== "undefined") {
    peer = new Peer();
    peer.on("open", (id) => {
      document.getElementById("myId").textContent = id;
    });
    peer.on("connection", (incomingConn) => {
      conn = incomingConn;
      isHost = true;
      isMultiplayer = true;
      setupConnectionHandlers();
      startGame();
    });
    peer.on("call", (call) => {
      call.answer(localStream);
      call.on("stream", (remoteStream) => {
        document.getElementById("remoteVideo").srcObject = remoteStream;
      });
    });
  } else {
    document.getElementById("myId").textContent = "Offline (Solo Ready)";
  }
} catch (err) {
  document.getElementById("myId").textContent = "Offline (Solo Ready)";
}

document.getElementById("connectBtn").onclick = () => {
  if (!peer) {
    alert("Multiplayer requires an internet connection to PeerJS.");
    return;
  }
  const friendId = document.getElementById("joinIdInput").value.trim();
  if (!friendId) return;
  isHost = false;
  isMultiplayer = true;
  conn = peer.connect(friendId);
  setupConnectionHandlers();
  if (localStream) {
    const call = peer.call(friendId, localStream);
    call.on("stream", (remoteStream) => {
      document.getElementById("remoteVideo").srcObject = remoteStream;
    });
  }
  startGame();
};

document.getElementById("soloBtn").onclick = () => {
  isHost = true;
  isMultiplayer = false;
  const keys = Object.keys(FIGHTERS);
  const randomOpponent = keys[Math.floor(Math.random() * keys.length)];
  p2.setFighter(randomOpponent);
  startGame();
};

document.getElementById("rematchBtn").onclick = () => {
  document.getElementById("resultsScreen").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");
};

function setupConnectionHandlers() {
  conn.on("open", () => {
    conn.send({ type: "fighter", id: selectedFighterId });
  });
  conn.on("data", (data) => {
    if (data.type === "fighter") {
      (isHost ? p2 : p1).setFighter(data.id);
    } else if (data.type === "input" && isHost) {
      p2.applyInput(data.keys);
    } else if (data.type === "state" && !isHost) {
      Object.assign(p1, data.p1);
      Object.assign(p2, data.p2);
      p1.setFighter(data.p1.fighterId);
      p2.setFighter(data.p2.fighterId);
      projectiles = data.projectiles;
    }
  });
}

function startGame() {
  matchStocks = parseInt(document.getElementById("stockSelect").value, 10);
  currentStage = document.getElementById("stageSelect").value;
  soloCpuEnabled = document.getElementById("cpuSelect").value === "cpu";

  (isHost ? p1 : p2).setFighter(selectedFighterId);
  p1.reset(true);
  p2.reset(true);
  projectiles = [];

  document.getElementById("p1NameHud").textContent = p1.stats.name;
  document.getElementById("p2NameHud").textContent = p2.stats.name;
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");

  if (!gameRunning) {
    gameRunning = true;
    requestAnimationFrame(gameLoop);
  }
}

function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Selected Stage
  const platforms = STAGES[currentStage] || STAGES.battlefield;
  for (const p of platforms) {
    ctx.fillStyle = p.solid ? "#576574" : "#8395a7";
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  if (isHost) {
    p1.applyInput(inputState);
    if (!isMultiplayer) {
      p2.applyInput(getCpuKeys(p2, p1));
    }
    p1.update(p2);
    p2.update(p1);

    // Update Projectiles
    projectiles.forEach((proj) => {
      proj.x += proj.vx;
      proj.life--;
      const target = proj.owner === p1 ? p2 : p1;
      if (Math.abs(proj.x - target.x) < 25 && Math.abs(proj.y - (target.y - 30)) < 35) {
        applySmashKnockback(target, proj.damage, Math.sign(proj.vx), proj.owner);
        proj.life = 0;
      }
    });
    projectiles = projectiles.filter((p) => p.life > 0);

    // Sync state to P2 Chromebook
    if (conn && conn.open) {
      conn.send({
        type: "state",
        p1: { x: p1.x, y: p1.y, facing: p1.facing, percent: p1.percent, stocks: p1.stocks, attackTimer: p1.attackTimer, shielding: p1.shielding, counterTimer: p1.counterTimer, animFrame: p1.animFrame, fighterId: p1.fighterId },
        p2: { x: p2.x, y: p2.y, facing: p2.facing, percent: p2.percent, stocks: p2.stocks, attackTimer: p2.attackTimer, shielding: p2.shielding, counterTimer: p2.counterTimer, animFrame: p2.animFrame, fighterId: p2.fighterId },
        projectiles: projectiles.map(({ x, y, color }) => ({ x, y, color }))
      });
    }
  } else if (conn && conn.open) {
    conn.send({ type: "input", keys: { ...inputState } });
  }

  inputState.jumpPressed = false;
  inputState.normalPressed = false;
  inputState.specialPressed = false;

  // Render Projectiles & Fighters
  projectiles.forEach((proj) => {
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  p1.draw();
  p2.draw();

  // Update Smash HUD
  document.getElementById("p1PercentHud").textContent = `${Math.floor(p1.percent)}%`;
  document.getElementById("p2PercentHud").textContent = `${Math.floor(p2.percent)}%`;
  document.getElementById("p1StocksHud").textContent = "●".repeat(Math.max(0, p1.stocks));
  document.getElementById("p2StocksHud").textContent = "●".repeat(Math.max(0, p2.stocks));

  requestAnimationFrame(gameLoop);
}
