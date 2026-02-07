const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Constants
const TILE_SRC_SIZE = 16;     
const TILE_DISPLAY_SIZE = 32; 
const COLS = 30;              
const ROWS = 20;              
let TILESET_COLS = 10; 

canvas.width = COLS * TILE_DISPLAY_SIZE;
canvas.height = ROWS * TILE_DISPLAY_SIZE;

// Offscreen canvas for fog
const fogCanvas = document.createElement("canvas");
fogCanvas.width = canvas.width;
fogCanvas.height = canvas.height;
const fogCtx = fogCanvas.getContext("2d");

// --- ASSETS ---
const tileset = new Image();
tileset.src = "src/map.png";

const playerImg = new Image();
playerImg.src = "src/AiraCutie.png";

const heartImg = new Image();
heartImg.src = "src/heart.png";

// --- AUDIO ---
const bgMusic = new Audio("src/Palagi (TJ Monterde x KZ Tandingan) - Paolo Gans - Fingerstyle Guitar.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

function startMusic() {
    if (bgMusic.paused) {
        bgMusic.play().catch(e => console.log("Music play blocked by browser."));
    }
}

// --- GAME STATE ---
let showMessage = false;
let messageText = ""; 
let displayedText = ""; 
let textIndex = 0;
let hasHeart = false;
let gameWon = false;
let finalState = "NONE"; 
let gameRunning = false;
let globalFrame = 0; 
let flashAlpha = 0; 
const particles = [];

const memoryNotes = [
    { text: "Thank you for always being there with me", found: false },
    { text: "You're my first and I wish you to be my last", found: false },
    { text: "I love you so much", found: false }
];

let FLOWER_ID, SPIKE_ID, HOLE_ID, SIGN_ID, CHEST_ID, POT_ID, NOTE_ID;
const signText = "Happy Monthsarry baby, Hope you enjoy this game I built. \n Go find the rocks and the heart.";

const player = {
    x: Math.floor(COLS / 2) * TILE_DISPLAY_SIZE, 
    y: Math.floor(ROWS / 2) * TILE_DISPLAY_SIZE,
    width: TILE_DISPLAY_SIZE - 4,
    height: TILE_DISPLAY_SIZE - 4,
    srcW: 125,
    srcH: 125,
    frameX: 0,
    frameY: 0,
    frameCount: 4,
    frameTimer: 0,
    frameSpeed: 8,
    speed: 4,
    isMoving: false
};

const keys = {};
window.addEventListener("keydown", (e) => {
    if (!gameRunning || !e.key) return;
    keys[e.key.toLowerCase()] = true;
    startMusic();
});
window.addEventListener("keyup", (e) => {
    if (e.key) keys[e.key.toLowerCase()] = false;
});

// --- PARTICLES ---
function createParticles(x, y, color, count, sizeRange = 5, vxRange = 8, vyRange = 8, decayBase = 0.015) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * vxRange,
            vy: (Math.random() - 0.5) * vyRange,
            size: Math.random() * sizeRange + 2,
            life: 1.0,
            decay: Math.random() * 0.02 + decayBase,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const topCurveHeight = p.size * 0.3;
        ctx.moveTo(p.x, p.y + topCurveHeight);
        ctx.bezierCurveTo(p.x, p.y, p.x - p.size / 2, p.y, p.x - p.size / 2, p.y + topCurveHeight);
        ctx.bezierCurveTo(p.x - p.size / 2, p.y + (p.size + topCurveHeight) / 2, p.x, p.y + (p.size + topCurveHeight) / 2, p.x, p.y + p.size);
        ctx.bezierCurveTo(p.x, p.y + (p.size + topCurveHeight) / 2, p.x + p.size / 2, p.y + (p.size + topCurveHeight) / 2, p.x + p.size / 2, p.y + topCurveHeight);
        ctx.bezierCurveTo(p.x + p.size / 2, p.y, p.x, p.y, p.x, p.y + topCurveHeight);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// --- FOG EFFECT ---
function drawFog() {
    if (finalState !== "NONE") return; 
    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogCtx.fillStyle = "rgba(0, 0, 0, 0.88)"; 
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const pulse = Math.sin(globalFrame * 0.08); 
    const radius = 130 + (pulse * 12); 
    const grad = fogCtx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
    grad.addColorStop(0, "rgba(0, 0, 0, 1)");
    grad.addColorStop(0.8, "rgba(0, 0, 0, 0.4)"); 
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    fogCtx.globalCompositeOperation = "destination-out";
    fogCtx.fillStyle = grad;
    fogCtx.beginPath();
    fogCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    fogCtx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "screen"; 
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius + 20);
    const glowAlpha = 0.15 + (pulse + 1) * 0.1; 
    glowGrad.addColorStop(0, `rgba(255, 100, 150, ${glowAlpha})`); 
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(fogCanvas, 0, 0);
}

