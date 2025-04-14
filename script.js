const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Elements References
const currentPlayerSpan = document.getElementById('currentPlayer');
const score1Span = document.getElementById('score1');
const score2Span = document.getElementById('score2');
const windInfoSpan = document.getElementById('windInfo');
const messageInfo = document.getElementById('messageInfo');
const angleInput = document.getElementById('angleInput');
const velocityInput = document.getElementById('velocityInput');
const fireButton = document.getElementById('fireButton');

// Game Constants
const GRAVITY = 0.1;
const GORILLA_WIDTH = 30;
const GORILLA_HEIGHT = 30;
const BANANA_RADIUS = 5;
const EXPLOSION_RADIUS = 25;
const BUILDING_MIN_HEIGHT = 50;
const BUILDING_MAX_HEIGHT = canvas.height * 0.6;
const BUILDING_WIDTH_MIN = 40;
const BUILDING_WIDTH_MAX = 80;

// Game State
let buildings = [];
let gorillas = [ { x: 0, y: 0, color: 'brown' }, { x: 0, y: 0, color: 'gray' } ];
let banana = { x: 0, y: 0, vx: 0, vy: 0, active: false };
let explosion = { x: 0, y: 0, radius: 0, active: false, timer: 0 };
let currentPlayer = 1;
let scores = { player1: 0, player2: 0 };
let wind = 0; // Positive = right, Negative = left
let gameInProgress = true;
let animationFrameId = null;

// --- Initialization ---

function generateCityscape() {
    buildings = [];
    let currentX = 0;
    while (currentX < canvas.width) {
        const buildingHeight = Math.random() * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT) + BUILDING_MIN_HEIGHT;
        const buildingWidth = Math.random() * (BUILDING_WIDTH_MAX - BUILDING_WIDTH_MIN) + BUILDING_WIDTH_MIN;
        const buildingColor = `rgb(${Math.random()*100 + 50}, ${Math.random()*100 + 50}, ${Math.random()*100 + 50})`; // Shades of grey/brown

        buildings.push({
            x: currentX,
            y: canvas.height - buildingHeight,
            width: buildingWidth,
            height: buildingHeight,
            color: buildingColor
        });
        currentX += buildingWidth;
    }
    // Ensure exact width coverage (optional)
    if (buildings.length > 0) {
         buildings[buildings.length - 1].width = canvas.width - buildings[buildings.length - 1].x;
    }
}

function placeGorillas() {
    // Place gorilla 1 on one of the first few buildings
    const buildingIndex1 = Math.floor(Math.random() * 3) + 1; // 2nd, 3rd, or 4th building
    if (buildingIndex1 < buildings.length) {
        gorillas[0].x = buildings[buildingIndex1].x + buildings[buildingIndex1].width / 2 - GORILLA_WIDTH / 2;
        gorillas[0].y = buildings[buildingIndex1].y - GORILLA_HEIGHT;
    } else { // Fallback if not enough buildings
         gorillas[0].x = 50;
         gorillas[0].y = canvas.height - BUILDING_MIN_HEIGHT - GORILLA_HEIGHT;
    }


    // Place gorilla 2 on one of the last few buildings
    const buildingIndex2 = buildings.length - (Math.floor(Math.random() * 3) + 2); // 2nd to last, 3rd to last, etc.
     if (buildingIndex2 >= 0 && buildingIndex2 > buildingIndex1 + 1) { // Ensure not too close
        gorillas[1].x = buildings[buildingIndex2].x + buildings[buildingIndex2].width / 2 - GORILLA_WIDTH / 2;
        gorillas[1].y = buildings[buildingIndex2].y - GORILLA_HEIGHT;
     } else { // Fallback
        gorillas[1].x = canvas.width - 80;
        gorillas[1].y = canvas.height - BUILDING_MIN_HEIGHT - GORILLA_HEIGHT;
     }
}

function setWind() {
    wind = (Math.random() - 0.5) * 0.1; // Small wind value
    windInfoSpan.textContent = (wind * 100).toFixed(1); // Display scaled wind
}

function initGame() {
    gameInProgress = true;
    banana.active = false;
    explosion.active = false;
    currentPlayer = 1;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    generateCityscape();
    placeGorillas();
    setWind();
    updateUI();
    draw();
    setMessage("Player 1: Enter angle and velocity.");
    enableControls(true);
}

function resetRound() {
    gameInProgress = true;
    banana.active = false;
    explosion.active = false;
     if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Keep scores, regenerate level
    generateCityscape();
    placeGorillas();
    setWind();
    currentPlayer = 1; // Start with player 1
    updateUI();
    draw();
    setMessage(`New Round! Player ${currentPlayer}'s Turn.`);
    enableControls(true);
}


// --- Drawing ---

