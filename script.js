const SCREENS = {
    WELCOME: 'screen-welcome',
    MAIN: 'screen-main',
    GAME: 'screen-game',
    COMPLETE: 'screen-complete'
};

const SAVE_KEY = 'arrow_puzzle_save_data';

const defaultSaveData = {
    level: 1,
    score: 0,
    coins: 6,
    gems: 0,
    hints: 2,
    unlockedArrows: ['default'],
    purchasedItems: [],
    settings: { sound: true, music: true, vibration: true },
    achievements: {},
    stats: { levelsCompleted: 0, totalTaps: 0, arrowsRemoved: 0 },
    highScores: [],
    streak: { count: 1, lastLogin: '', claimedToday: false },
    dailyMissions: {
        lastDate: '',
        missions: [
            { id: 'clear_arrows', desc: 'Clear 50 arrows today', target: 50, current: 0, rewardType: 'coins', rewardVal: 10, claimed: false },
            { id: 'complete_levels', desc: 'Complete 3 levels today', target: 3, current: 0, rewardType: 'coins', rewardVal: 15, claimed: false },
            { id: 'valid_taps', desc: 'Perform 20 valid taps', target: 20, current: 0, rewardType: 'hints', rewardVal: 1, claimed: false }
        ]
    }
};

function loadGameData() {
    try {
        const dataStr = localStorage.getItem(SAVE_KEY);
        if (dataStr) {
            const parsed = JSON.parse(dataStr);
            return {
                ...defaultSaveData,
                ...parsed,
                settings: { ...defaultSaveData.settings, ...(parsed.settings || {}) },
                stats: { ...defaultSaveData.stats, ...(parsed.stats || {}) },
                highScores: parsed.highScores || [],
                streak: parsed.streak || { count: 1, lastLogin: '', claimedToday: false },
                dailyMissions: parsed.dailyMissions || defaultSaveData.dailyMissions
            };
        }
        const oldLevel = localStorage.getItem('arrow_level');
        if (oldLevel) {
            const lvl = parseInt(oldLevel, 10) || 1;
            return { ...defaultSaveData, level: lvl };
        }
    } catch (e) {
        console.error("Failed to load save data", e);
    }
    return { ...defaultSaveData };
}

let gameData = loadGameData();
let currentLevel = gameData.level;
let currentArrows = [];
let lives = 3;

// --- Web Audio API Synthesizer (SFX & Background Music) ---
let audioCtx = null;
let bgmInterval = null;
let bgmStep = 0;
const bgmNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // Ambient C-Major sequence

function getAudioContext() {
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function startBGM() {
    if (bgmInterval || !gameData.settings || !gameData.settings.music) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    bgmInterval = setInterval(() => {
        if (!gameData.settings || !gameData.settings.music) {
            stopBGM();
            return;
        }
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const freq = bgmNotes[bgmStep % bgmNotes.length];
            bgmStep++;

            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } catch (e) {
            console.error(e);
        }
    }, 500);
}

function stopBGM() {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
}

function playSound(type) {
    if (gameData.settings && !gameData.settings.sound) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        if (type === 'tap') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'blocked') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'clear') {
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.04);
                gain.gain.setValueAtTime(0.18, now + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.04);
                osc.stop(now + i * 0.04 + 0.25);
            });
        } else if (type === 'complete') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const startTime = now + idx * 0.09;
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.35);
            });
        }
    } catch (e) {
        console.error("Audio error", e);
    }
}

// --- Vibration Feedback ---
function triggerVibration(type) {
    if (gameData.settings && !gameData.settings.vibration) return;
    if (!navigator.vibrate) return;

    try {
        if (type === 'tap') {
            navigator.vibrate([20, 20, 20]); // Soft double pulse for valid taps
        } else if (type === 'blocked') {
            navigator.vibrate([80, 40, 80]); // Heavy double buzz for invalid/blocked taps
        } else if (type === 'clear') {
            navigator.vibrate([40, 30, 50]); // Board clear pulse
        } else if (type === 'complete') {
            navigator.vibrate([100, 50, 100, 50, 200]); // Level victory rhythm
        } else if (typeof type === 'number' || Array.isArray(type)) {
            navigator.vibrate(type);
        }
    } catch (e) {
        console.error("Vibration error", e);
    }
}

