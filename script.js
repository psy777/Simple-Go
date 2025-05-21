// Note: CLERK_PUBLISHABLE_KEY is now set directly in the script tag in index.html
// via data-clerk-publishable-key attribute.
// The Clerk SDK will pick it up automatically.

window.addEventListener('load', async function () {
    const Clerk = window.Clerk; // Clerk SDK should be loaded on the window object
    if (!Clerk || !Clerk.load) { // Check if Clerk and its load method are available
        console.error('Clerk SDK not loaded or not ready.');
        // Attempt to initialize Clerk if the instance is available but not its methods
        if (typeof Clerk === 'function' && !Clerk.isReady()) {
            try {
                const clerkInstance = new Clerk(document.querySelector('script[data-clerk-publishable-key]').dataset.clerkPublishableKey);
                await clerkInstance.load();
                mountClerkComponents(clerkInstance);
            } catch (e) {
                console.error('Failed to manually initialize Clerk:', e);
            }
        }
        return;
    }
    
    // The Clerk instance is often available directly on window.Clerk after the script loads
    // and its load method might have already been called or is implicitly handled by the SDK.
    // If Clerk.load() is a function, it's usually for explicit re-initialization or options.
    // For the vanilla JS setup via script tag, Clerk often auto-initializes.
    // We need to ensure we have the Clerk instance.
    
    let clerkInstance = Clerk; // Assuming Clerk on window is the instance or has instance methods

    // If Clerk on window is a class constructor (like `class Clerk {...}`), instantiate it.
    // The script tag method usually makes `window.Clerk` the ready-to-use instance.
    // We'll check if `clerkInstance.load` exists and is a function. If not, it might be the class.
    if (typeof clerkInstance.load !== 'function' && typeof Clerk === 'function') {
        try {
            const publishableKey = document.querySelector('script[data-clerk-publishable-key]').dataset.clerkPublishableKey;
            if (!publishableKey) {
                console.error("Clerk Publishable Key not found in script tag.");
                return;
            }
            clerkInstance = new Clerk(publishableKey);
        } catch (e) {
            console.error("Error instantiating Clerk:", e);
            return;
        }
    }

    try {
        if (typeof clerkInstance.load === 'function' && (!clerkInstance.isReady || !clerkInstance.isReady())) {
             await clerkInstance.load();
        } else if (!clerkInstance.isReady || !clerkInstance.isReady()){
            // If .load isn't there but isReady suggests it's not loaded, this is an issue.
            console.warn("Clerk instance found but might not be fully loaded, and no .load() method available to call.");
        }
        // At this point, Clerk should be loaded if the script tag worked.
        // The Clerk object on window should be the initialized instance.
        mountClerkComponents(clerkInstance); // Pass the instance
    } catch (error) {
        console.error("Error loading Clerk:", error);
    }
});