function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw buildings
    buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // Draw gorillas
    gorillas.forEach((g, index) => {
        ctx.fillStyle = g.color;
        ctx.fillRect(g.x, g.y, GORILLA_WIDTH, GORILLA_HEIGHT);
        // Simple 'face' direction indicator
        ctx.fillStyle = 'white';
        if (index === 0) { // Player 1 faces right
             ctx.fillRect(g.x + GORILLA_WIDTH * 0.6, g.y + GORILLA_HEIGHT * 0.2, 5, 5);
        } else { // Player 2 faces left
             ctx.fillRect(g.x + GORILLA_WIDTH * 0.2, g.y + GORILLA_HEIGHT * 0.2, 5, 5);
        }
    });


    // Draw banana if active
    if (banana.active) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(banana.x, banana.y, BANANA_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw explosion if active
    if (explosion.active) {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Game Logic ---

function fireBanana() {
    if (!gameInProgress || banana.active) return;

    const angleDeg = parseFloat(angleInput.value);
    const velocity = parseFloat(velocityInput.value);

    if (isNaN(angleDeg) || isNaN(velocity) || velocity <= 0 || angleDeg < 0 || angleDeg > 180) {
        setMessage("Invalid input. Angle 0-180, Velocity > 0.");
        return;
    }

    enableControls(false);
    setMessage("");

    // Convert angle (0-180) to radians for Math functions
    // Adjust angle based on player (0=right, 180=left)
    let angleRad;
    if (currentPlayer === 1) {
        angleRad = (180 - angleDeg) * Math.PI / 180; // Player 1 throws right-to-left on screen usually, but 0 angle means horizontal right
        banana.x = gorillas[0].x + GORILLA_WIDTH; // Start from right edge of P1
        banana.y = gorillas[0].y + GORILLA_HEIGHT / 2;
    } else {
        angleRad = angleDeg * Math.PI / 180; // Player 2 throws left-to-right
        banana.x = gorillas[1].x; // Start from left edge of P2
        banana.y = gorillas[1].y + GORILLA_HEIGHT / 2;
    }

    const power = velocity / 5; // Scale velocity

    banana.vx = Math.cos(angleRad) * power;
    banana.vy = -Math.sin(angleRad) * power; // Negative Y is up in canvas
    banana.active = true;

    gameLoop(); // Start the animation
}

function gameLoop() {
    if (!banana.active && !explosion.active) {
        animationFrameId = null;
        return; // Stop loop if nothing is happening
    }

    if (banana.active) {
        // Update banana position
        banana.vx += wind;
        banana.vy += GRAVITY;
        banana.x += banana.vx;
        banana.y += banana.vy;

        // --- Collision Detection ---
        let hitTarget = null; // null, 'building', 'gorilla1', 'gorilla2', 'ground', 'offscreen'

        // Off screen check
        if (banana.x < -BANANA_RADIUS || banana.x > canvas.width + BANANA_RADIUS || banana.y > canvas.height + BANANA_RADIUS) {
            hitTarget = 'offscreen';
        }

        // Building collision
        if (!hitTarget) {
            for (const building of buildings) {
                if (banana.x >= building.x && banana.x <= building.x + building.width && banana.y >= building.y) {
                    hitTarget = 'building';
                    break;
                }
            }
        }

        // Gorilla collision
        if (!hitTarget) {
            gorillas.forEach((g, index) => {
                if (banana.x >= g.x && banana.x <= g.x + GORILLA_WIDTH &&
                    banana.y >= g.y && banana.y <= g.y + GORILLA_HEIGHT) {
                    hitTarget = `gorilla${index + 1}`;
                }
            });
        }

        // --- Handle Hit ---
        if (hitTarget) {
            banana.active = false;
            startExplosion(banana.x, banana.y);

            if (hitTarget === `gorilla${currentPlayer === 1 ? 2 : 1}`) { // Hit opponent
                setMessage(`Player ${currentPlayer} HITS!`);
                scores[`player${currentPlayer}`]++;
                updateUI();
                // Check for game over maybe? For now, just reset round after explosion.
                // gameInProgress = false; // Or trigger next round logic after explosion
            } else if (hitTarget === `gorilla${currentPlayer}`) { // Hit self
                 setMessage(`Player ${currentPlayer} hit themselves! Ouch!`);
                 // Optionally penalize? Switch turn anyway.
            } else if (hitTarget === 'building') {
                setMessage("Hit a building!");
            } else { // Offscreen
                setMessage("Missed!");
            }
            // Next turn logic happens after explosion finishes
        }
    }

     // --- Update Explosion ---
     if (explosion.active) {
        explosion.radius += 1; // Grow explosion
        explosion.timer--;
        if (explosion.timer <= 0) {
            explosion.active = false;
            // After explosion finishes, if game is still going, switch player
            if (gameInProgress) {
                switchPlayer();
            } else {
                 // Or handle end-of-game state here if a hit ended it
                 setMessage(`Player ${currentPlayer} Wins! Final Score: ${scores.player1}-${scores.player2}. Press F5 to play again.`);
                 // A more robust restart would be better than F5
                 // For now, we just reset the round on a hit.
                 setTimeout(resetRound, 1500); // Wait 1.5s then start new round
            }
        }
    }


    draw(); // Redraw the scene

    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startExplosion(x, y) {
    explosion.x = x;
    explosion.y = y;
    explosion.radius = 5;
    explosion.active = true;
    explosion.timer = 30; // Frames explosion lasts
}

function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateUI();
    setMessage(`Player ${currentPlayer}'s turn.`);
    enableControls(true);
}

// --- UI Updates ---

function updateUI() {
    currentPlayerSpan.textContent = currentPlayer;
    score1Span.textContent = scores.player1;
    score2Span.textContent = scores.player2;
     // Keep wind display updated (though it only changes per round now)
     windInfoSpan.textContent = (wind * 100).toFixed(1);
}

function setMessage(msg) {
    messageInfo.textContent = msg;
}

function enableControls(enabled) {
    angleInput.disabled = !enabled;
    velocityInput.disabled = !enabled;
    fireButton.disabled = !enabled;
}

// --- Event Listeners ---
fireButton.addEventListener('click', fireBanana);

// --- Start Game ---
initGame(); // Initialize everything when script loads