function saveGameData() {
    try {
        gameData.level = currentLevel;
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
        localStorage.setItem('arrow_level', currentLevel);
    } catch (e) {
        console.error("Failed to save game data", e);
    }
}

function updateCoins(amount) {
    gameData.coins += amount;
    saveGameData();
    updateStats();
}

function updateGems(amount) {
    gameData.gems += amount;
    saveGameData();
    updateStats();
}

function purchaseItem(itemId) {
    if (!gameData.purchasedItems.includes(itemId)) {
        gameData.purchasedItems.push(itemId);
        saveGameData();
    }
}

function updateSettings(newSettings) {
    gameData.settings = { ...gameData.settings, ...newSettings };
    saveGameData();
}

function resetProgress() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('arrow_level');
    gameData = { ...defaultSaveData };
    currentLevel = 1;
    saveGameData();
    updateMainScreen();
}

// Direction Vectors
const DIRS = {
    UP: { dx: 0, dy: -1 },
    DOWN: { dx: 0, dy: 1 },
    LEFT: { dx: -1, dy: 0 },
    RIGHT: { dx: 1, dy: 0 }
};

// --- Dynamic Difficulty System ---
function getLevelDifficulty(level) {
    if (level <= 2) return { name: 'Easy', color: '#10B981', densityMultiplier: 1.0, obstaclesCount: 0 };
    if (level <= 5) return { name: 'Medium', color: '#3B82F6', densityMultiplier: 1.25, obstaclesCount: 1 };
    if (level <= 9) return { name: 'Hard', color: '#F59E0B', densityMultiplier: 1.5, obstaclesCount: 2 };
    if (level <= 15) return { name: 'Expert', color: '#EF4444', densityMultiplier: 1.8, obstaclesCount: 3 };
    return { name: 'Insane', color: '#8B5CF6', densityMultiplier: 2.2, obstaclesCount: 4 };
}

function getTargetArrowCount(level) {
    const diff = getLevelDifficulty(level);
    let base = 3;
    if (level === 1) base = 3;
    else if (level === 2) base = 6;
    else if (level === 3) base = 8;
    else if (level === 4) base = 10;
    else if (level === 5) base = 12;
    else if (level < 10) base = 15 + (level - 6) * 2;
    else base = 20 + Math.floor((level - 10) * 2.5);

    return Math.floor(base * diff.densityMultiplier);
}

function generateLevel(level) {
    const diff = getLevelDifficulty(level);
    const N = getTargetArrowCount(level);
    const totalItems = N + diff.obstaclesCount;
    const size = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(3.5 * totalItems))));
    const arrows = [];
    const obstacleCells = new Set();
    let idCounter = 1;

    // Generate static barrier obstacles
    for (let o = 0; o < diff.obstaclesCount; o++) {
        for (let tries = 0; tries < 100; tries++) {
            const ox = Math.floor(Math.random() * (size - 2)) + 1;
            const oy = Math.floor(Math.random() * (size - 2)) + 1;
            const cellKey = `${ox},${oy}`;

            if (!obstacleCells.has(cellKey)) {
                obstacleCells.add(cellKey);
                arrows.push({
                    id: `obs_${o + 1}`,
                    x: ox,
                    y: oy,
                    length: 1,
                    dir: DIRS.UP,
                    isObstacle: true,
                    isRemoved: false,
                    animating: false,
                    animProgress: 0
                });
                break;
            }
        }
    }

    // Generate arrows
    for (let i = 0; i < N; i++) {
        for (let tries = 0; tries < 200; tries++) {
            const dirKeys = Object.keys(DIRS);
            const dir = DIRS[dirKeys[Math.floor(Math.random() * dirKeys.length)]];
            const length = Math.floor(Math.random() * 3) + 2; // 2 to 4
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);

            // Check if it fits in grid
            let fits = true;
            for (let j = 0; j < length; j++) {
                const cx = x - dir.dx * j;
                const cy = y - dir.dy * j;
                if (cx < 0 || cx >= size || cy < 0 || cy >= size) {
                    fits = false;
                    break;
                }
            }
            if (!fits) continue;

            // Check overlap with static obstacles & existing arrows
            let overlaps = false;
            const newCells = [];
            for (let j = 0; j < length; j++) {
                const cellStr = `${x - dir.dx * j},${y - dir.dy * j}`;
                newCells.push(cellStr);
                if (obstacleCells.has(cellStr)) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            for (const arrow of arrows) {
                const existingCells = getArrowCells(arrow);
                for (const cell of newCells) {
                    if (existingCells.includes(cell)) {
                        overlaps = true;
                        break;
                    }
                }
                if (overlaps) break;
            }
            if (overlaps) continue;

            // Check forward path intersection with currently placed arrows and static obstacles
            let pathClear = true;
            let rayX = x + dir.dx;
            let rayY = y + dir.dy;

            for (let k = 0; k < 30; k++) {
                const cell = `${rayX},${rayY}`;
                if (obstacleCells.has(cell)) {
                    pathClear = false;
                    break;
                }
                for (const arrow of arrows) {
                    if (getArrowCells(arrow).includes(cell)) {
                        pathClear = false;
                        break;
                    }
                }
                if (!pathClear) break;
                rayX += dir.dx;
                rayY += dir.dy;
            }

            if (pathClear) {
                arrows.push({ id: idCounter++, x, y, length, dir, isObstacle: false, isRemoved: false, animating: false, animProgress: 0 });
                break;
            }
        }
    }

    if (arrows.length === 0) {
        arrows.push({ id: 1, x: 0, y: 0, length: 2, dir: DIRS.RIGHT, isObstacle: false, isRemoved: false, animating: false, animProgress: 0 });
    }
    return arrows;
}