function mountClerkComponents(clerk) { // Accept clerk instance as argument
    if (!clerk) {
        console.error("Clerk instance not available for mounting components.");
        return;
    }
    const appDiv = document.getElementById('app');
    if (!appDiv) {
        console.error('#app div not found for Clerk components.');
        return;
    }

    appDiv.innerHTML = ''; // Clear previous content

    if (clerk.user) {
        const userButtonDiv = document.createElement('div');
        appDiv.appendChild(userButtonDiv);
        clerk.mountUserButton(userButtonDiv);
    } else {
        const signInDiv = document.createElement('div');
        appDiv.appendChild(signInDiv);
        clerk.mountSignIn(signInDiv, {
            // You can pass options to customize the sign-in component
            // e.g., appearance: { elements: { card: 'custom-card-class' } }
            // redirectUrl: './', // Where to redirect after sign-in/sign-up
        });
    }

    // Add a listener for session events to re-render components if auth state changes
    // This is important if the user signs in/out in another tab, or session expires.
    clerk.addListener(({ user }) => {
        console.log("Clerk listener triggered. User:", user);
        appDiv.innerHTML = ''; // Clear previous content
        if (user) {
            const userButtonDiv = document.createElement('div');
            appDiv.appendChild(userButtonDiv);
            clerk.mountUserButton(userButtonDiv);
        } else {
            const signInDiv = document.createElement('div');
            appDiv.appendChild(signInDiv);
            clerk.mountSignIn(signInDiv);
        }
    });
}


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
    const statusMessageP = document.getElementById('status-message');
    const moveNavigationInfoDiv = document.getElementById('move-navigation-info');
    const gameInfoSaveSgfBtn = document.querySelector('#game-info-footer #save-sgf-btn');

    // On-board Popup
    const boardPopupMessageDiv = document.getElementById('board-popup-message');

    // Mobile Navigation
    const mobileNavControls = document.getElementById('mobile-nav-controls');
    const mobileNavFirstBtn = document.getElementById('mobile-nav-first');
    const mobileNavPrevBtn = document.getElementById('mobile-nav-prev');
    const mobileNavMoveNextBtn = document.getElementById('mobile-nav-next'); // This is the "Next" button
    const mobileNavLastBtn = document.getElementById('mobile-nav-last');
    const mobileNavMoveNumSpan = document.getElementById('mobile-nav-movenum');


    // New Game Modal Elements
    const newGameModal = document.getElementById('new-game-modal');
    // const closeModalBtn = document.querySelector('.close-modal-btn'); // Will be handled by a general selector
    const startGameBtn = document.getElementById('start-game-btn');
    const modalGameTitleInput = document.getElementById('modal-game-title');
    const modalBoardSizeSelect = document.getElementById('modal-board-size-select');
    const modalBlackNameInput = document.getElementById('modal-black-name');
    const modalBlackRankInput = document.getElementById('modal-black-rank');
    const modalWhiteNameInput = document.getElementById('modal-white-name');
    const modalWhiteRankInput = document.getElementById('modal-white-rank');
    const modalKomiInput = document.getElementById('modal-komi');

    // Auth Modal Elements - To be removed or repurposed for Clerk
    // const loginModalBtn = document.getElementById('login-modal-btn');
    // const registerModalBtn = document.getElementById('register-modal-btn');
    // const loginModal = document.getElementById('login-modal');
    // const registerModal = document.getElementById('register-modal');
    // const loginForm = document.getElementById('login-form');
    // const registerForm = document.getElementById('register-form');
    // const logoutBtn = document.getElementById('logout-btn');
    // const authLinksDiv = document.getElementById('auth-links');
    // const userGreetingDiv = document.getElementById('user-greeting');
    // const usernameDisplaySpan = document.getElementById('username-display');
    // const loginErrorMessageP = document.getElementById('login-error-message');
    // const registerErrorMessageP = document.getElementById('register-error-message');

    // General Modal Close Buttons (using data attribute) - Keep for New Game Modal
    const allCloseModalBtns = document.querySelectorAll('.close-modal-btn');


    // API Base URL (for backend) - This will still be used for SGFs, Problems etc.
    const API_BASE_URL = 'https://wrengobackend-env-1.eba-dge4uxje.us-east-2.elasticbeanstalk.com/api'; // Adjust if your backend runs elsewhere

    // Game State Variables
    let gameTitle = "wrengo"; // Keep lowercase as per user's HTML
    let boardSize = parseInt(modalBoardSizeSelect.value);
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
        BLACK: '#111', WHITE: '#f0f0f0',
        PREVIEW_BLACK: 'rgba(17, 17, 17, 0.5)', PREVIEW_WHITE: 'rgba(240, 240, 240, 0.5)'
    };
    let BOARD_LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-line-color').trim() || '#503720';
    let BOARD_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-bg-color').trim() || '#e4b268';

    function updateAssetSources() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Update header logos
        document.getElementById('mobile-logo-light').style.display = isDarkMode ? 'none' : 'inline-block';
        document.getElementById('mobile-logo-dark').style.display = isDarkMode ? 'inline-block' : 'none';

        // Update button icons
        newGameModalBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode new game symbol.svg' : 'assets/light mode new game symbol.svg';
        loadSgfBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode upload button.svg' : 'assets/light mode upload button.svg';
        themeToggleBtn.querySelector('img').src = isDarkMode ? 'assets/light mode toggle.svg' : 'assets/dark mode toggle.svg'; // Icon shows opposite action
        gameInfoSaveSgfBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode save button.svg' : 'assets/light mode save button.svg';
    }


    function showBoardPopup(message) {
        boardPopupMessageDiv.textContent = message;
        boardPopupMessageDiv.style.display = 'block';
        setTimeout(() => { boardPopupMessageDiv.style.display = 'none'; }, 1500);
    }
    
    function clearBoardPopupMessage() {
        boardPopupMessageDiv.style.display = 'none';
        boardPopupMessageDiv.textContent = '';
    }

    function updateThemeColorsFromCSS() {
        BOARD_LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-line-color').trim();
        BOARD_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-bg-color').trim();
    }

    function updateMoveNavigationText() {
        if (currentMoveIndex === -1 && gameMoves.length === 0) { // New game, no moves yet
            moveNavigationInfoDiv.textContent = `Move 0. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
            mobileNavMoveNumSpan.textContent = '0';
        } else if (currentMoveIndex === -1 && gameMoves.length > 0) { // Navigated to before first move of a loaded game
             moveNavigationInfoDiv.textContent = `Start. ${playerNames.black}'s turn.`; // Player 1 always starts
             mobileNavMoveNumSpan.textContent = '0';
        } else if (currentMoveIndex === gameMoves.length - 1) { // At the last move
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1}. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
            mobileNavMoveNumSpan.textContent = (currentMoveIndex + 1).toString();
        } else { // Navigating somewhere in the middle
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1} of ${gameMoves.length}.`;
            mobileNavMoveNumSpan.textContent = (currentMoveIndex + 1).toString();
        }
    }


    function initGame(isModalStart = false) {
        if (isModalStart) {
            gameTitle = modalGameTitleInput.value.trim() || "wrengo";
            document.title = gameTitle + " SGF";
            boardSize = parseInt(modalBoardSizeSelect.value);
            playerNames.black = modalBlackNameInput.value.trim() || "Black";
            playerRanks.black = modalBlackRankInput.value.trim() || "??";
            playerNames.white = modalWhiteNameInput.value.trim() || "White";
            playerRanks.white = modalWhiteRankInput.value.trim() || "??";
            komi = parseFloat(modalKomiInput.value) || 6.5;
        } else {
            document.title = gameTitle + " SGF";
        }
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        currentPlayer = 1; blackCaptures = 0; whiteCaptures = 0;
        boardHistory = []; gameMoves = []; currentMoveIndex = -1;
        clearBoardPopupMessage(); statusMessageP.textContent = '';
        updateMoveNavigationText();
        updateGameInfo(); resizeCanvas();
    }

    function resizeCanvas() {
        const boardContainer = document.getElementById('board-container');
        let containerWidth = boardContainer.offsetWidth;
        if (containerWidth === 0) {
            const boardArea = document.getElementById('board-area');
            containerWidth = (boardArea && boardArea.offsetWidth > 0) ? boardArea.offsetWidth : window.innerWidth * 0.8; // Use more width
        }
        const maxCanvasSize = Math.min(containerWidth, window.innerHeight * 0.75); // Adjusted height usage
        squareSize = Math.floor(maxCanvasSize / (boardSize + 1));
        const canvasSize = squareSize * (boardSize + 1);
        canvas.width = canvasSize; canvas.height = canvasSize;
        drawBoard();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = BOARD_BG_COLOR; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const padding = squareSize / 2; ctx.strokeStyle = BOARD_LINE_COLOR; ctx.lineWidth = 1;
        for (let i = 0; i < boardSize; i++) {
            ctx.beginPath(); ctx.moveTo(padding + i * squareSize + squareSize / 2, padding + squareSize / 2);
            ctx.lineTo(padding + i * squareSize + squareSize / 2, padding + (boardSize - 1) * squareSize + squareSize / 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(padding + squareSize / 2, padding + i * squareSize + squareSize / 2);
            ctx.lineTo(padding + (boardSize - 1) * squareSize + squareSize / 2, padding + i * squareSize + squareSize / 2); ctx.stroke();
        }
        const starPointSize = Math.max(2, squareSize * 0.1); const starPoints = getStarPoints(boardSize);
        ctx.fillStyle = BOARD_LINE_COLOR;
        starPoints.forEach(point => {
            ctx.beginPath(); ctx.arc(padding + point.x * squareSize + squareSize / 2, padding + point.y * squareSize + squareSize / 2, starPointSize, 0, 2 * Math.PI); ctx.fill();
        });
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) { if (board[r][c] !== 0) drawStone(r, c, board[r][c]); }
        }
    }

    function getStarPoints(size) { /* ... (no change) ... */ 
        if (size === 9) return [{x:2,y:2},{x:6,y:2},{x:2,y:6},{x:6,y:6},{x:4,y:4}];
        if (size === 13) return [{x:3,y:3},{x:9,y:3},{x:3,y:9},{x:9,y:9},{x:6,y:6}];
        if (size === 19) return [{x:3,y:3},{x:9,y:3},{x:15,y:3},{x:3,y:9},{x:9,y:9},{x:15,y:9},{x:3,y:15},{x:9,y:15},{x:15,y:15}];
        return [];
    }
    function drawStone(row, col, player, isPreview = false) { /* ... (no change) ... */ 
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
    function updateGameInfo() { /* ... (no change to highlighting logic) ... */ 
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

    // --- Modal Handling ---
    function openModal(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
    }

    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
    }

    newGameModalBtn.addEventListener('click', () => openModal(newGameModal));
    // Removed event listeners for old login/register modal buttons

    allCloseModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId;
            if (modalId) {
                const modalToClose = document.getElementById(modalId);
                if (modalToClose) closeModal(modalToClose); // Check if modalToClose exists
            }
        });
    });
    
    if (startGameBtn) startGameBtn.addEventListener('click', () => { initGame(true); closeModal(newGameModal); });


    // Close modal if clicked outside of modal-content
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // --- Authentication Logic (To be replaced by Clerk) ---
    // function handleRegister(event) { ... } // Removed
    // async function handleLogin(event) { ... } // Removed
    // function handleLogout() { ... } // Removed
    // function updateAuthUI(isLoggedIn, userData = null) { ... } // Removed
    // async function checkInitialAuthState() { ... } // Removed

    // Removed event listeners for old login/register forms and logout button


    loadSgfBtn.addEventListener('click', () => sgfFileInput.click());
    sgfFileInput.addEventListener('change', (event) => { /* ... (no change) ... */ 
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

    function parseSgfContent(sgfString) { /* ... (no change to SGF parsing itself) ... */ 
        const data = {
            size: 19, komi: 6.5, moves: [], rules: "Japanese",
            gameName: "wrengo", blackName: "Black", whiteName: "White", blackRank: "??", whiteRank: "??"
        };
        const gameNameMatch = sgfString.match(/GN\[([^\]]*)\]/);
        if (gameNameMatch) data.gameName = gameNameMatch[1].trim() || "wrengo";
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

    function loadGameFromSgf(sgfData) { /* ... (no change to core SGF loading logic) ... */ 
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
        initGame(false); 
        gameMoves = sgfData.moves.map(m => ({ ...m })); 
        if (gameMoves.length > 0) navigateToMove(gameMoves.length - 1);
        else {
            updateMoveNavigationText(); // Ensure text is correct for no moves
            statusMessageP.textContent = ''; 
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
        updateMoveNavigationText(); // Use centralized function
        statusMessageP.textContent = '';
        updateGameInfo();
        drawBoard();
    }

    gameInfoSaveSgfBtn.addEventListener('click', () => { /* ... (no change) ... */ 
        const sgfContent = generateSgfContent();
        if (sgfContent) {
            const blob = new Blob([sgfContent], { type: 'application/x-go-sgf;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${gameTitle.replace(/[^a-z0-9 _-]/gi, '_') || 'GoGame'}.sgf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href); 
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'SGF file saved.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        } else {
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'No moves to save yet.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        }
    });
    function generateSgfContent() { /* ... (no change) ... */ 
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

    canvas.addEventListener('mousemove', (event) => { /* ... (no change) ... */ 
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
    canvas.addEventListener('click', (event) => { /* ... (no change) ... */ 
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
            // Silently ignore or provide brief non-error feedback via moveNavigationInfoDiv if desired
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
            if (capturedStones.length > 0) {
                 if (currentPlayer === 1) whiteCaptures -= capturedStones.length; else blackCaptures -= capturedStones.length;
            }
            return;
        }

        const boardStateString = tempBoard.map(r => r.join('')).join('|');
        if (boardHistory.includes(boardStateString)) {
            showBoardPopup('Ko!');
            if (capturedStones.length > 0) {
                 if (currentPlayer === 1) whiteCaptures -= capturedStones.length; else blackCaptures -= capturedStones.length;
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
        updateMoveNavigationText(); // Use centralized function
        if (capturedStones.length > 0) { // Append capture info if any
             moveNavigationInfoDiv.textContent += ` Captured ${capturedStones.length}.`;
        }
    }

    function getNeighbors(r, c) { /* ... (no change) ... */ 
        const neighbors = [];
        if (r > 0) neighbors.push({ r: r - 1, c: c });
        if (r < boardSize - 1) neighbors.push({ r: r + 1, c: c });
        if (c > 0) neighbors.push({ r: r, c: c - 1 });
        if (c < boardSize - 1) neighbors.push({ r: r, c: c + 1 });
        return neighbors;
    }
    function getGroup(r, c, currentBoardState) { /* ... (no change) ... */ 
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

    // Mobile Navigation Event Listeners
    mobileNavFirstBtn.addEventListener('click', () => { if (gameMoves.length > 0) navigateToMove(0); });
    mobileNavPrevBtn.addEventListener('click', () => { if (currentMoveIndex > 0) navigateToMove(currentMoveIndex - 1); else if (currentMoveIndex === 0) navigateToMove(-1);});
    mobileNavMoveNextBtn.addEventListener('click', () => { if (currentMoveIndex < gameMoves.length - 1) navigateToMove(currentMoveIndex + 1); });
    mobileNavLastBtn.addEventListener('click', () => { if (gameMoves.length > 0) navigateToMove(gameMoves.length - 1); });


    window.addEventListener('resize', () => resizeCanvas());
    document.addEventListener('keydown', (event) => {
        if (gameMoves.length === 0 && currentMoveIndex === -1 && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; // Allow arrows even if no moves for initial nav to -1
        if (event.key === 'ArrowLeft') {
            if (currentMoveIndex > -1) navigateToMove(currentMoveIndex - 1);
            else if (currentMoveIndex === -1 && gameMoves.length > 0) navigateToMove(-1); // Stay at start
        } else if (event.key === 'ArrowRight') {
            if (currentMoveIndex < gameMoves.length - 1) navigateToMove(currentMoveIndex + 1);
            else if (currentMoveIndex === gameMoves.length - 1 && gameMoves.length > 0) {
                 updateMoveNavigationText(); // Refresh text to show "Player's turn"
            }
        }
    });

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateAssetSources(); // Update all asset sources including logos and icons
        updateThemeColorsFromCSS();
        drawBoard();
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') document.body.classList.add('dark-mode');
    
    updateAssetSources(); // Initial asset sources
    updateThemeColorsFromCSS();
    // checkInitialAuthState(); // Clerk will handle its own auth state
    initGame(false);
});