function triggerMessage(text) {
    if (messageText !== text) {
        messageText = text;
        showMessage = true;
        textIndex = 0;
        displayedText = "";
    }
}

// Start Screen Logic
document.getElementById("start-btn").addEventListener("click", () => {
    const input = document.getElementById("anniversary-input").value.trim();
    if (input.toLowerCase() === "august 8 2024") {
        document.getElementById("start-screen").style.display = "none";
        document.getElementById("game-container").style.display = "flex";
        document.getElementById("mobile-controls").style.display = "flex";
        gameRunning = true;
        startMusic();
        gameLoop();
    } else {
        const err = document.getElementById("error-msg");
        err.style.display = "block";
        err.textContent = "Incorrect! Try 'August 8 2024'";
    }
});

const handleInput = (clientX, clientY) => {
    if (!gameRunning) return;
    startMusic();
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((clientY - rect.top) / rect.height) * canvas.height;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (gameWon && finalState === "NONE") {
        if (mouseX >= cx - 110 && mouseX <= cx - 10 && mouseY >= cy + 20 && mouseY <= cy + 70) {
            finalState = "YES";
            drawHeart(FLOWER_ID);
            createParticles(cx, cy, "#ff4757", 150, 10); 
            flashAlpha = 0.5;
        }
        if (mouseX >= cx + 10 && mouseX <= cx + 110 && mouseY >= cy + 20 && mouseY <= cy + 70) {
            finalState = "NO";
            drawSkull(SPIKE_ID);
            flashAlpha = 0.3;
        }
    } else if (finalState !== "NONE") {
        if (mouseX >= cx - 60 && mouseX <= cx + 60 && mouseY >= cy + 120 && mouseY <= cy + 160) {
            location.reload();
        }
    }
};

canvas.addEventListener("mousedown", (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener("touchstart", (e) => {
    if (!gameRunning) return;
    e.preventDefault(); 
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });

function drawHeart(tileId) {
    fillMapWith(0);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let x = (c - COLS / 2) / 8; 
            let y = -1 * (r - ROWS / 2) / 8; 
            let a = x * x + y * y - 1;
            if (a * a * a - x * x * y * y * y <= 0) mapLayer[r][c] = tileId;
        }
    }
}

function drawSkull(tileId) {
    fillMapWith(0);
    const skull = [
        {r: 4, c1: 12, c2: 17}, {r: 5, c1: 10, c2: 19},
        {r: 6, c1: 9, c2: 20}, {r: 7, c1: 8, c2: 21},
        {r: 8, c1: 8, c2: 21, eyes: [11, 12, 17, 18]},
        {r: 9, c1: 8, c2: 21, eyes: [11, 12, 17, 18]},
        {r: 10, c1: 8, c2: 21, nose: [14, 15]},
        {r: 11, c1: 9, c2: 20}, {r: 12, c1: 10, c2: 19},
        {r: 13, c1: 12, c2: 17}, {r: 14, c1: 12, c2: 17, teeth: [13, 15]},
        {r: 15, c1: 12, c2: 17}
    ];
    skull.forEach(row => {
        for (let c = row.c1; c <= row.c2; c++) {
            if (row.eyes && row.eyes.includes(c)) continue;
            if (row.nose && row.nose.includes(c)) continue;
            if (row.teeth && row.teeth.includes(c)) continue;
            if (row.r < ROWS && c < COLS) mapLayer[row.r][c] = tileId;
        }
    });
}

function fillMapWith(tileId) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            mapLayer[r][c] = tileId;
        }
    }
}

