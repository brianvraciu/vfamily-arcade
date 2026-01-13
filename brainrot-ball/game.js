// ========================================
// BRAINROT BALL - Italian Pinball Chaos
// ========================================

// Game Configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 1000,
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 2 },
            debug: {
                showBody: true,
                showStaticBody: true
            },
            enableSleeping: false,
            positionIterations: 10,
            velocityIterations: 8,
            constraintIterations: 4
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Global Game State
let gameState = {
    aura: 0,
    multiplier: 1,
    balls: 3,
    maxMultiplier: 5,
    multiplierTimer: 0,
    highScore: parseInt(localStorage.getItem('brainrotHighScore')) || 0,
    collectedCards: JSON.parse(localStorage.getItem('brainrotCards')) || [],
    fanumTaxActive: false,
    fanumTaxTimer: 0,
    godMode: false
};

// Card System - 12 Italian Themed Cards
const CARDS = [
    // Common (40% drop rate)
    { id: 1, name: 'Spaghetti', rarity: 'common', icon: '🍝', effect: '+100 Aura', value: 100, dropRate: 0.15 },
    { id: 2, name: 'Pizza Slice', rarity: 'common', icon: '🍕', effect: '+150 Aura', value: 150, dropRate: 0.15 },
    { id: 3, name: 'Cannoli', rarity: 'common', icon: '🥖', effect: '+200 Aura', value: 200, dropRate: 0.10 },

    // Rare (35% drop rate)
    { id: 4, name: 'Espresso', rarity: 'rare', icon: '☕', effect: '2x Multiplier', value: 'multiplier', dropRate: 0.12 },
    { id: 5, name: 'Gelato', rarity: 'rare', icon: '🍨', effect: '+500 Aura', value: 500, dropRate: 0.12 },
    { id: 6, name: 'Vespa', rarity: 'rare', icon: '🛵', effect: 'Extra Ball', value: 'ball', dropRate: 0.11 },

    // Epic (20% drop rate)
    { id: 7, name: 'Colosseum', rarity: 'epic', icon: '🏛️', effect: '+1000 Aura', value: 1000, dropRate: 0.08 },
    { id: 8, name: 'Ferrari', rarity: 'epic', icon: '🏎️', effect: '3x Multiplier', value: 'bigMultiplier', dropRate: 0.07 },
    { id: 9, name: 'Mona Lisa', rarity: 'epic', icon: '🖼️', effect: 'No Rizz Save', value: 'save', dropRate: 0.05 },

    // Legendary (5% drop rate)
    { id: 10, name: 'Godfather', rarity: 'legendary', icon: '🤵', effect: 'Max Multiplier', value: 'maxMultiplier', dropRate: 0.02 },
    { id: 11, name: 'Italian Flag', rarity: 'legendary', icon: '🇮🇹', effect: '+5000 Aura', value: 5000, dropRate: 0.02 },
    { id: 12, name: 'Roman Empire', rarity: 'legendary', icon: '⚔️', effect: 'FANUM TAX!', value: 'fanumTax', dropRate: 0.01 }
];

// Game Instance
let game;
let currentScene;
let ball;
let leftFlipper, rightFlipper;
let leftFlipperConstraint, rightFlipperConstraint;
let bumpers = [];
let targets = [];
let vault;
let plungerPower = 0;
let chargingPlunger = false;
let ballLaunched = false;
let canLaunch = true;

