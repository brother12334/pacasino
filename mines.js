function renderMines(container) {
  let grid = [], revealed = [], mineCount = 3, active = false, currentBet = 0, gemsFound = 0;
  const GRID_SIZE = 25;

  function multiplier() {
    const safeTotal = GRID_SIZE - mineCount;
    let m = 1;
    for (let i = 0; i < gemsFound; i++) {
      m *= (safeTotal - i) / (GRID_SIZE - i) > 0 ? safeTotal / (safeTotal - i) * 1.05 : 1;
    }
    return Math.max(1, (1 + gemsFound * 0.18) * (1 + mineCount * 0.12));
  }

  function buildGrid() {
    grid = Array(GRID_SIZE).fill(0);
    let placed = 0;
    while (placed < mineCount) {
      const i = Math.floor(Math.random() * GRID_SIZE);
      if (!grid[i]) { grid[i] = 1; placed++; }
    }
    revealed = Array(GRID_SIZE).fill(false);
    gemsFound = 0;
  }

  function renderGrid() {
    const g = document.getElementById('mines-grid');
    if (!g) return;
    g.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'mine-cell' + (revealed[i] ? (grid[i] ? ' bomb revealed' : ' gem revealed') : '') + (!active ? ' disabled' : '');
      if (revealed[i]) cell.textContent = grid[i] ? '💣' : '💎';
      else cell.textContent = '';
      cell.addEventListener('click', () => handleClick(i));
      g.appendChild(cell);
    }
    document.getElementById('mines-mult').textContent = active ? multiplier().toFixed(2) + 'x' : '—';
    document.getElementById('mines-profit').textContent = active ? ((multiplier() * currentBet) - currentBet).toFixed(2) : '0';
    const cashBtn = document.getElementById('mines-cash');
    if (cashBtn) cashBtn.disabled = !active || gemsFound === 0;
  }

  function handleClick(i) {
    if (!active || revealed[i]) return;
    revealed[i] = true;
    if (grid[i] === 1) {
      // Hit a mine — reveal all
      for (let j = 0; j < GRID_SIZE; j++) { if (grid[j] === 1) revealed[j] = true; }
      active = false;
      renderGrid();
      document.getElementById('mines-result').innerHTML = `<div class="result-msg lose">Boom! You hit a mine and lost ${currentBet.toLocaleString()} TKN.</div>`;
      document.getElementById('mines-start').disabled = false;
      document.getElementById('mines-cash').disabled = true;
    } else {
      gemsFound++;
      renderGrid();
      const safe = GRID_SIZE - mineCount - gemsFound;
      if (safe === 0) {
        // Found all gems
        const win = currentBet * multiplier();
        addBalance(win);
        active = false;
        renderGrid();
        document.getElementById('mines-result').innerHTML = `<div class="result-msg win">You cleared the board! Won ${win.toFixed(2)} TKN.</div>`;
        document.getElementById('mines-start').disabled = false;
      } else {
        document.getElementById('mines-result').innerHTML = '';
      }
    }
  }

  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Mines</div>
      <div class="game-desc">Click tiles to reveal gems. Hit a mine and you lose your bet. Cash out any time to lock in your winnings.</div>
      <div class="mines-layout">
        <div>
          <div class="mines-grid" id="mines-grid"></div>
          <div class="mines-info">
            <div class="mines-stat"><span>Multiplier</span><span id="mines-mult">—</span></div>
            <div class="mines-stat"><span>Profit</span><span id="mines-profit">0</span></div>
          </div>
          <div id="mines-result"></div>
        </div>
        <div class="mines-controls">
          <div class="bet-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
            <label>Bet amount</label>
            <input type="number" class="bet-input" id="mines-bet" value="50" min="1" />
            <div class="quick-bets">
              <button class="quick-bet-btn" onclick="document.getElementById('mines-bet').value=25">25</button>
              <button class="quick-bet-btn" onclick="document.getElementById('mines-bet').value=50">50</button>
              <button class="quick-bet-btn" onclick="document.getElementById('mines-bet').value=100">100</button>
              <button class="quick-bet-btn" onclick="document.getElementById('mines-bet').value=Math.floor(getBalance()/2)">½</button>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:var(--text-dim);display:block;margin-bottom:6px;">Mines count</label>
            <select class="mines-select" id="mines-count">
              ${[1,2,3,5,7,10,15,20].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n} mine${n>1?'s':''}</option>`).join('')}
            </select>
          </div>
          <button class="btn-primary" id="mines-start" style="width:100%;margin-bottom:8px;">Start Game</button>
          <button class="btn-green" id="mines-cash" style="width:100%;" disabled>Cash Out</button>
        </div>
      </div>
    </div>`;

  document.getElementById('mines-start').addEventListener('click', () => {
    const bet = parseBet(document.getElementById('mines-bet'));
    if (!validateBet(bet)) return;
    mineCount = parseInt(document.getElementById('mines-count').value);
    currentBet = bet;
    deductBalance(bet);
    active = true;
    buildGrid();
    document.getElementById('mines-result').innerHTML = '';
    document.getElementById('mines-start').disabled = true;
    renderGrid();
  });

  document.getElementById('mines-cash').addEventListener('click', () => {
    if (!active || gemsFound === 0) return;
    const win = currentBet * multiplier();
    addBalance(win);
    active = false;
    for (let j = 0; j < GRID_SIZE; j++) { if (grid[j] === 1) revealed[j] = true; }
    renderGrid();
    document.getElementById('mines-result').innerHTML = `<div class="result-msg win">Cashed out at ${multiplier().toFixed(2)}x — won ${win.toFixed(2)} TKN.</div>`;
    document.getElementById('mines-start').disabled = false;
  });

  renderGrid();
}
