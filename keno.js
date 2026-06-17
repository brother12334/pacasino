function renderKeno(container) {
  let selected = new Set(), drawn = new Set(), active = false;
  const MAX_PICKS = 10, TOTAL = 40, DRAW_COUNT = 20;

  const PAYTABLE = {
    1: [0, 3.8],
    2: [0, 0, 7],
    3: [0, 0, 3, 27],
    4: [0, 0, 2, 6, 40],
    5: [0, 0, 1.5, 3, 12, 100],
    6: [0, 0, 1, 2, 5, 20, 200],
    7: [0, 0, 0.5, 2, 4, 10, 50, 500],
    8: [0, 0, 0.5, 1.5, 3, 8, 25, 150, 1000],
    9: [0, 0, 0.5, 1, 2, 5, 15, 80, 500, 2500],
    10: [0, 0, 0.5, 1, 1.5, 4, 10, 40, 200, 1000, 5000],
  };

  function renderGrid() {
    const g = document.getElementById('keno-grid');
    if (!g) return;
    g.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
      const b = document.createElement('div');
      b.className = 'keno-ball' + (selected.has(i) ? ' selected' : '') + (drawn.has(i) && active === false && drawn.size > 0 ? (selected.has(i) ? ' hit' : ' drawn') : '');
      b.textContent = i;
      b.addEventListener('click', () => {
        if (drawn.size > 0) return;
        if (selected.has(i)) { selected.delete(i); }
        else if (selected.size < MAX_PICKS) { selected.add(i); }
        updatePickCount();
        renderGrid();
      });
      g.appendChild(b);
    }
  }

  function updatePickCount() {
    const el = document.getElementById('keno-pick-count');
    if (el) el.textContent = `${selected.size} / ${MAX_PICKS} selected`;
  }

  function getMultiplier(picks, hits) {
    const table = PAYTABLE[picks];
    if (!table || hits >= table.length) return table ? table[table.length - 1] : 0;
    return table[hits] || 0;
  }

  async function runDraw(bet) {
    drawn = new Set();
    const pool = Array.from({ length: TOTAL }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawOrder = pool.slice(0, DRAW_COUNT);

    for (const num of drawOrder) {
      drawn.add(num);
      renderGrid();
      await new Promise(r => setTimeout(r, 80));
    }

    const hits = [...selected].filter(n => drawn.has(n)).length;
    const mult = getMultiplier(selected.size, hits);
    const win = bet * mult;
    if (win > 0) addBalance(win);

    const type = win > bet ? 'win' : win > 0 ? 'push' : 'lose';
    document.getElementById('keno-result').innerHTML = `<div class="result-msg ${type}">${hits} of ${selected.size} picked — ${mult > 0 ? mult + 'x — ' + (win > 0 ? 'won ' + win.toFixed(2) + ' TKN' : 'no win') : 'no win. Lost ' + bet.toFixed(2) + ' TKN.'}</div>`;
    document.getElementById('keno-play').disabled = false;
    document.getElementById('keno-clear').disabled = false;
  }

  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Keno</div>
      <div class="game-desc">Pick up to 10 numbers from 1–40. The game draws 20. The more of your picks that match, the more you win.</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;max-width:480px;">
        <span id="keno-pick-count" style="font-size:13px;color:var(--text-dim);">0 / 10 selected</span>
        <button class="btn-secondary" id="keno-clear" style="padding:6px 12px;font-size:12px;">Clear</button>
      </div>
      <div class="keno-grid" id="keno-grid"></div>
      <div class="bet-row">
        <label>Bet</label>
        <input type="number" class="bet-input" id="keno-bet" value="50" min="1"/>
        <div class="quick-bets">
          <button class="quick-bet-btn" onclick="document.getElementById('keno-bet').value=25">25</button>
          <button class="quick-bet-btn" onclick="document.getElementById('keno-bet').value=50">50</button>
          <button class="quick-bet-btn" onclick="document.getElementById('keno-bet').value=100">100</button>
        </div>
        <button class="btn-primary" id="keno-play">Play</button>
      </div>
      <div id="keno-result"></div>
    </div>`;

  renderGrid();

  document.getElementById('keno-clear').addEventListener('click', () => {
    selected.clear(); drawn.clear();
    document.getElementById('keno-result').innerHTML = '';
    updatePickCount(); renderGrid();
  });

  document.getElementById('keno-play').addEventListener('click', async () => {
    if (selected.size < 1) { showToast('Pick at least 1 number.'); return; }
    const bet = parseBet(document.getElementById('keno-bet'));
    if (!validateBet(bet)) return;
    deductBalance(bet);
    drawn.clear();
    document.getElementById('keno-play').disabled = true;
    document.getElementById('keno-clear').disabled = true;
    document.getElementById('keno-result').innerHTML = '';
    await runDraw(bet);
  });
}
