const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Game state
let gameRunning = false;
let gameOver = false;
let levelComplete = false;
let score = 0;
let highScore = localStorage.getItem('bumpyDashHighScore') || 0;
let frameCount = 0;
let currentLevelIndex = 0;
let levelProgress = 0;
let completedLevels = JSON.parse(localStorage.getItem('completedLevels')) || [];
let bonusUnlocked = localStorage.getItem('bonusUnlocked') === 'true' || false;

// Cheat code detection
let arrowsPressed = { left: false, right: false, up: false, down: false };

// Update high score display
document.getElementById('highScore').textContent = highScore;

// Load Bumpy image
const bumpyImg = new Image();
bumpyImg.src = 'bumpy.jpg';
let imageLoaded = false;
bumpyImg.onload = () => {
    imageLoaded = true;
};

// Player (Bumpy the cat)
const player = {
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.6,
    jumpPower: -13,
    grounded: false,
    rotation: 0
};

// Ground
const ground = {
    y: 350,
    height: 50
};

// Game objects arrays
let obstacles = [];
let platforms = [];
let orbs = [];
let coins = [];
let enemies = [];
let obstacleSpeed = 6;

// Level definitions based on popular Geometry Dash levels
const LEVELS = [
    {
        id: 0,
        name: "Stereo Madness",
        difficulty: "Easy",
        length: 12000, // level length in "units" - 40 seconds at speed 5
        speed: 5,
        color: "#87ceeb",
        pattern: [
            { type: 'spike', at: 300 }, { type: 'spike', at: 500 }, { type: 'platform', at: 800, height: 60 },
            { type: 'coin', at: 900 }, { type: 'spike', at: 1100 }, { type: 'enemy', at: 1400 },
            { type: 'platform', at: 1700, height: 70 }, { type: 'orb', at: 2000 }, { type: 'spike', at: 2200 },
            { type: 'tallSpike', at: 2500 }, { type: 'platform', at: 2800, height: 80 }, { type: 'coin', at: 3000 },
            { type: 'spike', at: 3300 }, { type: 'enemy', at: 3600 }, { type: 'platform', at: 3900, height: 90 },
            { type: 'orb', at: 4200 }, { type: 'spike', at: 4400 }, { type: 'spike', at: 4700 },
            { type: 'platform', at: 5000, height: 100 }, { type: 'coin', at: 5200 }, { type: 'enemy', at: 5500 },
            { type: 'tallSpike', at: 5800 }, { type: 'orb', at: 6100 }, { type: 'spike', at: 6300 },
            { type: 'platform', at: 6600, height: 70 }, { type: 'spike', at: 6900 }, { type: 'enemy', at: 7200 },
            { type: 'coin', at: 7500 }, { type: 'platform', at: 7800, height: 110 }, { type: 'orb', at: 8100 },
            { type: 'tallSpike', at: 8400 }, { type: 'spike', at: 8700 }, { type: 'enemy', at: 9000 },
            { type: 'platform', at: 9300, height: 80 }, { type: 'coin', at: 9600 }, { type: 'spike', at: 9900 },
            { type: 'orb', at: 10200 }, { type: 'enemy', at: 10500 }, { type: 'tallSpike', at: 10800 },
            { type: 'platform', at: 11100, height: 120 }, { type: 'coin', at: 11400 }, { type: 'spike', at: 11700 }
        ]
    },
    {
        id: 1,
        name: "Back on Track",
        difficulty: "Easy",
        length: 14400,
        speed: 6,
        color: "#98D8C8",
        pattern: [
            { type: 'spike', at: 300 }, { type: 'platform', at: 600, height: 70 }, { type: 'enemy', at: 900 },
            { type: 'spike', at: 1200 }, { type: 'orb', at: 1500 }, { type: 'coin', at: 1700 },
            { type: 'tallSpike', at: 2000 }, { type: 'platform', at: 2300, height: 80 }, { type: 'enemy', at: 2600 },
            { type: 'spike', at: 2900 }, { type: 'orb', at: 3200 }, { type: 'platform', at: 3500, height: 90 },
            { type: 'coin', at: 3800 }, { type: 'tallSpike', at: 4100 }, { type: 'enemy', at: 4400 },
            { type: 'spike', at: 4700 }, { type: 'platform', at: 5000, height: 100 }, { type: 'orb', at: 5300 },
            { type: 'coin', at: 5600 }, { type: 'enemy', at: 5900 }, { type: 'tallSpike', at: 6200 },
            { type: 'spike', at: 6500 }, { type: 'platform', at: 6800, height: 70 }, { type: 'orb', at: 7100 },
            { type: 'enemy', at: 7400 }, { type: 'coin', at: 7700 }, { type: 'spike', at: 8000 },
            { type: 'tallSpike', at: 8300 }, { type: 'platform', at: 8600, height: 110 }, { type: 'orb', at: 8900 },
            { type: 'enemy', at: 9200 }, { type: 'spike', at: 9500 }, { type: 'coin', at: 9800 },
            { type: 'platform', at: 10100, height: 90 }, { type: 'tallSpike', at: 10400 }, { type: 'orb', at: 10700 },
            { type: 'enemy', at: 11000 }, { type: 'spike', at: 11300 }, { type: 'platform', at: 11600, height: 120 },
            { type: 'coin', at: 11900 }, { type: 'enemy', at: 12200 }, { type: 'tallSpike', at: 12500 },
            { type: 'orb', at: 12800 }, { type: 'spike', at: 13100 }, { type: 'platform', at: 13400, height: 80 },
            { type: 'coin', at: 13700 }, { type: 'enemy', at: 14000 }
        ]
    },
    {
        id: 2,
        name: "Polargeist",
        difficulty: "Normal",
        length: 15600,
        speed: 6.5,
        color: "#B19CD9",
        pattern: [
            { type: 'platform', at: 300, height: 80 }, { type: 'spike', at: 600 }, { type: 'enemy', at: 850 },
            { type: 'tallSpike', at: 1100 }, { type: 'orb', at: 1400 }, { type: 'coin', at: 1650 },
            { type: 'platform', at: 1900, height: 90 }, { type: 'spike', at: 2150 }, { type: 'enemy', at: 2400 },
            { type: 'tallSpike', at: 2700 }, { type: 'orb', at: 3000 }, { type: 'platform', at: 3300, height: 100 },
            { type: 'coin', at: 3550 }, { type: 'spike', at: 3800 }, { type: 'enemy', at: 4100 },
            { type: 'platform', at: 4400, height: 110 }, { type: 'tallSpike', at: 4700 }, { type: 'orb', at: 5000 },
            { type: 'coin', at: 5300 }, { type: 'spike', at: 5600 }, { type: 'enemy', at: 5900 },
            { type: 'platform', at: 6200, height: 70 }, { type: 'tallSpike', at: 6500 }, { type: 'orb', at: 6800 },
            { type: 'spike', at: 7100 }, { type: 'enemy', at: 7400 }, { type: 'coin', at: 7700 },
            { type: 'platform', at: 8000, height: 120 }, { type: 'tallSpike', at: 8300 }, { type: 'orb', at: 8600 },
            { type: 'enemy', at: 8900 }, { type: 'spike', at: 9200 }, { type: 'platform', at: 9500, height: 80 },
            { type: 'coin', at: 9800 }, { type: 'tallSpike', at: 10100 }, { type: 'orb', at: 10400 },
            { type: 'enemy', at: 10700 }, { type: 'spike', at: 11000 }, { type: 'platform', at: 11300, height: 100 },
            { type: 'coin', at: 11600 }, { type: 'tallSpike', at: 11900 }, { type: 'enemy', at: 12200 },
            { type: 'orb', at: 12500 }, { type: 'spike', at: 12800 }, { type: 'platform', at: 13100, height: 90 },
            { type: 'tallSpike', at: 13400 }, { type: 'coin', at: 13700 }, { type: 'enemy', at: 14000 },
            { type: 'orb', at: 14300 }, { type: 'spike', at: 14600 }, { type: 'platform', at: 14900, height: 110 },
            { type: 'enemy', at: 15200 }, { type: 'coin', at: 15500 }
        ]
    },
    {
        id: 3,
        name: "Dry Out",
        difficulty: "Normal",
        length: 16800,
        speed: 7,
        color: "#FFB84D",
        pattern: [
            { type: 'spike', at: 300 }, { type: 'platform', at: 600, height: 70 }, { type: 'enemy', at: 850 },
            { type: 'tallSpike', at: 1100 }, { type: 'orb', at: 1400 }, { type: 'spike', at: 1650 },
            { type: 'platform', at: 1900, height: 90 }, { type: 'coin', at: 2150 }, { type: 'enemy', at: 2400 },
            { type: 'tallSpike', at: 2700 }, { type: 'orb', at: 3000 }, { type: 'spike', at: 3300 },
            { type: 'platform', at: 3600, height: 110 }, { type: 'enemy', at: 3900 }, { type: 'coin', at: 4200 },
            { type: 'tallSpike', at: 4500 }, { type: 'orb', at: 4800 }, { type: 'spike', at: 5100 },
            { type: 'platform', at: 5400, height: 80 }, { type: 'enemy', at: 5700 }, { type: 'tallSpike', at: 6000 },
            { type: 'coin', at: 6300 }, { type: 'orb', at: 6600 }, { type: 'spike', at: 6900 },
            { type: 'enemy', at: 7200 }, { type: 'platform', at: 7500, height: 100 }, { type: 'tallSpike', at: 7800 },
            { type: 'orb', at: 8100 }, { type: 'coin', at: 8400 }, { type: 'spike', at: 8700 },
            { type: 'platform', at: 9000, height: 120 }, { type: 'enemy', at: 9300 }, { type: 'tallSpike', at: 9600 },
            { type: 'orb', at: 9900 }, { type: 'spike', at: 10200 }, { type: 'coin', at: 10500 },
            { type: 'platform', at: 10800, height: 70 }, { type: 'enemy', at: 11100 }, { type: 'tallSpike', at: 11400 },
            { type: 'orb', at: 11700 }, { type: 'spike', at: 12000 }, { type: 'platform', at: 12300, height: 90 },
            { type: 'coin', at: 12600 }, { type: 'enemy', at: 12900 }, { type: 'tallSpike', at: 13200 },
            { type: 'orb', at: 13500 }, { type: 'spike', at: 13800 }, { type: 'platform', at: 14100, height: 110 },
            { type: 'enemy', at: 14400 }, { type: 'coin', at: 14700 }, { type: 'tallSpike', at: 15000 },
            { type: 'orb', at: 15300 }, { type: 'spike', at: 15600 }, { type: 'enemy', at: 15900 },
            { type: 'platform', at: 16200, height: 100 }, { type: 'tallSpike', at: 16500 }
        ]
    },
    {
        id: 4,
        name: "Base After Base",
        difficulty: "Hard",
        length: 18000,
        speed: 7.5,
        color: "#FF6B6B",
        pattern: [
            { type: 'enemy', at: 300 }, { type: 'tallSpike', at: 600 }, { type: 'platform', at: 900, height: 90 },
            { type: 'orb', at: 1200 }, { type: 'spike', at: 1450 }, { type: 'enemy', at: 1700 },
            { type: 'coin', at: 1950 }, { type: 'tallSpike', at: 2200 }, { type: 'platform', at: 2500, height: 110 },
            { type: 'orb', at: 2800 }, { type: 'enemy', at: 3100 }, { type: 'spike', at: 3400 },
            { type: 'tallSpike', at: 3700 }, { type: 'platform', at: 4000, height: 100 }, { type: 'coin', at: 4300 },
            { type: 'orb', at: 4600 }, { type: 'enemy', at: 4900 }, { type: 'spike', at: 5200 },
            { type: 'tallSpike', at: 5500 }, { type: 'platform', at: 5800, height: 120 }, { type: 'orb', at: 6100 },
            { type: 'enemy', at: 6400 }, { type: 'coin', at: 6700 }, { type: 'spike', at: 7000 },
            { type: 'tallSpike', at: 7300 }, { type: 'platform', at: 7600, height: 80 }, { type: 'orb', at: 7900 },
            { type: 'enemy', at: 8200 }, { type: 'spike', at: 8500 }, { type: 'coin', at: 8800 },
            { type: 'tallSpike', at: 9100 }, { type: 'platform', at: 9400, height: 100 }, { type: 'orb', at: 9700 },
            { type: 'enemy', at: 10000 }, { type: 'spike', at: 10300 }, { type: 'tallSpike', at: 10600 },
            { type: 'platform', at: 10900, height: 110 }, { type: 'coin', at: 11200 }, { type: 'orb', at: 11500 },
            { type: 'enemy', at: 11800 }, { type: 'spike', at: 12100 }, { type: 'tallSpike', at: 12400 },
            { type: 'platform', at: 12700, height: 90 }, { type: 'orb', at: 13000 }, { type: 'enemy', at: 13300 },
            { type: 'coin', at: 13600 }, { type: 'spike', at: 13900 }, { type: 'tallSpike', at: 14200 },
            { type: 'platform', at: 14500, height: 120 }, { type: 'orb', at: 14800 }, { type: 'enemy', at: 15100 },
            { type: 'spike', at: 15400 }, { type: 'coin', at: 15700 }, { type: 'tallSpike', at: 16000 },
            { type: 'platform', at: 16300, height: 100 }, { type: 'orb', at: 16600 }, { type: 'enemy', at: 16900 },
            { type: 'spike', at: 17200 }, { type: 'tallSpike', at: 17500 }, { type: 'coin', at: 17800 }
        ]
    },
    {
        id: 5,
        name: "Clubstep",
        difficulty: "INSANE",
        length: 20400,
        speed: 8.5,
        color: "#9B59B6",
        pattern: [
            { type: 'spike', at: 250 }, { type: 'enemy', at: 500 }, { type: 'tallSpike', at: 750 },
            { type: 'platform', at: 1000, height: 100 }, { type: 'orb', at: 1250 }, { type: 'spike', at: 1500 },
            { type: 'enemy', at: 1750 }, { type: 'tallSpike', at: 2000 }, { type: 'coin', at: 2250 },
            { type: 'platform', at: 2500, height: 120 }, { type: 'orb', at: 2750 }, { type: 'spike', at: 3000 },
            { type: 'enemy', at: 3250 }, { type: 'tallSpike', at: 3500 }, { type: 'platform', at: 3750, height: 90 },
            { type: 'orb', at: 4000 }, { type: 'coin', at: 4250 }, { type: 'spike', at: 4500 },
            { type: 'enemy', at: 4750 }, { type: 'tallSpike', at: 5000 }, { type: 'platform', at: 5250, height: 110 },
            { type: 'orb', at: 5500 }, { type: 'spike', at: 5750 }, { type: 'enemy', at: 6000 },
            { type: 'tallSpike', at: 6250 }, { type: 'coin', at: 6500 }, { type: 'platform', at: 6750, height: 100 },
            { type: 'orb', at: 7000 }, { type: 'spike', at: 7250 }, { type: 'enemy', at: 7500 },
            { type: 'tallSpike', at: 7750 }, { type: 'platform', at: 8000, height: 120 }, { type: 'orb', at: 8250 },
            { type: 'coin', at: 8500 }, { type: 'spike', at: 8750 }, { type: 'enemy', at: 9000 },
            { type: 'tallSpike', at: 9250 }, { type: 'platform', at: 9500, height: 80 }, { type: 'orb', at: 9750 },
            { type: 'spike', at: 10000 }, { type: 'enemy', at: 10250 }, { type: 'tallSpike', at: 10500 },
            { type: 'coin', at: 10750 }, { type: 'platform', at: 11000, height: 110 }, { type: 'orb', at: 11250 },
            { type: 'spike', at: 11500 }, { type: 'enemy', at: 11750 }, { type: 'tallSpike', at: 12000 },
            { type: 'platform', at: 12250, height: 100 }, { type: 'orb', at: 12500 }, { type: 'coin', at: 12750 },
            { type: 'spike', at: 13000 }, { type: 'enemy', at: 13250 }, { type: 'tallSpike', at: 13500 },
            { type: 'platform', at: 13750, height: 120 }, { type: 'orb', at: 14000 }, { type: 'spike', at: 14250 },
            { type: 'enemy', at: 14500 }, { type: 'coin', at: 14750 }, { type: 'tallSpike', at: 15000 },
            { type: 'platform', at: 15250, height: 90 }, { type: 'orb', at: 15500 }, { type: 'spike', at: 15750 },
            { type: 'enemy', at: 16000 }, { type: 'tallSpike', at: 16250 }, { type: 'platform', at: 16500, height: 110 },
            { type: 'coin', at: 16750 }, { type: 'orb', at: 17000 }, { type: 'spike', at: 17250 },
            { type: 'enemy', at: 17500 }, { type: 'tallSpike', at: 17750 }, { type: 'platform', at: 18000, height: 100 },
            { type: 'orb', at: 18250 }, { type: 'spike', at: 18500 }, { type: 'coin', at: 18750 },
            { type: 'enemy', at: 19000 }, { type: 'tallSpike', at: 19250 }, { type: 'platform', at: 19500, height: 120 },
            { type: 'orb', at: 19750 }, { type: 'spike', at: 20000 }, { type: 'enemy', at: 20200 }
        ]
    }
];

