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
    
    let clerkInstance = Clerk; 

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
            console.warn("Clerk instance found but might not be fully loaded, and no .load() method available to call.");
        }
        mountClerkComponents(clerkInstance); 
    } catch (error) {
        console.error("Error loading Clerk:", error);
    }
});

function mountClerkComponents(clerk) { 
    if (!clerk) {
        console.error("Clerk instance not available for mounting components.");
        return;
    }
    const appDiv = document.getElementById('app');
    if (!appDiv) {
        console.error('#app div not found for Clerk components.');
        return;
    }

    appDiv.innerHTML = ''; 

    if (clerk.user) {
        const userButtonDiv = document.createElement('div');
        appDiv.appendChild(userButtonDiv);
        clerk.mountUserButton(userButtonDiv, {
            appearance: {
                elements: {
                    userButtonAvatarBox: "clerk-avatar-box", 
                    userButtonPopoverCard: "clerk-popover-card"
                }
            }
        });
    } else {
        const loginButton = document.createElement('button');
        loginButton.classList.add('text-button'); 
        loginButton.textContent = 'Login'; 
        loginButton.addEventListener('click', () => {
            clerk.openSignIn({}); 
        });
        appDiv.appendChild(loginButton);
    }

    clerk.addListener(({ user }) => {
        console.log("Clerk listener triggered. User:", user);
        appDiv.innerHTML = ''; 
        if (user) {
            const userButtonDiv = document.createElement('div');
            appDiv.appendChild(userButtonDiv);
            clerk.mountUserButton(userButtonDiv, {
                 appearance: { elements: { userButtonAvatarBox: "clerk-avatar-box" } }
            });
        } else {
            const loginButton = document.createElement('button');
            loginButton.classList.add('text-button');
            loginButton.textContent = 'Login'; 
            loginButton.addEventListener('click', () => clerk.openSignIn({}));
            appDiv.appendChild(loginButton);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('go-board-canvas');
    const ctx = canvas.getContext('2d');

    const newGameModalBtn = document.getElementById('new-game-modal-btn');
    const loadSgfBtn = document.getElementById('load-sgf-btn');
    const sgfFileInput = document.getElementById('sgf-file-input');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    const blackPlayerNameDisplay = document.querySelector('#player-info-black .player-name');
    const blackCapturesSpan = document.getElementById('black-captures');
    const whitePlayerNameDisplay = document.querySelector('#player-info-white .player-name');
    const whiteCapturesSpan = document.getElementById('white-captures');
    const statusMessageP = document.getElementById('status-message');
    const moveNavigationInfoDiv = document.getElementById('move-navigation-info');
    const gameInfoSaveSgfBtn = document.querySelector('#game-info-footer #save-sgf-btn');

    const boardPopupMessageDiv = document.getElementById('board-popup-message');

    const mobileNavFirstBtn = document.getElementById('mobile-nav-first');
    const mobileNavPrevBtn = document.getElementById('mobile-nav-prev');
    const mobileNavMoveNextBtn = document.getElementById('mobile-nav-next'); 
    const mobileNavLastBtn = document.getElementById('mobile-nav-last');
    const mobileNavMoveNumSpan = document.getElementById('mobile-nav-movenum');
    const toggleNavBtn = document.getElementById('toggle-nav-btn'); // Assuming a button with this ID exists for toggling nav visibility

    const newGameModal = document.getElementById('new-game-modal');
    const startGameBtn = document.getElementById('start-game-btn');
    const modalGameTitleInput = document.getElementById('modal-game-title');
    const modalBoardSizeSelect = document.getElementById('modal-board-size-select');
    const modalBlackNameInput = document.getElementById('modal-black-name');
    const modalBlackRankInput = document.getElementById('modal-black-rank');
    const modalWhiteNameInput = document.getElementById('modal-white-name');
    const modalWhiteRankInput = document.getElementById('modal-white-rank');
    const modalKomiInput = document.getElementById('modal-komi');

    // Shortcuts Modal Elements
    const shortcutsInfoBtn = document.getElementById('shortcuts-info-btn'); 
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsInfoBtnImg = shortcutsInfoBtn ? shortcutsInfoBtn.querySelector('img') : null; // Get the img element

    const allCloseModalBtns = document.querySelectorAll('.close-modal-btn');

    const API_BASE_URL = 'https://wrengobackend-env-1.eba-dge4uxje.us-east-2.elasticbeanstalk.com/api'; 

    let gameTitle = "wrengo";
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

    let sgfGameRoot = null; 
    let currentNode = null; 
    let currentPathMoves = []; 
    let currentMoveIndex = -1; 

    const STONE_COLOR = {
        BLACK: '#111', WHITE: '#f0f0f0',
        PREVIEW_BLACK: 'rgba(17, 17, 17, 0.5)', PREVIEW_WHITE: 'rgba(240, 240, 240, 0.5)'
    };
    let BOARD_LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-line-color').trim() || '#503720';
    let BOARD_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--board-bg-color').trim() || '#e4b268';

    function sgfCharToNum(char) { return char.charCodeAt(0) - 'a'.charCodeAt(0); }
    function numToSgfChar(num) { return String.fromCharCode('a'.charCodeAt(0) + num); }

    function toSgfCoords(r, c) { 
        return numToSgfChar(c) + numToSgfChar(r);
    }

    function sgfCoordToRowCol(sgfCoord) { 
        if (!sgfCoord || sgfCoord.length !== 2) return { r: -1, c: -1 };
        const c = sgfCharToNum(sgfCoord[0]);
        const r = sgfCharToNum(sgfCoord[1]);
        if (r < 0 || c < 0 || r >= boardSize || c >= boardSize) return {r: -1, c: -1};
        return { r, c };
    }

    class SgfNode {
        constructor(properties = {}, parent = null) {
            this.properties = properties; 
            this.children = [];       
            this.parent = parent;
            this.selectedChildIndex = 0; 
        }

        addChildNode(childNode) {
            this.children.push(childNode);
            childNode.parent = this;
            return childNode;
        }
        
        createAndAddChild(properties = {}) {
            const newNode = new SgfNode(properties, this);
            this.children.push(newNode);
            return newNode;
        }

        getSelectedChild() {
            if (this.children.length === 0 || this.selectedChildIndex < 0 || this.selectedChildIndex >= this.children.length) {
                return null;
            }
            return this.children[this.selectedChildIndex];
        }

        selectVariation(childIndex) {
            if (childIndex >= 0 && childIndex < this.children.length) {
                this.selectedChildIndex = childIndex;
                return true;
            }
            return false;
        }

        getMoveData() { 
            let player, sgfCoordsProp;
            if (this.properties.B && this.properties.B[0]) {
                player = 1; sgfCoordsProp = this.properties.B[0];
            } else if (this.properties.W && this.properties.W[0]) {
                player = 2; sgfCoordsProp = this.properties.W[0];
            } else {
                return null;
            }
            const { r, c } = sgfCoordToRowCol(sgfCoordsProp);
            if (r === -1 || c === -1) return null; 
            return { player, r, c, sgfCoords: sgfCoordsProp };
        }

        findChildByMove(player, r, c) {
            const targetSgfCoords = toSgfCoords(r, c);
            for (let i = 0; i < this.children.length; i++) {
                const child = this.children[i];
                const moveData = child.getMoveData();
                if (moveData && moveData.player === player && moveData.sgfCoords === targetSgfCoords) {
                    return { node: child, index: i };
                }
            }
            return null;
        }

        getProp(propName) {
            return (this.properties[propName] && this.properties[propName][0]) ? this.properties[propName][0] : null;
        }
    }

    function updateAssetSources() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        document.getElementById('mobile-logo-light').style.display = isDarkMode ? 'none' : 'inline-block';
        document.getElementById('mobile-logo-dark').style.display = isDarkMode ? 'inline-block' : 'none';
        
        // Apply consistent icon switching logic
        newGameModalBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode new game symbol.svg' : 'assets/light mode new game symbol.svg';
        loadSgfBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode upload button.svg' : 'assets/light mode upload button.svg';
        gameInfoSaveSgfBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode save button.svg' : 'assets/light mode save button.svg';
        
        // Theme toggle button will show the icon of the CURRENT theme
        themeToggleBtn.querySelector('img').src = isDarkMode ? 'assets/dark mode theme toggle.svg' : 'assets/light mode theme toggle.svg'; 
        
        if (shortcutsInfoBtnImg) {
            shortcutsInfoBtnImg.src = isDarkMode ? 'assets/dark mode info button.svg' : 'assets/light mode info button.svg';
        }
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
        const totalMovesInCurrentPath = currentPathMoves.length;
        if (currentMoveIndex === -1 && totalMovesInCurrentPath === 0) { 
            moveNavigationInfoDiv.textContent = `Move 0. ${playerNames[currentPlayer === 1 ? 'black' : 'white']}'s turn.`;
            mobileNavMoveNumSpan.textContent = '0';
        } else if (currentMoveIndex === -1 && totalMovesInCurrentPath >= 0) { 
             moveNavigationInfoDiv.textContent = `Start. ${playerNames.black}'s turn.`;
             mobileNavMoveNumSpan.textContent = '0';
        } else if (currentMoveIndex === totalMovesInCurrentPath - 1) { 
            const hasActualVariations = currentNode && currentNode.children.length > 1;
            const nextPlayerTurn = playerNames[currentPlayer === 1 ? 'black' : 'white'];
            let text = `Move ${currentMoveIndex + 1}. ${nextPlayerTurn}'s turn.`;
            if (hasActualVariations) {
                text += " (Variations exist)";
            }
            moveNavigationInfoDiv.textContent = text;
            mobileNavMoveNumSpan.textContent = (currentMoveIndex + 1).toString();
        } else { 
            moveNavigationInfoDiv.textContent = `Move ${currentMoveIndex + 1} of ${totalMovesInCurrentPath}.`;
            mobileNavMoveNumSpan.textContent = (currentMoveIndex + 1).toString();
        }
    }

    function initGame(isModalStart = false, loadedSgfRootProps = null) {
        let newBoardSize = 19; // Default

        if (isModalStart) { // New game from modal
            gameTitle = modalGameTitleInput.value.trim() || "wrengo";
            newBoardSize = parseInt(modalBoardSizeSelect.value);
            playerNames.black = modalBlackNameInput.value.trim() || "Black";
            playerRanks.black = modalBlackRankInput.value.trim() || "??";
            playerNames.white = modalWhiteNameInput.value.trim() || "White";
            playerRanks.white = modalWhiteRankInput.value.trim() || "??";
            komi = parseFloat(modalKomiInput.value) || 6.5;
            
            const rootPropsForNewGame = {
                GM: ["1"], FF: ["4"], CA: ["UTF-8"], AP: ["Wrengo:1.1"],
                SZ: [newBoardSize.toString()], GN: [gameTitle],
                PB: [playerNames.black], PW: [playerNames.white],
                BR: [playerRanks.black], WR: [playerRanks.white],
                KM: [komi.toString()], DT: [new Date().toISOString().slice(0,10)], RU: ["Japanese"]
            };
            sgfGameRoot = new SgfNode(rootPropsForNewGame);
            currentNode = sgfGameRoot;

        } else if (loadedSgfRootProps) { // Loading from SGF, sgfGameRoot is already set by loadGameFromSgf
            gameTitle = loadedSgfRootProps.GN?.[0] || "wrengo";
            newBoardSize = parseInt(loadedSgfRootProps.SZ?.[0]) || 19; 
            playerNames.black = loadedSgfRootProps.PB?.[0] || "Black";
            playerRanks.black = loadedSgfRootProps.BR?.[0] || "??";
            playerNames.white = loadedSgfRootProps.PW?.[0] || "White";
            playerRanks.white = loadedSgfRootProps.WR?.[0] || "??";
            komi = parseFloat(loadedSgfRootProps.KM?.[0]) || 6.5;
            
            if (sgfGameRoot) { 
                currentNode = sgfGameRoot;
            } else { 
                console.error("initGame called for SGF load, but sgfGameRoot is not set! Recreating a basic one.");
                const fallbackRootProps = { 
                    GM: ["1"], FF: ["4"], CA: ["UTF-8"], AP: ["Wrengo:1.1"], RU: ["Japanese"],
                    SZ: [newBoardSize.toString()], GN: [gameTitle], PB: [playerNames.black], PW: [playerNames.white],
                    BR: [playerRanks.black], WR: [playerRanks.white], KM: [komi.toString()], DT: [new Date().toISOString().slice(0,10)]
                 };
                sgfGameRoot = new SgfNode(loadedSgfRootProps ? { ...fallbackRootProps, ...loadedSgfRootProps } : fallbackRootProps);
                currentNode = sgfGameRoot;
            }
        } else { // Default init
            gameTitle = "wrengo";
            newBoardSize = 19;
            playerNames = { black: "Black", white: "White" };
            playerRanks = { black: "??", white: "??" };
            komi = 6.5;
            const defaultRootProps = {
                GM: ["1"], FF: ["4"], CA: ["UTF-8"], AP: ["Wrengo:1.1"],
                SZ: [newBoardSize.toString()], GN: [gameTitle],
                PB: [playerNames.black], PW: [playerNames.white],
                BR: [playerRanks.black], WR: [playerRanks.white],
                KM: [komi.toString()], DT: [new Date().toISOString().slice(0,10)], RU: ["Japanese"]
            };
            sgfGameRoot = new SgfNode(defaultRootProps);
            currentNode = sgfGameRoot;
        }
        
        document.title = gameTitle + " SGF";
        boardSize = newBoardSize; 

        currentPathMoves = [];
        currentMoveIndex = -1;
        
        applyPathToBoard(); 

        clearBoardPopupMessage();
        statusMessageP.textContent = '';
        updateMoveNavigationText();
        updateGameInfo(); 
        resizeCanvas();   
    }


    function resizeCanvas() {
        const boardContainer = document.getElementById('board-container');
        let containerWidth = boardContainer.offsetWidth;
        if (containerWidth === 0) {
            const boardArea = document.getElementById('board-area');
            containerWidth = (boardArea && boardArea.offsetWidth > 0) ? boardArea.offsetWidth : window.innerWidth * 0.8; 
        }
        const maxCanvasSize = Math.min(containerWidth, window.innerHeight * 0.75); 
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

        // Draw variation markers
        // Show markers if current node has multiple valid, playable children for the current player.
        if (currentNode && sgfGameRoot) {
            const variations = currentNode.children;
            let playableVariationCount = 0;
            if (variations.length > 1) { // Only consider drawing if there are multiple children structurally
                for (let i = 0; i < variations.length; i++) {
                    const childNode = variations[i];
                    const moveData = childNode.getMoveData();
                    if (moveData && moveData.player === currentPlayer && board[moveData.r][moveData.c] === 0) {
                        playableVariationCount++;
                    }
                }
            }

            if (playableVariationCount > 1) { // Only draw markers if there are actually multiple distinct playable moves
                let markerCharIndex = 0;
                for (let i = 0; i < variations.length; i++) {
                    const childNode = variations[i];
                    const moveData = childNode.getMoveData();
                    if (moveData && moveData.player === currentPlayer && board[moveData.r][moveData.c] === 0) { 
                        const letter = String.fromCharCode('A'.charCodeAt(0) + markerCharIndex++);
                        drawVariationMarkerStone(moveData.r, moveData.c, moveData.player, letter);
                    }
                }
            }
        }
    }

    function drawVariationMarkerStone(row, col, player, text) {
        const padding = squareSize / 2;
        const stoneRadius = squareSize * 0.45; 
        const x = padding + col * squareSize + squareSize / 2;
        const y = padding + row * squareSize + squareSize / 2;

        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, 2 * Math.PI);
        // Use preview colors for the stone to make it appear semi-transparent
        ctx.fillStyle = player === 1 ? STONE_COLOR.PREVIEW_BLACK : STONE_COLOR.PREVIEW_WHITE;
        ctx.fill();
        ctx.strokeStyle = player === 1 ? '#000' : '#ccc'; // Keep outline for white stones
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = player === 1 ? STONE_COLOR.WHITE : STONE_COLOR.BLACK; 
        const fontSize = Math.max(10, Math.floor(squareSize * 0.55)); 
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
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

    function openModal(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
    }

    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
    }

    newGameModalBtn.addEventListener('click', () => openModal(newGameModal));

    allCloseModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId;
            if (modalId) {
                const modalToClose = document.getElementById(modalId);
                if (modalToClose) closeModal(modalToClose); 
            }
        });
    });
    
    if (startGameBtn) startGameBtn.addEventListener('click', () => { initGame(true); closeModal(newGameModal); });
    
    // Event listener for the new shortcuts info button
    if (shortcutsInfoBtn && shortcutsModal) {
        shortcutsInfoBtn.addEventListener('click', () => openModal(shortcutsModal));
    }

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    loadSgfBtn.addEventListener('click', () => sgfFileInput.click());
    sgfFileInput.addEventListener('change', (event) => { 
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const sgfRoot = parseSgfContent(e.target.result);
                    if (sgfRoot) loadGameFromSgf(sgfRoot);
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
        let currentIndex = 0;
        let rootNode = null;
        let currentStack = []; 

        function skipWhitespaceAndComments() {
            while (currentIndex < sgfString.length && /\s/.test(sgfString[currentIndex])) {
                currentIndex++;
            }
        }

        function parseProperties() {
            const props = {};
            skipWhitespaceAndComments();
            while (currentIndex < sgfString.length && sgfString[currentIndex] !== ';' && sgfString[currentIndex] !== '(' && sgfString[currentIndex] !== ')') {
                let propName = "";
                while (currentIndex < sgfString.length && /[A-Z]/.test(sgfString[currentIndex])) {
                    propName += sgfString[currentIndex++];
                }
                if (!propName) {
                    if (currentIndex < sgfString.length && sgfString[currentIndex] !== ';' && sgfString[currentIndex] !== '(' && sgfString[currentIndex] !== ')') {
                        console.warn("SGF Parse: Expected property name at index", currentIndex, `Found: '${sgfString[currentIndex]}'`);
                        currentIndex++; 
                        continue;
                    }
                    break; 
                }
                props[propName] = [];
                skipWhitespaceAndComments();
                while (sgfString[currentIndex] === '[') {
                    currentIndex++; 
                    let value = "";
                    let escape = false;
                    while (currentIndex < sgfString.length) {
                        const char = sgfString[currentIndex++];
                        if (escape) {
                            value += char;
                            escape = false;
                        } else if (char === '\\') {
                            escape = true;
                        } else if (char === ']') {
                            break;
                        } else {
                            value += char;
                        }
                    }
                    props[propName].push(value);
                    skipWhitespaceAndComments();
                }
            }
            return props;
        }
        
        function parseSequence() {
            let seqParent = currentStack.length > 0 ? currentStack[currentStack.length - 1] : null;
            let lastNodeInSequence = seqParent;

            while (currentIndex < sgfString.length && sgfString[currentIndex] !== ')') {
                skipWhitespaceAndComments();
                if (sgfString[currentIndex] === ';') {
                    currentIndex++; 
                    const properties = parseProperties();
                    if (properties.SZ && properties.SZ[0]) {
                        const sz = parseInt(properties.SZ[0]);
                        if (!isNaN(sz) && sz > 0) boardSize = sz; 
                    }

                    const newNode = new SgfNode(properties);
                    if (!rootNode) { 
                        rootNode = newNode;
                        lastNodeInSequence = rootNode;
                    } else if (lastNodeInSequence) {
                        lastNodeInSequence.addChildNode(newNode);
                        lastNodeInSequence = newNode;
                    } else {
                        console.error("SGF Parse: No parent for new node.");
                        return; 
                    }
                } else if (sgfString[currentIndex] === '(') {
                    currentIndex++; 
                    if (!lastNodeInSequence && rootNode) lastNodeInSequence = rootNode; 
                    else if (!lastNodeInSequence && !rootNode) { 
                         console.warn("SGF Parse: Variation starts before any root node properties at index", currentIndex);
                         rootNode = new SgfNode({SZ: [boardSize.toString()]}); 
                         lastNodeInSequence = rootNode;
                    }
                    currentStack.push(lastNodeInSequence); // lastNodeInSequence here is the parent of the upcoming variation(s)
                    let parentOfThisVariationGroup = lastNodeInSequence;
                    parseSequence(); 
                    currentStack.pop(); 
                    lastNodeInSequence = parentOfThisVariationGroup; // Restore lastNodeInSequence to the node that preceded this variation block
                    skipWhitespaceAndComments();
                    if (sgfString[currentIndex] === ')') {
                        currentIndex++; 
                    } else {
                        console.warn("SGF Parse: Missing ')' after variation at index", currentIndex);
                    }
                } else if (sgfString[currentIndex] === ')') {
                    break; 
                } else if (currentIndex < sgfString.length) {
                     console.warn("SGF Parse: Unexpected token in sequence at index", currentIndex, `Token: '${sgfString[currentIndex]}'`);
                     currentIndex++; 
                } else {
                    break; 
                }
            }
        }

        skipWhitespaceAndComments();
        if (sgfString[currentIndex] === '(') {
            currentIndex++; 
            parseSequence(); 
            skipWhitespaceAndComments();
            if (sgfString[currentIndex] === ')') {
                currentIndex++; 
            } else {
                 console.warn("SGF Parse: SGF content did not end with ')' at index", currentIndex);
            }
        } else {
            console.error("SGF Parse: SGF must start with '('.");
            return new SgfNode({SZ: [boardSize.toString()]}); 
        }
        
        if (rootNode && !rootNode.getProp("SZ")) {
            if (!rootNode.properties.SZ) rootNode.properties.SZ = [boardSize.toString()];
        }
        return rootNode || new SgfNode({SZ: [boardSize.toString()]}); 
    }


    function loadGameFromSgf(parsedNode) {
        sgfGameRoot = parsedNode; 
        if (!sgfGameRoot) {
            statusMessageP.textContent = "Error: Parsed SGF data is invalid.";
            initGame(false); 
            return;
        }

        const rootActualProps = sgfGameRoot.properties;
        if (rootActualProps.SZ && rootActualProps.SZ[0]) {
            const sz = parseInt(rootActualProps.SZ[0]);
            if (!isNaN(sz) && sz > 0) boardSize = sz;
        }
        
        initGame(false, rootActualProps); 

        let path = [];
        let nodeForPath = sgfGameRoot; 
        while(nodeForPath) {
            const moveData = nodeForPath.getMoveData();
            if (moveData && (nodeForPath !== sgfGameRoot || (nodeForPath === sgfGameRoot && (moveData.player === 1 || moveData.player === 2)))) {
                 path.push({ ...moveData, sgfNodeRef: nodeForPath });
            }

            if (nodeForPath.children.length > 0) {
                nodeForPath = nodeForPath.getSelectedChild(); 
            } else {
                nodeForPath = null; 
            }
        }
        
        currentPathMoves = path;
        currentMoveIndex = path.length > 0 ? path.length - 1 : -1;

        if (currentMoveIndex !== -1) {
            currentNode = currentPathMoves[currentMoveIndex].sgfNodeRef;
        } else { 
            currentNode = sgfGameRoot; 
        }
        
        applyPathToBoard(); 
        updateMoveNavigationText();
        statusMessageP.textContent = ''; 
        updateGameInfo();
        if (rootActualProps.SZ && rootActualProps.SZ[0]) resizeCanvas(); 
        drawBoard();
    }

    function applyPathToBoard() {
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        blackCaptures = 0; whiteCaptures = 0;
        boardHistory = []; 
        let pathCurrentPlayer = 1; 

        if (sgfGameRoot) {
            const setupProperties = ['AB', 'AW', 'AE'];
            setupProperties.forEach(prop => {
                if (sgfGameRoot.properties[prop]) {
                    sgfGameRoot.properties[prop].forEach(sgfCoord => {
                        const {r, c} = sgfCoordToRowCol(sgfCoord);
                        if (r !== -1 && c !== -1) {
                            if (prop === 'AB') board[r][c] = 1;
                            else if (prop === 'AW') board[r][c] = 2;
                            else if (prop === 'AE') board[r][c] = 0; 
                        }
                    });
                }
            });
            if (sgfGameRoot.properties.PL && sgfGameRoot.properties.PL[0]) {
                pathCurrentPlayer = (sgfGameRoot.properties.PL[0].toUpperCase() === 'W') ? 2 : 1;
            }
        }
        boardHistory.push(board.map(r => r.join('')).join('|')); 

        for (let i = 0; i <= currentMoveIndex && i < currentPathMoves.length; i++) {
            const move = currentPathMoves[i];
            if (!move || typeof move.r === 'undefined' || typeof move.c === 'undefined') {
                console.error(`Invalid move data at index ${i} in currentPathMoves.`);
                statusMessageP.textContent = `Error: Corrupted move data at move ${i + 1}.`;
                return;
            }
            
            if (i === 0 && !(sgfGameRoot.properties.PL && sgfGameRoot.properties.PL[0])) { 
                pathCurrentPlayer = move.player; 
            } else if (i > 0 && currentPathMoves[i-1].player === move.player) {
                 console.warn(`SGF Replay: Consecutive moves by same player at move ${i + 1}. Player ${move.player}`);
            } else if (i > 0 && currentPathMoves[i-1].player !== move.player) { 
                pathCurrentPlayer = move.player; 
            } else if (i === 0 && sgfGameRoot.properties.PL && sgfGameRoot.properties.PL[0]) {
                if (move.player !== pathCurrentPlayer) {
                     console.warn(`SGF Replay: Player mismatch for first move ${i+1} despite PL. Expected ${pathCurrentPlayer}, got ${move.player}. Forcing.`);
                }
            }


            const tempBoardState = board.map(arr => arr.slice());

            if (tempBoardState[move.r][move.c] !== 0 && !(sgfGameRoot.properties.AB?.includes(toSgfCoords(move.r, move.c)) || sgfGameRoot.properties.AW?.includes(toSgfCoords(move.r, move.c)) ) ) {
                console.warn(`SGF Replay: Attempt to play on occupied stone at (${move.r},${move.c}) at move ${i+1}. Skipping placement.`);
            } else {
                 tempBoardState[move.r][move.c] = move.player;
            }

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
            if (groupAfterPlacement.liberties === 0 && capturedInStep.length === 0 && tempBoardState[move.r][move.c] !== 0) {
                console.warn(`SGF Replay: Suicide at move ${i+1} (${move.r},${move.c}).`);
            }

            board = tempBoardState; 
            boardHistory.push(board.map(r => r.join('')).join('|'));
            pathCurrentPlayer = opponentInStep; 
        }

        currentPlayer = pathCurrentPlayer; 
        updateGameInfo();
        drawBoard();
    }


    function navigateToMove(targetMoveIndex) { 
        if (!sgfGameRoot) return;

        if (targetMoveIndex < -1 || targetMoveIndex >= currentPathMoves.length) {
            if (targetMoveIndex === -1 && currentPathMoves.length === 0) { 
                 // Allow this
            } else if (targetMoveIndex === currentPathMoves.length && currentPathMoves.length > 0) { 
                 targetMoveIndex = currentPathMoves.length - 1; 
            } else if (targetMoveIndex >= currentPathMoves.length && currentPathMoves.length > 0) {
                 console.warn("NavigateToMove: targetMoveIndex out of current path bounds.", targetMoveIndex, "Path length:", currentPathMoves.length);
                 targetMoveIndex = currentPathMoves.length -1; 
            } else if (targetMoveIndex >= 0 && currentPathMoves.length === 0) { 
                console.warn("NavigateToMove: No moves in current path to navigate to index", targetMoveIndex);
                targetMoveIndex = -1; 
            }
        }
        
        currentMoveIndex = targetMoveIndex;

        if (currentMoveIndex === -1) {
            currentNode = sgfGameRoot;
        } else {
            currentNode = currentPathMoves[currentMoveIndex].sgfNodeRef;
        }
        
        applyPathToBoard(); 
        updateMoveNavigationText();
        statusMessageP.textContent = '';
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
            URL.revokeObjectURL(a.href);
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'SGF file saved.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        } else {
            const originalNavText = moveNavigationInfoDiv.textContent;
            moveNavigationInfoDiv.textContent = 'No game data to save.';
            setTimeout(() => moveNavigationInfoDiv.textContent = originalNavText, 2000);
        }
    });

    function generateSgfContent() {
        if (!sgfGameRoot) return null;
        let sgfString = ""; 
        function buildSgfRecursive(node, isFirstNodeInSequence = true) {
            if (!node) return;

            let propertiesString = "";
            if (node === sgfGameRoot && !node.properties.SZ) {
                node.properties.SZ = [boardSize.toString()];
            }
            if (node === sgfGameRoot) {
                const defaultRootProps = { GM: ["1"], FF: ["4"], CA: ["UTF-8"], AP: ["Wrengo:1.1"], RU: ["Japanese"]};
                for (const prop in defaultRootProps) {
                    if (!node.properties[prop]) node.properties[prop] = defaultRootProps[prop];
                }
                if (!node.properties.KM) node.properties.KM = [komi.toString()];
                if (!node.properties.GN) node.properties.GN = [gameTitle];
                if (!node.properties.PB) node.properties.PB = [playerNames.black];
                if (!node.properties.PW) node.properties.PW = [playerNames.white];
                if (!node.properties.BR) node.properties.BR = [playerRanks.black];
                if (!node.properties.WR) node.properties.WR = [playerRanks.white];
                if (!node.properties.DT) node.properties.DT = [new Date().toISOString().slice(0,10)];
            }


            for (const key in node.properties) {
                if (node.properties.hasOwnProperty(key)) {
                    if (node.properties[key].length === 0 && key !== 'B' && key !== 'W') continue;

                    node.properties[key].forEach(val => {
                        const escapedVal = val.toString().replace(/\\/g, '\\\\').replace(/]/g, '\\]');
                        propertiesString += `${key}[${escapedVal}]`;
                    });
                }
            }

            if (isFirstNodeInSequence || propertiesString || (node !== sgfGameRoot && (node.properties.B || node.properties.W))) { 
                sgfString += ";" + propertiesString;
            }


            if (node.children.length > 0) {
                if (node.children.length === 1) {
                    buildSgfRecursive(node.children[node.selectedChildIndex], false);
                } else {
                    buildSgfRecursive(node.children[node.selectedChildIndex], false);
                    for (let i = 0; i < node.children.length; i++) {
                        if (i === node.selectedChildIndex) continue;
                        sgfString += "(";
                        buildSgfRecursive(node.children[i], true); 
                        sgfString += ")";
                    }
                }
            }
        }

        sgfString = "(";
        buildSgfRecursive(sgfGameRoot, true); 
        sgfString += ")";

        return sgfString;
    }


    canvas.addEventListener('mousemove', (event) => { 
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left; const y = event.clientY - rect.top;
        const padding = squareSize / 2;
        const col = Math.floor((x - padding) / squareSize); const row = Math.floor((y - padding) / squareSize);
        
        drawBoard(); // Redraw board first to clear old previews/markers

        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === 0 && sgfGameRoot) { 
            let isOverVariationMarker = false;
            // Check if the hover is over an existing variation marker for the current player
            if (currentNode && currentMoveIndex === currentPathMoves.length - 1) {
                const variations = currentNode.children;
                if (variations.length > 1) { // Only check if multiple variations exist
                    for (let i = 0; i < variations.length; i++) {
                        const childNode = variations[i];
                        const moveData = childNode.getMoveData();
                        if (moveData && moveData.player === currentPlayer && moveData.r === row && moveData.c === col) {
                            isOverVariationMarker = true;
                            break;
                        }
                    }
                }
            }

            if (!isOverVariationMarker) { // Only draw preview if not hovering over an active variation marker
                drawStone(row, col, currentPlayer, true);
            }
        }
    });
    canvas.addEventListener('mouseout', () => { if (sgfGameRoot) drawBoard(); }); 
    canvas.addEventListener('click', (event) => {
        if (!sgfGameRoot) return; 

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left; const y = event.clientY - rect.top;
        const padding = squareSize / 2;
        const col = Math.floor((x - padding) / squareSize); const row = Math.floor((y - padding) / squareSize);
        
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
            // Check if clicking on a variation marker
            if (currentNode && currentMoveIndex === currentPathMoves.length - 1) {
                const variations = currentNode.children;
                if (variations.length > 1) { // Check only if multiple variations exist
                    for (let i = 0; i < variations.length; i++) {
                        const childNode = variations[i];
                        const moveData = childNode.getMoveData();
                        if (moveData && moveData.player === currentPlayer && moveData.r === row && moveData.c === col && board[row][col] === 0) {
                            // Clicked on variation marker i for an empty spot
                            currentNode.selectVariation(i); 
                            
                            const selectedMoveNode = currentNode.getSelectedChild();
                            if (selectedMoveNode) {
                                const basePath = (currentMoveIndex === -1) ? [] : currentPathMoves.slice(0, currentMoveIndex + 1);
                                const newMoveData = selectedMoveNode.getMoveData(); // Get data from the selected node
                                if (newMoveData) { // Ensure it's a playable move
                                    currentPathMoves = [...basePath, { ...newMoveData, sgfNodeRef: selectedMoveNode }];
                                    currentMoveIndex = currentPathMoves.length - 1;
                                    currentNode = selectedMoveNode; 
                                    applyPathToBoard();
                                    updateMoveNavigationText();
                                    return; 
                                }
                            }
                        }
                    }
                }
            }
            // If no variation marker was clicked, or not in a state to select variations, fall through to normal move.
            handleMove(row, col);
        }
    });

    function handleMove(row, col) {
        clearBoardPopupMessage();
        statusMessageP.textContent = '';

        if (board[row][col] !== 0) { 
            showBoardPopup('Point occupied');
            return;
        }

        const tempBoardForCheck = board.map(arr => arr.slice());
        tempBoardForCheck[row][col] = currentPlayer; 

        let capturedStonesThisTurn = [];
        const opponent = (currentPlayer === 1) ? 2 : 1;
        const neighbors = getNeighbors(row, col);

        for (const n of neighbors) {
            if (tempBoardForCheck[n.r][n.c] === opponent) {
                const group = getGroup(n.r, n.c, tempBoardForCheck);
                if (group.liberties === 0) {
                    capturedStonesThisTurn.push(...group.stones);
                    group.stones.forEach(stone => tempBoardForCheck[stone.r][stone.c] = 0);
                }
            }
        }

        const currentGroup = getGroup(row, col, tempBoardForCheck);
        if (currentGroup.liberties === 0 && capturedStonesThisTurn.length === 0) {
            showBoardPopup('Illegal move: Suicide');
            return; 
        }

        const boardStateString = tempBoardForCheck.map(r => r.join('')).join('|');
        if (boardHistory.length >= 2 && boardHistory[boardHistory.length - 2] === boardStateString && capturedStonesThisTurn.length === 1) {
            showBoardPopup('Illegal move: Ko');
            return;
        }


        const sgfCoords = toSgfCoords(row, col);
        const moveProp = currentPlayer === 1 ? 'B' : 'W';
        const newMoveProperties = { [moveProp]: [sgfCoords] };
        
        let existingVariation = currentNode.findChildByMove(currentPlayer, row, col);
        let newPlayedNode;

        if (existingVariation) {
            currentNode.selectVariation(existingVariation.index);
            newPlayedNode = existingVariation.node;
        } else {
            if (currentMoveIndex < currentPathMoves.length -1) {
                currentPathMoves = currentPathMoves.slice(0, currentMoveIndex + 1);
            }
            newPlayedNode = currentNode.createAndAddChild(newMoveProperties);
            currentNode.selectVariation(currentNode.children.length - 1); 
        }
        
        currentNode = newPlayedNode; 

        const newPath = [];
        let pathTracerNode = sgfGameRoot; 
        
        while(pathTracerNode) {
            const moveData = pathTracerNode.getMoveData();
            if (moveData && (pathTracerNode !== sgfGameRoot || (pathTracerNode === sgfGameRoot && (moveData.player === 1 || moveData.player === 2) ) ) ) {
                 newPath.push({ ...moveData, sgfNodeRef: pathTracerNode });
            }
            if (pathTracerNode === currentNode) break; 

            if (pathTracerNode.children.length > 0) {
                pathTracerNode = pathTracerNode.getSelectedChild();
                if (!pathTracerNode) break; 
            } else {
                break; 
            }
            if (newPath.length > boardSize * boardSize * 3) { console.error("Path reconstruction runaway"); break; } 
        }
        currentPathMoves = newPath;
        currentMoveIndex = currentPathMoves.length - 1;
        
        applyPathToBoard(); 

        updateMoveNavigationText();
        if (capturedStonesThisTurn.length > 0) {
             moveNavigationInfoDiv.textContent += ` Captured ${capturedStonesThisTurn.length}.`;
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

    mobileNavFirstBtn.addEventListener('click', () => {
        if (!sgfGameRoot) return;
        let firstMoveNode = sgfGameRoot;
        let path = [];
        let tempNode = sgfGameRoot;
        while(tempNode){
            const moveData = tempNode.getMoveData();
            if(moveData && (tempNode !== sgfGameRoot || (moveData.player ===1 || moveData.player ===2))){
                path.push({...moveData, sgfNodeRef: tempNode});
                break; 
            }
            if(tempNode.children.length > 0){
                tempNode = tempNode.getSelectedChild();
            } else {
                tempNode = null; 
            }
        }

        if (path.length > 0) {
            currentPathMoves = path; 
            navigateToMove(0);       
        } else { 
            navigateToMove(-1);      
        }
    });
    mobileNavPrevBtn.addEventListener('click', () => {
        if (!sgfGameRoot) return;
        if (currentMoveIndex >= 0) navigateToMove(currentMoveIndex - 1);
    });
    mobileNavMoveNextBtn.addEventListener('click', () => {
        if (!sgfGameRoot || !currentNode) return;
        const nextNode = currentNode.getSelectedChild();
        if (nextNode && nextNode.getMoveData()) {
            const basePath = (currentMoveIndex === -1) ? [] : currentPathMoves.slice(0, currentMoveIndex + 1);
            currentPathMoves = [...basePath, { ...nextNode.getMoveData(), sgfNodeRef: nextNode }];
            currentMoveIndex = currentPathMoves.length - 1;
            currentNode = nextNode; 
            applyPathToBoard();
            updateMoveNavigationText();
        } else {
            updateMoveNavigationText(); 
        }
    });
    mobileNavLastBtn.addEventListener('click', () => {
        if (!sgfGameRoot) return;
        let tempPath = [];
        let tempNode = sgfGameRoot;
        while(tempNode) {
            const moveData = tempNode.getMoveData();
            if (moveData && (tempNode !== sgfGameRoot || (tempNode === sgfGameRoot && (moveData.player ===1 || moveData.player ===2)) )) {
                 tempPath.push({...moveData, sgfNodeRef: tempNode});
            }
            if (tempNode.children.length > 0) {
                 tempNode = tempNode.getSelectedChild();
            } else {
                break;
            }
        }
        
        if (tempPath.length > 0) {
            currentPathMoves = tempPath;
            navigateToMove(tempPath.length - 1);
        } else { 
            navigateToMove(-1);
        }
    });


    window.addEventListener('resize', () => { if (sgfGameRoot) resizeCanvas(); });
    document.addEventListener('keydown', (event) => {
        if (!sgfGameRoot) return; 

        if (event.key === 'ArrowLeft') {
            if (currentMoveIndex >= 0) { 
                navigateToMove(currentMoveIndex - 1);
            }
        } else if (event.key === 'ArrowRight') {
            if (currentNode && currentNode.getSelectedChild()) {
                const nextNode = currentNode.getSelectedChild();
                const moveData = nextNode.getMoveData(); 
                if (moveData) {
                    const basePath = (currentMoveIndex === -1) ? [] : currentPathMoves.slice(0, currentMoveIndex + 1);
                    currentPathMoves = [...basePath, { ...moveData, sgfNodeRef: nextNode }];
                    currentMoveIndex = currentPathMoves.length - 1;
                    currentNode = nextNode; 
                    applyPathToBoard();
                    updateMoveNavigationText();
                }
            } else {
                 updateMoveNavigationText(); 
            }
        } else if (event.shiftKey && event.key.length === 1 && event.key.toUpperCase() >= 'A' && event.key.toUpperCase() <= 'Z') {
            // Check if variation markers would be visible (same logic as in drawBoard)
            if (currentNode && sgfGameRoot) {
                const variations = currentNode.children;
                let playableVariationsData = []; // To store {node, originalIndex, moveData, markerLetter}
                let playableVariationCount = 0;

                if (variations.length > 1) {
                    for (let i = 0; i < variations.length; i++) {
                        const childNode = variations[i];
                        const moveData = childNode.getMoveData();
                        if (moveData && moveData.player === currentPlayer && board[moveData.r][moveData.c] === 0) {
                            playableVariationsData.push({ node: childNode, originalIndex: i, moveData: moveData });
                            playableVariationCount++;
                        }
                    }
                }

                if (playableVariationCount > 1) { // If markers would be shown
                    const targetLetter = event.key.toUpperCase();
                    const targetMarkerIndex = targetLetter.charCodeAt(0) - 'A'.charCodeAt(0);

                    if (targetMarkerIndex >= 0 && targetMarkerIndex < playableVariationsData.length) {
                        const chosenVariationMeta = playableVariationsData[targetMarkerIndex];
                        currentNode.selectVariation(chosenVariationMeta.originalIndex);
                        
                        const selectedMoveNode = currentNode.getSelectedChild(); // This is chosenVariationMeta.node
                        if (selectedMoveNode) {
                            const basePath = (currentMoveIndex === -1) ? [] : currentPathMoves.slice(0, currentMoveIndex + 1);
                            const newMoveData = selectedMoveNode.getMoveData(); // Should be same as chosenVariationMeta.moveData
                            if (newMoveData) {
                                currentPathMoves = [...basePath, { ...newMoveData, sgfNodeRef: selectedMoveNode }];
                                currentMoveIndex = currentPathMoves.length - 1;
                                currentNode = selectedMoveNode;
                                applyPathToBoard();
                                updateMoveNavigationText();
                                event.preventDefault(); 
                                return;
                            }
                        }
                    }
                }
            }
        }
    });

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateAssetSources(); 
        updateThemeColorsFromCSS();
        if (sgfGameRoot) drawBoard(); 
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') document.body.classList.add('dark-mode');
    
    updateAssetSources(); 
    updateThemeColorsFromCSS();
    initGame(false); 

    if (toggleNavBtn && mobileNavControls) {
        // Initial state: show nav on small screens, allow toggle to hide.
        // On larger screens, it might be hidden by CSS by default, toggle shows it.
        // Consider localStorage for persistence if desired.
        // For now, simple toggle. Add a class to #mobile-nav-controls like 'hidden-by-toggle'
        // CSS would be: #mobile-nav-controls.hidden-by-toggle { display: none !important; }
        // Or directly manipulate style:
        // mobileNavControls.style.display = 'flex'; // Or 'none' based on initial desired state / screen size

        toggleNavBtn.addEventListener('click', () => {
            if (mobileNavControls.style.display === 'none' || mobileNavControls.classList.contains('hidden-by-toggle')) {
                mobileNavControls.style.display = 'flex'; // Or your default display type for flex container
                mobileNavControls.classList.remove('hidden-by-toggle');
            } else {
                mobileNavControls.style.display = 'none';
                mobileNavControls.classList.add('hidden-by-toggle');
            }
        });
    }
});