// UI Elements
const ui = {
    auraDisplay: document.getElementById('aura-display'),
    multiplierDisplay: document.getElementById('multiplier-display'),
    ballsDisplay: document.getElementById('balls-display'),
    fanumTaxAlert: document.getElementById('fanum-tax-alert'),
    taxCountdown: document.getElementById('tax-countdown'),
    cardNotification: document.getElementById('card-notification'),
    newCardDisplay: document.getElementById('new-card-display'),
    controlsHint: document.getElementById('controls-hint'),
    mainMenu: document.getElementById('main-menu'),
    gameOverMenu: document.getElementById('game-over-menu'),
    pauseMenu: document.getElementById('pause-menu'),
    inventoryMenu: document.getElementById('inventory-menu'),
    highScoreValue: document.getElementById('high-score-value'),
    finalAura: document.getElementById('final-aura'),
    finalCards: document.getElementById('final-cards'),
    newHighScore: document.getElementById('new-high-score'),
    cardGrid: document.getElementById('card-grid'),
    collectionCount: document.getElementById('collection-count'),
    collectibleCount: document.getElementById('collectibleCount')
};

// Sound System
const sounds = {
    context: null,
    enabled: true,

    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    },

    play(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.value = volume;

        oscillator.start(this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        oscillator.stop(this.context.currentTime + duration);
    },

    flipper() {
        this.play(300, 0.05, 'square', 0.2);
    },

    bumper() {
        this.play(800, 0.1, 'sine', 0.3);
    },

    target() {
        this.play(1200, 0.15, 'triangle', 0.25);
    },

    launch() {
        this.play(200, 0.3, 'sawtooth', 0.3);
    },

    cardUnlock() {
        this.play(1500, 0.4, 'sine', 0.4);
        setTimeout(() => this.play(2000, 0.3, 'sine', 0.3), 100);
    },

    fanumTax() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.play(500 + i * 200, 0.2, 'square', 0.4), i * 100);
        }
    },

    ballLost() {
        this.play(150, 0.5, 'sawtooth', 0.3);
    }
};

// Phaser Preload
function preload() {
    // No assets to preload - using geometric shapes
}