const mapLayer = [];
function generateMaze() {
    for (let r = 0; r < ROWS; r++) {
        mapLayer[r] = [];
        for (let c = 0; c < COLS; c++) {
            mapLayer[r][c] = HOLE_ID; 
        }
    }
    const stack = [];
    let current = { r: 1, c: 1 };
    mapLayer[current.r][current.c] = 0;
    while (true) {
        let neighbors = [];
        let r = current.r, c = current.c;
        if (r > 2 && mapLayer[r - 2][c] === HOLE_ID) neighbors.push({ r: r - 2, c: c, midR: r - 1, midC: c });
        if (r < ROWS - 3 && mapLayer[r + 2][c] === HOLE_ID) neighbors.push({ r: r + 2, c: c, midR: r + 1, midC: c });
        if (c > 2 && mapLayer[r][c - 2] === HOLE_ID) neighbors.push({ r: r, c: c - 2, midR: r, midC: c - 1 });
        if (c < COLS - 3 && mapLayer[r][c + 2] === HOLE_ID) neighbors.push({ r: r, c: c + 2, midR: r, midC: c + 1 });
        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            mapLayer[next.midR][next.midC] = 0;
            mapLayer[next.r][next.c] = 0;
            stack.push(current);
            current = { r: next.r, c: next.c };
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (mapLayer[r][c] === 0 && Math.random() < 0.1) mapLayer[r][c] = FLOWER_ID; 
        }
    }
    const midC = Math.floor(COLS / 2), midR = Math.floor(ROWS / 2);
    for (let r = midR - 1; r <= midR + 1; r++) {
        for (let c = midC - 1; c <= midC + 1; c++) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) mapLayer[r][c] = 0;
        }
    }
    mapLayer[midR][midC + 1] = SIGN_ID; 
    mapLayer[1][1] = POT_ID;           
    mapLayer[ROWS - 2][COLS - 2] = CHEST_ID; 
    mapLayer[1][2] = 0; mapLayer[2][1] = 0;
    mapLayer[ROWS - 2][COLS - 3] = 0; mapLayer[ROWS - 3][COLS - 2] = 0;

    let placed = 0;
    while (placed < 3) {
        let rr = Math.floor(Math.random() * ROWS);
        let rc = Math.floor(Math.random() * COLS);
        if (mapLayer[rr][rc] === 0 || mapLayer[rr][rc] === FLOWER_ID) {
            const dist = Math.sqrt(Math.pow(rc - midC, 2) + Math.pow(rr - midR, 2));
            if (dist > 5) { mapLayer[rr][rc] = NOTE_ID; placed++; }
        }
    }
}

function canMoveTo(nx, ny) {
    const margin = 6; 
    const corners = [{ x: nx + margin, y: ny + margin }, { x: nx + player.width - margin, y: ny + margin }, { x: nx + margin, y: ny + player.height - margin }, { x: nx + player.width - margin, y: ny + player.height - margin }];
    for (let p of corners) {
        let col = Math.floor(p.x / TILE_DISPLAY_SIZE), row = Math.floor(p.y / TILE_DISPLAY_SIZE);
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
        const tile = mapLayer[row][col];
        if (tile === HOLE_ID) return false; 
        if (tile === NOTE_ID) {
            const currentNoteIndex = memoryNotes.findIndex(n => !n.found);
            if (currentNoteIndex !== -1) {
                memoryNotes[currentNoteIndex].found = true;
                mapLayer[row][col] = 0;
                triggerMessage(memoryNotes[currentNoteIndex].text);
                createParticles(p.x, p.y, "#ff69b4", 30);
                flashAlpha = 0.2;
                setTimeout(() => { if(messageText === memoryNotes[currentNoteIndex].text) showMessage = false; }, 4000);
            }
        }
        if (tile === POT_ID) {
            hasHeart = true; mapLayer[row][col] = 0;
            triggerMessage("You found a Heart! <3");
            createParticles(p.x, p.y, "#ff4757", 40); 
            flashAlpha = 0.4;
            setTimeout(() => { if(messageText === "You found a Heart! <3") showMessage = false; }, 3000);
        }
        if (tile === CHEST_ID) {
            if (hasHeart) gameWon = true;
            else triggerMessage("Locked! You need a Heart.");
            return false;
        }
    }
    return true;
}