// Play sound effect using Web Audio API
function playSound(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Draw Bumpy using real photo
function drawBumpy(x, y, width, height) {
    ctx.save();

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.translate(centerX, centerY);
    if (!player.grounded) {
        player.rotation += 0.15;
    } else {
        player.rotation = 0;
    }
    ctx.rotate(player.rotation);

    if (imageLoaded) {
        ctx.beginPath();
        ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(bumpyImg, -width / 2, -height / 2, width, height);

        ctx.strokeStyle = '#764ba2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Draw enemy dog
function drawDog(x, y, width, height) {
    ctx.save();

    // Body
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y + 15, width, height - 15);

    // Head
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ears (floppy dog ears)
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + width / 2 - 8, y + 8, 4, 8, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width / 2 + 8, y + 8, 4, 8, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + 15, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + width / 2 - 4, y + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width / 2 + 4, y + 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + width, y + height - 10);
    ctx.quadraticCurveTo(x + width + 8, y + height - 20, x + width + 5, y + height - 5);
    ctx.stroke();

    // Legs
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 5, y + height - 10, 4, 10);
    ctx.fillRect(x + width - 9, y + height - 10, 4, 10);

    ctx.restore();
}

// Draw ground
function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, ground.y, canvas.width, ground.height);

    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, ground.y, canvas.width, 10);

    ctx.fillStyle = '#654321';
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.fillRect(i, ground.y + 15, 20, 5);
    }
}