// Phaser Create
function create() {
    const scene = this;
    currentScene = scene;
    const { width, height } = scene.cameras.main;

    // Initialize sound
    if (!sounds.context) {
        sounds.init();
    }

    // ===== CREATE WORLD BOUNDARIES =====
    // Top wall
    scene.matter.add.rectangle(width / 2, -25, width, 50, {
        isStatic: true,
        label: 'wall',
        friction: 0.1
    });

    // Left wall
    scene.matter.add.rectangle(-25, height / 2, 50, height, {
        isStatic: true,
        label: 'wall',
        friction: 0.1
    });

    // Right main wall (stops at plunger lane)
    scene.matter.add.rectangle(width - 90, height / 2 - 150, 20, height - 300, {
        isStatic: true,
        label: 'wall',
        friction: 0.1
    });

    // Plunger lane right wall
    scene.matter.add.rectangle(width - 15, height / 2, 10, height, {
        isStatic: true,
        label: 'wall',
        friction: 0.1
    });

    // Separator between playfield and plunger lane (bottom)
    scene.matter.add.rectangle(width - 60, height - 80, 80, 20, {
        isStatic: true,
        label: 'wall',
        friction: 0.1
    });

    // Angled outlane walls at bottom
    const leftOutlane = scene.matter.add.rectangle(120, height - 80, 200, 20, {
        isStatic: true,
        angle: 0.6,
        label: 'wall',
        friction: 0.3
    });

    const rightOutlane = scene.matter.add.rectangle(width - 200, height - 80, 200, 20, {
        isStatic: true,
        angle: -0.6,
        label: 'wall',
        friction: 0.3
    });

    // ===== CREATE FLIPPERS WITH PROPER CONSTRAINTS =====
    const flipperWidth = 100;
    const flipperHeight = 20;
    const flipperY = height - 150;

    // LEFT FLIPPER
    const leftFlipperX = 220;
    const leftPivotX = 180;
    const leftPivotY = flipperY;

    leftFlipper = scene.matter.add.rectangle(leftFlipperX, flipperY, flipperWidth, flipperHeight, {
        chamfer: { radius: 10 },
        label: 'flipper',
        density: 0.001,
        friction: 0.8,
        restitution: 0.5,
        collisionFilter: {
            category: 1,
            mask: -1
        }
    });

    // Pin left flipper with constraint
    const leftPivot = scene.matter.add.circle(leftPivotX, leftPivotY, 5, {
        isStatic: true
    });

    leftFlipperConstraint = scene.matter.add.constraint(leftFlipper, leftPivot, 0, 0.9, {
        pointA: { x: -40, y: 0 },
        stiffness: 0.9,
        damping: 0.1
    });

    // Set angle limits on left flipper
    leftFlipper.minAngle = -0.8; // ~-45 degrees (down)
    leftFlipper.maxAngle = 0.3;  // ~17 degrees (up)
    leftFlipper.restAngle = -0.8;
    leftFlipper.activeAngle = 0.3;
    scene.matter.body.setAngle(leftFlipper, leftFlipper.restAngle);

    // RIGHT FLIPPER
    const rightFlipperX = 580;
    const rightPivotX = 620;
    const rightPivotY = flipperY;

    rightFlipper = scene.matter.add.rectangle(rightFlipperX, flipperY, flipperWidth, flipperHeight, {
        chamfer: { radius: 10 },
        label: 'flipper',
        density: 0.001,
        friction: 0.8,
        restitution: 0.5,
        collisionFilter: {
            category: 1,
            mask: -1
        }
    });

    // Pin right flipper with constraint
    const rightPivot = scene.matter.add.circle(rightPivotX, rightPivotY, 5, {
        isStatic: true
    });

    rightFlipperConstraint = scene.matter.add.constraint(rightFlipper, rightPivot, 0, 0.9, {
        pointA: { x: 40, y: 0 },
        stiffness: 0.9,
        damping: 0.1
    });

    // Set angle limits on right flipper
    rightFlipper.minAngle = -0.3; // ~-17 degrees (up)
    rightFlipper.maxAngle = 0.8;  // ~45 degrees (down)
    rightFlipper.restAngle = 0.8;
    rightFlipper.activeAngle = -0.3;
    scene.matter.body.setAngle(rightFlipper, rightFlipper.restAngle);

    // ===== CREATE BUMPERS =====
    bumpers = [];
    const bumperPositions = [
        { x: 250, y: 250 },
        { x: 450, y: 250 },
        { x: 350, y: 400 },
        { x: 200, y: 550 },
        { x: 500, y: 550 }
    ];

    bumperPositions.forEach(pos => {
        const bumper = scene.matter.add.circle(pos.x, pos.y, 40, {
            isStatic: true,
            restitution: 1.8,
            label: 'bumper'
        });
        bumpers.push(bumper);
    });

    // ===== CREATE TARGETS =====
    targets = [];
    const targetPositions = [
        { x: 120, y: 180 },
        { x: 580, y: 180 },
        { x: 120, y: 380 },
        { x: 580, y: 380 },
        { x: 350, y: 120 }
    ];

    targetPositions.forEach((pos, index) => {
        const target = scene.matter.add.rectangle(pos.x, pos.y, 60, 20, {
            isStatic: true,
            label: 'target',
            targetId: index,
            restitution: 0.5
        });
        targets.push(target);
    });

    // ===== CREATE VAULT (FANUM TAX) =====
    vault = scene.matter.add.rectangle(350, 50, 80, 40, {
        isStatic: true,
        label: 'vault',
        restitution: 0.5
    });

    // ===== CREATE BALL =====
    ball = scene.matter.add.circle(width - 45, height - 200, 15, {
        restitution: 0.7,
        friction: 0.01,
        frictionAir: 0.005,
        density: 0.002,
        label: 'ball',
        collisionFilter: {
            category: 1,
            mask: -1
        }
    });

    ballLaunched = false;
    canLaunch = true;
    plungerPower = 0;
    chargingPlunger = false;

    // ===== SETUP CONTROLS =====
    setupControls(scene);

    // ===== SETUP COLLISIONS =====
    setupCollisions(scene);

    // Update UI
    updateUI();

    // Hide main menu, show game
    ui.mainMenu.classList.add('hidden');
    ui.controlsHint.classList.remove('hidden');
}

