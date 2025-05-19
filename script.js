document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('go-board-canvas');
    const ctx = canvas.getContext('2d');
    const boardSizeSelect = document.getElementById('board-size-select');
    const newGameBtn = document.getElementById('new-game-btn');
    const loadSgfBtn = document.getElementById('load-sgf-btn');
    const sgfFileInput = document.getElementById('sgf-file-input');
    const saveSgfBtn = document.getElementById('save-sgf-btn');
    const currentPlayerSpan = document.getElementById('current-player');
    const blackCapturesSpan = document.getElementById('black-captures');
    const whiteCapturesSpan = document.getElementById('white-captures');
    const statusMessageP = document.getElementById('status-message');

    let boardSize = parseInt(boardSizeSelect.value);
    let squareSize;
    let board = []; // 2D array representing the board state: 0 for empty, 1 for black, 2 for white
    let currentPlayer = 1; // 1 for Black, 2 for White
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let boardHistory = []; // For Superko rule
    let gameMoves = []; // To store moves for SGF: [{player, r, c}, ...]
    let currentMoveIndex = -1; // -1 means at the start, before any moves are shown/made from gameMoves

    const STONE_COLOR = {
        BLACK: '#111',
        WHITE: '#f0f0f0',
        PREVIEW_BLACK: 'rgba(17, 17, 17, 0.5)',
        PREVIEW_WHITE: 'rgba(240, 240, 240, 0.5)'
    };
    const BOARD_LINE_COLOR = '#503720'; // Darker brown for lines
    const BOARD_BG_COLOR = '#e4b268'; // Traditional Go board color from CSS

    function initGame() {
        boardSize = parseInt(boardSizeSelect.value);
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        currentPlayer = 1;
        blackCaptures = 0;
        whiteCaptures = 0;
        boardHistory = [];
        gameMoves = [];
        currentMoveIndex = -1;
        updateGameInfo();
        resizeCanvas();
        drawBoard();
        statusMessageP.textContent = 'New game started.';
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
        currentPlayerSpan.textContent = currentPlayer === 1 ? 'Black' : 'White';
        currentPlayerSpan.style.color = currentPlayer === 1 ? STONE_COLOR.BLACK : STONE_COLOR.WHITE;
        // For white player, ensure text is readable on light background
        if (currentPlayer === 2) {
             currentPlayerSpan.style.backgroundColor = STONE_COLOR.BLACK; // Or a dark grey
        } else {
            currentPlayerSpan.style.backgroundColor = 'transparent';
        }

        blackCapturesSpan.textContent = blackCaptures;
        whiteCapturesSpan.textContent = whiteCaptures;
    }

    // Event Listeners
    newGameBtn.addEventListener('click', initGame);
    boardSizeSelect.addEventListener('change', initGame);
    
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
                        statusMessageP.textContent = `SGF file "${file.name}" loaded.`;
                    } else {
                        statusMessageP.textContent = `Error parsing SGF file: ${file.name}.`;
                    }
                } catch (error) {
                    console.error("Error processing SGF:", error);
                    statusMessageP.textContent = `Error processing SGF: ${error.message}`;
                }
            };
            reader.readAsText(file);
            sgfFileInput.value = ''; // Reset file input
        }
    });

    function parseSgfContent(sgfString) {
        const data = {
            size: 19, // Default
            komi: 6.5, // Default
            moves: [],
            rules: "Japanese" // Default, can be extracted if present (e.g. RU[Japanese])
        };

        // Extract properties like SZ, KM
        const sizeMatch = sgfString.match(/SZ\[(\d+)\]/);
        if (sizeMatch) data.size = parseInt(sizeMatch[1]);

        const komiMatch = sgfString.match(/KM\[([\d\.]+)\]/);
        if (komiMatch) data.komi = parseFloat(komiMatch[1]);
        
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
        boardSizeSelect.value = sgfData.size.toString(); // Update dropdown
        initGame(); // Resets board, player, history, captures, gameMoves

        // Override komi if needed (not directly used in current display but good to have)
        // console.log("Komi from SGF:", sgfData.komi);
        
        // Store all moves from SGF into gameMoves
        gameMoves = sgfData.moves.map(m => ({ ...m })); // Make a copy
        
        // Navigate to the last move of the SGF to display the final board state
        if (gameMoves.length > 0) {
            navigateToMove(gameMoves.length - 1);
            statusMessageP.textContent = `SGF loaded. Displaying move ${gameMoves.length}. Player ${currentPlayer === 1 ? 'Black' : 'White'}'s turn.`;
        } else {
            // SGF had no moves, just board setup (e.g. only SZ property)
            initGame(); // Re-initialize with the SGF size
            boardSizeSelect.value = sgfData.size.toString(); // Ensure dropdown reflects SGF size
            resizeCanvas(); // Adjust canvas for the new size
            drawBoard();
            statusMessageP.textContent = `SGF loaded with size ${sgfData.size}. No moves found.`;
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
        currentPlayer = tempCurrentPlayer; // Player whose turn it is *after* the navigated move

        if (moveIndex === -1) { // Navigated to before the first move
            currentPlayer = 1; // Black's turn
            statusMessageP.textContent = 'At the start of the game.';
        } else {
            statusMessageP.textContent = `Displaying move ${currentMoveIndex + 1} of ${gameMoves.length}. Player ${currentPlayer === 1 ? 'Black' : 'White'}'s turn.`;
        }
        
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
            statusMessageP.textContent = 'SGF file saved.';
        } else {
            statusMessageP.textContent = 'No moves to save yet.';
        }
    });

    function generateSgfContent() {
        if (gameMoves.length === 0 && boardSize === 0) { // boardSize check in case initGame wasn't fully run
            return null;
        }

        let sgf = `(;GM[1]FF[4]CA[UTF-8]AP[ClineGo:1.0]KM[6.5]SZ[${boardSize}]PB[Black]PW[White]DT[${new Date().toISOString().slice(0,10)}]`;

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
        if (board[row][col] !== 0) {
            statusMessageP.textContent = 'Invalid move: Position already occupied.';
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
        currentPlayer = opponent; // opponent is now the next player
        updateGameInfo();
        drawBoard();
        statusMessageP.textContent = `Player ${currentPlayer === 1 ? 'Black' : 'White'}'s turn.`;
        if (capturedStones.length > 0) {
            statusMessageP.textContent += ` Captured ${capturedStones.length} stone(s).`;
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
            } else if (currentMoveIndex === gameMoves.length -1) {
                // If at the last move, pressing right again could mean "go to live play"
                // For now, it does nothing, or we could clear selection.
                // To re-enable live play after navigation:
                // currentPlayer = (gameMoves[currentMoveIndex].player === 1) ? 2 : 1; // Next player after last move
                // updateGameInfo();
                // statusMessageP.textContent = `At end of game. Player ${currentPlayer === 1 ? 'Black' : 'White'}'s turn to play.`;
            }
        }
        // Add other shortcuts here, e.g., for placing stones in an edit mode
    });

    initGame();
});