// --- Drawing & Game Logic ---
function getArrowCells(arrow) {
    if (arrow.isObstacle) {
        return [`${arrow.x},${arrow.y}`];
    }
    const cells = [];
    for (let i = 0; i < arrow.length; i++) {
        cells.push(`${arrow.x - arrow.dir.dx * i},${arrow.y - arrow.dir.dy * i}`);
    }
    return cells;
}

function checkCollision(arrow, allArrows) {
    if (arrow.isObstacle) return true;

    const otherCells = new Set();
    allArrows.forEach(a => {
        if (a.id !== arrow.id && !a.isRemoved) {
            getArrowCells(a).forEach(c => otherCells.add(c));
        }
    });

    let rayX = arrow.x + arrow.dir.dx;
    let rayY = arrow.y + arrow.dir.dy;

    for (let i = 0; i < 30; i++) {
        if (otherCells.has(`${rayX},${rayY}`)) {
            return true;
        }
        rayX += arrow.dir.dx;
        rayY += arrow.dir.dy;
    }
    return false;
}

let isAnimating = false;
let boardRenderInfo = null;
let particles = [];

function spawnParticles(x, y, count = 25, colorSet = ['#3B82F6', '#60A5FA', '#34D399', '#F59E0B', '#EC4899', '#8B5CF6']) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 5 + 3,
            color: colorSet[Math.floor(Math.random() * colorSet.length)],
            alpha: 1,
            life: 0,
            maxLife: Math.floor(Math.random() * 20) + 25
        });
    }
}

function calculateBounds(arrows, canvas) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    arrows.forEach(a => {
        for (let i = 0; i < a.length; i++) {
            const cx = a.x - a.dir.dx * i;
            const cy = a.y - a.dir.dy * i;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);
        }
    });
    
    if (minX === Infinity) return null;
    
    const cols = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const paddingCells = 2;
    const cellSize = Math.min(canvas.width / (cols + paddingCells), canvas.height / (rows + paddingCells));

    const boardWidth = cols * cellSize;
    const boardHeight = rows * cellSize;
    const offsetX = (canvas.width - boardWidth) / 2;
    const offsetY = (canvas.height - boardHeight) / 2;
    
    return { minX, maxX, minY, maxY, cols, rows, cellSize, offsetX, offsetY };
}

