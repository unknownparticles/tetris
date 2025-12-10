/**
 * alun的方块 - 完整游戏代码 (无模块化，可直接用 file:// 打开)
 */

(function () {
    'use strict';

    // ========================================
    // 常量
    // ========================================
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;

    const TetrominoType = {
        I: 'I',
        J: 'J',
        L: 'L',
        O: 'O',
        S: 'S',
        T: 'T',
        Z: 'Z'
    };

    const TETROMINO_TYPES = Object.values(TetrominoType);

    const TETROMINOES = {
        [TetrominoType.I]: {
            type: TetrominoType.I,
            shape: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]
        },
        [TetrominoType.J]: {
            type: TetrominoType.J,
            shape: [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ]
        },
        [TetrominoType.L]: {
            type: TetrominoType.L,
            shape: [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ]
        },
        [TetrominoType.O]: {
            type: TetrominoType.O,
            shape: [
                [1, 1],
                [1, 1]
            ]
        },
        [TetrominoType.S]: {
            type: TetrominoType.S,
            shape: [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ]
        },
        [TetrominoType.T]: {
            type: TetrominoType.T,
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ]
        },
        [TetrominoType.Z]: {
            type: TetrominoType.Z,
            shape: [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ]
        }
    };

    const SCORES = {
        SINGLE: 100,
        DOUBLE: 300,
        TRIPLE: 500,
        TETRIS: 800,
        SOFT_DROP: 1,
        HARD_DROP: 2
    };

    const LEVELS = [800, 720, 630, 550, 470, 380, 300, 220, 150, 100];

    // ========================================
    // 游戏逻辑工具函数
    // ========================================
    function createEmptyGrid() {
        return Array.from({ length: BOARD_HEIGHT }, () =>
            Array.from({ length: BOARD_WIDTH }, () => ({ type: null, locked: false }))
        );
    }

    function getRandomTetrominoType() {
        return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
    }

    function rotateMatrix(matrix) {
        const N = matrix.length;
        return matrix.map((row, i) =>
            row.map((_, j) => matrix[N - 1 - j][i])
        );
    }

    function checkCollision(shape, position, grid) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    const boardX = x + position.x;
                    const boardY = y + position.y;

                    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                        return true;
                    }

                    if (boardY >= 0 && grid[boardY][boardX].locked) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function checkLines(grid) {
        let linesCleared = 0;

        const newGrid = grid.filter(row => {
            const isLineFull = row.every(cell => cell.locked);
            if (isLineFull) linesCleared++;
            return !isLineFull;
        });

        while (newGrid.length < BOARD_HEIGHT) {
            newGrid.unshift(
                Array.from({ length: BOARD_WIDTH }, () => ({ type: null, locked: false }))
            );
        }

        return { newGrid, linesCleared };
    }

    // ========================================
    // Tetris 游戏引擎
    // ========================================
    class TetrisGame {
        constructor() {
            this.gameState = {
                grid: createEmptyGrid(),
                activePiece: null,
                nextPiece: getRandomTetrominoType(),
                score: 0,
                level: 1,
                lines: 0,
                gameOver: false,
                isPaused: false
            };

            this.requestId = null;
            this.lastTime = 0;
            this.onStateChange = null;
            this.onGameOver = null;
        }

        spawnPiece(currentGrid, nextType) {
            const type = nextType;
            const shape = TETROMINOES[type].shape;
            const initialPos = {
                x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
                y: -1
            };

            if (checkCollision(shape, { ...initialPos, y: 0 }, currentGrid)) {
                return null;
            }

            return { type, shape, position: initialPos };
        }

        startGame() {
            const next = getRandomTetrominoType();
            const firstPieceType = getRandomTetrominoType();
            const grid = createEmptyGrid();
            const spawned = this.spawnPiece(grid, firstPieceType);

            this.gameState = {
                grid,
                activePiece: spawned,
                nextPiece: next,
                score: 0,
                level: 1,
                lines: 0,
                gameOver: false,
                isPaused: false
            };

            this.lastTime = 0;
            this.notifyStateChange();
            this.startGameLoop();
        }

        move(dir) {
            const { gameOver, isPaused, activePiece, grid } = this.gameState;
            if (gameOver || isPaused || !activePiece) return;

            const newPos = {
                x: activePiece.position.x + dir.x,
                y: activePiece.position.y + dir.y
            };

            if (!checkCollision(activePiece.shape, newPos, grid)) {
                this.gameState.activePiece = { ...activePiece, position: newPos };
                this.notifyStateChange();
            }
        }

        rotate() {
            const { gameOver, isPaused, activePiece, grid } = this.gameState;
            if (gameOver || isPaused || !activePiece) return;

            const rotatedShape = rotateMatrix(activePiece.shape);
            const pos = activePiece.position;
            const kicks = [0, 1, -1, 2, -2];

            for (const offset of kicks) {
                if (!checkCollision(rotatedShape, { ...pos, x: pos.x + offset }, grid)) {
                    this.gameState.activePiece = {
                        ...activePiece,
                        shape: rotatedShape,
                        position: { ...pos, x: pos.x + offset }
                    };
                    this.notifyStateChange();
                    return;
                }
            }
        }

        lockPiece() {
            const { grid, activePiece, nextPiece, score, level, lines } = this.gameState;
            if (!activePiece) return;

            const newGrid = grid.map(row => row.map(cell => ({ ...cell })));

            for (let y = 0; y < activePiece.shape.length; y++) {
                for (let x = 0; x < activePiece.shape[y].length; x++) {
                    if (activePiece.shape[y][x]) {
                        const boardY = y + activePiece.position.y;
                        const boardX = x + activePiece.position.x;
                        if (boardY >= 0) {
                            newGrid[boardY][boardX] = { type: activePiece.type, locked: true };
                        }
                    }
                }
            }

            const { newGrid: clearedGrid, linesCleared } = checkLines(newGrid);

            let scoreAdd = 0;
            if (linesCleared === 1) scoreAdd = SCORES.SINGLE * level;
            if (linesCleared === 2) scoreAdd = SCORES.DOUBLE * level;
            if (linesCleared === 3) scoreAdd = SCORES.TRIPLE * level;
            if (linesCleared === 4) scoreAdd = SCORES.TETRIS * level;

            const newLines = lines + linesCleared;
            const newLevel = Math.floor(newLines / 10) + 1;

            const nextSpawn = this.spawnPiece(clearedGrid, nextPiece);
            const newNextPiece = getRandomTetrominoType();

            this.gameState = {
                ...this.gameState,
                grid: clearedGrid,
                activePiece: nextSpawn,
                nextPiece: newNextPiece,
                score: score + scoreAdd,
                lines: newLines,
                level: newLevel,
                gameOver: !nextSpawn
            };

            this.notifyStateChange();

            if (!nextSpawn && this.onGameOver) {
                this.onGameOver(this.gameState);
            }
        }

        hardDrop() {
            const { gameOver, isPaused, activePiece, grid, score } = this.gameState;
            if (gameOver || isPaused || !activePiece) return;

            let tempY = activePiece.position.y;
            while (!checkCollision(activePiece.shape, { x: activePiece.position.x, y: tempY + 1 }, grid)) {
                tempY++;
            }

            const dropDistance = tempY - activePiece.position.y;

            this.gameState.score = score + dropDistance * SCORES.HARD_DROP;
            this.gameState.activePiece = {
                ...activePiece,
                position: { ...activePiece.position, y: tempY }
            };

            this.notifyStateChange();
            this.lockPiece();
        }

        tick() {
            const { gameOver, isPaused, activePiece, grid } = this.gameState;
            if (gameOver || isPaused || !activePiece) return;

            const newPos = { ...activePiece.position, y: activePiece.position.y + 1 };

            if (!checkCollision(activePiece.shape, newPos, grid)) {
                this.gameState.activePiece = { ...activePiece, position: newPos };
                this.notifyStateChange();
            }
        }

        togglePause() {
            if (this.gameState.gameOver) return;
            this.gameState.isPaused = !this.gameState.isPaused;
            this.notifyStateChange();
        }

        notifyStateChange() {
            if (this.onStateChange) {
                this.onStateChange(this.gameState);
            }
        }

        getCurrentSpeed() {
            const levelIndex = Math.min(this.gameState.level - 1, LEVELS.length - 1);
            return LEVELS[levelIndex] || 100;
        }

        startGameLoop() {
            if (this.requestId) {
                cancelAnimationFrame(this.requestId);
            }

            const loop = (time) => {
                if (!this.lastTime) this.lastTime = time;
                const deltaTime = time - this.lastTime;
                const speed = this.getCurrentSpeed();

                if (deltaTime > speed) {
                    if (!this.gameState.isPaused && !this.gameState.gameOver && this.gameState.activePiece) {
                        const canMoveDown = !checkCollision(
                            this.gameState.activePiece.shape,
                            { x: this.gameState.activePiece.position.x, y: this.gameState.activePiece.position.y + 1 },
                            this.gameState.grid
                        );

                        if (canMoveDown) {
                            this.tick();
                        } else {
                            this.lockPiece();
                        }
                    }
                    this.lastTime = time;
                }

                this.requestId = requestAnimationFrame(loop);
            };

            this.requestId = requestAnimationFrame(loop);
        }

        stopGameLoop() {
            if (this.requestId) {
                cancelAnimationFrame(this.requestId);
                this.requestId = null;
            }
        }
    }

    // ========================================
    // UI 渲染和事件绑定
    // ========================================
    const elements = {
        gameBoard: document.getElementById('game-board'),
        nextPiece: document.getElementById('next-piece'),
        scoreDesktop: document.getElementById('score-desktop'),
        levelDesktop: document.getElementById('level-desktop'),
        linesDesktop: document.getElementById('lines-desktop'),
        scoreMobile: document.getElementById('score-mobile'),
        levelMobile: document.getElementById('level-mobile'),
        linesMobile: document.getElementById('lines-mobile'),
        overlay: document.getElementById('overlay'),
        overlayTitle: document.getElementById('overlay-title'),
        overlayScore: document.getElementById('overlay-score'),
        aiSection: document.getElementById('ai-section'),
        aiComment: document.getElementById('ai-comment'),
        btnPause: document.getElementById('btn-pause'),
        btnRestart: document.getElementById('btn-restart'),
        btnLeft: document.getElementById('btn-left'),
        btnRight: document.getElementById('btn-right'),
        btnRotate: document.getElementById('btn-rotate'),
        btnDown: document.getElementById('btn-down'),
        btnHarddrop: document.getElementById('btn-harddrop'),
        pauseIcon: document.getElementById('pause-icon'),
        playIcon: document.getElementById('play-icon'),
        pauseText: document.getElementById('pause-text')
    };

    const game = new TetrisGame();

    function initBoard() {
        elements.gameBoard.innerHTML = '';
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell empty';
                cell.dataset.x = x;
                cell.dataset.y = y;
                elements.gameBoard.appendChild(cell);
            }
        }
    }

    function renderBoard(gameState) {
        const { grid, activePiece } = gameState;
        const displayGrid = grid.map(row => row.map(cell => cell.type));

        if (activePiece) {
            activePiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const boardY = y + activePiece.position.y;
                        const boardX = x + activePiece.position.x;
                        if (boardY >= 0 && boardY < displayGrid.length &&
                            boardX >= 0 && boardX < displayGrid[0].length) {
                            displayGrid[boardY][boardX] = activePiece.type;
                        }
                    }
                });
            });
        }

        const cells = elements.gameBoard.children;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const index = y * BOARD_WIDTH + x;
                const type = displayGrid[y][x];
                const cell = cells[index];

                if (type) {
                    cell.className = 'cell filled ' + type;
                } else {
                    cell.className = 'cell empty';
                }
            }
        }
    }

    function renderNextPiece(type) {
        const shape = TETROMINOES[type].shape;
        elements.nextPiece.innerHTML = '';
        elements.nextPiece.style.gridTemplateColumns = 'repeat(' + shape[0].length + ', 20px)';
        elements.nextPiece.style.gridTemplateRows = 'repeat(' + shape.length + ', 20px)';

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                const cell = document.createElement('div');
                if (value) {
                    cell.className = 'cell filled ' + type;
                } else {
                    cell.className = 'cell empty';
                }
                elements.nextPiece.appendChild(cell);
            });
        });
    }

    function updateStats(gameState) {
        const { score, level, lines } = gameState;

        elements.scoreDesktop.textContent = score;
        elements.levelDesktop.textContent = level;
        elements.linesDesktop.textContent = lines;

        elements.scoreMobile.textContent = score;
        elements.levelMobile.textContent = level;
        elements.linesMobile.textContent = lines;
    }

    function updateOverlay(gameState) {
        const { gameOver, isPaused, score } = gameState;

        if (gameOver) {
            elements.overlayTitle.textContent = 'GAME OVER';
            elements.overlayScore.textContent = '最终得分: ' + score;
            elements.overlay.classList.remove('hidden');
        } else if (isPaused) {
            elements.overlayTitle.textContent = 'PAUSED';
            elements.overlayScore.textContent = '';
            elements.overlay.classList.remove('hidden');
        } else {
            elements.overlay.classList.add('hidden');
        }
    }

    function updatePauseButton(isPaused, gameOver) {
        if (isPaused) {
            elements.pauseIcon.classList.add('hidden');
            elements.playIcon.classList.remove('hidden');
            elements.pauseText.textContent = '继续';
        } else {
            elements.pauseIcon.classList.remove('hidden');
            elements.playIcon.classList.add('hidden');
            elements.pauseText.textContent = '暂停';
        }

        elements.btnPause.disabled = gameOver;
    }

    function getLocalAIComment(score, level, lines) {
        const lowScoreComments = [
            "这...是在试玩吗？再来一局证明自己！🎮",
            "刚刚热身结束？真正的实力还没展现出来吧！",
            "别灰心！俄罗斯方块大师也是从菜鸟开始的～",
            "这分数怕是键盘有问题吧？😏",
            "没关系，失败是成功之母！继续加油！"
        ];

        const mediumScoreComments = [
            "不错不错，有点实力！再接再厉！💪",
            "中规中矩的表现，但我知道你能做得更好！",
            "已经超越了60%的玩家，继续保持！",
            "稳扎稳打的风格，下次冲击更高分！",
            "有进步！距离高手只差一点点了～"
        ];

        const highScoreComments = [
            "太强了！你是方块界的传奇！🏆",
            "这操作，这意识，简直是神仙级别！",
            "我怀疑你开了挂，但我没有证据... 🤔",
            "大神请收下我的膝盖！🧎",
            "这分数可以上排行榜了！绝对的高玩！"
        ];

        let comments;
        if (score < 1000) {
            comments = lowScoreComments;
        } else if (score < 5000) {
            comments = mediumScoreComments;
        } else {
            comments = highScoreComments;
        }

        return comments[Math.floor(Math.random() * comments.length)];
    }

    function showAIComment(gameState) {
        const { score, level, lines } = gameState;

        if (score > 0) {
            elements.aiSection.classList.remove('hidden');
            elements.aiComment.innerHTML = '<div class="ai-loading"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4"></path><path d="m16.24 7.76 2.83-2.83"></path><path d="M21 12h-4"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="M12 17v4"></path><path d="m7.76 16.24-2.83 2.83"></path><path d="M7 12H3"></path><path d="m7.76 7.76-2.83-2.83"></path></svg><span>分析数据中...</span></div>';

            setTimeout(function () {
                const comment = getLocalAIComment(score, level, lines);
                elements.aiComment.textContent = comment;
            }, 800);
        }
    }

    function hideAIComment() {
        elements.aiSection.classList.add('hidden');
        elements.aiComment.textContent = '等待游戏数据...';
    }

    function onStateChange(gameState) {
        renderBoard(gameState);
        renderNextPiece(gameState.nextPiece);
        updateStats(gameState);
        updateOverlay(gameState);
        updatePauseButton(gameState.isPaused, gameState.gameOver);

        if (!gameState.gameOver) {
            hideAIComment();
        }
    }

    function onGameOver(gameState) {
        showAIComment(gameState);
    }

    function setupKeyboardControls() {
        window.addEventListener('keydown', function (e) {
            if (game.gameState.gameOver && e.code !== 'KeyR') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) {
                e.preventDefault();
            }

            if (e.code === 'KeyP') {
                game.togglePause();
                return;
            }

            if (e.code === 'KeyR') {
                hideAIComment();
                game.startGame();
                return;
            }

            if (game.gameState.isPaused) return;

            switch (e.code) {
                case 'ArrowLeft':
                    game.move({ x: -1, y: 0 });
                    break;
                case 'ArrowRight':
                    game.move({ x: 1, y: 0 });
                    break;
                case 'ArrowDown':
                    game.move({ x: 0, y: 1 });
                    break;
                case 'ArrowUp':
                    game.rotate();
                    break;
                case 'Space':
                    game.hardDrop();
                    break;
            }
        });
    }

    function setupTouchControls() {
        elements.btnLeft.addEventListener('click', function () { game.move({ x: -1, y: 0 }); });
        elements.btnRight.addEventListener('click', function () { game.move({ x: 1, y: 0 }); });
        elements.btnDown.addEventListener('click', function () { game.move({ x: 0, y: 1 }); });
        elements.btnRotate.addEventListener('click', function () { game.rotate(); });
        elements.btnHarddrop.addEventListener('click', function () { game.hardDrop(); });
        elements.btnPause.addEventListener('click', function () { game.togglePause(); });
        elements.btnRestart.addEventListener('click', function () {
            hideAIComment();
            game.startGame();
        });
    }

    // ========================================
    // 触摸滑动手势支持
    // ========================================
    function setupSwipeControls() {
        const gameBoard = elements.gameBoard;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;

        const SWIPE_THRESHOLD = 20;  // 滑动距离阈值（降低使操作更灵敏）
        const TAP_THRESHOLD = 15;    // 点击距离阈值（稍微放宽容错）
        const TAP_TIME_THRESHOLD = 250; // 点击时间阈值 (ms)
        const MOVE_STEP_THRESHOLD = 25; // 连续移动的步进距离（更灵敏）

        let lastMoveX = 0; // 用于连续水平移动

        gameBoard.addEventListener('touchstart', function (e) {
            if (game.gameState.gameOver || game.gameState.isPaused) return;

            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            lastMoveX = touchStartX;
            isSwiping = true;

            e.preventDefault();
        }, { passive: false });

        gameBoard.addEventListener('touchmove', function (e) {
            if (!isSwiping || game.gameState.gameOver || game.gameState.isPaused) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - lastMoveX;
            const deltaY = touch.clientY - touchStartY;

            // 水平连续移动 (边滑边移)
            if (Math.abs(deltaX) > MOVE_STEP_THRESHOLD) {
                if (deltaX > 0) {
                    game.move({ x: 1, y: 0 }); // 右移
                } else {
                    game.move({ x: -1, y: 0 }); // 左移
                }
                lastMoveX = touch.clientX;
            }

            e.preventDefault();
        }, { passive: false });

        gameBoard.addEventListener('touchend', function (e) {
            if (!isSwiping) return;
            isSwiping = false;

            if (game.gameState.gameOver || game.gameState.isPaused) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;

            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // 判断是点击还是滑动
            if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD && deltaTime < TAP_TIME_THRESHOLD) {
                // 点击 = 旋转
                game.rotate();
            } else if (absY > absX && absY > SWIPE_THRESHOLD) {
                // 垂直滑动
                if (deltaY > 0) {
                    // 下滑 = 硬降
                    game.hardDrop();
                }
                // 上滑忽略
            }
            // 水平滑动已在 touchmove 中处理

            e.preventDefault();
        }, { passive: false });

        // 防止触摸时滚动页面
        gameBoard.addEventListener('touchcancel', function () {
            isSwiping = false;
        });
    }

    function init() {
        initBoard();
        game.onStateChange = onStateChange;
        game.onGameOver = onGameOver;
        setupKeyboardControls();
        setupTouchControls();
        setupSwipeControls();
        game.startGame();
    }

    // 启动游戏
    init();

})();