// Draw spike obstacle
function drawSpike(x, y, width, height) {
    ctx.fillStyle = '#8B0000';

    const numSpikes = Math.floor(width / 15);
    for (let i = 0; i < numSpikes; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 15, y);
        ctx.lineTo(x + i * 15 + 7, y - height);
        ctx.lineTo(x + i * 15 + 14, y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#660000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw platform
function drawPlatform(platform) {
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(platform.x, platform.y, platform.width, 5);
}

// Draw orb
function drawOrb(orb) {
    const pulseSize = Math.sin(frameCount * 0.1) * 2;
    const radius = orb.radius + pulseSize;

    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius + 5);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = orb.used ? '#888' : '#FFD700';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(orb.x - 5, orb.y - 5, radius / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw coin
function drawCoin(coin) {
    if (coin.collected) return;

    const rotationAngle = (frameCount * 0.05) % (Math.PI * 2);
    const scale = Math.abs(Math.cos(rotationAngle)) * 0.5 + 0.5;

    ctx.save();
    ctx.translate(coin.x, coin.y);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, coin.radius * scale, coin.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// Draw clouds
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    const cloudPositions = [
        { x: (frameCount * 0.2) % 900 - 100, y: 50 },
        { x: (frameCount * 0.15) % 950 - 150, y: 100 },
        { x: (frameCount * 0.25) % 1000 - 200, y: 150 }
    ];

    cloudPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.arc(pos.x + 15, pos.y - 5, 25, 0, Math.PI * 2);
        ctx.arc(pos.x + 35, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Generate level element based on pattern
function generateFromPattern() {
    const level = LEVELS[currentLevelIndex];
    const pattern = level.pattern;

    pattern.forEach(item => {
        if (Math.abs(levelProgress - item.at) < 5 && !item.spawned) {
            item.spawned = true;

            switch (item.type) {
                case 'spike':
                    obstacles.push({
                        x: canvas.width,
                        y: ground.y,
                        width: 30,
                        height: 40,
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

                case 'platform':
                    const platformWidth = 80;
                    const platformHeight = 15;
                    const platformY = ground.y - item.height;

                    platforms.push({
                        x: canvas.width,
                        y: platformY,
                        width: platformWidth,
                        height: platformHeight,
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

                case 'coin':
                    coins.push({
                        x: canvas.width,
                        y: ground.y - 120,
                        radius: 10,
                        collected: false
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
            }
        }
    });
}

// Check collision with rectangle
function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

// Check collision with circle
function checkCircleCollision(x1, y1, w1, h1, cx, cy, radius) {
    const closestX = Math.max(x1, Math.min(cx, x1 + w1));
    const closestY = Math.max(y1, Math.min(cy, y1 + h1));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
}

// Update game
function update() {
    if (!gameRunning || gameOver || levelComplete) return;

    frameCount++;
    levelProgress += obstacleSpeed;

    // Update progress bar
    const level = LEVELS[currentLevelIndex];
    const progress = Math.min((levelProgress / level.length) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';

    // Check level completion
    if (levelProgress >= level.length) {
        completeLevelSuccess();
        return;
    }

    // Update player physics
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Check ground collision
    player.grounded = false;
    if (player.y + player.height >= ground.y) {
        player.y = ground.y - player.height;
        player.velocityY = 0;
        player.grounded = true;
    }

    // Check platform collisions
    platforms.forEach(platform => {
        if (checkCollision(player.x, player.y, player.width, player.height,
                          platform.x, platform.y, platform.width, platform.height)) {
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.grounded = true;
            }
        }
    });

    // Generate level elements
    generateFromPattern();

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= obstacleSpeed;

        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            continue;
        }

        if (checkCollision(player.x + 5, player.y + 5, player.width - 10, player.height - 10,
                          obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height)) {
            endGame();
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
            obstacle.passed = true;
            score++;
            document.getElementById('score').textContent = score;
        }
    }

    // Update platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
        const platform = platforms[i];
        platform.x -= obstacleSpeed;

        if (platform.x + platform.width < 0) {
            platforms.splice(i, 1);
            continue;
        }

        if (!platform.passed && platform.x + platform.width < player.x) {
            platform.passed = true;
            score++;
            document.getElementById('score').textContent = score;
        }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.x -= obstacleSpeed;

        if (enemy.x + enemy.width < 0) {
            enemies.splice(i, 1);
            continue;
        }

        if (checkCollision(player.x + 5, player.y + 5, player.width - 10, player.height - 10,
                          enemy.x, enemy.y, enemy.width, enemy.height)) {
            endGame();
        }

        if (!enemy.passed && enemy.x + enemy.width < player.x) {
            enemy.passed = true;
            score += 2;
            document.getElementById('score').textContent = score;
        }
    }

    // Update orbs
    for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        orb.x -= obstacleSpeed;

        if (orb.x + orb.radius < 0) {
            orbs.splice(i, 1);
            continue;
        }

        if (!orb.used && checkCircleCollision(player.x, player.y, player.width, player.height,
                                               orb.x, orb.y, orb.radius)) {
            orb.used = true;
            player.velocityY = -15;
            player.grounded = false;
            playSound(800, 0.1, 'sine');
        }

        if (!orb.passed && orb.x < player.x) {
            orb.passed = true;
            score++;
            document.getElementById('score').textContent = score;
        }
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.x -= obstacleSpeed;

        if (coin.x + coin.radius < 0) {
            coins.splice(i, 1);
            continue;
        }

        if (!coin.collected && checkCircleCollision(player.x, player.y, player.width, player.height,
                                                     coin.x, coin.y, coin.radius)) {
            coin.collected = true;
            score += 3;
            document.getElementById('score').textContent = score;
            playSound(1200, 0.1, 'square');
        }
    }
}

// Draw game
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background with level color
    const level = LEVELS[currentLevelIndex];
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, level.color);
    gradient.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawClouds();
    drawGround();

    platforms.forEach(platform => {
        drawPlatform(platform);
    });

    coins.forEach(coin => {
        drawCoin(coin);
    });

    orbs.forEach(orb => {
        drawOrb(orb);
    });

    obstacles.forEach(obstacle => {
        drawSpike(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    enemies.forEach(enemy => {
        drawDog(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    drawBumpy(player.x, player.y, player.width, player.height);

    if (!gameRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click or Press SPACE to Start!', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Arial';
        ctx.fillText('Avoid dogs and spikes! Use orbs to bounce!', canvas.width / 2, canvas.height / 2 + 40);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Jump function
function jump() {
    if (!gameRunning) {
        startGame();
        return;
    }

    if (!gameOver && !levelComplete) {
        let nearOrb = false;
        orbs.forEach(orb => {
            if (!orb.used && checkCircleCollision(player.x, player.y, player.width, player.height,
                                                   orb.x, orb.y, orb.radius + 20)) {
                nearOrb = true;
                orb.used = true;
                player.velocityY = -15;
                playSound(800, 0.1, 'sine');
            }
        });

        if (player.grounded && !nearOrb) {
            player.velocityY = player.jumpPower;
            playSound(400, 0.1, 'square');
        }
    }
}

// Start game
function startGame() {
    gameRunning = true;
    gameOver = false;
    levelComplete = false;
    score = 0;
    frameCount = 0;
    levelProgress = 0;
    obstacles = [];
    platforms = [];
    orbs = [];
    coins = [];
    enemies = [];

    const level = LEVELS[currentLevelIndex];
    obstacleSpeed = level.speed;

    // Reset pattern spawned flags
    level.pattern.forEach(item => {
        item.spawned = false;
    });

    player.y = 300;
    player.velocityY = 0;
    player.rotation = 0;

    document.getElementById('score').textContent = score;
    document.getElementById('levelName').textContent = level.name;
    document.getElementById('currentLevel').textContent = currentLevelIndex < 5 ? (currentLevelIndex + 1) : 'BONUS';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('levelComplete').style.display = 'none';
    document.getElementById('levelSelect').style.display = 'none';
    document.getElementById('allComplete').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('nextLevelBtn').style.display = 'none';
    document.getElementById('menuBtn').style.display = 'none';
}

// Complete level successfully
function completeLevelSuccess() {
    levelComplete = true;

    // Mark level as completed
    if (!completedLevels.includes(currentLevelIndex)) {
        completedLevels.push(currentLevelIndex);
        localStorage.setItem('completedLevels', JSON.stringify(completedLevels));
    }

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('bumpyDashHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }

    // Check if all 5 main levels are completed
    if (completedLevels.filter(l => l < 5).length === 5 && !bonusUnlocked) {
        bonusUnlocked = true;
        localStorage.setItem('bonusUnlocked', 'true');
        document.getElementById('allComplete').style.display = 'block';
        document.getElementById('menuBtn').style.display = 'inline-block';
    } else {
        // Show level complete screen
        const level = LEVELS[currentLevelIndex];
        document.getElementById('completeLevelName').textContent = level.name;
        document.getElementById('levelScore').textContent = score;
        document.getElementById('levelComplete').style.display = 'block';

        if (currentLevelIndex < 4) {
            document.getElementById('nextLevelBtn').style.display = 'inline-block';
        }
        document.getElementById('restartBtn').style.display = 'inline-block';
        document.getElementById('menuBtn').style.display = 'inline-block';
    }

    playSound(600, 0.3, 'triangle');
}

// End game
function endGame() {
    gameOver = true;
    playSound(200, 0.5, 'sawtooth');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('bumpyDashHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }

    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('restartBtn').style.display = 'inline-block';
    document.getElementById('menuBtn').style.display = 'inline-block';
}

// Show level select
function showLevelSelect() {
    gameRunning = false;
    document.getElementById('levelSelect').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('levelComplete').style.display = 'none';
    document.getElementById('allComplete').style.display = 'none';

    const levelButtonsContainer = document.getElementById('levelButtons');
    levelButtonsContainer.innerHTML = '';

    // Add main levels
    for (let i = 0; i < 5; i++) {
        const level = LEVELS[i];
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = `${i + 1}. ${level.name}`;
        btn.onclick = () => {
            currentLevelIndex = i;
            document.getElementById('levelSelect').style.display = 'none';
            startGame();
        };
        levelButtonsContainer.appendChild(btn);
    }

    // Add bonus level
    const bonusBtn = document.createElement('button');
    bonusBtn.className = 'level-btn bonus';
    bonusBtn.textContent = 'BONUS: Clubstep';
    bonusBtn.disabled = !bonusUnlocked;
    bonusBtn.onclick = () => {
        currentLevelIndex = 5;
        document.getElementById('levelSelect').style.display = 'none';
        startGame();
    };
    levelButtonsContainer.appendChild(bonusBtn);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }

    // Cheat code detection
    if (e.code === 'ArrowLeft') arrowsPressed.left = true;
    if (e.code === 'ArrowRight') arrowsPressed.right = true;
    if (e.code === 'ArrowUp') arrowsPressed.up = true;
    if (e.code === 'ArrowDown') arrowsPressed.down = true;

    // Check if all arrows are pressed
    if (arrowsPressed.left && arrowsPressed.right && arrowsPressed.up && arrowsPressed.down) {
        bonusUnlocked = true;
        localStorage.setItem('bonusUnlocked', 'true');
        playSound(1000, 0.2, 'sine');
        alert('Bonus level "Clubstep" unlocked!');
        arrowsPressed = { left: false, right: false, up: false, down: false };
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') arrowsPressed.left = false;
    if (e.code === 'ArrowRight') arrowsPressed.right = false;
    if (e.code === 'ArrowUp') arrowsPressed.up = false;
    if (e.code === 'ArrowDown') arrowsPressed.down = false;
});

canvas.addEventListener('click', jump);

// Mobile touch support - immediate response without delay
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent 300ms click delay on mobile
    jump();
}, { passive: false });

document.getElementById('restartBtn').addEventListener('click', () => {
    startGame();
});

document.getElementById('nextLevelBtn').addEventListener('click', () => {
    currentLevelIndex++;
    startGame();
});

document.getElementById('menuBtn').addEventListener('click', () => {
    showLevelSelect();
});

// Start with level select
showLevelSelect();
gameLoop();
