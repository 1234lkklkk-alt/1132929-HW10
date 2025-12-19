/* script.js */

document.addEventListener('DOMContentLoaded', () => {

    // === 參數 ===
    const BOARD_SIZE = 8;
    const EMPTY = 0;
    const BLACK = 1;
    const WHITE = 2;

    let board = [];
    let currentPlayer = BLACK;
    let gameActive = true;
    let isAnimating = false;

    let blackWins = 0;
    let whiteWins = 0;

    // === DOM ===
    const boardEl = document.getElementById('board');
    const scoreBlackEl = document.getElementById('score-black');
    const scoreWhiteEl = document.getElementById('score-white');
    const winsBlackEl = document.getElementById('wins-black');
    const winsWhiteEl = document.getElementById('wins-white');
    const statusEl = document.getElementById('status-display');
    const btnRestart = document.getElementById('btn-restart');
    const chkComputer = document.getElementById('chk-computer');
    const rdoBasic = document.querySelector('input[value="basic"]');
    const damageOverlay = document.getElementById('damage-overlay');
    const body = document.body;

    function initGame() {
        board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
        board[3][3] = WHITE;
        board[3][4] = BLACK;
        board[4][3] = BLACK;
        board[4][4] = WHITE;

        currentPlayer = BLACK;
        gameActive = true;
        isAnimating = false;

        renderBoard();
        updateStatus();
    }

    // === 渲染 (維持上次修復的雙人對戰邏輯) ===
    function renderBoard() {
        boardEl.innerHTML = '';
        const validMoves = getValidMoves(currentPlayer);
        let b = 0, w = 0;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const val = board[r][c];
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (val === BLACK) b++;
                if (val === WHITE) w++;

                if (val !== EMPTY) {
                    const disc = document.createElement('div');
                    disc.className = `disc ${val === BLACK ? 'black' : 'white'}`;
                    cell.appendChild(disc);
                }
                else if (gameActive && !isAnimating && validMoves.some(m => m.r === r && m.c === c)) {
                    // 判斷是否為真人回合
                    const isHumanTurn = !chkComputer.checked || currentPlayer === BLACK;

                    if (isHumanTurn) {
                        cell.classList.add('valid-move');
                        cell.onclick = () => handleMove(r, c);
                    }
                }
                boardEl.appendChild(cell);
            }
        }
        scoreBlackEl.innerText = b;
        scoreWhiteEl.innerText = w;
    }

    async function handleMove(r, c) {
        if (!gameActive || isAnimating) return;
        if (!isValidMove(r, c, currentPlayer)) return;

        isAnimating = true;

        board[r][c] = currentPlayer;

        const cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
        cell.classList.remove('valid-move');
        cell.onclick = null;
        const newDisc = document.createElement('div');
        newDisc.className = `disc ${currentPlayer === BLACK ? 'black' : 'white'} placed`;
        cell.appendChild(newDisc);

        const flips = calculateFlips(r, c, currentPlayer);
        if (flips.length > 0) {
            // 只有電腦吃掉玩家時震動
            if (currentPlayer === WHITE && chkComputer.checked) {
                triggerDamageEffect();
            }

            await playFlipSequence(flips, currentPlayer);
            flips.forEach(p => board[p.r][p.c] = currentPlayer);
        }

        currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
        isAnimating = false;

        renderBoard();
        updateStatus();

        if (checkGameOver()) return;

        if (currentPlayer === WHITE && chkComputer.checked && gameActive) {
            setTimeout(computerTurn, 800);
        }
    }

    function playFlipSequence(flips, player) {
        return new Promise(resolve => {
            let index = 0;
            const targetClass = player === BLACK ? 'black' : 'white';
            function next() {
                if (index >= flips.length) {
                    setTimeout(resolve, 200);
                    return;
                }
                const p = flips[index];
                const cell = document.querySelector(`.cell[data-r='${p.r}'][data-c='${p.c}']`);
                const disc = cell ? cell.querySelector('.disc') : null;
                if (disc) {
                    disc.classList.add('flipping');
                    setTimeout(() => {
                        disc.classList.remove('black', 'white');
                        disc.classList.add(targetClass);
                    }, 150);
                }
                index++;
                setTimeout(next, 100);
            }
            next();
        });
    }

    function triggerDamageEffect() {
        body.classList.add('shake-damage');
        damageOverlay.style.opacity = '0.6';
        setTimeout(() => {
            body.classList.remove('shake-damage');
            damageOverlay.style.opacity = '0';
        }, 400);
    }

    function computerTurn() {
        if (!gameActive) return;
        const moves = getValidMoves(WHITE);
        if (moves.length === 0) {
            alert("電腦 PASS！");
            currentPlayer = BLACK;
            renderBoard();
            updateStatus();
            return;
        }
        let bestMove = null;
        if (rdoBasic && rdoBasic.checked) {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        } else {
            moves.forEach(m => m.val = calculateFlips(m.r, m.c, WHITE).length);
            const maxVal = Math.max(...moves.map(m => m.val));
            const corners = moves.filter(m => (m.r === 0 || m.r === 7) && (m.c === 0 || m.c === 7));
            if (corners.length > 0) bestMove = corners[Math.floor(Math.random() * corners.length)];
            else bestMove = moves.filter(m => m.val === maxVal)[0];
        }
        handleMove(bestMove.r, bestMove.c);
    }

    function checkGameOver() {
        const p1Moves = getValidMoves(currentPlayer);
        if (p1Moves.length > 0) return false;

        const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        const p2Moves = getValidMoves(opponent);

        if (p2Moves.length === 0) {
            gameActive = false;
            let b = parseInt(scoreBlackEl.innerText);
            let w = parseInt(scoreWhiteEl.innerText);
            let msg = "";
            if (b > w) {
                msg = "黑棋勝利 (WIN)!";
                blackWins++;
            } else if (w > b) {
                msg = "白棋勝利 (LOSE)...";
                whiteWins++;
            } else {
                msg = "平手 (DRAW)!";
            }
            winsBlackEl.innerText = blackWins;
            winsWhiteEl.innerText = whiteWins;
            setTimeout(() => alert(`遊戲結束！\n${msg}`), 500);
            return true;
        } else {
            const name = currentPlayer === BLACK ? "黑棋" : "白棋";
            setTimeout(() => {
                alert(`${name} 無步可走，PASS！`);
                currentPlayer = opponent;
                renderBoard();
                updateStatus();
                if (currentPlayer === WHITE && chkComputer.checked) computerTurn();
            }, 500);
            return false;
        }
    }

    function isValidMove(r, c, player) {
        if (board[r][c] !== EMPTY) return false;
        return calculateFlips(r, c, player).length > 0;
    }
    function calculateFlips(row, col, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        let res = [];
        for (let d of dirs) {
            let r = row + d[0], c = col + d[1];
            let temp = [];
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opponent) {
                temp.push({ r, c });
                r += d[0]; c += d[1];
            }
            if (temp.length > 0 && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
                res.push(...temp);
            }
        }
        return res;
    }
    function getValidMoves(player) {
        let moves = [];
        for (let r = 0; r < BOARD_SIZE; r++)
            for (let c = 0; c < BOARD_SIZE; c++)
                if (isValidMove(r, c, player)) moves.push({ r, c });
        return moves;
    }
    function updateStatus() {
        let text = "";
        if (chkComputer.checked) {
            text = currentPlayer === BLACK ? "黑棋 (您的回合)" : "白棋 (電腦思考中...)";
        } else {
            text = currentPlayer === BLACK ? "黑棋 (P1 回合)" : "白棋 (P2 回合)";
        }
        statusEl.innerText = `TURN: ${text}`;
        statusEl.style.backgroundColor = currentPlayer === BLACK ? "#1a1a1a" : "#fff";
        statusEl.style.color = currentPlayer === BLACK ? "#fff" : "#1a1a1a";
    }

    // 監聽模式切換
    chkComputer.addEventListener('change', () => {
        updateStatus();
        renderBoard();
    });

    btnRestart.onclick = initGame;
    initGame();

    // === 新增：背景動態日文生成器 ===
    const bgContainer = document.querySelector('.bg-decorations');
    const mangatexts = ['ゴゴゴ', 'ドーン', 'ザッ', 'ビシッ', 'ズギュン', 'メメタァ', 'オラオラ', 'バーン'];

    function spawnMangaText() {
        if (!bgContainer) return;
        const el = document.createElement('span');
        el.classList.add('dynamic-deco');
        el.innerText = mangatexts[Math.floor(Math.random() * mangatexts.length)];

        // 隨機參數
        const size = Math.floor(Math.random() * 6 + 5) + 'rem'; // 5-11rem
        const rot = Math.floor(Math.random() * 90 - 45) + 'deg'; // -45 to 45deg
        // 隨機終點 (飛出畫面外)
        const endX = (Math.random() * 250 - 125) + 'vw';
        const endY = (Math.random() * 250 - 125) + 'vh';
        const duration = (Math.random() * 3 + 4) + 's'; // 4-7s

        // 設定 CSS 變數
        el.style.setProperty('--txt-size', size);
        el.style.setProperty('--txt-rot', rot);
        el.style.setProperty('--end-x', endX);
        el.style.setProperty('--end-y', endY);
        el.style.setProperty('--anim-duration', duration);

        bgContainer.appendChild(el);

        // 動畫結束後移除元素
        setTimeout(() => {
            el.remove();
        }, parseFloat(duration) * 1000);
    }

    // 啟動生成迴圈 (每 500ms 產生一個)
    setInterval(spawnMangaText, 500);
    spawnMangaText(); // 先產生一個
});