function gameLoop(time) {
    let needsUpdate = false;
    currentArrows.forEach(arrow => {
        if (arrow.animating) {
            const elapsed = time - arrow.animStartTime;
            const duration = 650; // ms
            if (elapsed >= duration) {
                arrow.animating = false;
                arrow.isRemoved = true;
                needsUpdate = true;

                // Audio & Vibration trigger on board clearance
                playSound('clear');
                triggerVibration([15, 20, 15]);

                // Spawn particle explosion when arrow clears board
                if (boardRenderInfo) {
                    const canvas = document.getElementById('game-canvas');
                    if (canvas) {
                        let headX = boardRenderInfo.offsetX + (arrow.x - boardRenderInfo.minX) * boardRenderInfo.cellSize + boardRenderInfo.cellSize / 2;
                        let headY = boardRenderInfo.offsetY + (arrow.y - boardRenderInfo.minY) * boardRenderInfo.cellSize + boardRenderInfo.cellSize / 2;
                        const distance = Math.max(canvas.width, canvas.height);
                        headX += arrow.dir.dx * distance;
                        headY += arrow.dir.dy * distance;
                        const clampX = Math.max(20, Math.min(canvas.width - 20, headX));
                        const clampY = Math.max(20, Math.min(canvas.height - 20, headY));
                        spawnParticles(clampX, clampY, 30);
                    }
                }
            } else {
                arrow.animProgress = elapsed / duration;
                needsUpdate = true;

                // Spawn trail particles while animating
                if (Math.random() < 0.35 && boardRenderInfo) {
                    const canvas = document.getElementById('game-canvas');
                    if (canvas) {
                        let headX = boardRenderInfo.offsetX + (arrow.x - boardRenderInfo.minX) * boardRenderInfo.cellSize + boardRenderInfo.cellSize / 2;
                        let headY = boardRenderInfo.offsetY + (arrow.y - boardRenderInfo.minY) * boardRenderInfo.cellSize + boardRenderInfo.cellSize / 2;
                        const distance = Math.max(canvas.width, canvas.height);
                        const move = distance * arrow.animProgress;
                        headX += arrow.dir.dx * move;
                        headY += arrow.dir.dy * move;
                        if (headX >= 0 && headX <= canvas.width && headY >= 0 && headY <= canvas.height) {
                            spawnParticles(headX, headY, 2, ['#60A5FA', '#93C5FD', '#3B82F6']);
                        }
                    }
                }
            }
        }
    });

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Subtle gravity
        p.vx *= 0.96; // Drag
        p.vy *= 0.96;
        p.life++;
        p.alpha = 1 - (p.life / p.maxLife);
        if (p.life >= p.maxLife) {
            particles.splice(i, 1);
        }
    }
    if (particles.length > 0) {
        needsUpdate = true;
    }

    if (needsUpdate) {
        drawArrows(document.getElementById('game-canvas'), currentArrows, boardRenderInfo);
        requestAnimationFrame(gameLoop);
    } else {
        isAnimating = false;
        checkWin();
    }
}

