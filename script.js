const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Constants
const TILE_SRC_SIZE = 16;     
const TILE_DISPLAY_SIZE = 32; 
const COLS = 30;              
const ROWS = 20;              
const TILESET_COLS = 12; 

canvas.width = COLS * TILE_DISPLAY_SIZE;
canvas.height = ROWS * TILE_DISPLAY_SIZE;

// --- ASSETS ---
const tileset = new Image();
tileset.src = "src/map.png";

const playerImg = new Image();
playerImg.src = "src/AiraCutie.png";

const heartImg = new Image();
heartImg.src = "src/heart.png";

// --- GAME STATE ---
let showMessage = false;
let messageText = ""; 
let hasHeart = false;
let gameWon = false;
let finalState = "NONE"; // 'NONE', 'YES', 'NO'

// Tile ID Definitions (Row index 1)
const FLOWER_ID = 1 * TILESET_COLS + 2; // 3rd col, 2nd row (Index 14) -> Flower
const SPIKE_ID = 1 * TILESET_COLS + 0;  // 1st col, 2nd row (Index 12) -> Spike
const HOLE_ID = 1 * TILESET_COLS + 3;   // 4th col, 2nd row (Index 15)
const SIGN_ID = 1 * TILESET_COLS + 8;   // 9th col, 2nd row (Index 20)
const CHEST_ID = 1 * TILESET_COLS + 9;  // 10th col, 2nd row (Index 21)
const POT_ID = 1 * TILESET_COLS + 10;   // 11th col, 2nd row (Index 22)

const signText = "Happy Monthsarry baby, Hope you enjoy this game I built";

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
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Interaction Handler
const handleInput = (clientX, clientY) => {
    if (!gameWon && finalState === "NONE") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (gameWon && finalState === "NONE") {
        // YES Button
        if (mouseX >= cx - 110 && mouseX <= cx - 10 && mouseY >= cy + 20 && mouseY <= cy + 70) {
            finalState = "YES";
            drawHeart(FLOWER_ID);
        }
        
        // NO Button
        if (mouseX >= cx + 10 && mouseX <= cx + 110 && mouseY >= cy + 20 && mouseY <= cy + 70) {
            finalState = "NO";
            fillMapWith(SPIKE_ID);
        }
    } else if (finalState !== "NONE") {
        // Restart Button
        if (mouseX >= cx - 60 && mouseX <= cx + 60 && mouseY >= cy + 100 && mouseY <= cy + 140) {
            location.reload();
        }
    }
};

canvas.addEventListener("mousedown", (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); 
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });

function fillMapWith(tileId) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            mapLayer[r][c] = tileId;
        }
    }
}

function drawHeart(tileId) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            mapLayer[r][c] = 0; 
        }
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let x = (c - COLS / 2) / 8; 
            let y = -1 * (r - ROWS / 2) / 8; 
            let a = x * x + y * y - 1;
            if (a * a * a - x * x * y * y * y <= 0) {
                mapLayer[r][c] = tileId;
            }
        }
    }
}

// Map Data
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
            // Updated to use FLOWER_ID (Index 14) for decorations
            if (mapLayer[r][c] === 0 && Math.random() < 0.1) mapLayer[r][c] = FLOWER_ID; 
        }
    }
    
    const midC = Math.floor(COLS / 2);
    const midR = Math.floor(ROWS / 2);
    for (let r = midR - 1; r <= midR + 1; r++) {
        for (let c = midC - 1; c <= midC + 1; c++) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) mapLayer[r][c] = 0;
        }
    }
    
    mapLayer[midR][midC + 1] = SIGN_ID; 
    mapLayer[1][1] = POT_ID;           
    mapLayer[ROWS - 2][COLS - 2] = CHEST_ID; 
    
    mapLayer[1][2] = 0;
    mapLayer[2][1] = 0;
    mapLayer[ROWS - 2][COLS - 3] = 0;
    mapLayer[ROWS - 3][COLS - 2] = 0;
}

function canMoveTo(nx, ny) {
    const margin = 6; 
    const corners = [
        { x: nx + margin, y: ny + margin }, 
        { x: nx + player.width - margin, y: ny + margin }, 
        { x: nx + margin, y: ny + player.height - margin }, 
        { x: nx + player.width - margin, y: ny + player.height - margin } 
    ];

    for (let p of corners) {
        let col = Math.floor(p.x / TILE_DISPLAY_SIZE);
        let row = Math.floor(p.y / TILE_DISPLAY_SIZE);
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
        
        const tile = mapLayer[row][col];
        if (tile === HOLE_ID) return false; 
        
        if (tile === POT_ID) {
            hasHeart = true;
            mapLayer[row][col] = 0;
            messageText = "You found a Heart! <3";
            showMessage = true;
            setTimeout(() => { if(messageText === "You found a Heart! <3") showMessage = false; }, 3000);
        }
        if (tile === CHEST_ID) {
            if (hasHeart) {
                gameWon = true;
            } else {
                messageText = "Locked! You need a Heart.";
                showMessage = true;
            }
            return false;
        }
    }
    return true;
}

