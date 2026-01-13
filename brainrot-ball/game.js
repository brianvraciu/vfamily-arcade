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
            enableSleeping: false
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
let bumpers = [];
let targets = [];
let vault;
let plunger;
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

    // Initialize sound
    if (!sounds.context) {
        sounds.init();
    }

    // Create pinball table boundaries
    createTable(scene);

    // Create flippers
    createFlippers(scene);

    // Create bumpers
    createBumpers(scene);

    // Create targets
    createTargets(scene);

    // Create vault (FANUM TAX target)
    createVault(scene);

    // Create plunger
    createPlunger(scene);

    // Create ball
    createBall(scene);

    // Setup controls
    setupControls(scene);

    // Setup collision events
    setupCollisions(scene);

    // Update UI
    updateUI();

    // Hide main menu, show game
    ui.mainMenu.classList.add('hidden');
    ui.controlsHint.classList.remove('hidden');
}

// Phaser Update
function update(time, delta) {
    // Update multiplier timer
    if (gameState.multiplierTimer > 0) {
        gameState.multiplierTimer -= delta;
        if (gameState.multiplierTimer <= 0) {
            gameState.multiplier = Math.max(1, gameState.multiplier - 1);
            updateUI();
        }
    }

    // Update FANUM TAX timer
    if (gameState.fanumTaxActive) {
        gameState.fanumTaxTimer -= delta;
        ui.taxCountdown.textContent = Math.ceil(gameState.fanumTaxTimer / 1000);

        if (gameState.fanumTaxTimer <= 0) {
            deactivateFanumTax();
        }
    }

    // Check if ball is out of bounds
    if (ball && ball.y > 1050) {
        handleBallLost();
    }
}

// Create Table
function createTable(scene) {
    const { width, height } = scene.cameras.main;

    // Outer walls
    scene.matter.add.rectangle(width / 2, -25, width, 50, { isStatic: true, label: 'wall' });
    scene.matter.add.rectangle(-25, height / 2, 50, height, { isStatic: true, label: 'wall' });

    // Right wall (shorter to allow plunger lane)
    scene.matter.add.rectangle(width - 90, height / 2 - 100, 20, height - 200, { isStatic: true, label: 'wall' });

    // Plunger lane walls (right side channel)
    scene.matter.add.rectangle(width - 30, height / 2, 20, height, { isStatic: true, label: 'wall' });

    // Bottom separator between plunger lane and play field
    scene.matter.add.rectangle(width - 60, height - 80, 80, 20, { isStatic: true, label: 'wall' });

    // Slanted sides at bottom (outlanes)
    const leftSlant = scene.matter.add.rectangle(120, height - 80, 180, 20, {
        isStatic: true,
        angle: 0.5,
        label: 'wall'
    });

    const rightSlant = scene.matter.add.rectangle(width - 200, height - 80, 180, 20, {
        isStatic: true,
        angle: -0.5,
        label: 'wall'
    });

    // Draw walls
    const graphics = scene.add.graphics();
    graphics.lineStyle(5, 0xFFD700);
    graphics.strokeRect(0, 0, width - 60, height - 50);
    graphics.strokeRect(width - 60, 0, 60, height);
}