function drawArrows(canvas, arrows, renderInfo) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!renderInfo) return;

    const { minX, minY, cellSize, offsetX, offsetY } = renderInfo;

    const strokeWidth = cellSize * 0.15;
    const padding = cellSize * 0.2;
    const arrowHeadSize = strokeWidth * 2.5;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;

    arrows.forEach(arrow => {
        if (arrow.isRemoved && !arrow.animating) return;

        if (arrow.isObstacle) {
            const bx = offsetX + (arrow.x - minX) * cellSize + cellSize * 0.15;
            const by = offsetY + (arrow.y - minY) * cellSize + cellSize * 0.15;
            const bSize = cellSize * 0.7;

            ctx.save();
            ctx.fillStyle = '#EF4444';
            ctx.strokeStyle = '#991B1B';
            ctx.lineWidth = 3;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bx, by, bSize, bSize, 8);
            } else {
                ctx.rect(bx, by, bSize, bSize);
            }
            ctx.fill();
            ctx.stroke();

            // Draw barrier inner icon
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bx + bSize * 0.3, by + bSize * 0.3);
            ctx.lineTo(bx + bSize * 0.7, by + bSize * 0.7);
            ctx.moveTo(bx + bSize * 0.7, by + bSize * 0.3);
            ctx.lineTo(bx + bSize * 0.3, by + bSize * 0.7);
            ctx.stroke();
            ctx.restore();
            return;
        }

        let headX = offsetX + (arrow.x - minX) * cellSize + cellSize / 2;
        let headY = offsetY + (arrow.y - minY) * cellSize + cellSize / 2;
        
        const tailGridX = arrow.x - arrow.dir.dx * (arrow.length - 1);
        const tailGridY = arrow.y - arrow.dir.dy * (arrow.length - 1);
        
        let tailX = offsetX + (tailGridX - minX) * cellSize + cellSize / 2;
        let tailY = offsetY + (tailGridY - minY) * cellSize + cellSize / 2;

        let alpha = 1;
        if (arrow.animating) {
            const distance = Math.max(canvas.width, canvas.height);
            const move = distance * arrow.animProgress;
            headX += arrow.dir.dx * move;
            headY += arrow.dir.dy * move;
            tailX += arrow.dir.dx * move;
            tailY += arrow.dir.dy * move;
            alpha = 1 - arrow.animProgress;
        }

        ctx.strokeStyle = `rgba(15, 23, 42, ${Math.max(0, alpha)})`;

        // Apply padding
        const startX = tailX + arrow.dir.dx * padding;
        const startY = tailY + arrow.dir.dy * padding;
        const endX = headX - arrow.dir.dx * padding;
        const endY = headY - arrow.dir.dy * padding;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        if (arrow.dir === DIRS.UP) {
            ctx.lineTo(endX - arrowHeadSize, endY + arrowHeadSize);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + arrowHeadSize, endY + arrowHeadSize);
        } else if (arrow.dir === DIRS.DOWN) {
            ctx.lineTo(endX - arrowHeadSize, endY - arrowHeadSize);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + arrowHeadSize, endY - arrowHeadSize);
        } else if (arrow.dir === DIRS.LEFT) {
            ctx.lineTo(endX + arrowHeadSize, endY - arrowHeadSize);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + arrowHeadSize, endY + arrowHeadSize);
        } else if (arrow.dir === DIRS.RIGHT) {
            ctx.lineTo(endX - arrowHeadSize, endY - arrowHeadSize);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - arrowHeadSize, endY + arrowHeadSize);
        }
        ctx.stroke();
    });

    // Draw particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// --- UI Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// --- Setup ---
document.getElementById('btn-accept').addEventListener('click', () => {
    showScreen(SCREENS.MAIN);
    updateMainScreen();
});

document.getElementById('btn-new-game').addEventListener('click', () => {
    startGame(currentLevel);
});

document.getElementById('btn-daily-play').addEventListener('click', () => {
    startGame(currentLevel);
});

document.getElementById('btn-back').addEventListener('click', () => {
    showScreen(SCREENS.MAIN);
});

document.getElementById('btn-next-level').addEventListener('click', () => {
    startGame(currentLevel);
});

document.getElementById('btn-complete-main').addEventListener('click', () => {
    showScreen(SCREENS.MAIN);
    updateMainScreen();
});

function updateMainScreen() {
    document.getElementById('main-level-text').innerText = currentLevel;
}

function updateStats() {
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
        h.style.opacity = i < lives ? '1' : '0.3';
    });
    const diff = document.getElementById('difficulty-badge');
    if (diff) {
        const difficulty = getLevelDifficulty(currentLevel);
        diff.innerText = difficulty.name;
        diff.style.backgroundColor = difficulty.color;
        diff.style.color = '#FFFFFF';
        diff.style.padding = '2px 8px';
        diff.style.borderRadius = '10px';
        diff.style.fontSize = '12px';
        diff.style.fontWeight = 'bold';
    }
}

