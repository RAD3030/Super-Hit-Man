const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let p1SelectedId = "01_plumber";
let p2SelectedId = "02_ape";
let selectingFor = 1;
let matchStocks = 3;
let currentStage = "battlefield";
let gameMode = "solo"; // "solo" | "local2p" | "online" | "training"
let itemsEnabled = true;

// 8 Stadium Definitions
const STAGES = {
  battlefield: {
    bgTop: "#1e2a4a", bgBot: "#0d111f", platColor: "#576574", softColor: "#8395a7",
    platforms: [
      { x: 200, y: 420, w: 600, h: 24, solid: true },
      { x: 250, y: 310, w: 140, h: 10, solid: false },
      { x: 610, y: 310, w: 140, h: 10, solid: false },
      { x: 430, y: 210, w: 140, h: 10, solid: false }
    ]
  },
  final: {
    bgTop: "#2c1642", bgBot: "#0a0612", platColor: "#6c5ce7", softColor: "#a29bfe",
    platforms: [
      { x: 180, y: 420, w: 640, h: 28, solid: true }
    ]
  },
  towers: {
    bgTop: "#2c221e", bgBot: "#120d0b", platColor: "#7f8c8d", softColor: "#bdc3c7",
    platforms: [
      { x: 200, y: 430, w: 600, h: 24, solid: true },
      { x: 240, y: 310, w: 120, h: 10, solid: false },
      { x: 240, y: 200, w: 120, h: 10, solid: false },
      { x: 640, y: 310, w: 120, h: 10, solid: false },
      { x: 640, y: 200, w: 120, h: 10, solid: false }
    ]
  },
  fountain: {
    bgTop: "#132a46", bgBot: "#07101c", platColor: "#00cec9", softColor: "#81ecec",
    platforms: [
      { x: 210, y: 425, w: 580, h: 24, solid: true },
      { x: 260, y: 325, w: 120, h: 10, solid: false },
      { x: 620, y: 325, w: 120, h: 10, solid: false },
      { x: 430, y: 235, w: 140, h: 10, solid: false }
    ]
  },
  stadium: {
    bgTop: "#143622", bgBot: "#08170e", platColor: "#27ae60", softColor: "#f1c40f",
    platforms: [
      { x: 160, y: 425, w: 680, h: 26, solid: true },
      { x: 260, y: 300, w: 160, h: 10, solid: false },
      { x: 580, y: 300, w: 160, h: 10, solid: false }
    ]
  },
  smashville: {
    bgTop: "#1c3b57", bgBot: "#0d1b2a", platColor: "#e67e22", softColor: "#fdcb6e",
    platforms: [
      { x: 220, y: 425, w: 560, h: 24, solid: true },
      { x: 420, y: 300, w: 160, h: 12, solid: false, moving: true }
    ]
  },
  temple: {
    bgTop: "#2b2b2b", bgBot: "#121212", platColor: "#95a5a6", softColor: "#dfe6e9",
    platforms: [
      { x: 150, y: 440, w: 700, h: 24, solid: true },
      { x: 180, y: 320, w: 220, h: 12, solid: false },
      { x: 580, y: 340, w: 230, h: 12, solid: false },
      { x: 370, y: 210, w: 240, h: 12, solid: false }
    ]
  },
  yoshi: {
    bgTop: "#1e4620", bgBot: "#0d210e", platColor: "#4cd137", softColor: "#ffffff",
    platforms: [
      { x: 210, y: 420, w: 580, h: 24, solid: true },
      { x: 250, y: 315, w: 130, h: 10, solid: false },
      { x: 435, y: 230, w: 130, h: 10, solid: false },
      { x: 620, y: 315, w: 130, h: 10, solid: false }
    ]
  }
};

// Sky Power-Up Item Catalog
const ITEM_TYPES = [
  { id: "mushroom", label: "MUSHROOM", color: "#ff3b3b", accent: "#ffffff" },
  { id: "poison", label: "POISON", color: "#8e44ad", accent: "#2ecc71" },
  { id: "star", label: "SUPER STAR", color: "#f1c40f", accent: "#ffffff" },
  { id: "tomato", label: "TOMATO -50%", color: "#e74c3c", accent: "#27ae60" },
  { id: "bobomb", label: "BOB-OMB", color: "#2d3436", accent: "#ff7675" },
  { id: "beamsword", label: "BEAM SWORD", color: "#00f7ff", accent: "#ffffff" },
  { id: "smashball", label: "SMASH BALL", color: "#fdcb6e", accent: "#ff3b3b" }
];

// Mode UI Toggle
document.getElementById("modeSelect").onchange = (e) => {
  gameMode = e.target.value;
  const onlineBox = document.getElementById("onlineControls");
  if (gameMode === "online") {
    onlineBox.classList.remove("hidden");
  } else {
    onlineBox.classList.add("hidden");
  }
  if (gameMode === "local2p") {
    document.getElementById("p2Username").value = "Player2";
  } else if (gameMode === "solo") {
    document.getElementById("p2Username").value = "CPU_Bot";
  } else if (gameMode === "training") {
    document.getElementById("p2Username").value = "Dummy";
  }
};

