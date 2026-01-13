// ======================
// NEW GAME IMPROVEMENTS
// ======================

// NEW STATE VARIABLES (Insert after line 20)
/*
let teacherCodeInput = '';
let godMode = false;
let isEndlessMode = false;
let particles = [];
let checkpoints = [];
let collectibles = [];
let currentCheckpoint = null;
let collectibleCount = 0;
let coyoteTime = 0;
const COYOTE_TIME_DURATION = 6;
let bgLayerOffset1 = 0;
let bgLayerOffset2 = 0;
*/

// PLAYER MODIFICATIONS (Replace player object)
/*
const player = {
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    baseWidth: 40,
    baseHeight: 40,
    scaleX: 1,
    scaleY: 1,
    velocityY: 0,
    gravity: 0.6,
    jumpPower: -13,
    grounded: false,
    rotation: 0,
    coyoteTimer: 0
};
*/

// PARTICLE SYSTEM
function createParticle(x, y, color = '#FFD700') {
    return {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 30,
        maxLife: 30,
        size: 3 + Math.random() * 3,
        color: color
    };
}

function spawnDustParticles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x + Math.random() * player.width, y, '#D2B48C'));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// CHECKPOINT SYSTEM
function drawCheckpoint(checkpoint) {
    const x = checkpoint.x;
    const y = ground.y - 60;

    // Flag pole
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, 4, 60);

    // Flag
    const flagColor = checkpoint.activated ? '#00FF00' : '#FF6B6B';
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 34, y + 10);
    ctx.lineTo(x + 4, y + 20);
    ctx.closePath();
    ctx.fill();

    // Flag animation
    if (!checkpoint.activated) {
        const wave = Math.sin(frameCount * 0.1) * 2;
        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 34 + wave, y + 10);
        ctx.lineTo(x + 4, y + 20);
        ctx.closePath();
        ctx.fill();
    }
}

function checkCheckpointCollision() {
    checkpoints.forEach(checkpoint => {
        if (!checkpoint.activated &&
            player.x < checkpoint.x + 20 &&
            player.x + player.width > checkpoint.x &&
            player.y < ground.y &&
            player.y + player.height > ground.y - 60) {
            checkpoint.activated = true;
            currentCheckpoint = checkpoint;
            playSound(800, 0.2, 'triangle');
        }
    });
}

// COLLECTIBLES SYSTEM
function drawCollectible(collectible) {
    if (collectible.collected) return;

    const bounce = Math.sin(frameCount * 0.1 + collectible.x * 0.01) * 5;
    const x = collectible.x;
    const y = collectible.y + bounce;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(frameCount * 0.05);

    if (collectible.type === 'fish') {
        // Fish bone
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        // Fish bone shape
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(-4, -4);
        ctx.lineTo(-4, 4);
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 4);
        ctx.moveTo(4, -4);
        ctx.lineTo(4, 4);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Yarn ball
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // String pattern
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI);
        ctx.stroke();
    }

    ctx.restore();

    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

function checkCollectibleCollision() {
    collectibles.forEach(c => {
        if (!c.collected &&
            player.x < c.x + 15 &&
            player.x + player.width > c.x - 15 &&
            player.y < c.y + 15 &&
            player.y + player.height > c.y - 15) {
            c.collected = true;
            collectibleCount++;
            document.getElementById('collectibleCount').textContent = collectibleCount;
            playSound(1400, 0.15, 'square');

            // Spawn celebration particles
            for (let i = 0; i < 10; i++) {
                particles.push(createParticle(c.x, c.y, '#FFD700'));
            }
        }
    });
}

// PARALLAX BACKGROUND
function drawParallaxBackground() {
    const level = LEVELS[currentLevelIndex];

    // Far layer (slow)
    bgLayerOffset1 = (bgLayerOffset1 + obstacleSpeed * 0.2) % 800;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = -1; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(200 + i * 300 - bgLayerOffset1, 100, 30, 0, Math.PI * 2);
        ctx.arc(220 + i * 300 - bgLayerOffset1, 95, 40, 0, Math.PI * 2);
        ctx.arc(250 + i * 300 - bgLayerOffset1, 100, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mid layer (medium)
    bgLayerOffset2 = (bgLayerOffset2 + obstacleSpeed * 0.5) % 800;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = -1; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(100 + i * 250 - bgLayerOffset2, 150, 25, 0, Math.PI * 2);
        ctx.arc(115 + i * 250 - bgLayerOffset2, 145, 30, 0, Math.PI * 2);
        ctx.arc(135 + i * 250 - bgLayerOffset2, 150, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ENDLESS MODE GENERATOR
function generateEndlessObstacle() {
    const types = ['spike', 'tallSpike', 'enemy', 'platform', 'orb', 'collectible'];
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
        case 'spike':
            obstacles.push({
                x: canvas.width,
                y: ground.y,
                width: 30,
                height: 40 + Math.random() * 20,
                type: 'spike',
                passed: false
            });
            break;
        case 'tallSpike':
            obstacles.push({
                x: canvas.width,
                y: ground.y,
                width: 30,
                height: 80,
                type: 'tallSpike',
                passed: false
            });
            break;
        case 'enemy':
            enemies.push({
                x: canvas.width,
                y: ground.y - 35,
                width: 30,
                height: 35,
                passed: false
            });
            break;
        case 'platform':
            const platformY = ground.y - 60 - Math.random() * 100;
            platforms.push({
                x: canvas.width,
                y: platformY,
                width: 80,
                height: 15,
                passed: false
            });
            break;
        case 'orb':
            orbs.push({
                x: canvas.width,
                y: ground.y - 100,
                radius: 15,
                used: false,
                passed: false
            });
            break;
        case 'collectible':
            collectibles.push({
                x: canvas.width,
                y: ground.y - 120,
                type: Math.random() < 0.5 ? 'fish' : 'yarn',
                collected: false
            });
            break;
    }
}

// SQUASH AND STRETCH
function updateSquashStretch() {
    // Reset to normal
    player.scaleX = player.scaleX * 0.9 + 1.0 * 0.1;
    player.scaleY = player.scaleY * 0.9 + 1.0 * 0.1;

    // Apply effects based on state
    if (!player.grounded && player.velocityY < 0) {
        // Jumping - stretch vertically
        player.scaleY = 1.2;
        player.scaleX = 0.9;
    } else if (!player.grounded && player.velocityY > 5) {
        // Falling - compress vertically
        player.scaleY = 0.9;
        player.scaleX = 1.1;
    }

    player.width = player.baseWidth * player.scaleX;
    player.height = player.baseHeight * player.scaleY;
}

// COYOTE TIME
function updateCoyoteTime() {
    if (player.grounded) {
        player.coyoteTimer = COYOTE_TIME_DURATION;
    } else if (player.coyoteTimer > 0) {
        player.coyoteTimer--;
    }
}

function canJump() {
    return player.coyoteTimer > 0 || player.grounded;
}

// GOD MODE VISUAL EFFECT
function drawGodModeEffect() {
    if (!godMode) return;

    // Gold outline around player
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Sunglasses
    const glassY = player.y + 12;
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 8, glassY, 10, 6);
    ctx.fillRect(player.x + 22, glassY, 10, 6);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + 18, glassY + 3);
    ctx.lineTo(player.x + 22, glassY + 3);
    ctx.stroke();

    ctx.restore();
}