function checkTutorialOverlay() {
    const tutorialShown = localStorage.getItem('arrow_tutorial_shown');
    if (!tutorialShown) {
        const modal = document.getElementById('modal-tutorial');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
}

function getDailyMissions() {
    const today = new Date().toISOString().split('T')[0];
    if (!gameData.dailyMissions || gameData.dailyMissions.lastDate !== today) {
        gameData.dailyMissions = {
            lastDate: today,
            missions: [
                { id: 'clear_arrows', desc: 'Clear 50 arrows today', target: 50, current: 0, rewardType: 'coins', rewardVal: 10, claimed: false },
                { id: 'complete_levels', desc: 'Complete 3 levels today', target: 3, current: 0, rewardType: 'coins', rewardVal: 15, claimed: false },
                { id: 'valid_taps', desc: 'Perform 20 valid taps', target: 20, current: 0, rewardType: 'hints', rewardVal: 1, claimed: false }
            ]
        };
        saveGameData();
    }
    return gameData.dailyMissions.missions;
}

function updateMissionProgress(id, count = 1) {
    const missions = getDailyMissions();
    let updated = false;
    missions.forEach(m => {
        if (m.id === id && !m.claimed && m.current < m.target) {
            m.current = Math.min(m.target, m.current + count);
            updated = true;
        }
    });
    if (updated) {
        saveGameData();
        renderDailyMissions();
    }
}

function renderDailyMissions() {
    const listEl = document.getElementById('missions-list');
    if (!listEl) return;
    const missions = getDailyMissions();

    listEl.innerHTML = missions.map(m => {
        const pct = Math.min(100, Math.floor((m.current / m.target) * 100));
        const canClaim = m.current >= m.target && !m.claimed;
        const rewardText = m.rewardType === 'coins' ? `🪙 +${m.rewardVal} Coins` : `💡 +${m.rewardVal} Hint`;

        return `
            <div class="mission-card">
                <div class="mission-header">
                    <span class="mission-title">${m.desc}</span>
                    <span class="mission-reward">${rewardText}</span>
                </div>
                <div class="mission-progress-bar-bg">
                    <div class="mission-progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="mission-footer">
                    <span>${m.current} / ${m.target}</span>
                    <button class="mission-claim-btn" ${canClaim ? '' : 'disabled'} onclick="claimMissionReward('${m.id}')">
                        ${m.claimed ? 'Claimed ✓' : (canClaim ? 'Claim!' : 'In Progress')}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function claimMissionReward(missionId) {
    const missions = getDailyMissions();
    const mission = missions.find(m => m.id === missionId);
    if (mission && !mission.claimed && mission.current >= mission.target) {
        mission.claimed = true;
        if (mission.rewardType === 'coins') {
            gameData.coins += mission.rewardVal;
        } else if (mission.rewardType === 'hints') {
            gameData.hints = (gameData.hints || 2) + mission.rewardVal;
        }
        saveGameData();
        updateStats();
        renderDailyMissions();
        playSound('complete');
        triggerVibration('clear');
    }
}

function startGame(level) {
    currentArrows = generateLevel(level);
    lives = 3;
    document.getElementById('game-level-title').innerText = `Level ${level}`;
    updateStats();
    showScreen(SCREENS.GAME);
    startBGM();
    checkTutorialOverlay();
    
    const canvas = document.getElementById('game-canvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    boardRenderInfo = calculateBounds(currentArrows, canvas);
    drawArrows(canvas, currentArrows, boardRenderInfo);

    // Interaction
    canvas.onclick = (e) => {
        if (!boardRenderInfo) return;
        const rect = canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        // Find tapped arrow
        let tappedArrow = null;
        for (const arrow of currentArrows) {
            if (arrow.isRemoved || arrow.animating) continue;
            
            for (let i = 0; i < arrow.length; i++) {
                const cx = boardRenderInfo.offsetX + (arrow.x - arrow.dir.dx * i - boardRenderInfo.minX) * boardRenderInfo.cellSize;
                const cy = boardRenderInfo.offsetY + (arrow.y - arrow.dir.dy * i - boardRenderInfo.minY) * boardRenderInfo.cellSize;
                
                if (touchX >= cx && touchX <= cx + boardRenderInfo.cellSize &&
                    touchY >= cy && touchY <= cy + boardRenderInfo.cellSize) {
                    tappedArrow = arrow;
                    break;
                }
            }
            if (tappedArrow) break;
        }

        if (tappedArrow) {
            if (tappedArrow.isObstacle || checkCollision(tappedArrow, currentArrows)) {
                playSound('blocked');
                triggerVibration('blocked');
                if (lives > 0) {
                    lives--;
                    updateStats();
                    canvas.style.transform = 'translate(-5px, 0)';
                    setTimeout(() => canvas.style.transform = 'translate(5px, 0)', 50);
                    setTimeout(() => canvas.style.transform = 'translate(0, 0)', 100);
                }
            } else {
                playSound('tap');
                triggerVibration('tap');
                updateMissionProgress('valid_taps', 1);
                updateMissionProgress('clear_arrows', 1);
                
                tappedArrow.animating = true;
                tappedArrow.animStartTime = performance.now();
                if (!isAnimating) {
                    isAnimating = true;
                    requestAnimationFrame(gameLoop);
                }
            }
        }
    };
}

function checkWin() {
    if (currentArrows.length > 0 && currentArrows.every(a => a.isRemoved || a.isObstacle)) {
        setTimeout(() => {
            playSound('complete');
            triggerVibration('complete');
            updateMissionProgress('complete_levels', 1);

            currentLevel++;
            gameData.level = currentLevel;
            const completedLvl = currentLevel - 1;
            const earnedScore = 100 * completedLvl;
            gameData.score += 100;
            gameData.coins += 2;
            gameData.stats.levelsCompleted++;

            // Record to scoreboard
            if (!gameData.highScores) gameData.highScores = [];
            gameData.highScores.unshift({
                level: completedLvl,
                score: earnedScore,
                date: new Date().toLocaleDateString()
            });
            gameData.highScores.sort((a, b) => b.score - a.score || b.level - a.level);
            gameData.highScores = gameData.highScores.slice(0, 10);

            saveGameData();

            document.getElementById('next-level-text').innerText = currentLevel;
            showScreen(SCREENS.COMPLETE);

            // Animate progress bar
            const scorePercent = lives === 3 ? 100 : (lives === 2 ? 85 : 70);
            animateProgressBar(scorePercent);
            
            // Draw snapshot
            const snapCanvas = document.getElementById('snapshot-canvas');
            snapCanvas.width = 208; // 240 - 32 padding
            snapCanvas.height = 208;
            const prevArrows = generateLevel(completedLvl);
            const snapInfo = calculateBounds(prevArrows, snapCanvas);
            drawArrows(snapCanvas, prevArrows, snapInfo);
        }, 300);
    }
}

function renderScoreboard() {
    const listEl = document.getElementById('scoreboard-list');
    const highScoreEl = document.getElementById('sb-high-score');
    const totalLevelsEl = document.getElementById('sb-total-levels');

    const scores = gameData.highScores || [];
    const topScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : gameData.score;
    if (highScoreEl) highScoreEl.innerText = topScore;
    if (totalLevelsEl) totalLevelsEl.innerText = gameData.stats.levelsCompleted || 0;

    if (!listEl) return;
    if (scores.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding: 20px; color:#94A3B8;">No records yet! Complete levels to set high scores.</div>';
        return;
    }

    listEl.innerHTML = scores.map((item, idx) => `
        <div class="sb-row">
            <span class="sb-rank">#${idx + 1}</span>
            <div class="sb-info">
                <div class="sb-level">Level ${item.level}</div>
                <div class="sb-date">${item.date}</div>
            </div>
            <span class="sb-score">${item.score} PTS</span>
        </div>
    `).join('');
}

function checkDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (!gameData.streak || !gameData.streak.lastLogin) {
        gameData.streak = { count: 1, lastLogin: today, claimedToday: true };
        gameData.coins += 5;
        saveGameData();
        showStreakReward(1, 5);
        return;
    }

    const lastLogin = gameData.streak.lastLogin;
    if (lastLogin === today) {
        updateStreakUI();
        return;
    }

    let streakCount = gameData.streak.count || 1;
    const lastDate = new Date(lastLogin);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        streakCount++;
    } else if (diffDays > 1) {
        streakCount = 1;
    }

    const rewardCoins = 5 + (streakCount - 1) * 2;
    gameData.coins += rewardCoins;
    gameData.streak = {
        count: streakCount,
        lastLogin: today,
        claimedToday: true
    };
    saveGameData();

    showStreakReward(streakCount, rewardCoins);
}

function updateStreakUI() {
    const banner = document.getElementById('streak-banner');
    if (banner && gameData.streak) {
        banner.innerText = `🔥 ${gameData.streak.count || 1} Day Streak`;
    }
}

function showStreakReward(streakCount, rewardCoins) {
    updateStreakUI();
    const titleEl = document.getElementById('streak-title');
    const descEl = document.getElementById('streak-desc');
    const rewardEl = document.getElementById('streak-reward-coins');
    const modal = document.getElementById('modal-streak');

    if (titleEl) titleEl.innerText = `🔥 Day ${streakCount} Streak!`;
    if (descEl) descEl.innerText = streakCount > 1 ? `You logged in ${streakCount} days in a row!` : 'Welcome back! Daily streak reward claimed.';
    if (rewardEl) rewardEl.innerText = rewardCoins;
    if (modal) modal.classList.remove('hidden');
}

const scoreboardBtn = document.getElementById('btn-scoreboard');
if (scoreboardBtn) {
    scoreboardBtn.addEventListener('click', () => {
        renderScoreboard();
        document.getElementById('modal-scoreboard').classList.remove('hidden');
    });
}

const closeScoreboardBtn = document.getElementById('btn-close-scoreboard');
if (closeScoreboardBtn) {
    closeScoreboardBtn.addEventListener('click', () => {
        document.getElementById('modal-scoreboard').classList.add('hidden');
    });
}

const meTabBtn = document.getElementById('btn-me-tab');
if (meTabBtn) {
    meTabBtn.addEventListener('click', () => {
        renderScoreboard();
        document.getElementById('modal-scoreboard').classList.remove('hidden');
    });
}

const claimStreakBtn = document.getElementById('btn-claim-streak');
if (claimStreakBtn) {
    claimStreakBtn.addEventListener('click', () => {
        document.getElementById('modal-streak').classList.add('hidden');
        updateMainScreen();
    });
}

function animateProgressBar(targetPercent = 100) {
    const bar = document.getElementById('complete-progress-bar');
    const text = document.getElementById('score-text');
    if (!bar || !text) return;

    bar.style.width = '0%';
    text.innerText = '0% (+100 PTS)';

    const startTime = performance.now();
    const duration = 1000; // 1s animation

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const currentVal = Math.floor(eased * targetPercent);

        bar.style.width = `${eased * targetPercent}%`;
        text.innerText = `${currentVal}% (+100 PTS)`;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// --- Modal & Settings Listeners ---
const settingsBtn = document.getElementById('btn-settings');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        const toggleBgm = document.getElementById('toggle-bgm');
        const toggleSfx = document.getElementById('toggle-sfx');
        const toggleVib = document.getElementById('toggle-vibration');

        if (toggleBgm) toggleBgm.checked = gameData.settings.music !== false;
        if (toggleSfx) toggleSfx.checked = gameData.settings.sound !== false;
        if (toggleVib) toggleVib.checked = gameData.settings.vibration !== false;

        document.getElementById('modal-settings').classList.remove('hidden');
    });
}

const closeSettingsBtn = document.getElementById('btn-close-settings');
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        document.getElementById('modal-settings').classList.add('hidden');
    });
}

const toggleBgm = document.getElementById('toggle-bgm');
if (toggleBgm) {
    toggleBgm.addEventListener('change', (e) => {
        gameData.settings.music = e.target.checked;
        saveGameData();
        if (e.target.checked) startBGM();
        else stopBGM();
    });
}

const toggleSfx = document.getElementById('toggle-sfx');
if (toggleSfx) {
    toggleSfx.addEventListener('change', (e) => {
        gameData.settings.sound = e.target.checked;
        saveGameData();
    });
}

const toggleVib = document.getElementById('toggle-vibration');
if (toggleVib) {
    toggleVib.addEventListener('change', (e) => {
        gameData.settings.vibration = e.target.checked;
        saveGameData();
    });
}

const dailyTabBtn = document.getElementById('btn-daily-tab');
if (dailyTabBtn) {
    dailyTabBtn.addEventListener('click', () => {
        renderDailyMissions();
        document.getElementById('modal-missions').classList.remove('hidden');
    });
}

const closeMissionsBtn = document.getElementById('btn-close-missions');
if (closeMissionsBtn) {
    closeMissionsBtn.addEventListener('click', () => {
        document.getElementById('modal-missions').classList.add('hidden');
    });
}

const closeTutorialBtn = document.getElementById('btn-close-tutorial');
if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', () => {
        localStorage.setItem('arrow_tutorial_shown', 'true');
        document.getElementById('modal-tutorial').classList.add('hidden');
    });
}

const backBtn = document.getElementById('btn-back');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        stopBGM();
        showScreen(SCREENS.MAIN);
    });
}

// Initial
if (localStorage.getItem(SAVE_KEY) || localStorage.getItem('arrow_level')) {
    showScreen(SCREENS.MAIN);
    updateMainScreen();
    checkDailyStreak();
} else {
    showScreen(SCREENS.WELCOME);
}