// P1 vs P2 Tile Target Selector
document.getElementById("targetP1Btn").onclick = () => {
  selectingFor = 1;
  document.getElementById("targetP1Btn").classList.add("active-target");
  document.getElementById("targetP2Btn").classList.remove("active-target");
};
document.getElementById("targetP2Btn").onclick = () => {
  selectingFor = 2;
  document.getElementById("targetP2Btn").classList.add("active-target");
  document.getElementById("targetP1Btn").classList.remove("active-target");
};

// Build 89-Fighter Roster Grid
const rosterGrid = document.getElementById("rosterGrid");
Object.entries(FIGHTERS).forEach(([id, data]) => {
  const tile = document.createElement("div");
  tile.className = "fighter-tile" +
    (id === p1SelectedId ? " selected-p1" : "") +
    (id === p2SelectedId ? " selected-p2" : "");
  tile.dataset.id = id;

  const parts = data.name.split(". ");
  const num = parts[0] || "00";
  const shortName = parts[1] || data.name;
  const accentColor = data.accent || "#ffffff";

  tile.innerHTML = `
    <span class="tile-num">#${num}</span>
    <div class="tile-swatch" style="background: linear-gradient(135deg, ${data.color} 55%, ${accentColor} 55%); border-radius: ${data.bodyType === 'mech' ? '4px' : '50%'};"></div>
    <span class="tile-name">${shortName}</span>
  `;

  tile.onclick = () => {
    if (selectingFor === 1) {
      document.querySelectorAll(".fighter-tile").forEach(t => t.classList.remove("selected-p1"));
      tile.classList.add("selected-p1");
      p1SelectedId = id;
      document.getElementById("p1PickLabel").textContent = data.name;
    } else {
      document.querySelectorAll(".fighter-tile").forEach(t => t.classList.remove("selected-p2"));
      tile.classList.add("selected-p2");
      p2SelectedId = id;
      document.getElementById("p2PickLabel").textContent = data.name;
    }

    document.getElementById("selectedName").textContent = data.name;
    document.getElementById("selectedStats").textContent =
      `Speed: ${data.speed} | Weight: ${data.weight} | Jumps: ${data.maxJumps} | Final Smash: ${(data.smashName || "ULTIMATE BLAST")}`;
  };

  rosterGrid.appendChild(tile);
});
class StickFighter {
  constructor(id, x, isPlayer1) {
    this.isPlayer1 = isPlayer1;
    this.username = isPlayer1 ? "Player1" : "Player2";
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
    this.hasHit = false;
    this.shielding = false;
    this.counterTimer = 0;
    this.animFrame = 0;

    // Power-up & Ultimate Bar States
    this.smashMeter = 0; // 0 to 100
    this.sizeScale = 1.0;
    this.sizeTimer = 0;
    this.starTimer = 0;
    this.beamSwordTimer = 0;
    this.finalSmashBanner = 0;

    if (fullReset) this.stocks = matchStocks;
  }

  gainMeter(amount) {
    this.smashMeter = Math.min(100, this.smashMeter + amount);
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

    const moveSpeed = this.stats.speed * (this.starTimer > 0 ? 1.35 : 1.0);

    if (keys.left) {
      this.vx = -moveSpeed;
      this.facing = -1;
      this.animFrame += 0.25;
    } else if (keys.right) {
      this.vx = moveSpeed;
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
      this.hasHit = false;
    }

    if (keys.specialPressed && this.attackTimer <= 0) {
      if (this.smashMeter >= 100) {
        this.triggerFinalSmash();
      } else {
        this.attackTimer = 20;
        this.attackType = "special";
        this.hasHit = false;
        this.triggerSpecial();
      }
    }
  }