function update() {
    updateParticles();
    globalFrame++; 
    if (flashAlpha > 0) flashAlpha -= 0.02;

    if (showMessage && textIndex < messageText.length) {
        textIndex += 0.5;
        displayedText = messageText.substring(0, Math.floor(textIndex));
    } else if (showMessage) displayedText = messageText;

    if (gameWon) {
        if (finalState === "YES" && globalFrame % 5 === 0) {
            createParticles(Math.random() * canvas.width, canvas.height + 10, "#ff4757", 1, 10, 2, -10, 0.005);
            createParticles(Math.random() * canvas.width, canvas.height + 10, "#ff6b81", 1, 8, 2, -8, 0.005);
        }
        return; 
    }
    
    if (player.isMoving && globalFrame % 10 === 0) {
        createParticles(player.x + player.width/2, player.y + player.height, "rgba(255, 192, 203, 0.5)", 1, 3);
    }

    player.isMoving = false;
    let dx = 0, dy = 0;
    const midC = Math.floor(COLS / 2), midR = Math.floor(ROWS / 2);
    
    // Sign Proximity Trigger Refactored
    const signCol = midC + 1;
    const signRow = midR;
    const pCX = player.x + player.width / 2;
    const pCY = player.y + player.height / 2;
    const sCX = (signCol + 0.5) * TILE_DISPLAY_SIZE;
    const sCY = (signRow + 0.5) * TILE_DISPLAY_SIZE;
    const dist = Math.sqrt(Math.pow(pCX - sCX, 2) + Math.pow(pCY - sCY, 2));
    
    if (dist < TILE_DISPLAY_SIZE * 2.0) { // Increased radius to 2.0 tiles
        const isGameMsg = messageText === "You found my Heart! <3" || messageText === "Locked! You need a Heart." || memoryNotes.some(n => n.text === messageText);
        // Only trigger sign if not showing a high-priority game message
        if (!showMessage || (isGameMsg && textIndex >= messageText.length)) {
            triggerMessage(signText);
        }
    } else if (messageText === signText) {
        showMessage = false;
    }

    if (keys["w"] || keys["arrowup"]) { dy = -1; player.frameY = 1; player.isMoving = true; } 
    else if (keys["s"] || keys["arrowdown"]) { dy = 1; player.frameY = 0; player.isMoving = true; } 
    else if (keys["a"] || keys["arrowleft"]) { dx = -1; player.frameY = 3; player.isMoving = true; } 
    else if (keys["d"] || keys["arrowright"]) { dx = 1; player.frameY = 2; player.isMoving = true; }

    if (player.isMoving) {
        let nextX = player.x + dx * player.speed, nextY = player.y + dy * player.speed;
        if (canMoveTo(nextX, player.y)) player.x = nextX;
        if (canMoveTo(player.x, nextY)) player.y = nextY;
        player.frameTimer++;
        if (player.frameTimer >= player.frameSpeed) { player.frameX = (player.frameX + 1) % player.frameCount; player.frameTimer = 0; }
    } else { player.frameX = 0; player.frameTimer = 0; }
}

function drawMap() {
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dx = c * TILE_DISPLAY_SIZE, dy = r * TILE_DISPLAY_SIZE;
            ctx.drawImage(tileset, 0, 0, TILE_SRC_SIZE, TILE_SRC_SIZE, dx, dy, TILE_DISPLAY_SIZE + 0.5, TILE_DISPLAY_SIZE + 0.5);
            const tileId = mapLayer[r][c];
            if (tileId !== 0) {
                let srcX = (tileId % TILESET_COLS) * TILE_SRC_SIZE, srcY = Math.floor(tileId / TILESET_COLS) * TILE_SRC_SIZE;
                let bounce = 0;
                if ([POT_ID, CHEST_ID, NOTE_ID].includes(tileId)) bounce = Math.sin(globalFrame * 0.1) * 3;
                ctx.drawImage(tileset, srcX, srcY, TILE_SRC_SIZE, TILE_SRC_SIZE, dx, dy + bounce, TILE_DISPLAY_SIZE + 0.5, TILE_DISPLAY_SIZE + 0.5);
            }
        }
    }
}

function drawPlayer() {
    ctx.imageSmoothingEnabled = false;
    let drawX = Math.floor(player.x), drawY = Math.floor(player.y), drawW = player.width, drawH = player.height;
    if (!player.isMoving) {
        const breath = Math.sin(globalFrame * 0.1) * 1.5; 
        drawH -= breath; drawY += breath; 
    }
    ctx.drawImage(playerImg, player.frameX * player.srcW, player.frameY * player.srcH, player.srcW, player.srcH, drawX, drawY, drawW, drawH);
}