// Phaser Update
function update(time, delta) {
    if (!currentScene) return;

    // ===== FLIPPER PHYSICS - Apply torque and clamp angles =====
    if (leftFlipper) {
        // Apply torque when active, return to rest when not
        if (leftFlipper.isActive) {
            currentScene.matter.body.setAngularVelocity(leftFlipper, 0.6);
        } else {
            currentScene.matter.body.setAngularVelocity(leftFlipper, -0.5);
        }

        // Clamp angle to limits
        if (leftFlipper.angle < leftFlipper.minAngle) {
            currentScene.matter.body.setAngle(leftFlipper, leftFlipper.minAngle);
            currentScene.matter.body.setAngularVelocity(leftFlipper, 0);
        } else if (leftFlipper.angle > leftFlipper.maxAngle) {
            currentScene.matter.body.setAngle(leftFlipper, leftFlipper.maxAngle);
            currentScene.matter.body.setAngularVelocity(leftFlipper, 0);
        }
    }

    if (rightFlipper) {
        // Apply torque when active, return to rest when not
        if (rightFlipper.isActive) {
            currentScene.matter.body.setAngularVelocity(rightFlipper, -0.6);
        } else {
            currentScene.matter.body.setAngularVelocity(rightFlipper, 0.5);
        }

        // Clamp angle to limits
        if (rightFlipper.angle < rightFlipper.minAngle) {
            currentScene.matter.body.setAngle(rightFlipper, rightFlipper.minAngle);
            currentScene.matter.body.setAngularVelocity(rightFlipper, 0);
        } else if (rightFlipper.angle > rightFlipper.maxAngle) {
            currentScene.matter.body.setAngle(rightFlipper, rightFlipper.maxAngle);
            currentScene.matter.body.setAngularVelocity(rightFlipper, 0);
        }
    }

    // ===== PLUNGER CHARGING =====
    if (chargingPlunger) {
        plungerPower = Math.min(plungerPower + delta * 0.002, 1.0);
    }

    // ===== MULTIPLIER TIMER =====
    if (gameState.multiplierTimer > 0) {
        gameState.multiplierTimer -= delta;
        if (gameState.multiplierTimer <= 0) {
            gameState.multiplier = Math.max(1, gameState.multiplier - 1);
            updateUI();
        }
    }

    // ===== FANUM TAX TIMER =====
    if (gameState.fanumTaxActive) {
        gameState.fanumTaxTimer -= delta;
        ui.taxCountdown.textContent = Math.ceil(gameState.fanumTaxTimer / 1000);

        if (gameState.fanumTaxTimer <= 0) {
            deactivateFanumTax();
        }
    }

    // ===== CHECK IF BALL OUT OF BOUNDS =====
    if (ball && ball.position.y > 1050) {
        handleBallLost();
    }
}