  triggerFinalSmash() {
    this.smashMeter = 0;
    this.finalSmashBanner = 90;
    this.attackTimer = 26;
    this.attackType = "finalsmash";
    this.vx = this.facing * 20;
    this.starTimer = Math.max(this.starTimer, 120);

    projectiles.push({
      owner: this,
      x: this.x + this.facing * 40,
      y: this.y - 34,
      vx: this.facing * 15,
      color: this.stats.specialColor,
      damage: 34,
      radius: 28,
      isFinal: true,
      life: 90
    });
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
        radius: 8,
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
    if (this.starTimer > 0) this.starTimer--;
    if (this.beamSwordTimer > 0) this.beamSwordTimer--;
    if (this.finalSmashBanner > 0) this.finalSmashBanner--;
    if (this.sizeTimer > 0) {
      this.sizeTimer--;
      if (this.sizeTimer === 0) this.sizeScale = 1.0;
    }

    // Passive Ultimate Meter trickle
    this.gainMeter(0.03);

    // Gravity
    this.vy += 0.65;
    this.x += this.vx;
    this.y += this.vy;
    this.grounded = false;

    // Platform Collisions
    const stageObj = STAGES[currentStage] || STAGES.battlefield;
    for (const p of stageObj.platforms) {
      if (
        this.vy >= 0 &&
        this.x >= p.x &&
        this.x <= p.x + p.w &&
        this.y >= p.y &&
        this.y - this.vy <= p.y + 14
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

      const isMeleeSpecial = this.attackType === "special" &&
        (this.stats.specialType === "dash" || this.stats.specialType === "uppercut");
      const isNormalAttack = this.attackType === "normal";

      if (!this.hasHit && this.attackTimer >= 5 && this.attackTimer <= 12 && (isNormalAttack || isMeleeSpecial)) {
        const hasSword = this.beamSwordTimer > 0 || ["sword", "whip", "hammer"].includes(this.stats.weapon);
        const reach = (hasSword ? 78 : 54) * this.sizeScale;
        const hitX = this.x + this.facing * (reach * 0.55);
        const dx = Math.abs(hitX - opponent.x);
        const dy = Math.abs((this.y - 30 * this.sizeScale) - (opponent.y - 30 * opponent.sizeScale));

        if (dx < reach && dy < 55 * this.sizeScale) {
          let dmg = (this.attackType === "special" ? this.stats.specialDamage : this.stats.normalDamage) || 10;
          if (this.sizeScale > 1.1) dmg = Math.round(dmg * 1.45);
          if (this.beamSwordTimer > 0) dmg += 5;

          applySmashKnockback(opponent, dmg, this.facing, this);
          this.gainMeter(dmg * 1.1);
          this.hasHit = true;
        }
      }
    }

    // Blast Zone KO Check
    if (this.x < -120 || this.x > canvas.width + 120 || this.y > canvas.height + 120 || this.y < -220) {
      this.stocks--;
      if (this.stocks > 0) {
        this.reset(false);
      } else {
        gameRunning = false;
        const winnerName = this.isPlayer1 ? p2.username : p1.username;
        document.getElementById("winnerText").textContent = `${winnerName.toUpperCase()} WINS!`;
        document.getElementById("resultsScreen").classList.remove("hidden");
      }
    }
  }

  draw() {
    ctx.save();

    const c = this.starTimer > 0 ? `hsl(${(Date.now() / 4) % 360}, 95%, 60%)` : this.stats.color;
    const accent = this.stats.accent || "#ffffff";
    const f = this.facing;
    const body = this.stats.bodyType || "normal";
    const hair = this.stats.hair || "none";
    const weapon = this.beamSwordTimer > 0 ? "beamsword" : (this.stats.weapon || "none");

    // 1. Ground Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, (this.grounded ? 20 : 12) * this.sizeScale, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Overhead Username & Ultimate Meter Bar
    const overheadY = this.y - (body === "puff" ? 56 : 82) * this.sizeScale;
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = this.isPlayer1 ? "#ff6b6b" : "#54a0ff";
    ctx.fillText(this.username, this.x, overheadY - 10);

    // Ultimate Bar Background
    const barW = 54;
    const barH = 6;
    ctx.fillStyle = "#111522";
    ctx.fillRect(this.x - barW / 2, overheadY - 6, barW, barH);

    // Ultimate Bar Fill
    const fillW = (this.smashMeter / 100) * barW;
    ctx.fillStyle = this.smashMeter >= 100
      ? `hsl(${(Date.now() / 3) % 360}, 100%, 55%)`
      : "#f1c40f";
    ctx.fillRect(this.x - barW / 2, overheadY - 6, fillW, barH);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barW / 2, overheadY - 6, barW, barH);

    if (this.smashMeter >= 100) {
      ctx.font = "bold 10px Segoe UI, sans-serif";
      ctx.fillStyle = "#ffeaa7";
      ctx.fillText("ULTIMATE READY!", this.x, overheadY - 22);
    }

    // Final Smash Callout Banner
    if (this.finalSmashBanner > 0) {
      ctx.font = "italic 900 18px Segoe UI, sans-serif";
      ctx.fillStyle = "#f1c40f";
      ctx.fillText(this.stats.smashName || "FINAL SMASH!", this.x, overheadY - 36);
    }

    // Apply Character Scale (Mushroom / Poison Mushroom)
    const tilt = this.hitstun > 0 ? -f * 0.35 : (this.vx * 0.035);
    const bounce = this.grounded ? Math.abs(Math.sin(this.animFrame)) * 3 : 0;

    ctx.translate(this.x, this.y);
    ctx.scale(this.sizeScale, this.sizeScale);
    ctx.rotate(tilt);

    // === KIRBY / JIGGLYPUFF / PAC-MAN PUFFBALL BODY ===
    if (body === "puff") {
      const r = 17;
      const puffY = -18 + bounce;
      const stride = this.grounded ? Math.sin(this.animFrame) * 7 : 4;

      // Red/Colored Feet
      ctx.fillStyle = accent;
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(-stride + f * 3, -3, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(stride + f * 3, -3, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ears / Horns
      if (hair === "ears" || hair === "horns") {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-10, puffY - 10);
        ctx.lineTo(-14, puffY - 23);
        ctx.lineTo(-2, puffY - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Spherical Puff Body
      const grad = ctx.createRadialGradient(-4, puffY - 5, 2, 0, puffY, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.28, c);
      grad.addColorStop(1, "#111522");
      ctx.fillStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, puffY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rosy Cheeks & Big Cute Eyes
      ctx.fillStyle = "#ff6b81";
      ctx.beginPath();
      ctx.ellipse(f * 3, puffY + 1, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.stats.hat === "visor") {
        ctx.fillStyle = "#00f7ff";
        ctx.fillRect(f === 1 ? 0 : -13, puffY - 5, 13, 6);
      } else {
        ctx.fillStyle = "#0b0d14";
        ctx.beginPath();
        ctx.ellipse(f * 7, puffY - 3, 2.3, 4.5, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "#ffffff";
ctx.beginPath();
ctx.arc(f * 7.5, puffY - 4.5, 1.1, 0, Math.PI * 2);
ctx.fill();
}
// Stubby Arms
const handX = f * (this.attackTimer > 0 ? 25 : 13);
const handY = puffY + (this.attackTimer > 0 ? -2 : 4);
ctx.fillStyle = c;
ctx.beginPath();
ctx.arc(handX, handY, 5.5, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
this.drawWeapon(weapon, handX, handY, f, accent);
this.drawOverlays();
ctx.restore();
return;
}
// === MUSCULAR / CHIBI / TALL / REPTILE / MECH HUMANOID RENDER ===
const isMuscular = body === "muscular";
const isChibi = body === "chibi";
const isTall = body === "tall";
const isFlat = body === "flat";
const wScale = isMuscular ? 1.45 : isChibi ? 0.9 : isFlat ? 0.45 : 1.0;
const hScale = isTall ? 1.14 : isChibi ? 0.78 : isMuscular ? 1.08 : 1.0;
ctx.scale(wScale, hScale);
const hipY = -22 + bounce;
const shoulderY = -43 + bounce;
const headY = -57 + bounce;
const stride = this.grounded ? Math.sin(this.animFrame) * 11 : 7;
const limbW = isMuscular ? 9.5 : 6;
const drawLimb = (x1, y1, x2, y2, width, color) => {
ctx.lineCap = body === "mech" ? "square" : "round";
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
// Long Hair / Cape
if (hair === "long") {
ctx.fillStyle = accent;
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(-f * 4, headY - 4);
ctx.lineTo(-f * 16, shoulderY + 18);
ctx.lineTo(-f * 6, shoulderY + 18);
ctx.closePath();
ctx.fill();
ctx.stroke();
} else if (hair === "ponytail") {
ctx.fillStyle = accent;
ctx.beginPath();
ctx.arc(-f * 11, headY - 3, 5, 0, Math.PI * 2);
ctx.fill();
}
// Back Arm
const backArmX = -f * (this.attackTimer > 0 ? 12 : 8 + stride * 0.4);
drawLimb(0, shoulderY + 2, backArmX, shoulderY + 13, limbW, c);
// Legs & Boots
const backFootX = -stride;
const frontFootX = stride;
const backFootY = this.grounded ? 0 : -5;
const frontFootY = this.grounded ? 0 : -2;
drawLimb(-2, hipY, backFootX, backFootY - 3, limbW + 1, accent);
drawLimb(2, hipY, frontFootX, frontFootY - 3, limbW + 1, accent);
ctx.fillStyle = isFlat ? c : "#1e2436";
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 2;
[backFootX, frontFootX].forEach((fx, idx) => {
const fy = idx === 0 ? backFootY : frontFootY;
ctx.beginPath();
ctx.ellipse(fx + f * 3, fy - 2, 7.5, 4, 0, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
});
// Broad Muscular V-Taper Torso vs Standard Torso
const topW = isMuscular ? 14 : 10;
const botW = isMuscular ? 8 : 7;
ctx.fillStyle = c;
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 3;
if (body === "mech") {
ctx.fillRect(-10, shoulderY - 2, 20, hipY - shoulderY + 4);
ctx.strokeRect(-10, shoulderY - 2, 20, hipY - shoulderY + 4);
} else {
ctx.beginPath();
ctx.moveTo(-topW, shoulderY - 2);
ctx.lineTo(topW, shoulderY - 2);
ctx.lineTo(botW, hipY + 2);
ctx.lineTo(-botW, hipY + 2);
ctx.closePath();
ctx.fill();
ctx.stroke();
}
// Muscular Pectoral / Chest Plate Detail
if (isMuscular) {
ctx.fillStyle = accent;
ctx.beginPath();
ctx.ellipse(0, shoulderY + 8, 9, 6, 0, 0, Math.PI * 2);
ctx.fill();
} else {
ctx.fillStyle = accent;
ctx.fillRect(-botW, hipY - 5, botW * 2, 6);
}
// Red Tie (Donkey Kong)
if (this.stats.hat === "tie") {
ctx.fillStyle = "#ff2e2e";
ctx.beginPath();
ctx.moveTo(f * 2, shoulderY + 1);
ctx.lineTo(f * 6, shoulderY + 14);
ctx.lineTo(f * 2, shoulderY + 18);
ctx.lineTo(-f * 2, shoulderY + 14);
ctx.closePath();
ctx.fill();
}
// Head
const headR = isChibi ? 13 : 11;
const headGrad = ctx.createRadialGradient(-3, headY - 4, 2, 0, headY, headR);
headGrad.addColorStop(0, isFlat ? c : "#ffffff");
headGrad.addColorStop(0.28, c);
headGrad.addColorStop(1, isFlat ? c : "#111522");
ctx.fillStyle = headGrad;
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 3;
if (body === "mech") {
ctx.fillRect(-10, headY - 10, 20, 20);
ctx.strokeRect(-10, headY - 10, 20, 20);
} else {
ctx.beginPath();
ctx.arc(0, headY, headR, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
}
// Hair, Ears, Horns
if (hair === "spiky") {
ctx.fillStyle = accent;
ctx.beginPath();
ctx.moveTo(-9, headY - 7);
ctx.lineTo(-4, headY - 19);
ctx.lineTo(0, headY - 11);
ctx.lineTo(5, headY - 20);
ctx.lineTo(9, headY - 7);
ctx.closePath();
ctx.fill();
} else if (hair === "ears") {
ctx.fillStyle = c;
ctx.beginPath();
ctx.moveTo(-6, headY - 8);
ctx.lineTo(-9, headY - 22);
ctx.lineTo(-1, headY - 10);
ctx.moveTo(2, headY - 10);
ctx.lineTo(7, headY - 22);
ctx.lineTo(8, headY - 8);
ctx.fill();
ctx.stroke();
} else if (hair === "horns") {
ctx.fillStyle = "#ffeaa7";
ctx.beginPath();
ctx.moveTo(-7, headY - 8);
ctx.lineTo(-13, headY - 20);
ctx.lineTo(-2, headY - 10);
ctx.moveTo(2, headY - 10);
ctx.lineTo(13, headY - 20);
ctx.lineTo(7, headY - 8);
ctx.fill();
ctx.stroke();
}
// Eyes / Visor
if (this.stats.hat === "visor") {
ctx.fillStyle = "#00f7ff";
ctx.fillRect(f === 1 ? 1 : -10, headY - 4, 9, 5);
} else {
ctx.fillStyle = "#ffffff";
ctx.beginPath();
ctx.ellipse(f * 5, headY - 1, 2.5, 3.5, 0, 0, Math.PI * 2);
ctx.fill();
}
// Hats, Crowns & Hoods
if (this.stats.hat === "cap") {
ctx.fillStyle = c;
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(0, headY - 3, headR, Math.PI, 0);
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
} else if (this.stats.hat === "crown") {
ctx.fillStyle = "#f1c40f";
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(-7, headY - 9);
ctx.lineTo(-7, headY - 17);
ctx.lineTo(-2, headY - 13);
ctx.lineTo(0, headY - 18);
ctx.lineTo(2, headY - 13);
ctx.lineTo(7, headY - 17);
ctx.lineTo(7, headY - 9);
ctx.closePath();
ctx.fill();
ctx.stroke();
}
// Front Arm & Fist
const punchReach = this.attackTimer > 0 ? 30 : 11;
const handX = f * punchReach;
const handY = shoulderY + (this.attackTimer > 0 ? -3 : 11);
drawLimb(0, shoulderY + 2, handX, handY, limbW, c);
ctx.fillStyle = weapon === "gloves" ? "#ff3333" : "#ffffff";
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 2;
const fistR = isMuscular ? 6.5 : weapon === "gloves" ? 7 : 4.5;
ctx.beginPath();
ctx.arc(handX, handY, fistR, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();
this.drawWeapon(weapon, handX, handY, f, accent);
ctx.scale(1 / wScale, 1 / hScale);
this.drawOverlays();
ctx.restore();
}
drawWeapon(weapon, handX, handY, f, accent) {
if (weapon === "sword" || weapon === "beamsword") {
const len = weapon === "beamsword" ? 38 : 28;
const tipX = handX + f * len;
const tipY = handY - (len - 4);
ctx.strokeStyle = weapon === "beamsword" ? "#00f7ff" : "#74b9ff";
ctx.lineWidth = weapon === "beamsword" ? 8 : 6;
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
} else if (weapon === "blaster") {
ctx.fillStyle = "#2d3436";
ctx.strokeStyle = "#0b0d14";
ctx.lineWidth = 2;
ctx.fillRect(f === 1 ? handX - 2 : handX - 16, handY - 6, 18, 9);
ctx.strokeRect(f === 1 ? handX - 2 : handX - 16, handY - 6, 18, 9);
} else if (weapon === "hammer") {
ctx.strokeStyle = "#8e5a2b";
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(handX, handY);
ctx.lineTo(handX + f * 18, handY - 18);
ctx.stroke();
ctx.fillStyle = accent;
ctx.fillRect(handX + f * 12, handY - 26, 14, 10);
} else if (weapon === "wand") {
ctx.strokeStyle = "#f1c40f";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(handX, handY);
ctx.lineTo(handX + f * 18, handY - 18);
ctx.stroke();
ctx.fillStyle = this.stats.specialColor;
ctx.beginPath();
ctx.arc(handX + f * 18, handY - 18, 4.5, 0, Math.PI * 2);
ctx.fill();
} else if (weapon === "bow") {
ctx.strokeStyle = "#f1c40f";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(handX + f * 4, handY, 14, f === 1 ? -1.2 : 1.9, f === 1 ? 1.2 : 4.4);
ctx.stroke();
} else if (weapon === "whip" && this.attackTimer > 3) {
ctx.strokeStyle = accent;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(handX, handY);
ctx.quadraticCurveTo(handX + f * 22, handY - 12, handX + f * 42, handY + 2);
ctx.stroke();
}
}
drawOverlays() {
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
if (this.counterTimer > 0) {
ctx.strokeStyle = this.stats.specialColor;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(0, -32, 40, 0, Math.PI * 2);
ctx.stroke();
}
}
}
// Smash Bros. Knockback Formula
function applySmashKnockback(target, damage, direction, attacker = null) {
  if (target.starTimer > 0) return; // Super Star invincibility

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
  target.gainMeter(damage * 0.8);
  const launchForce = ((target.percent / 10 + (target.percent * damage) / 20) * (1.4 / target.stats.weight)) + 4.5;
  target.vx = direction * launchForce * 0.85;
  target.vy = -launchForce * 0.65;
  target.hitstun = Math.min(35, Math.floor(launchForce * 1.4));
}

const p1 = new StickFighter("01_plumber", 350, true);
const p2 = new StickFighter("02_ape", 650, false);
let projectiles = [];
let skyItems = [];
let itemSpawnTimer = 240;
let gameRunning = false;

// Keyboard Controls (Supports Single-Player, Same-Chromebook 2P, and Online)
const p1Keys = { left: false, right: false, down: false, jumpPressed: false, normalPressed: false, specialPressed: false };
const p2Keys = { left: false, right: false, down: false, jumpPressed: false, normalPressed: false, specialPressed: false };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (gameMode === "local2p") {
    // Player 1: WASD + F (Attack) + G (Special)
    if (k === "a") p1Keys.left = true;
    if (k === "d") p1Keys.right = true;
    if (k === "s") p1Keys.down = true;
    if (k === "w") p1Keys.jumpPressed = true;
    if (k === "f") p1Keys.normalPressed = true;
    if (k === "g") p1Keys.specialPressed = true;

    // Player 2: Arrow Keys + K (Attack) + L (Special)
    if (e.key === "ArrowLeft") p2Keys.left = true;
    if (e.key === "ArrowRight") p2Keys.right = true;
    if (e.key === "ArrowDown") p2Keys.down = true;
    if (e.key === "ArrowUp") p2Keys.jumpPressed = true;
    if (k === "k") p2Keys.normalPressed = true;
    if (k === "l") p2Keys.specialPressed = true;
  } else {
    // 1P / Online Controls
    if (k === "a" || e.key === "ArrowLeft") p1Keys.left = true;
    if (k === "d" || e.key === "ArrowRight") p1Keys.right = true;
    if (k === "s" || e.key === "ArrowDown") p1Keys.down = true;
    if (k === "w" || e.key === "ArrowUp" || k === " ") p1Keys.jumpPressed = true;
    if (k === "j" || k === "z") p1Keys.normalPressed = true;
    if (k === "k" || k === "x") p1Keys.specialPressed = true;
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (gameMode === "local2p") {
    if (k === "a") p1Keys.left = false;
    if (k === "d") p1Keys.right = false;
    if (k === "s") p1Keys.down = false;
    if (e.key === "ArrowLeft") p2Keys.left = false;
    if (e.key === "ArrowRight") p2Keys.right = false;
    if (e.key === "ArrowDown") p2Keys.down = false;
  } else {
    if (k === "a" || e.key === "ArrowLeft") p1Keys.left = false;
    if (k === "d" || e.key === "ArrowRight") p1Keys.right = false;
    if (k === "s" || e.key === "ArrowDown") p1Keys.down = false;
  }
});

// CPU AI for Solo Mode
function getCpuKeys(bot, target) {
  const keys = { left: false, right: false, down: false, jumpPressed: false, normalPressed: false, specialPressed: false };
  if (gameMode === "training") return keys;

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;

  if (bot.x < 220) keys.right = true;
  else if (bot.x > 780) keys.left = true;
  else if (Math.abs(dx) > 55) {
    if (dx > 0) keys.right = true;
    else keys.left = true;
  }

  if ((bot.y > 410 || dy < -60) && Math.random() < 0.08) keys.jumpPressed = true;
  if (Math.abs(dx) < 68 && Math.abs(dy) < 48 && Math.random() < 0.08) keys.normalPressed = true;
  if (bot.smashMeter >= 100 && Math.abs(dx) < 350) keys.specialPressed = true;
  else if (Math.abs(dx) >= 140 && Math.abs(dx) < 350 && Math.random() < 0.03) keys.specialPressed = true;

  return keys;
}

// Sky Item Spawner & Pickup Logic
function updateSkyItems() {
  if (!itemsEnabled) return;

  itemSpawnTimer--;
  if (itemSpawnTimer <= 0 && skyItems.length < 3) {
    itemSpawnTimer = 280 + Math.floor(Math.random() * 180);
    const template = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    skyItems.push({
      ...template,
      x: 240 + Math.random() * 520,
      y: -20,
      vy: 2.2,
      life: 650
    });
  }

  const stageObj = STAGES[currentStage] || STAGES.battlefield;

  skyItems.forEach((item) => {
    item.life--;
    item.y += item.vy;

    // Land on platforms
    for (const p of stageObj.platforms) {
      if (item.vy > 0 && item.x >= p.x && item.x <= p.x + p.w && item.y >= p.y - 10 && item.y - item.vy <= p.y + 8) {
        item.y = p.y - 10;
        item.vy = 0;
      }
    }

    // Check Fighter Pickup
    [p1, p2].forEach((fighter) => {
      if (item.life > 0 && Math.abs(item.x - fighter.x) < 30 && Math.abs(item.y - (fighter.y - 28)) < 36) {
        applyItemEffect(fighter, item);
        item.life = 0;
      }
    });
  });

  skyItems = skyItems.filter((it) => it.life > 0 && it.y < canvas.height + 60);
}

function applyItemEffect(fighter, item) {
  if (item.id === "mushroom") {
    fighter.sizeScale = 1.55;
    fighter.sizeTimer = 480;
  } else if (item.id === "poison") {
    fighter.sizeScale = 0.65;
    fighter.sizeTimer = 420;
  } else if (item.id === "star") {
    fighter.starTimer = 420;
  } else if (item.id === "tomato") {
    fighter.percent = Math.max(0, fighter.percent - 50);
  } else if (item.id === "bobomb") {
    applySmashKnockback(fighter, 26, -fighter.facing, null);
  } else if (item.id === "beamsword") {
    fighter.beamSwordTimer = 540;
  } else if (item.id === "smashball") {
    fighter.smashMeter = 100;
  }
}

function drawSkyItems() {
  skyItems.forEach((item) => {
    ctx.save();
    ctx.translate(item.x, item.y);

    // Glowing aura
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Smash Ball Crosshair
    if (item.id === "smashball") {
      ctx.strokeStyle = "#0b0d14";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(-4, 12);
      ctx.moveTo(-12, 4);
      ctx.lineTo(12, 4);
      ctx.stroke();
    }

    // Label tag
    ctx.font = "bold 10px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.label, 0, -16);
    ctx.restore();
  });
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
document.getElementById("muteToggleBtn").onclick = () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    document.getElementById("muteToggleBtn").textContent = audioTrack.enabled ? "🔊 Mute Mic" : "🔇 Unmute Mic";
  }
};

document.getElementById("copyBtn").onclick = () => {
  const idText = document.getElementById("myId").textContent;
  navigator.clipboard.writeText(idText);
  document.getElementById("copyBtn").textContent = "Copied!";
  setTimeout(() => (document.getElementById("copyBtn").textContent = "Copy ID"), 1500);
};

// PeerJS Online Multiplayer (2 Chromebooks)
let peer = null;
let conn = null;
let isHost = true;

try {
  if (typeof Peer !== "undefined") {
    peer = new Peer();
    peer.on("open", (id) => {
      document.getElementById("myId").textContent = id;
    });
    peer.on("connection", (incomingConn) => {
      conn = incomingConn;
      isHost = true;
      gameMode = "online";
      setupConnectionHandlers();
      launchMatch();
    });
    peer.on("call", (call) => {
      call.answer(localStream);
      call.on("stream", (remoteStream) => {
        document.getElementById("remoteVideo").srcObject = remoteStream;
      });
    });
  } else {
    document.getElementById("myId").textContent = "Offline (Local Ready)";
  }
} catch (err) {
  document.getElementById("myId").textContent = "Offline (Local Ready)";
}

document.getElementById("connectBtn").onclick = () => {
  const u1 = document.getElementById("p1Username").value.trim();
  if (!u1) {
    alert("Please enter your Username before joining!");
    return;
  }
  if (!peer) {
    alert("Online multiplayer requires an internet connection.");
    return;
  }
  const friendId = document.getElementById("joinIdInput").value.trim();
  if (!friendId) return;
  isHost = false;
  gameMode = "online";
  conn = peer.connect(friendId);
  setupConnectionHandlers();
  if (localStream) {
    const call = peer.call(friendId, localStream);
    call.on("stream", (remoteStream) => {
      document.getElementById("remoteVideo").srcObject = remoteStream;
    });
  }
  launchMatch();
};

document.getElementById("startMatchBtn").onclick = () => {
  const u1 = document.getElementById("p1Username").value.trim();
  const u2 = document.getElementById("p2Username").value.trim();
  if (!u1) {
    alert("Please enter a P1 Username to play!");
    return;
  }
  if (gameMode === "local2p" && !u2) {
    alert("Please enter a P2 Username for Same-Chromebook 2P mode!");
    return;
  }
  isHost = true;
  launchMatch();
};

document.getElementById("rematchBtn").onclick = () => {
  document.getElementById("resultsScreen").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");
};

function setupConnectionHandlers() {
  conn.on("open", () => {
    const myName = document.getElementById("p1Username").value.trim() || "Player";
    conn.send({ type: "profile", id: p1SelectedId, username: myName });
  });
  conn.on("data", (data) => {
    if (data.type === "profile") {
      const target = isHost ? p2 : p1;
      target.setFighter(data.id);
      target.username = data.username || "Friend";
document.getElementById(isHost ? "p2NameHud" : "p1NameHud").textContent = target.username;
document.getElementById(isHost ? "p2FighterHud" : "p1FighterHud").textContent = target.stats.name;
} else if (data.type === "input" && isHost) {
p2.applyInput(data.keys);
} else if (data.type === "state" && !isHost) {
Object.assign(p1, data.p1);
Object.assign(p2, data.p2);
p1.setFighter(data.p1.fighterId);
p2.setFighter(data.p2.fighterId);
projectiles = data.projectiles;
skyItems = data.skyItems;
}
});
}
function launchMatch() {
matchStocks = parseInt(document.getElementById("stockSelect").value, 10);
currentStage = document.getElementById("stageSelect").value;
itemsEnabled = document.getElementById("itemSelect").value === "on";
const u1 = document.getElementById("p1Username").value.trim() || "Player1";
const u2 = document.getElementById("p2Username").value.trim() || (gameMode === "local2p" ? "Player2" : "CPU_Bot");
if (gameMode === "online") {
if (isHost) {
p1.setFighter(p1SelectedId);
p1.username = u1;
} else {
p2.setFighter(p1SelectedId);
p2.username = u1;
}
} else {
p1.setFighter(p1SelectedId);
p1.username = u1;
p2.setFighter(p2SelectedId);
p2.username = u2;
}
p1.reset(true);
p2.reset(true);
projectiles = [];
skyItems = [];
itemSpawnTimer = 180;
document.getElementById("p1NameHud").textContent = p1.username;
document.getElementById("p1FighterHud").textContent = p1.stats.name;
document.getElementById("p2NameHud").textContent = p2.username;
document.getElementById("p2FighterHud").textContent = p2.stats.name;
document.getElementById("cam1Label").textContent = p1.username;
document.getElementById("cam2Label").textContent = p2.username;
document.getElementById("lobby").classList.add("hidden");
document.getElementById("hud").classList.remove("hidden");
if (!gameRunning) {
gameRunning = true;
requestAnimationFrame(gameLoop);
}
}
function gameLoop() {
if (!gameRunning) return;
const stageObj = STAGES[currentStage] || STAGES.battlefield;
// Draw Stadium Sky Gradient
const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
bgGrad.addColorStop(0, stageObj.bgTop);
bgGrad.addColorStop(1, stageObj.bgBot);
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, canvas.width, canvas.height);
// Draw Stadium Platforms (with Smashville moving platform support)
for (const p of stageObj.platforms) {
if (p.moving) {
p.x = 420 + Math.sin(Date.now() / 700) * 160;
}
ctx.fillStyle = p.solid ? stageObj.platColor : stageObj.softColor;
ctx.fillRect(p.x, p.y, p.w, p.h);
}
if (isHost) {
p1.applyInput(p1Keys);
if (gameMode === "local2p") {
p2.applyInput(p2Keys);
} else if (gameMode !== "online") {
p2.applyInput(getCpuKeys(p2, p1));
}
p1.update(p2);
p2.update(p1);
updateSkyItems();
// Update Projectiles
projectiles.forEach((proj) => {
proj.x += proj.vx;
proj.life--;
const hitRadius = proj.radius || 8;
const target = proj.owner === p1 ? p2 : p1;
if (Math.abs(proj.x - target.x) < 24 + hitRadius && Math.abs(proj.y - (target.y - 30)) < 36 + hitRadius) {
applySmashKnockback(target, proj.damage, Math.sign(proj.vx), proj.owner);
proj.owner.gainMeter(proj.damage * 0.8);
if (!proj.isFinal) proj.life = 0;
}
});
projectiles = projectiles.filter((p) => p.life > 0);
// Sync state to P2 Chromebook if Online
if (conn && conn.open) {
conn.send({
type: "state",
p1: { x: p1.x, y: p1.y, facing: p1.facing, percent: p1.percent, stocks: p1.stocks, attackTimer: p1.attackTimer, shielding: p1.shielding, counterTimer: p1.counterTimer, animFrame: p1.animFrame, fighterId: p1.fighterId, smashMeter: p1.smashMeter, sizeScale: p1.sizeScale, starTimer: p1.starTimer, beamSwordTimer: p1.beamSwordTimer, finalSmashBanner: p1.finalSmashBanner, username: p1.username },
p2: { x: p2.x, y: p2.y, facing: p2.facing, percent: p2.percent, stocks: p2.stocks, attackTimer: p2.attackTimer, shielding: p2.shielding, counterTimer: p2.counterTimer, animFrame: p2.animFrame, fighterId: p2.fighterId, smashMeter: p2.smashMeter, sizeScale: p2.sizeScale, starTimer: p2.starTimer, beamSwordTimer: p2.beamSwordTimer, finalSmashBanner: p2.finalSmashBanner, username: p2.username },
projectiles: projectiles.map(({ x, y, color, radius }) => ({ x, y, color, radius })),
skyItems: skyItems.map(({ id, label, color, x, y }) => ({ id, label, color, x, y }))
});
}
} else if (conn && conn.open) {
conn.send({ type: "input", keys: { ...p1Keys } });
}
p1Keys.jumpPressed = false;
p1Keys.normalPressed = false;
p1Keys.specialPressed = false;
p2Keys.jumpPressed = false;
p2Keys.normalPressed = false;
p2Keys.specialPressed = false;
// Render Items, Projectiles & Fighters
drawSkyItems();
projectiles.forEach((proj) => {
ctx.fillStyle = proj.color;
ctx.beginPath();
ctx.arc(proj.x, proj.y, proj.radius || 8, 0, Math.PI * 2);
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
document.getElementById("p1StocksHud").textContent = "●".repeat(Math.max(0, p1.stocks));
document.getElementById("p2StocksHud").textContent = "●".repeat(Math.max(0, p2.stocks));
requestAnimationFrame(gameLoop);
};