function update() {
    if (gameWon) return; 
    
    player.isMoving = false;
    let dx = 0, dy = 0;

    const midC = Math.floor(COLS / 2);
    const midR = Math.floor(ROWS / 2);
    const signX = (midC + 1) * TILE_DISPLAY_SIZE;
    const signY = midR * TILE_DISPLAY_SIZE;
    const dist = Math.sqrt(Math.pow(player.x - signX, 2) + Math.pow(player.y - signY, 2));
    
    if (dist < TILE_DISPLAY_SIZE * 1.5) {
        if (!showMessage || messageText === "Locked! You need a Heart.") {
            messageText = signText;
            showMessage = true;
        }
    } else if (messageText === signText) {
        showMessage = false;
    }

    if (keys["w"] || keys["arrowup"]) { dy = -1; player.frameY = 1; player.isMoving = true; } 
    else if (keys["s"] || keys["arrowdown"]) { dy = 1; player.frameY = 0; player.isMoving = true; } 
    else if (keys["a"] || keys["arrowleft"]) { dx = -1; player.frameY = 3; player.isMoving = true; } 
    else if (keys["d"] || keys["arrowright"]) { dx = 1; player.frameY = 2; player.isMoving = true; }

    if (player.isMoving) {
        let nextX = player.x + dx * player.speed;
        let nextY = player.y + dy * player.speed;
        if (canMoveTo(nextX, player.y)) player.x = nextX;
        if (canMoveTo(player.x, nextY)) player.y = nextY;

        player.frameTimer++;
        if (player.frameTimer >= player.frameSpeed) {
            player.frameX = (player.frameX + 1) % player.frameCount;
            player.frameTimer = 0;
        }
    } else {
        player.frameX = 0;
        player.frameTimer = 0;
    }
}

function drawMap() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.drawImage(tileset, 0, 0, TILE_SRC_SIZE, TILE_SRC_SIZE, c * TILE_DISPLAY_SIZE, r * TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE);
            const tileId = mapLayer[r][c];
            if (tileId !== 0) {
                let srcX = (tileId % TILESET_COLS) * TILE_SRC_SIZE;
                let srcY = Math.floor(tileId / TILESET_COLS) * TILE_SRC_SIZE;
                ctx.drawImage(tileset, srcX, srcY, TILE_SRC_SIZE, TILE_SRC_SIZE, c * TILE_DISPLAY_SIZE, r * TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE);
            }
        }
    }
}

function drawPlayer() {
    ctx.drawImage(playerImg, player.frameX * player.srcW, player.frameY * player.srcH, player.srcW, player.srcH, player.x, player.y, player.width, player.height);
}

function render() {
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMap();
    if (!gameWon || finalState === "NONE") drawPlayer();

    if (hasHeart) {
        ctx.drawImage(heartImg, 10, 10, 32, 32);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText("x 1", 50, 32);
    }

    if (showMessage && !gameWon) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(canvas.width / 2 - 250, 50, 500, 60);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 250, 50, 500, 60);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(messageText, canvas.width / 2, 85);
        ctx.textAlign = "start";
    }

    if (gameWon) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (finalState === "NONE") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = "bold 36px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Will you be my Valentine?", cx, cy - 40);
            
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(cx - 110, cy + 20, 100, 50);
            ctx.fillStyle = "white";
            ctx.font = "bold 24px Arial";
            ctx.fillText("YES", cx - 60, cy + 55);

            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(cx + 10, cy + 20, 100, 50);
            ctx.fillStyle = "white";
            ctx.fillText("NO", cx + 60, cy + 55);
            ctx.textAlign = "start";
        } else {
            // YES or NO screen
            if (finalState === "YES") {
                ctx.fillStyle = "rgba(255, 192, 203, 0.3)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "white";
                ctx.font = "bold 40px Arial";
                ctx.textAlign = "center";
                ctx.fillText("HAPPY VALENTINE'S DAY!", cx, cy - 40);
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                ctx.font = "bold 60px Arial";
                ctx.fillText("I LOVE YOU! <3", cx, cy + 40);
            } else {
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "white";
                ctx.font = "bold 40px Arial";
                ctx.textAlign = "center";
                ctx.fillText("I'll try harder next time...", cx, cy - 40);
            }

            // Restart Button for both final states
            ctx.fillStyle = "#3498db";
            ctx.fillRect(cx - 60, cy + 100, 120, 40);
            ctx.fillStyle = "white";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Restart", cx, cy + 125);
            ctx.textAlign = "start";
        }
    }
}

// Mobile D-Pad Logic
const setupMobileControls = () => {
    const bindTouch = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); keys[key] = true; });
        btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[key] = false; });
    };

    bindTouch("btn-up", "w");
    bindTouch("btn-down", "s");
    bindTouch("btn-left", "a");
    bindTouch("btn-right", "d");
};
setTimeout(setupMobileControls, 100);

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

generateMaze();
let assetsLoaded = 0;
function checkLoad() {
    assetsLoaded++;
    if (assetsLoaded === 3) gameLoop();
}
tileset.onload = playerImg.onload = heartImg.onload = checkLoad;