// Setup Controls
function setupControls(scene) {
    // Keyboard controls
    const cursors = scene.input.keyboard.createCursorKeys();
    const spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Left flipper
    scene.input.keyboard.on('keydown-LEFT', () => {
        leftFlipper.isActive = true;
        sounds.flipper();
    });

    scene.input.keyboard.on('keyup-LEFT', () => {
        leftFlipper.isActive = false;
    });

    // Right flipper
    scene.input.keyboard.on('keydown-RIGHT', () => {
        rightFlipper.isActive = true;
        sounds.flipper();
    });

    scene.input.keyboard.on('keyup-RIGHT', () => {
        rightFlipper.isActive = false;
    });

    // Launch ball - hold space to charge, release to launch
    spaceKey.on('down', () => {
        if (!ballLaunched && canLaunch) {
            chargingPlunger = true;
            plungerPower = 0;
        }
    });

    spaceKey.on('up', () => {
        if (chargingPlunger) {
            launchBall();
            chargingPlunger = false;
        }
    });

    // Touch controls
    const { width } = scene.cameras.main;

    scene.input.on('pointerdown', (pointer) => {
        if (pointer.x < width / 2) {
            leftFlipper.isActive = true;
            sounds.flipper();
        } else {
            rightFlipper.isActive = true;
            sounds.flipper();
        }
    });

    scene.input.on('pointerup', (pointer) => {
        if (pointer.x < width / 2) {
            leftFlipper.isActive = false;
        } else {
            rightFlipper.isActive = false;
        }
    });

    // Swipe down to launch
    let swipeStart = null;
    scene.input.on('pointerdown', (pointer) => {
        swipeStart = pointer.y;
    });

    scene.input.on('pointerup', (pointer) => {
        if (swipeStart && pointer.y < swipeStart - 50 && !ballLaunched && canLaunch) {
            launchBall();
        }
        swipeStart = null;
    });
}

// Setup Collisions
function setupCollisions(scene) {
    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;

            // Bumper collision
            if ((bodyA.label === 'bumper' && bodyB.label === 'ball') ||
                (bodyA.label === 'ball' && bodyB.label === 'bumper')) {
                handleBumperHit(bodyA.label === 'ball' ? bodyA : bodyB);
            }

            // Target collision
            if ((bodyA.label === 'target' && bodyB.label === 'ball') ||
                (bodyA.label === 'ball' && bodyB.label === 'target')) {
                handleTargetHit(bodyA.label === 'target' ? bodyA : bodyB);
            }

            // Vault collision
            if ((bodyA.label === 'vault' && bodyB.label === 'ball') ||
                (bodyA.label === 'ball' && bodyB.label === 'vault')) {
                handleVaultHit();
            }
        });
    });
}

// Launch Ball
function launchBall() {
    if (!canLaunch || !currentScene || !ball) return;

    // Use charged power to determine launch velocity
    const minVelocity = -15;
    const maxVelocity = -35;
    const launchVelocity = minVelocity + (maxVelocity - minVelocity) * plungerPower;

    // Apply velocity directly to ball
    currentScene.matter.body.setVelocity(ball, { x: 0, y: launchVelocity });

    ballLaunched = true;
    canLaunch = false;
    sounds.launch();

    // Reset plunger power
    plungerPower = 0;

    // Allow launching again after ball leaves launch lane
    setTimeout(() => {
        canLaunch = true;
        ballLaunched = false;
    }, 2000);
}

// Handle Bumper Hit
function handleBumperHit(ballBody) {
    const points = 50 * gameState.multiplier;
    addScore(points);
    sounds.bumper();

    // Increase multiplier
    gameState.multiplier = Math.min(gameState.maxMultiplier, gameState.multiplier + 0.5);
    gameState.multiplierTimer = 3000;
    updateUI();

    // Random card drop (10% chance)
    if (Math.random() < 0.1) {
        dropCard();
    }
}

// Handle Target Hit
function handleTargetHit(targetBody) {
    const points = 100 * gameState.multiplier;
    addScore(points);
    sounds.target();

    // Increase multiplier more
    gameState.multiplier = Math.min(gameState.maxMultiplier, gameState.multiplier + 1);
    gameState.multiplierTimer = 5000;
    updateUI();

    // Better card drop chance (20%)
    if (Math.random() < 0.2) {
        dropCard();
    }
}

// Handle Vault Hit
function handleVaultHit() {
    if (gameState.fanumTaxActive) {
        // Successfully hit vault during FANUM TAX
        const bonus = 5000 * gameState.multiplier;
        addScore(bonus);
        deactivateFanumTax();
        sounds.cardUnlock();

        // Guaranteed legendary card
        dropCard('legendary');
    } else {
        const points = 200 * gameState.multiplier;
        addScore(points);
        sounds.target();
    }
}

