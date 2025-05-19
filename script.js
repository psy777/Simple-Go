document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('go-board-canvas');
    const ctx = canvas.getContext('2d');
    
    // Main Controls
    const newGameModalBtn = document.getElementById('new-game-modal-btn');
    const loadSgfBtn = document.getElementById('load-sgf-btn');
    const sgfFileInput = document.getElementById('sgf-file-input');
    const saveSgfBtn = document.getElementById('save-sgf-btn');

    // Game Info Display
    const blackPlayerNameDisplay = document.querySelector('#player-info-black .player-name');
    const blackCapturesSpan = document.getElementById('black-captures');
    const whitePlayerNameDisplay = document.querySelector('#player-info-white .player-name');
    const whiteCapturesSpan = document.getElementById('white-captures');
    const statusMessageP = document.getElementById('status-message');
    const moveNavigationInfoDiv = document.getElementById('move-navigation-info');

    // New Game Modal Elements
    const newGameModal = document.getElementById('new-game-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const modalBoardSizeSelect = document.getElementById('modal-board-size-select');
    const modalBlackNameInput = document.getElementById('modal-black-name');
    const modalBlackRankInput = document.getElementById('modal-black-rank');
    const modalWhiteNameInput = document.getElementById('modal-white-name');
    const modalWhiteRankInput = document.getElementById('modal-white-rank');
    const modalKomiInput = document.getElementById('modal-komi');

    // Game State Variables
    let boardSize = parseInt(modalBoardSizeSelect.value); // Default from modal
    let playerNames = { black: "Black", white: "White" };
    let playerRanks = { black: "??", white: "??" };
    let komi = 6.5;
    let squareSize;
    let board = []; 
    let currentPlayer = 1; 
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let boardHistory = []; 
    let gameMoves = []; 
    let currentMoveIndex = -1; 

    const STONE_COLOR = {
        BLACK: '#111',
        WHITE: '#f0f0f0',
        PREVIEW_BLACK: 'rgba(17, 17, 17, 0.5)',
        PREVIEW_WHITE: 'rgba(240, 240, 240, 0.5)'
    };
    const BOARD_LINE_COLOR = '#503720'; // Darker brown for lines
    const BOARD_BG_COLOR = '#e4b268'; // Traditional Go board color from CSS

    function initGame(isModalStart = false) {
        if (isModalStart) {
            boardSize = parseInt(modalBoardSizeSelect.value);
            playerNames.black = modalBlackNameInput.value || "Black";
            playerRanks.black = modalBlackRankInput.value || "??";
            playerNames.white = modalWhiteNameInput.value || "White";
            playerRanks.white = modalWhiteRankInput.value || "??";
            komi = parseFloat(modalKomiInput.value) || 6.5;
        }
        // If not modal start, it might be SGF load or initial page load
        // For initial page load, values from modal selectors are used by default for boardSize

        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        currentPlayer = 1;
        blackCaptures = 0;
        whiteCaptures = 0;
        boardHistory = [];
        gameMoves = [];
        currentMoveIndex = -1;
        
        statusMessageP.textContent = ''; // Clear previous error messages
        moveNavigationInfoDiv.textContent = 'New game started.';
        
        updateGameInfo();
        resizeCanvas(); // This will call drawBoard
        // drawBoard(); // Called by resizeCanvas
    }

    function resizeCanvas() {
        const boardContainer = document.getElementById('board-container');
        // Ensure container has a width, fallback if not yet rendered
        const containerWidth = boardContainer.offsetWidth || 600; 
        const maxCanvasSize = Math.min(containerWidth - 20, window.innerHeight * 0.7); // Leave some padding

        squareSize = Math.floor(maxCanvasSize / (boardSize + 1)); // +1 for borders/padding
        const canvasSize = squareSize * (boardSize +1); // Total canvas dimension
        
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // Redraw after resize
        drawBoard();
    }
    
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background color (already set by CSS, but good for canvas save)
        ctx.fillStyle = BOARD_BG_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const padding = squareSize / 2; // Padding around the grid

        // Draw grid lines
        ctx.strokeStyle = BOARD_LINE_COLOR;
        ctx.lineWidth = 1;

        for (let i = 0; i < boardSize; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(padding + i * squareSize + squareSize/2, padding + squareSize/2);
            ctx.lineTo(padding + i * squareSize + squareSize/2, padding + (boardSize - 1) * squareSize + squareSize/2);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(padding + squareSize/2, padding + i * squareSize + squareSize/2);
            ctx.lineTo(padding + (boardSize - 1) * squareSize + squareSize/2, padding + i * squareSize + squareSize/2);
            ctx.stroke();
        }

        // Draw star points (hoshi)
        const starPointSize = Math.max(2, squareSize * 0.1);
        const starPoints = getStarPoints(boardSize);
        ctx.fillStyle = BOARD_LINE_COLOR;
        starPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(
                padding + point.x * squareSize + squareSize/2, 
                padding + point.y * squareSize + squareSize/2, 
                starPointSize, 0, 2 * Math.PI
            );
            ctx.fill();
        });

        // Draw stones
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] !== 0) {
                    drawStone(r, c, board[r][c]);
                }
            }
        }
    }

    function getStarPoints(size) {
        if (size === 9) return [{x:2,y:2},{x:6,y:2},{x:2,y:6},{x:6,y:6},{x:4,y:4}];
        if (size === 13) return [{x:3,y:3},{x:9,y:3},{x:3,y:9},{x:9,y:9},{x:6,y:6}];
        if (size === 19) return [{x:3,y:3},{x:9,y:3},{x:15,y:3},{x:3,y:9},{x:9,y:9},{x:15,y:9},{x:3,y:15},{x:9,y:15},{x:15,y:15}];
        return []; // Default for other sizes or no hoshi
    }

    function drawStone(row, col, player, isPreview = false) {
        const padding = squareSize / 2;
        const stoneRadius = squareSize * 0.45; // Slightly smaller than half square
        const x = padding + col * squareSize + squareSize/2;
        const y = padding + row * squareSize + squareSize/2;

        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, 2 * Math.PI);
        
        if (isPreview) {
            ctx.fillStyle = player === 1 ? STONE_COLOR.PREVIEW_BLACK : STONE_COLOR.PREVIEW_WHITE;
        } else {
            ctx.fillStyle = player === 1 ? STONE_COLOR.BLACK : STONE_COLOR.WHITE;
        }
        ctx.fill();

        // Optional: Add a subtle border to stones for better definition
        ctx.strokeStyle = player === 1 ? '#000' : '#ccc';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
    
    function updateGameInfo() {
        blackPlayerNameDisplay.innerHTML = `${playerNames.black} <span class="player-rank">(${playerRanks.black})</span>`;
        whitePlayerNameDisplay.innerHTML = `${playerNames.white} <span class="player-rank">(${playerRanks.white})</span>`;
        
        blackCapturesSpan.textContent = blackCaptures;
        whiteCapturesSpan.textContent = whiteCaptures;

        // Highlight active player
        const blackInfoBox = document.getElementById('player-info-black');
        const whiteInfoBox = document.getElementById('player-info-white');

        if (currentPlayer === 1) {
            blackInfoBox.style.border = '2px solid #007bff';
            blackInfoBox.style.padding = '13px'; // Adjust padding to maintain size with border
            whiteInfoBox.style.border = '1px solid #e0e0e0';
            whiteInfoBox.style.padding = '14px';
        } else {
            whiteInfoBox.style.border = '2px solid #007bff';
            whiteInfoBox.style.padding = '13px';
            blackInfoBox.style.border = '1px solid #e0e0e0';
            blackInfoBox.style.padding = '14px';
        }
    }

    // Modal Event Listeners
    newGameModalBtn.addEventListener('click', () => {
        newGameModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        newGameModal.style.display = 'none';
    });

    startGameBtn.addEventListener('click', () => {
        initGame(true); // Pass true to indicate it's a modal start
        newGameModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => { // Close modal if clicked outside
        if (event.target === newGameModal) {
            newGameModal.style.display = 'none';
        }
    });

    // Other Event Listeners
    loadSgfBtn.addEventListener('click', () => sgfFileInput.click());
    sgfFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const sgfData = parseSgfContent(e.target.result);
                    if (sgfData) {
                        loadGameFromSgf(sgfData);
                        // statusMessageP.textContent = `SGF file "${file.name}" loaded.`; // Moved to loadGameFromSgf
                    } else {
                        statusMessageP.textContent = `Error parsing SGF file: ${file.name}.`; // This is an error, so keep
                        moveNavigationInfoDiv.textContent = '';
                    }
                } catch (error) {
                    console.error("Error processing SGF:", error);
                    statusMessageP.textContent = `Error processing SGF: ${error.message}`; // This is an error
                    moveNavigationInfoDiv.textContent = '';
                }
            };
            reader.readAsText(file);
            sgfFileInput.value = ''; // Reset file input
        }
    });

    function parseSgfContent(sgfString) {
        const data = {
            size: 19, 
            komi: 6.5, 
            moves: [],
            rules: "Japanese",
            blackName: "Black",
            whiteName: "White",
            blackRank: "??",
            whiteRank: "??"
        };

        // Extract properties like SZ, KM, PB, PW, BR, WR
        const sizeMatch = sgfString.match(/SZ\[(\d+)\]/);
        if (sizeMatch) data.size = parseInt(sizeMatch[1]); else console.log("SGF: SZ not found, using default.");

        const komiMatch = sgfString.match(/KM\[([\d\.]+)\]/);
        if (komiMatch) data.komi = parseFloat(komiMatch[1]); else console.log("SGF: KM not found, using default.");

        const blackNameMatch = sgfString.match(/PB\[([^\]]*)\]/); // Allow empty name
        if (blackNameMatch) data.blackName = blackNameMatch[1] || "Black"; else console.log("SGF: PB not found, using default.");

        const whiteNameMatch = sgfString.match(/PW\[([^\]]*)\]/); // Allow empty name
        if (whiteNameMatch) data.whiteName = whiteNameMatch[1] || "White"; else console.log("SGF: PW not found, using default.");
        
        const blackRankMatch = sgfString.match(/BR\[([^\]]*)\]/); // Allow empty rank
        if (blackRankMatch) data.blackRank = blackRankMatch[1] || "??"; else console.log("SGF: BR not found, using default.");

        const whiteRankMatch = sgfString.match(/WR\[([^\]]*)\]/); // Allow empty rank
        if (whiteRankMatch) data.whiteRank = whiteRankMatch[1] || "??"; else console.log("SGF: WR not found, using default.");
        
        // Extract moves: sequence of ;B[xy] or ;W[xy]
        // This is a simplified parser, assumes one main variation.
        const moveRegex = /;([BW])\[([a-s]{2})\]/g;
        let match;
        while ((match = moveRegex.exec(sgfString)) !== null) {
            const player = match[1] === 'B' ? 1 : 2;
            const coords = match[2];
            if (coords.length === 2) { // Basic check for valid coordinate string length
                const c = coords.charCodeAt(0) - 'a'.charCodeAt(0);
                const r = coords.charCodeAt(1) - 'a'.charCodeAt(0);
                if (r >= 0 && r < data.size && c >= 0 && c < data.size) {
                     data.moves.push({ player, r, c });
                } else {
                    console.warn(`Invalid SGF coordinate: ${coords} for board size ${data.size}`);
                }
            }
        }
        return data;
    }

    function loadGameFromSgf(sgfData) {
        // Set modal values from SGF to reflect loaded game if user opens modal again
        modalBoardSizeSelect.value = sgfData.size.toString();
        modalBlackNameInput.value = sgfData.blackName;
        modalBlackRankInput.value = sgfData.blackRank;
        modalWhiteNameInput.value = sgfData.whiteName;
        modalWhiteRankInput.value = sgfData.whiteRank;
        modalKomiInput.value = sgfData.komi;

        // Initialize game with SGF data (but not as a modal start)
        boardSize = sgfData.size;
        playerNames.black = sgfData.blackName;
        playerNames.white = sgfData.whiteName;
        playerRanks.black = sgfData.blackRank;
        playerRanks.white = sgfData.whiteRank;
        komi = sgfData.komi;
        
        initGame(false); // false: not a modal start, uses already set global vars

        // Store all moves from SGF into gameMoves
        gameMoves = sgfData.moves.map(m => ({ ...m })); // Make a copy
        
        // Navigate to the last move of the SGF to display the final board state
        if (gameMoves.length > 0) {
            navigateToMove(gameMoves.length - 1); // This will update moveNavigationInfoDiv
        } else {
            // SGF had no moves, just board setup
            // initGame() already called, board is set up.
            // updateGameInfo and drawBoard are also called by initGame->resizeCanvas.
            moveNavigationInfoDiv.textContent = `SGF loaded (Size: ${sgfData.size}). No moves.`;
            statusMessageP.textContent = '';
        }
        // Ensure status message is cleared if SGF load was successful without move issues
        if (!statusMessageP.textContent.startsWith("Error")) {
             statusMessageP.textContent = '';
        }
    }

    function navigateToMove(moveIndex) {
        if (moveIndex < -1 || moveIndex >= gameMoves.length) {
            console.warn("NavigateToMove: Index out of bounds", moveIndex);
            return;
        }

        // Reset board and game state to initial
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        blackCaptures = 0;
        whiteCaptures = 0;
        boardHistory = []; // Clear history as we are replaying
        let tempCurrentPlayer = 1; // Start with Black for replaying

        for (let i = 0; i <= moveIndex; i++) {
            const move = gameMoves[i];
            if (!move || typeof move.r === 'undefined' || typeof move.c === 'undefined') {
                console.error("Invalid move object at index", i, move);
                statusMessageP.textContent = `Error: Invalid move data at step ${i+1}.`;
                return; // Stop replay
            }

            // Apply the move to a temporary board to calculate captures and next state
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
                        group.stones.forEach(stone => {
                            tempBoardState[stone.r][stone.c] = 0;
                        });
                    }
                }
            }

            if (capturedInStep.length > 0) {
                if (move.player === 1) whiteCaptures += capturedInStep.length;
                else blackCaptures += capturedInStep.length;
            }
            
            // Suicide check (simplified for replay - SGF shouldn't have illegal moves)
            const groupAfterPlacement = getGroup(move.r, move.c, tempBoardState);
            if (groupAfterPlacement.liberties === 0 && capturedInStep.length === 0) {
                 console.warn(`SGF Replay: Suicide move at index ${i} (${move.r},${move.c}) by player ${move.player}. This shouldn't happen in valid SGF.`);
                 // Decide how to handle: stop, skip, or allow? For now, allow.
            }

            board = tempBoardState; // Commit the state
            const boardStateStr = board.map(r => r.join('')).join('|');
            boardHistory.push(boardStateStr); // Add to history for consistency
            tempCurrentPlayer = opponentInStep;
        }

        currentMoveIndex = moveIndex;
        currentPlayer = tempCurrentPlayer; 

        if (moveIndex === -1) { 
            currentPlayer = 1; 
            moveNavigationInfoDiv.textContent = 'At the start of the game.';
        } else {
            moveNavigationInfoDiv.textContent = `Displaying move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
        }
        statusMessageP.textContent = ''; // Clear error messages on successful navigation
        updateGameInfo();
        drawBoard();
    }


    saveSgfBtn.addEventListener('click', () => {
        const sgfContent = generateSgfContent();
        if (sgfContent) {
            const blob = new Blob([sgfContent], { type: 'application/x-go-sgf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `game-${new Date().toISOString().slice(0,10)}.sgf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            // statusMessageP.textContent = 'SGF file saved.'; // No general status messages
            moveNavigationInfoDiv.textContent = 'SGF file saved.';
            setTimeout(() => { // Clear save message after a bit
                if (moveNavigationInfoDiv.textContent === 'SGF file saved.') {
                    if (currentMoveIndex > -1 && gameMoves.length > 0) {
                        moveNavigationInfoDiv.textContent = `Displaying move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
                    } else if (gameMoves.length === 0) {
                         moveNavigationInfoDiv.textContent = 'New game started.';
                    } else {
                        moveNavigationInfoDiv.textContent = '';
                    }
                }
            }, 2000);
        } else {
            // statusMessageP.textContent = 'No moves to save yet.';
            moveNavigationInfoDiv.textContent = 'No moves to save yet.';
             setTimeout(() => { // Clear message
                if (moveNavigationInfoDiv.textContent === 'No moves to save yet.') {
                     moveNavigationInfoDiv.textContent = '';
                }
            }, 2000);
        }
    });

    function generateSgfContent() {
        if (gameMoves.length === 0 && boardSize === 0) { 
            return null;
        }

        let sgf = `(;GM[1]FF[4]CA[UTF-8]AP[ClineGo:1.0]KM[${komi}]SZ[${boardSize}]PB[${playerNames.black}]PW[${playerNames.white}]BR[${playerRanks.black}]WR[${playerRanks.white}]DT[${new Date().toISOString().slice(0,10)}]RU[Japanese]`; // Added RU

        gameMoves.forEach(move => {
            const playerChar = move.player === 1 ? 'B' : 'W';
            // SGF coordinates are 'aa' for top-left (0,0)
            const sgfCol = String.fromCharCode('a'.charCodeAt(0) + move.c);
            const sgfRow = String.fromCharCode('a'.charCodeAt(0) + move.r);
            sgf += `;${playerChar}[${sgfCol}${sgfRow}]`;
        });

        sgf += ')';
        return sgf;
    }

    canvas.addEventListener('mousemove', (event) => {
        // Placeholder for stone preview logic
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const padding = squareSize / 2;

        // Calculate board coordinates from mouse position
        // Adjust for the fact that lines are at squareSize/2, squareSize + squareSize/2 etc.
        // So, an intersection is at (padding + c * squareSize + squareSize/2)
        // We want to find c such that mouse_x is closest to this.
        // mouse_x - padding - squareSize/2 = c * squareSize
        // c = (mouse_x - padding - squareSize/2) / squareSize
        // More simply, consider the center of the squares.
        // The click area for an intersection (r,c) is a square centered at that intersection.
        const col = Math.floor((x - padding) / squareSize);
        const row = Math.floor((y - padding) / squareSize);

        drawBoard(); // Redraw to clear previous preview

        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === 0) {
            drawStone(row, col, currentPlayer, true);
        }
    });

    canvas.addEventListener('mouseout', () => {
        drawBoard(); // Clear preview when mouse leaves canvas
    });

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const padding = squareSize / 2;

        const col = Math.floor((x - padding) / squareSize);
        const row = Math.floor((y - padding) / squareSize);

        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
            handleMove(row, col);
        }
    });

    function handleMove(row, col) {
        statusMessageP.textContent = ''; // Clear previous errors on new attempt

        if (board[row][col] !== 0) {
            // This is not a rule violation, just an invalid placement.
            // User might want feedback for this, but not in the "error" status message.
            // For now, let's keep it silent or use moveNavigationInfoDiv briefly.
            moveNavigationInfoDiv.textContent = 'Position already occupied.';
            setTimeout(() => { // Clear message
                 if (moveNavigationInfoDiv.textContent === 'Position already occupied.') {
                    if (currentMoveIndex > -1 && gameMoves.length > 0) {
                        moveNavigationInfoDiv.textContent = `Displaying move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
                    } else {
                         moveNavigationInfoDiv.textContent = 'New game started.'; // Or empty if preferred
                    }
                 }
            }, 1500);
            return;
        }

        // --- Core Game Logic Implementation ---
        const tempBoard = board.map(arr => arr.slice());
        tempBoard[row][col] = currentPlayer;
        let capturedStones = [];

        // 1. Check for captures of opponent stones
        const opponent = (currentPlayer === 1) ? 2 : 1;
        const neighbors = getNeighbors(row, col);

        for (const n of neighbors) {
            if (tempBoard[n.r][n.c] === opponent) {
                const group = getGroup(n.r, n.c, tempBoard);
                if (group.liberties === 0) {
                    capturedStones.push(...group.stones);
                    group.stones.forEach(stone => {
                        tempBoard[stone.r][stone.c] = 0; // Remove captured stones
                    });
                }
            }
        }
        
        // Update capture counts
        if (capturedStones.length > 0) {
            if (currentPlayer === 1) { // Black captured white stones
                whiteCaptures += capturedStones.length;
            } else { // White captured black stones
                blackCaptures += capturedStones.length;
            }
        }

        // 2. Check for suicide
        const currentGroup = getGroup(row, col, tempBoard);
        if (currentGroup.liberties === 0) {
            // If no captures were made by this move, it's a suicide.
            if (capturedStones.length === 0) {
                statusMessageP.textContent = 'Invalid move: Suicide is not allowed.';
                return;
            }
        }

        // 3. Superko check
        const boardStateString = tempBoard.map(r => r.join('')).join('|');
        if (boardHistory.includes(boardStateString)) {
            statusMessageP.textContent = 'Invalid move: Superko violation (board state repeated).';
            // Revert captures if any for this specific check, as the move is invalid
            if (capturedStones.length > 0) {
                 if (currentPlayer === 1) whiteCaptures -= capturedStones.length;
                 else blackCaptures -= capturedStones.length;
            }
            return;
        }

        // If move is valid, apply it to the actual board
        board = tempBoard;
        boardHistory.push(boardStateString); // Add current state to history
        
        // If we were navigating, new move invalidates further SGF history
        if (currentMoveIndex < gameMoves.length -1 && currentMoveIndex !== -1) {
            gameMoves = gameMoves.slice(0, currentMoveIndex + 1);
        }
        
        const movePlayer = (opponent === 2 ? 1 : 2); // The player who made the move
        gameMoves.push({ player: movePlayer , r: row, c: col });
        currentMoveIndex = gameMoves.length - 1;


        // Switch player
        currentPlayer = opponent; 
        updateGameInfo();
        drawBoard();
        
        let moveMsg = `Move ${currentMoveIndex + 1}.`;
        if (capturedStones.length > 0) {
            moveMsg += ` Captured ${capturedStones.length} stone(s).`;
        }
        moveNavigationInfoDiv.textContent = moveMsg;
        // statusMessageP.textContent = ''; // Cleared at the start of handleMove
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

        const stones = [];
        const liberties = new Set();
        const visited = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));
        const queue = [{ r, c }];

        visited[r][c] = true;
        stones.push({ r, c });

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = getNeighbors(current.r, current.c);

            for (const n of neighbors) {
                if (currentBoardState[n.r][n.c] === 0) { // Liberty
                    liberties.add(`${n.r}-${n.c}`);
                } else if (currentBoardState[n.r][n.c] === player && !visited[n.r][n.c]) {
                    visited[n.r][n.c] = true;
                    stones.push({ r: n.r, c: n.c });
                    queue.push({ r: n.r, c: n.c });
                }
            }
        }
        return { stones, liberties: liberties.size, player };
    }
    
    // Initial setup
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawBoard();
    });

    document.addEventListener('keydown', (event) => {
        if (gameMoves.length === 0) return; // No moves to navigate

        if (event.key === 'ArrowLeft') {
            if (currentMoveIndex > -1) {
                navigateToMove(currentMoveIndex - 1);
            }
        } else if (event.key === 'ArrowRight') {
            if (currentMoveIndex < gameMoves.length - 1) {
                navigateToMove(currentMoveIndex + 1);
            } else if (currentMoveIndex === gameMoves.length - 1) {
                // At the last recorded move. Pressing right again signifies wanting to make a new move.
                // The board is already in the state of the last move.
                // currentPlayer is already set to whose turn it would be *after* the last move.
                // We just need to update the UI to reflect that we are now in "live play" mode.
                moveNavigationInfoDiv.textContent = `End of recorded game. Your turn, ${playerNames[currentPlayer === 1 ? 'black' : 'white']}.`;
                // No actual state change needed here, just UI feedback.
                // Clicking on the board will now append a new move.
            }
        }
    });

    initGame(false); // Initial game setup on page load, not from modal
});