function render() {
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMap();
    if (!gameWon || finalState === "NONE") { drawPlayer(); drawFog(); }
    drawParticles();

    if (hasHeart) {
        const pulse = 1 + Math.sin(globalFrame * 0.1) * 0.1;
        ctx.drawImage(heartImg, 10, 10, 32 * pulse, 32 * pulse);
        ctx.fillStyle = "white"; ctx.font = "bold 16px Arial"; ctx.fillText("x 1", 50, 32);
    }

    if (showMessage && !gameWon) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(canvas.width / 2 - 280, 20, 560, 120); 
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 280, 20, 560, 120);
        ctx.fillStyle = "white";
        ctx.font = messageText.length > 40 ? "bold 16px Arial" : "bold 20px Arial";
        ctx.textAlign = "center";
        const lines = displayedText.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, 60 + (i * 30));
        });
        ctx.textAlign = "start";
    }

    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (gameWon) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        if (finalState === "NONE") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white"; ctx.font = "bold 36px Arial"; ctx.textAlign = "center"; ctx.fillText("Will you be my Valentine?", cx, cy - 40);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(cx - 110, cy + 20, 100, 50);
            ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.fillText("YES", cx - 60, cy + 55);
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(cx + 10, cy + 20, 100, 50);
            ctx.fillStyle = "white"; ctx.fillText("NO", cx + 60, cy + 55);
            ctx.textAlign = "start";
        } else {
            if (finalState === "YES") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "white";
                ctx.font = "bold 40px Arial";
                ctx.textAlign = "center";
                ctx.fillText("TO MORE BONDING TIME WITH YOU!", cx, cy - 40);
                const textPulse = 1 + Math.sin(globalFrame * 0.05) * 0.05;
                ctx.save(); ctx.translate(cx, cy + 40); ctx.scale(textPulse, textPulse);
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; ctx.font = "bold 60px Arial"; ctx.textAlign = "center";
                ctx.fillText("I love you Aira", 0, 0); ctx.restore();
            } else {
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "white";
                ctx.font = "bold 60px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Why?", cx, cy - 40);
            }
            ctx.fillStyle = "#3498db";
            ctx.fillRect(cx - 60, cy + 120, 120, 40);
            ctx.fillStyle = "white";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Restart", cx, cy + 145);
            ctx.textAlign = "start";
        }
    }
}

function drawPlayer() {
    ctx.imageSmoothingEnabled = false;
    let drawX = Math.floor(player.x), drawY = Math.floor(player.y), drawW = player.width, drawH = player.height;
    if (!player.isMoving) {
        const breath = Math.sin(globalFrame * 0.1) * 1.5; 
        drawH -= breath; drawY += breath; 
    }
    ctx.drawImage(playerImg, player.frameX * player.srcW, player.frameY * player.srcH, player.srcW, player.srcH, drawX, drawY, drawW, drawH);
}

const setupMobileControls = () => {
    const bindTouch = (id, key) => {
        const btn = document.getElementById(id); if (!btn) return;
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); keys[key] = true; startMusic(); });
        btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[key] = false; });
    };
    bindTouch("btn-up", "w"); bindTouch("btn-down", "s");
    bindTouch("btn-left", "a"); bindTouch("btn-right", "d");
};
setTimeout(setupMobileControls, 100);

function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }

let assetsLoaded = 0;
function checkLoad() {
    assetsLoaded++;
    if (assetsLoaded === 3) {
        TILESET_COLS = Math.floor(tileset.width / TILE_SRC_SIZE);
        SPIKE_ID = 1 * TILESET_COLS + 0; FLOWER_ID = 1 * TILESET_COLS + 2; HOLE_ID = 1 * TILESET_COLS + 3;   
        NOTE_ID = 1 * TILESET_COLS + 6; SIGN_ID = 1 * TILESET_COLS + 8; CHEST_ID = 1 * TILESET_COLS + 9; POT_ID = 1 * TILESET_COLS + 10;
        generateMaze();
    }
}
tileset.onload = playerImg.onload = heartImg.onload = checkLoad;