// Activate FANUM TAX
function activateFanumTax() {
    gameState.fanumTaxActive = true;
    gameState.fanumTaxTimer = 5000;
    ui.fanumTaxAlert.classList.remove('hidden');
    sounds.fanumTax();
}

// Deactivate FANUM TAX
function deactivateFanumTax() {
    gameState.fanumTaxActive = false;
    ui.fanumTaxAlert.classList.add('hidden');
}

// Drop Card
function dropCard(forceRarity = null) {
    let card;

    if (forceRarity === 'legendary') {
        const legendaryCards = CARDS.filter(c => c.rarity === 'legendary');
        card = legendaryCards[Math.floor(Math.random() * legendaryCards.length)];
    } else {
        // Weighted random selection
        const roll = Math.random();
        let cumulative = 0;

        for (const c of CARDS) {
            cumulative += c.dropRate;
            if (roll <= cumulative) {
                card = c;
                break;
            }
        }
    }

    if (!card) card = CARDS[0]; // Fallback

    // Apply card effect
    applyCardEffect(card);

    // Add to collection if not already collected
    if (!gameState.collectedCards.includes(card.id)) {
        gameState.collectedCards.push(card.id);
        localStorage.setItem('brainrotCards', JSON.stringify(gameState.collectedCards));
    }

    // Show notification
    showCardNotification(card);
}

// Apply Card Effect
function applyCardEffect(card) {
    switch (card.value) {
        case 'multiplier':
            gameState.multiplier = Math.min(gameState.maxMultiplier, gameState.multiplier + 1);
            gameState.multiplierTimer = 10000;
            break;
        case 'bigMultiplier':
            gameState.multiplier = Math.min(gameState.maxMultiplier, gameState.multiplier + 2);
            gameState.multiplierTimer = 15000;
            break;
        case 'maxMultiplier':
            gameState.multiplier = gameState.maxMultiplier;
            gameState.multiplierTimer = 20000;
            break;
        case 'ball':
            gameState.balls = Math.min(5, gameState.balls + 1);
            break;
        case 'save':
            // No rizz save - extra ball protection
            gameState.balls = Math.min(5, gameState.balls + 1);
            break;
        case 'fanumTax':
            activateFanumTax();
            break;
        default:
            // Numeric aura value
            addScore(card.value * gameState.multiplier);
    }

    updateUI();
}

