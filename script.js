document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('go-board-canvas');
    const ctx = canvas.getContext('2d');

    // Main Controls
    const newGameModalBtn = document.getElementById('new-game-modal-btn');
    const loadSgfBtn = document.getElementById('load-sgf-btn');
    const sgfFileInput = document.getElementById('sgf-file-input');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // Game Info Display
    const blackPlayerNameDisplay = document.querySelector('#player-info-black .player-name');
    const blackCapturesSpan = document.getElementById('black-captures');
    const whitePlayerNameDisplay = document.querySelector('#player-info-white .player-name');
    const whiteCapturesSpan = document.getElementById('white-captures');
    const statusMessageP = document.getElementById('status-message'); // For SGF parsing errors primarily
    const moveNavigationInfoDiv = document.getElementById('move-navigation-info');
    const gameInfoSaveSgfBtn = document.querySelector('#game-info-footer #save-sgf-btn');

    // On-board Popup
    const boardPopupMessageDiv = document.getElementById('board-popup-message');

    // New Game Modal Elements
    const newGameModal = document.getElementById('new-game-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const modalGameTitleInput = document.getElementById('modal-game-title');
    const modalBoardSizeSelect = document.getElementById('modal-board-size-select');
    const modalBlackNameInput = document.getElementById('modal-black-name');
    const modalBlackRankInput = document.getElementById('modal-black-rank');
    const modalWhiteNameInput = document.getElementById('modal-white-name');
    const modalWhiteRankInput = document.getElementById('modal-white-rank');
    const modalKomiInput = document.getElementById('modal-komi');

    // Game State Variables
    let gameTitle = "Wren Go";
    let boardSize = parseInt(modalBoardSizeSelect.value);
    let playerNames = { black: "Black", white: "White" };
    let playerRanks = { black: "??", white: "??" };
    let komi = 6.5;
    let squareSize;
    let board = [];
    let currentPlayer = 1; // 1 for Black, 2 for White
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let boardHistory = [];
    let gameMoves = [];
    let currentMoveIndex = -1;

    const ICONS = {
        NEW_GAME: '➕',
        LOAD_SGF: '📤',
        SAVE_SGF: '💾',
        THEME_LIGHT: '☀️',
        THEME_DARK: '🌙'
    };

    const STONE_COLOR = {
        BLACK: '#111',
        WHITE: '#f0f0f0',
        PREVIEW_BLACK: 'rgba(17, 17, 17, 0.5)',
        PREVIEW_WHITE: 'rgba(240, 240, 240, 0.5)'
    };
    let BOARD_LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-line-color').trim() || '#503720';
    let BOARD_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-bg-color').trim() || '#e4b268';

    function updateButtonIcons() {
        newGameModalBtn.innerHTML = ICONS.NEW_GAME;
        loadSgfBtn.innerHTML = ICONS.LOAD_SGF;
        gameInfoSaveSgfBtn.innerHTML = ICONS.SAVE_SGF;
        themeToggleBtn.innerHTML = document.body.classList.contains('dark-mode') ? ICONS.THEME_LIGHT : ICONS.THEME_DARK;
    }

    function showBoardPopup(message) {
        boardPopupMessageDiv.textContent = message;
        boardPopupMessageDiv.style.display = 'block';
        setTimeout(() => {
            boardPopupMessageDiv.style.display = 'none';
        }, 1500);
    }
    
    function clearBoardPopupMessage() {
        boardPopupMessageDiv.style.display = 'none';
        boardPopupMessageDiv.textContent = '';
    }

    function updateThemeColorsFromCSS() {
        BOARD_LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-line-color').trim();
        BOARD_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-bg-color').trim();
    }

    function initGame(isModalStart = false) {
        if (isModalStart) {
            gameTitle = modalGameTitleInput.value.trim() || "Wren Go";
            document.title = gameTitle + " SGF";
            boardSize = parseInt(modalBoardSizeSelect.value);
            playerNames.black = modalBlackNameInput.value.trim() || "Black";
            playerRanks.black = modalBlackRankInput.value.trim() || "??";
            playerNames.white = modalWhiteNameInput.value.trim() || "White";
            playerRanks.white = modalWhiteRankInput.value.trim() || "??";
            komi = parseFloat(modalKomiInput.value) || 6.5;
        } else {
            document.title = gameTitle + " SGF"; // Ensure title is set on initial load too
        }

        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        currentPlayer = 1;
        blackCaptures = 0;
        whiteCaptures = 0;
        boardHistory = [];
        gameMoves = [];
        currentMoveIndex = -1;

        clearBoardPopupMessage();
        statusMessageP.textContent = ''; // Clear SGF parsing errors
        moveNavigationInfoDiv.textContent = `Move 0. ${playerNames.black}'s turn.`;

        updateGameInfo();
        resizeCanvas();
    }

    function resizeCanvas() {
        const boardContainer = document.getElementById('board-container');
        let containerWidth = boardContainer.offsetWidth;
        if (containerWidth === 0) {
            const boardArea = document.getElementById('board-area');
            containerWidth = (boardArea && boardArea.offsetWidth > 0) ? boardArea.offsetWidth : window.innerWidth * 0.6;
        }
        const maxCanvasSize = Math.min(containerWidth, window.innerHeight * 0.80);
        squareSize = Math.floor(maxCanvasSize / (boardSize + 1));
        const canvasSize = squareSize * (boardSize + 1);
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        drawBoard();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = BOARD_BG_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const padding = squareSize / 2;
        ctx.strokeStyle = BOARD_LINE_COLOR;
        ctx.lineWidth = 1;
        for (let i = 0; i < boardSize; i++) {
            ctx.beginPath();
            ctx.moveTo(padding + i * squareSize + squareSize / 2, padding + squareSize / 2);
            ctx.lineTo(padding + i * squareSize + squareSize / 2, padding + (boardSize - 1) * squareSize + squareSize / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(padding + squareSize / 2, padding + i * squareSize + squareSize / 2);
            ctx.lineTo(padding + (boardSize - 1) * squareSize + squareSize / 2, padding + i * squareSize + squareSize / 2);
            ctx.stroke();
        }
        const starPointSize = Math.max(2, squareSize * 0.1);
        const starPoints = getStarPoints(boardSize);
        ctx.fillStyle = BOARD_LINE_COLOR;
        starPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(padding + point.x * squareSize + squareSize / 2, padding + point.y * squareSize + squareSize / 2, starPointSize, 0, 2 * Math.PI);
            ctx.fill();
        });
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] !== 0) drawStone(r, c, board[r][c]);
            }
        }
    }

    function getStarPoints(size) {
        if (size === 9) return [{x:2,y:2},{x:6,y:2},{x:2,y:6},{x:6,y:6},{x:4,y:4}];
        if (size === 13) return [{x:3,y:3},{x:9,y:3},{x:3,y:9},{x:9,y:9},{x:6,y:6}];
        if (size === 19) return [{x:3,y:3},{x:9,y:3},{x:15,y:3},{x:3,y:9},{x:9,y:9},{x:15,y:9},{x:3,y:15},{x:9,y:15},{x:15,y:15}];
        return [];
    }

    function drawStone(row, col, player, isPreview = false) {
        const padding = squareSize / 2;
        const stoneRadius = squareSize * 0.45;
        const x = padding + col * squareSize + squareSize / 2;
        const y = padding + row * squareSize + squareSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, 2 * Math.PI);
        if (isPreview) ctx.fillStyle = player === 1 ? STONE_COLOR.PREVIEW_BLACK : STONE_COLOR.PREVIEW_WHITE;
        else ctx.fillStyle = player === 1 ? STONE_COLOR.BLACK : STONE_COLOR.WHITE;
        ctx.fill();
        ctx.strokeStyle = player === 1 ? '#000' : '#ccc';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    function updateGameInfo() {
        blackPlayerNameDisplay.innerHTML = `${playerNames.black} <span class="player-rank">(${playerRanks.black})</span>`;
        whitePlayerNameDisplay.innerHTML = `${playerNames.white} <span class="player-rank">(${playerRanks.white})</span>`;
        blackCapturesSpan.textContent = blackCaptures;
        whiteCapturesSpan.textContent = whiteCaptures;
        const blackInfoBox = document.getElementById('player-info-black');
        const whiteInfoBox = document.getElementById('player-info-white');
        if (currentPlayer === 1) {
            blackInfoBox.classList.add('active');
            whiteInfoBox.classList.remove('active');
        } else {
            whiteInfoBox.classList.add('active');
            blackInfoBox.classList.remove('active');
        }
    }

    newGameModalBtn.addEventListener('click', () => newGameModal.style.display = 'flex');
    closeModalBtn.addEventListener('click', () => newGameModal.style.display = 'none');
    startGameBtn.addEventListener('click', () => { initGame(true); newGameModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === newGameModal) newGameModal.style.display = 'none'; });

    loadSgfBtn.addEventListener('click', () => sgfFileInput.click());
    sgfFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const sgfData = parseSgfContent(e.target.result);
                    if (sgfData) loadGameFromSgf(sgfData);
                    else { statusMessageP.textContent = `Error parsing SGF file: ${file.name}.`; moveNavigationInfoDiv.textContent = ''; }
                } catch (error) {
                    console.error("Error processing SGF:", error);
                    statusMessageP.textContent = `Error processing SGF: ${error.message}`; moveNavigationInfoDiv.textContent = '';
                }
            };
            reader.readAsText(file);
            sgfFileInput.value = '';
        }
    });

    function parseSgfContent(sgfString) {
        const data = {
            size: 19, komi: 6.5, moves: [], rules: "Japanese",
            gameName: "Wren Go", blackName: "Black", whiteName: "White", blackRank: "??", whiteRank: "??"
        };
        const gameNameMatch = sgfString.match(/GN\[([^\]]*)\]/);
        if (gameNameMatch) data.gameName = gameNameMatch[1].trim() || "Wren Go";
        const sizeMatch = sgfString.match(/SZ\[(\d+)\]/); if (sizeMatch) data.size = parseInt(sizeMatch[1]);
        const komiMatch = sgfString.match(/KM\[([\d\.]+)\]/); if (komiMatch) data.komi = parseFloat(komiMatch[1]);
        const blackNameMatch = sgfString.match(/PB\[([^\]]*)\]/); if (blackNameMatch) data.blackName = blackNameMatch[1].trim() || "Black";
        const whiteNameMatch = sgfString.match(/PW\[([^\]]*)\]/); if (whiteNameMatch) data.whiteName = whiteNameMatch[1].trim() || "White";
        const blackRankMatch = sgfString.match(/BR\[([^\]]*)\]/); if (blackRankMatch) data.blackRank = blackRankMatch[1].trim() || "??";
        const whiteRankMatch = sgfString.match(/WR\[([^\]]*)\]/); if (whiteRankMatch) data.whiteRank = whiteRankMatch[1].trim() || "??";
        const moveRegex = /;([BW])\[([a-s]{2})\]/g; let match;
        while ((match = moveRegex.exec(sgfString)) !== null) {
            const player = match[1] === 'B' ? 1 : 2; const coords = match[2];
            if (coords.length === 2) {
                const c = coords.charCodeAt(0) - 'a'.charCodeAt(0); const r = coords.charCodeAt(1) - 'a'.charCodeAt(0);
                if (r >= 0 && r < data.size && c >= 0 && c < data.size) data.moves.push({ player, r, c });
                else console.warn(`Invalid SGF coordinate: ${coords} for board size ${data.size}`);
            }
        }
        return data;
    }

    function loadGameFromSgf(sgfData) {
        modalGameTitleInput.value = sgfData.gameName;
        modalBoardSizeSelect.value = sgfData.size.toString();
        modalBlackNameInput.value = sgfData.blackName;
        modalBlackRankInput.value = sgfData.blackRank;
        modalWhiteNameInput.value = sgfData.whiteName;
        modalWhiteRankInput.value = sgfData.whiteRank;
        modalKomiInput.value = sgfData.komi;
        gameTitle = sgfData.gameName; boardSize = sgfData.size;
        playerNames.black = sgfData.blackName; playerNames.white = sgfData.whiteName;
        playerRanks.black = sgfData.blackRank; playerRanks.white = sgfData.whiteRank;
        komi = sgfData.komi;
        initGame(false); // This resets gameMoves and currentMoveIndex
        gameMoves = sgfData.moves.map(m => ({ ...m })); // Repopulate gameMoves
        if (gameMoves.length > 0) navigateToMove(gameMoves.length - 1);
        else {
            moveNavigationInfoDiv.textContent = `SGF loaded (Size: ${sgfData.size}). No moves. ${playerNames.black}'s turn.`;
            statusMessageP.textContent = ''; // Clear SGF parsing errors if any
        }
        if (!statusMessageP.textContent.startsWith("Error")) statusMessageP.textContent = '';
    }

    function navigateToMove(moveIndex) {
        if (moveIndex < -1 || moveIndex >= gameMoves.length) return;
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        blackCaptures = 0; whiteCaptures = 0; boardHistory = [];
        let tempCurrentPlayer = 1;
        for (let i = 0; i <= moveIndex; i++) {
            const move = gameMoves[i];
            if (!move || typeof move.r === 'undefined' || typeof move.c === 'undefined') {
                statusMessageP.textContent = `Error: Invalid SGF data at move ${i + 1}.`; return;
            }
            const tempBoardState = board.map(arr => arr.slice());
            tempBoardState[move.r][move.c] = move.player;
            let capturedInStep = [];
            const opponentInStep = (move.player === 1) ? 2 : 1;
            const neighborsInStep = getNeighbors(move.r, move.c);
            for (const n of neighborsInStep) {
                if (tempBoardState[n.r][n.c] === opponentInStep) {
                    const group = getGroup(n.r, n.c, tempBoardState);
                    if (group.liberties === 0) {
                        capturedInStep.push(...group.stones);
                        group.stones.forEach(stone => tempBoardState[stone.r][stone.c] = 0);
                    }
                }
            }
            if (capturedInStep.length > 0) {
                if (move.player === 1) whiteCaptures += capturedInStep.length;
                else blackCaptures += capturedInStep.length;
            }
            const groupAfterPlacement = getGroup(move.r, move.c, tempBoardState);
            if (groupAfterPlacement.liberties === 0 && capturedInStep.length === 0) console.warn(`SGF Replay: Suicide at move ${i+1}`);
            board = tempBoardState;
            boardHistory.push(board.map(r => r.join('')).join('|'));
            tempCurrentPlayer = opponentInStep;
        }
        currentMoveIndex = moveIndex;
        currentPlayer = tempCurrentPlayer;
        if (moveIndex === -1) { // Start of game
            currentPlayer = 1;
            moveNavigationInfoDiv.textContent = `Move 0. ${playerNames.black}'s turn.`;
        } else if (currentMoveIndex === gameMoves.length - 1) { // Last move of game/SGF
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1}. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
        } else { // Navigating somewhere in the middle
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
        }
        statusMessageP.textContent = '';
        updateGameInfo();
        drawBoard();
    }

    gameInfoSaveSgfBtn.addEventListener('click', () => {
        const sgfContent = generateSgfContent();
        if (sgfContent) {
            const blob = new Blob([sgfContent], { type: 'application/x-go-sgf;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${gameTitle.replace(/[^a-z0-9 _-]/gi, '_') || 'GoGame'}.sgf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href); // Corrected from url to a.href
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'SGF file saved.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        } else {
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'No moves to save yet.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        }
    });

    function generateSgfContent() {
        if (gameMoves.length === 0 && boardSize === 0) return null;
        let sgf = `(;GM[1]FF[4]CA[UTF-8]AP[ClineGo:1.0]KM[${komi}]SZ[${boardSize}]GN[${gameTitle}]PB[${playerNames.black}]PW[${playerNames.white}]BR[${playerRanks.black}]WR[${playerRanks.white}]DT[${new Date().toISOString().slice(0,10)}]RU[Japanese]`;
        gameMoves.forEach(move => {
            const playerChar = move.player === 1 ? 'B' : 'W';
            const sgfCol = String.fromCharCode('a'.charCodeAt(0) + move.c);
            const sgfRow = String.fromCharCode('a'.charCodeAt(0) + move.r);
            sgf += `;${playerChar}[${sgfCol}${sgfRow}]`;
        });
        sgf += ')';
        return sgf;
    }

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left; const y = event.clientY - rect.top;
        const padding = squareSize / 2;
        const col = Math.floor((x - padding) / squareSize); const row = Math.floor((y - padding) / squareSize);
        drawBoard();
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === 0) {
            drawStone(row, col, currentPlayer, true);
        }
    });

    canvas.addEventListener('mouseout', () => drawBoard());

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left; const y = event.clientY - rect.top;
        const padding = squareSize / 2;
        const col = Math.floor((x - padding) / squareSize); const row = Math.floor((y - padding) / squareSize);
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) handleMove(row, col);
    });

    function handleMove(row, col) {
        clearBoardPopupMessage();
        statusMessageP.textContent = '';

        if (board[row][col] !== 0) {
            // This is not a rule violation, just an invalid placement.
            // No popup, no status message. Silently ignore or provide brief non-error feedback.
            // For now, let's keep it silent.
            return;
        }

        const tempBoard = board.map(arr => arr.slice());
        tempBoard[row][col] = currentPlayer;
        let capturedStones = [];
        const opponent = (currentPlayer === 1) ? 2 : 1;
        const neighbors = getNeighbors(row, col);
        for (const n of neighbors) {
            if (tempBoard[n.r][n.c] === opponent) {
                const group = getGroup(n.r, n.c, tempBoard);
                if (group.liberties === 0) {
                    capturedStones.push(...group.stones);
                    group.stones.forEach(stone => tempBoard[stone.r][stone.c] = 0);
                }
            }
        }
        if (capturedStones.length > 0) {
            if (currentPlayer === 1) whiteCaptures += capturedStones.length;
            else blackCaptures += capturedStones.length;
        }

        const currentGroup = getGroup(row, col, tempBoard);
        if (currentGroup.liberties === 0 && capturedStones.length === 0) {
            showBoardPopup('Illegal move, suicide');
            if (capturedStones.length > 0) { // Revert captures if they were mistakenly added
                 if (currentPlayer === 1) whiteCaptures -= capturedStones.length;
                 else blackCaptures -= capturedStones.length;
            }
            return;
        }

        const boardStateString = tempBoard.map(r => r.join('')).join('|');
        if (boardHistory.includes(boardStateString)) {
            showBoardPopup('Ko!');
            if (capturedStones.length > 0) { // Revert captures
                 if (currentPlayer === 1) whiteCaptures -= capturedStones.length;
                 else blackCaptures -= capturedStones.length;
            }
            return;
        }

        board = tempBoard;
        boardHistory.push(boardStateString);
        if (currentMoveIndex < gameMoves.length - 1 && currentMoveIndex !== -1) {
            gameMoves = gameMoves.slice(0, currentMoveIndex + 1);
        }
        const movePlayer = currentPlayer;
        gameMoves.push({ player: movePlayer, r: row, c: col });
        currentMoveIndex = gameMoves.length - 1;
        currentPlayer = opponent;
        updateGameInfo();
        drawBoard();
        
        // Update move navigation info
        if (currentMoveIndex === gameMoves.length -1) { // If it's the latest move
             moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1}. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
        } else { // Should not happen if logic for truncating gameMoves is correct
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
        }
        if (capturedStones.length > 0) {
             moveNavigationInfoDiv.textContent += ` Captured ${capturedStones.length}.`;
        }
    }

    function getNeighbors(r, c) {
        const neighbors = [];
        if (r > 0) neighbors.push({ r: r - 1, c: c });
        if (r < boardSize - 1) neighbors.push({ r: r + 1, c: c });
        if (c > 0) neighbors.push({ r: r, c: c - 1 });
        if (c < boardSize - 1) neighbors.push({ r: r, c: c + 1 });
        return neighbors;
    }

    function getGroup(r, c, currentBoardState) {
        const player = currentBoardState[r][c];
        if (player === 0) return { stones: [], liberties: 0 };
        const stones = []; const liberties = new Set();
        const visited = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));
        const queue = [{ r, c }];
        visited[r][c] = true; stones.push({ r, c });
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = getNeighbors(current.r, current.c);
            for (const n of neighbors) {
                if (currentBoardState[n.r][n.c] === 0) liberties.add(`${n.r}-${n.c}`);
                else if (currentBoardState[n.r][n.c] === player && !visited[n.r][n.c]) {
                    visited[n.r][n.c] = true; stones.push({ r: n.r, c: n.c }); queue.push({ r: n.r, c: n.c });
                }
            }
        }
        return { stones, liberties: liberties.size, player };
    }

    window.addEventListener('resize', () => resizeCanvas());

    document.addEventListener('keydown', (event) => {
        if (gameMoves.length === 0 && currentMoveIndex === -1) return;
        if (event.key === 'ArrowLeft') {
            if (currentMoveIndex > -1) navigateToMove(currentMoveIndex - 1);
        } else if (event.key === 'ArrowRight') {
            if (currentMoveIndex < gameMoves.length - 1) navigateToMove(currentMoveIndex + 1);
            else if (currentMoveIndex === gameMoves.length - 1 && gameMoves.length > 0) { // At the last move
                moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1}. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
            }
        }
    });

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateButtonIcons();
        updateThemeColorsFromCSS();
        drawBoard();
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') document.body.classList.add('dark-mode');
    
    updateButtonIcons();
    updateThemeColorsFromCSS();
    initGame(false);
});
