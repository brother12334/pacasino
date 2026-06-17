// ── DICE ──────────────────────────────────────────────────────────────────

function renderDice(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Dice</div>
      <div class="game-desc">Set a target number, pick over or under, and roll. The closer to the edge, the better the payout.</div>

      <div class="dice-wrap">
        <div class="dice-display">
          <div class="die" id="die-1">${dotGrid(1)}</div>
          <div class="die" id="die-2">${dotGrid(1)}</div>
        </div>

        <div class="dice-total-num" id="dice-total">—</div>
        <div class="dice-total-label" id="dice-total-label">Roll to start</div>

        <div class="result-msg" id="dice-result" style="display:none"></div>

        <div style="margin: 20px 0 8px">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">
            Target: <strong id="target-display" style="color:var(--accent)">7</strong>
            &nbsp;·&nbsp; Win chance: <strong id="chance-display" style="color:var(--text)">~58%</strong>
            &nbsp;·&nbsp; Multiplier: <strong id="mult-display" style="color:var(--accent)">1.60x</strong>
          </div>
          <input class="dice-slider" id="dice-slider" type="range" min="2" max="12" value="7" step="1" style="width:100%" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dimmer);margin-top:4px">
            <span>2</span><span>7</span><span>12</span>
          </div>
        </div>

        <div class="dice-over-under" style="margin-bottom:20px">
          <div class="dice-ou-btn active" id="btn-over">Over</div>
          <div class="dice-ou-btn" id="btn-under">Under</div>
        </div>

        <div class="bet-row">
          <label>Bet</label>
          <input class="bet-input" id="dice-bet" type="number" min="1" value="10" />
          <div class="quick-bets">
            <button class="quick-bet-btn" data-amt="5">5</button>
            <button class="quick-bet-btn" data-amt="10">10</button>
            <button class="quick-bet-btn" data-amt="25">25</button>
            <button class="quick-bet-btn" data-amt="50">50</button>
          </div>
          <button class="btn-primary" id="dice-roll-btn">Roll</button>
        </div>
      </div>
    </div>`;

  // Dot layout per face value: positions in 3x3 grid (0–8, row-major)
  const DOT_POSITIONS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  function dotGrid(val) {
    return Array.from({ length: 9 }, (_, i) =>
      `<div class="dot${DOT_POSITIONS[val]?.includes(i) ? ' on' : ''}"></div>`
    ).join('');
  }

  function setDie(id, val) {
    document.getElementById(id).innerHTML = dotGrid(val);
  }

  // ── Probability helpers ─────────────────────────────────────────────────
  // Number of ways to roll each total with 2d6
  const WAYS = { 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:5, 9:4, 10:3, 11:2, 12:1 };
  const TOTAL_WAYS = 36;

  function winWays(target, direction) {
    let ways = 0;
    for (let t = 2; t <= 12; t++) {
      if (direction === 'over' && t > target) ways += WAYS[t];
      if (direction === 'under' && t < target) ways += WAYS[t];
    }
    return ways;
  }

  function calcMultiplier(target, direction) {
    const ways = winWays(target, direction);
    if (ways === 0) return null;
    // House edge ~3%
    return Math.round((TOTAL_WAYS / ways) * 0.97 * 100) / 100;
  }

  // ── State ───────────────────────────────────────────────────────────────
  let target = 7;
  let direction = 'over';
  let rolling = false;

  function updateOddsDisplay() {
    const ways = winWays(target, direction);
    const pct = Math.round((ways / TOTAL_WAYS) * 100);
    const mult = calcMultiplier(target, direction);
    document.getElementById('target-display').textContent = target;
    document.getElementById('chance-display').textContent = mult ? `~${pct}%` : 'Impossible';
    document.getElementById('mult-display').textContent = mult ? `${mult}x` : '—';
  }

  // ── Slider ──────────────────────────────────────────────────────────────
  document.getElementById('dice-slider').addEventListener('input', e => {
    target = parseInt(e.target.value);
    updateOddsDisplay();
  });

  // ── Over / Under toggle ─────────────────────────────────────────────────
  document.getElementById('btn-over').addEventListener('click', () => {
    direction = 'over';
    document.getElementById('btn-over').classList.add('active');
    document.getElementById('btn-under').classList.remove('active');
    updateOddsDisplay();
  });

  document.getElementById('btn-under').addEventListener('click', () => {
    direction = 'under';
    document.getElementById('btn-under').classList.add('active');
    document.getElementById('btn-over').classList.remove('active');
    updateOddsDisplay();
  });

  // ── Quick bets ──────────────────────────────────────────────────────────
  container.querySelectorAll('.quick-bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('dice-bet').value = btn.dataset.amt;
    });
  });

  // ── Roll ────────────────────────────────────────────────────────────────
  document.getElementById('dice-roll-btn').addEventListener('click', () => {
    if (rolling) return;

    const bet = parseBet(document.getElementById('dice-bet'));
    if (!validateBet(bet)) return;

    const mult = calcMultiplier(target, direction);
    if (!mult) { showToast('That bet is impossible — adjust the target.'); return; }

    deductBalance(bet);
    rolling = true;
    document.getElementById('dice-roll-btn').disabled = true;

    // Clear previous result
    const resultEl = document.getElementById('dice-result');
    resultEl.style.display = 'none';

    const d1El = document.getElementById('die-1');
    const d2El = document.getElementById('die-2');

    // Roll animation — shuffle faces for 600ms
    let ticks = 0;
    const interval = setInterval(() => {
      const r1 = Math.ceil(Math.random() * 6);
      const r2 = Math.ceil(Math.random() * 6);
      d1El.innerHTML = dotGrid(r1);
      d2El.innerHTML = dotGrid(r2);
      ticks++;
      if (ticks > 10) {
        clearInterval(interval);
        finishRoll(bet, mult, d1El, d2El);
      }
    }, 60);

    d1El.classList.add('rolling');
    d2El.classList.add('rolling');
    setTimeout(() => {
      d1El.classList.remove('rolling');
      d2El.classList.remove('rolling');
    }, 400);
  });

  function finishRoll(bet, mult, d1El, d2El) {
    const v1 = Math.ceil(Math.random() * 6);
    const v2 = Math.ceil(Math.random() * 6);
    const total = v1 + v2;

    d1El.innerHTML = dotGrid(v1);
    d2El.innerHTML = dotGrid(v2);

    const totalEl = document.getElementById('dice-total');
    const labelEl = document.getElementById('dice-total-label');
    totalEl.textContent = total;

    const won = direction === 'over' ? total > target : total < target;

    const resultEl = document.getElementById('dice-result');

    if (won) {
      const payout = Math.round(bet * mult * 100) / 100;
      addBalance(payout);
      d1El.classList.add('win');
      d2El.classList.add('win');
      totalEl.style.color = 'var(--green)';
      labelEl.textContent = `${direction === 'over' ? 'Over' : 'Under'} ${target} — you win!`;
      resultEl.textContent = `Rolled ${total} — ${direction} ${target}. Won ${payout.toLocaleString()} tokens (${mult}x)`;
      resultEl.className = 'result-msg win';
      showToast(`+${payout.toLocaleString()} tokens`, 'win');
    } else {
      d1El.classList.add('lose');
      d2El.classList.add('lose');
      totalEl.style.color = 'var(--red)';
      labelEl.textContent = `${direction === 'over' ? 'Over' : 'Under'} ${target} — no luck.`;
      resultEl.textContent = `Rolled ${total} — not ${direction} ${target}. Lost ${bet.toLocaleString()} tokens.`;
      resultEl.className = 'result-msg lose';
      showToast(`-${bet.toLocaleString()} tokens`, 'lose');
    }

    resultEl.style.display = 'block';

    // Reset die colors after a beat
    setTimeout(() => {
      d1El.classList.remove('win', 'lose');
      d2El.classList.remove('win', 'lose');
      totalEl.style.color = '';
      rolling = false;
      document.getElementById('dice-roll-btn').disabled = false;
    }, 1800);
  }

  // Init
  updateOddsDisplay();
}