// Create Flippers
function createFlippers(scene) {
    const { width, height } = scene.cameras.main;

    // Flipper specs: Rest angle pointing DOWN, swing up 50° (standard pinball)
    // More extreme downward angle for proper pinball feel
    const restAngleLeft = -0.7; // ~-40 degrees - pointing down-right
    const maxAngleLeft = 0.2; // ~11 degrees - pointing slightly up
    const restAngleRight = 0.7; // ~40 degrees - pointing down-left
    const maxAngleRight = -0.2; // ~-11 degrees - pointing slightly up

    // Left flipper
    leftFlipper = scene.matter.add.rectangle(240, height - 130, 100, 20, {
        chamfer: { radius: 10 },
        label: 'flipper',
        angle: restAngleLeft,
        restitution: 0.8,
        friction: 0.5
    });
    leftFlipper.isActive = false;
    leftFlipper.restAngle = restAngleLeft;
    leftFlipper.maxAngle = maxAngleLeft;

    const leftPivot = scene.matter.add.circle(200, height - 130, 5, { isStatic: true });
    scene.matter.add.constraint(leftFlipper, leftPivot, 0, 1, {
        pointA: { x: -40, y: 0 },
        stiffness: 1
    });

    // Right flipper
    rightFlipper = scene.matter.add.rectangle(560, height - 130, 100, 20, {
        chamfer: { radius: 10 },
        label: 'flipper',
        angle: restAngleRight,
        restitution: 0.8,
        friction: 0.5
    });
    rightFlipper.isActive = false;
    rightFlipper.restAngle = restAngleRight;
    rightFlipper.maxAngle = maxAngleRight;

    const rightPivot = scene.matter.add.circle(600, height - 130, 5, { isStatic: true });
    scene.matter.add.constraint(rightFlipper, rightPivot, 0, 1, {
        pointA: { x: 40, y: 0 },
        stiffness: 1
    });

    // Flipper physics update - force angles to stay in bounds
    scene.matter.world.on('beforeupdate', () => {
        // Left flipper control
        if (leftFlipper.isActive) {
            scene.matter.body.setAngularVelocity(leftFlipper, 0.5);
            // Clamp to max angle
            if (leftFlipper.angle >= leftFlipper.maxAngle) {
                scene.matter.body.setAngle(leftFlipper, leftFlipper.maxAngle);
                scene.matter.body.setAngularVelocity(leftFlipper, 0);
            }
        } else {
            scene.matter.body.setAngularVelocity(leftFlipper, -0.4);
            // Clamp to rest angle
            if (leftFlipper.angle <= leftFlipper.restAngle) {
                scene.matter.body.setAngle(leftFlipper, leftFlipper.restAngle);
                scene.matter.body.setAngularVelocity(leftFlipper, 0);
            }
        }

        // Right flipper control
        if (rightFlipper.isActive) {
            scene.matter.body.setAngularVelocity(rightFlipper, -0.5);
            // Clamp to max angle
            if (rightFlipper.angle <= rightFlipper.maxAngle) {
                scene.matter.body.setAngle(rightFlipper, rightFlipper.maxAngle);
                scene.matter.body.setAngularVelocity(rightFlipper, 0);
            }
        } else {
            scene.matter.body.setAngularVelocity(rightFlipper, 0.4);
            // Clamp to rest angle
            if (rightFlipper.angle >= rightFlipper.restAngle) {
                scene.matter.body.setAngle(rightFlipper, rightFlipper.restAngle);
                scene.matter.body.setAngularVelocity(rightFlipper, 0);
            }
        }
    });
}

// Create Bumpers
function createBumpers(scene) {
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
            restitution: 1.5,
            label: 'bumper'
        });
        bumpers.push(bumper);

        // Draw bumper
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xFF00FF, 1);
        graphics.fillCircle(pos.x, pos.y, 40);
    });
}

// Create Targets
function createTargets(scene) {
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
            targetId: index
        });
        targets.push(target);

        // Draw target
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x00FFFF, 1);
        graphics.fillRect(pos.x - 30, pos.y - 10, 60, 20);
    });
}

// Create Vault (FANUM TAX)
function createVault(scene) {
    vault = scene.matter.add.rectangle(400, 50, 80, 40, {
        isStatic: true,
        label: 'vault'
    });

    // Draw vault
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillRect(360, 30, 80, 40);

    const text = scene.add.text(400, 50, '💰', {
        fontSize: '32px',
        align: 'center'
    });
    text.setOrigin(0.5);
}

// Create Plunger
function createPlunger(scene) {
    const { width, height } = scene.cameras.main;

    // Plunger at bottom of launch lane - start as static so it doesn't fall
    plunger = scene.matter.add.rectangle(width - 45, height - 80, 30, 60, {
        isStatic: true, // Static until launch
        label: 'plunger',
        density: 0.05
    });
}

// Create Ball
function createBall(scene) {
    const { width, height } = scene.cameras.main;

    // Ball starts in plunger lane (right side)
    ball = scene.matter.add.circle(width - 45, height - 200, 15, {
        restitution: 0.8,
        friction: 0.05,
        density: 0.001,
        label: 'ball',
        frictionAir: 0.01
    });

    ballLaunched = false;
    canLaunch = true;
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

    // Launch ball
    spaceKey.on('down', () => {
        launchBall();
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
    if (!canLaunch || ballLaunched || !currentScene || !ball) return;

    // Apply strong upward force to ball to simulate plunger hit
    const launchForce = 0.25;
    currentScene.matter.body.applyForce(ball, ball.position, { x: 0, y: -launchForce });

    ballLaunched = true;
    canLaunch = false;
    sounds.launch();

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