// Show Card Notification
function showCardNotification(card) {
    ui.newCardDisplay.innerHTML = `
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    ui.cardNotification.classList.remove('hidden');

    sounds.cardUnlock();

    setTimeout(() => {
        ui.cardNotification.classList.add('hidden');
    }, 3000);
}

// Add Score
function addScore(points) {
    gameState.aura += Math.round(points);
    updateUI();
}

// Handle Ball Lost
function handleBallLost() {
    sounds.ballLost();
    gameState.balls--;

    if (gameState.balls <= 0) {
        endGame();
    } else {
        // Reset ball
        if (ball && ball.destroy) ball.destroy();
        createBall(currentScene);
        updateUI();
    }
}

// End Game
function endGame() {
    // Update high score
    if (gameState.aura > gameState.highScore) {
        gameState.highScore = gameState.aura;
        localStorage.setItem('brainrotHighScore', gameState.highScore);
        ui.newHighScore.classList.remove('hidden');
    } else {
        ui.newHighScore.classList.add('hidden');
    }

    // Show game over screen
    ui.finalAura.textContent = gameState.aura;
    ui.finalCards.textContent = gameState.collectedCards.length;
    ui.gameOverMenu.classList.remove('hidden');
}

// Update UI
function updateUI() {
    ui.auraDisplay.textContent = gameState.aura;
    ui.multiplierDisplay.textContent = `${gameState.multiplier.toFixed(1)}x`;
    ui.ballsDisplay.textContent = gameState.balls;
    ui.highScoreValue.textContent = gameState.highScore;
    ui.collectionCount.textContent = gameState.collectedCards.length;
}

// Update Inventory Display
function updateInventoryDisplay() {
    ui.cardGrid.innerHTML = '';

    CARDS.forEach(card => {
        const isUnlocked = gameState.collectedCards.includes(card.id);

        const cardElement = document.createElement('div');
        cardElement.className = `card-item ${card.rarity} ${isUnlocked ? '' : 'locked'}`;

        cardElement.innerHTML = `
            <div class="card-rarity">${getRarityIcon(card.rarity)}</div>
            <div class="card-icon">${isUnlocked ? card.icon : '❓'}</div>
            <div class="card-name">${isUnlocked ? card.name : '???'}</div>
            <div class="card-effect">${isUnlocked ? card.effect : 'Locked'}</div>
        `;

        ui.cardGrid.appendChild(cardElement);
    });
}

// Get Rarity Icon
function getRarityIcon(rarity) {
    switch (rarity) {
        case 'common': return '⚪';
        case 'rare': return '🔵';
        case 'epic': return '🟣';
        case 'legendary': return '🟡';
        default: return '';
    }
}

// Button Event Listeners
document.getElementById('start-game-btn').addEventListener('click', () => {
    if (!game) {
        game = new Phaser.Game(config);
    } else {
        // Reset game state
        gameState.aura = 0;
        gameState.multiplier = 1;
        gameState.balls = 3;
        gameState.multiplierTimer = 0;
        gameState.fanumTaxActive = false;

        ui.mainMenu.classList.add('hidden');
        ui.controlsHint.classList.remove('hidden');

        // Restart scene
        game.scene.scenes[0].scene.restart();
    }
});

document.getElementById('view-inventory-btn').addEventListener('click', () => {
    updateInventoryDisplay();
    ui.inventoryMenu.classList.remove('hidden');
});

document.getElementById('inventory-btn').addEventListener('click', () => {
    game.scene.scenes[0].scene.pause();
    updateInventoryDisplay();
    ui.inventoryMenu.classList.remove('hidden');
});

document.getElementById('close-inventory-btn').addEventListener('click', () => {
    ui.inventoryMenu.classList.add('hidden');
    if (game && game.scene.scenes[0].scene.isPaused()) {
        game.scene.scenes[0].scene.resume();
    }
});

document.getElementById('pause-btn').addEventListener('click', () => {
    game.scene.scenes[0].scene.pause();
    ui.pauseMenu.classList.remove('hidden');
});

document.getElementById('resume-btn').addEventListener('click', () => {
    game.scene.scenes[0].scene.resume();
    ui.pauseMenu.classList.add('hidden');
});

document.getElementById('restart-btn').addEventListener('click', () => {
    ui.pauseMenu.classList.add('hidden');
    gameState.aura = 0;
    gameState.multiplier = 1;
    gameState.balls = 3;
    game.scene.scenes[0].scene.restart();
});

document.getElementById('menu-main-btn').addEventListener('click', () => {
    ui.pauseMenu.classList.add('hidden');
    ui.mainMenu.classList.remove('hidden');
    game.scene.scenes[0].scene.stop();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    ui.gameOverMenu.classList.add('hidden');
    gameState.aura = 0;
    gameState.multiplier = 1;
    gameState.balls = 3;
    game.scene.scenes[0].scene.restart();
});

document.getElementById('game-over-main-btn').addEventListener('click', () => {
    ui.gameOverMenu.classList.add('hidden');
    ui.mainMenu.classList.remove('hidden');
});

document.getElementById('sound-btn').addEventListener('click', () => {
    sounds.enabled = !sounds.enabled;
    document.getElementById('sound-btn').textContent = sounds.enabled ? '🔊' : '🔇';
});

// Initialize high score display
ui.highScoreValue.textContent = gameState.highScore;
