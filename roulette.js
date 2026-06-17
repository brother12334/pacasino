// ── ROULETTE ───────────────────────────────────────────────────────────────

function renderRoulette(container) {
  const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const GREEN_NUMS = new Set([0]);

  function numColor(n) {
    if (GREEN_NUMS.has(n)) return 'green';
    if (RED_NUMS.has(n)) return 'red';
    return 'black';
  }

  // Build number grid (European, 0–36)
  const GRID_ORDER = [
    3,6,9,12,15,18,21,24,27,30,33,36,
    2,5,8,11,14,17,20,23,26,29,32,35,
    1,4,7,10,13,16,19,22,25,28,31,34
  ];

  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Roulette</div>
      <div class="game-desc">European roulette — single zero. Pick numbers, colors, or ranges, then spin.</div>

      <div class="roulette-wrap">
        <!-- Wheel -->
        <div class="roulette-wheel-area">
          <canvas id="roulette-canvas" width="220" height="220"></canvas>
          <div style="margin-top:14px;text-align:center">
            <div class="roulette-result-num" id="roulette-result-num" style="display:none"></div>
            <div id="roulette-result-label" style="font-size:12px;color:var(--text-dim);margin-bottom:6px"></div>
          </div>
          <div class="result-msg" id="roulette-result" style="display:none;margin-top:8px;max-width:220px"></div>
        </div>

        <!-- Betting board -->
        <div style="flex:1;min-width:260px">
          <!-- Zero -->
          <div style="margin-bottom:5px">
            <div class="rb-cell green-num" data-bet="number" data-val="0" style="max-width:56px;background:rgba(62,207,116,0.1);border-color:rgba(62,207,116,0.3)">0</div>
          </div>

          <!-- Number grid -->
          <div class="roulette-board" style="margin-bottom:6px">
            ${GRID_ORDER.map(n => {
              const c = numColor(n);
              return `<div class="rb-cell ${c}-num" data-bet="number" data-val="${n}">${n}</div>`;
            }).join('')}
          </div>

          <!-- 1st/2nd/3rd column -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:280px;margin-bottom:6px">
            <div class="rb-outside" data-bet="col" data-val="1">Col 1</div>
            <div class="rb-outside" data-bet="col" data-val="2">Col 2</div>
            <div class="rb-outside" data-bet="col" data-val="3">Col 3</div>
          </div>

          <!-- Outside bets -->
          <div class="roulette-outside">
            <div class="rb-outside" data-bet="dozen" data-val="1">1–12</div>
            <div class="rb-outside" data-bet="dozen" data-val="2">13–24</div>
            <div class="rb-outside" data-bet="dozen" data-val="3">25–36</div>
          </div>
          <div class="roulette-outside" style="margin-top:6px">
            <div class="rb-outside" data-bet="half" data-val="low">1–18</div>
            <div class="rb-outside" data-bet="parity" data-val="even">Even</div>
            <div class="rb-outside" data-bet="color" data-val="red" style="color:#f87171">Red</div>
            <div class="rb-outside" data-bet="color" data-val="black">Black</div>
            <div class="rb-outside" data-bet="parity" data-val="odd">Odd</div>
            <div class="rb-outside" data-bet="half" data-val="high">19–36</div>
          </div>

          <!-- Bet controls -->
          <div class="bet-row" style="margin-top:18px">
            <label>Bet</label>
            <input class="bet-input" id="roulette-bet" type="number" min="1" value="10" />
            <div class="quick-bets">
              <button class="quick-bet-btn" data-amt="5">5</button>
              <button class="quick-bet-btn" data-amt="10">10</button>
              <button class="quick-bet-btn" data-amt="25">25</button>
              <button class="quick-bet-btn" data-amt="50">50</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="btn-primary" id="roulette-spin-btn">Spin</button>
            <button class="btn-secondary" id="roulette-clear-btn">Clear</button>
            <span id="roulette-selection-label" style="font-size:12px;color:var(--text-dim)">No bet selected</span>
          </div>
        </div>
      </div>
    </div>`;

  // ── Wheel drawing ────────────────────────────────────────────────────────
  const WHEEL_NUMS = [
    0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,
    5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
  ];
  const canvas = document.getElementById('roulette-canvas');
  const ctx = canvas.getContext('2d');
  const CX = 110, CY = 110, R = 105, R_INNER = 30;
  const SLICE = (Math.PI * 2) / WHEEL_NUMS.length;

  let wheelAngle = 0;
  let spinning = false;
  let animFrame = null;

  function drawWheel(angle) {
    ctx.clearRect(0, 0, 220, 220);
    WHEEL_NUMS.forEach((n, i) => {
      const start = angle + i * SLICE - Math.PI / 2;
      const end = start + SLICE;
      const col = numColor(n);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, end);
      ctx.closePath();
      ctx.fillStyle = col === 'green' ? '#166534' : col === 'red' ? '#991b1b' : '#1a1a1a';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Number label
      const mid = start + SLICE / 2;
      const tx = CX + (R - 16) * Math.cos(mid);
      const ty = CY + (R - 16) * Math.sin(mid);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${n === 0 ? 9 : 8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n, 0, 0);
      ctx.restore();
    });

    // Center cap
    ctx.beginPath();
    ctx.arc(CX, CY, R_INNER, 0, Math.PI * 2);
    ctx.fillStyle = '#16181c';
    ctx.fill();
    ctx.strokeStyle = '#2a2d35';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(CX, CY - R - 2);
    ctx.lineTo(CX - 7, CY - R + 14);
    ctx.lineTo(CX + 7, CY - R + 14);
    ctx.closePath();
    ctx.fillStyle = '#c8a96e';
    ctx.fill();
  }

  drawWheel(0);

  // ── Bet state ────────────────────────────────────────────────────────────
  let selectedBet = null; // { type, val }

  function updateSelectionLabel() {
    const el = document.getElementById('roulette-selection-label');
    if (!selectedBet) { el.textContent = 'No bet selected'; return; }
    const labels = {
      number: `Number ${selectedBet.val}`,
      color: selectedBet.val.charAt(0).toUpperCase() + selectedBet.val.slice(1),
      parity: selectedBet.val.charAt(0).toUpperCase() + selectedBet.val.slice(1),
      half: selectedBet.val === 'low' ? '1–18' : '19–36',
      dozen: selectedBet.val === '1' ? '1–12' : selectedBet.val === '2' ? '13–24' : '25–36',
      col: `Column ${selectedBet.val}`,
    };
    el.textContent = `Betting on: ${labels[selectedBet.type]}`;
  }

  // Click handlers for board cells
  container.querySelectorAll('.rb-cell, .rb-outside').forEach(el => {
    el.addEventListener('click', () => {
      if (spinning) return;
      container.querySelectorAll('.rb-cell.selected, .rb-outside.selected').forEach(e => e.classList.remove('selected'));
      selectedBet = { type: el.dataset.bet, val: el.dataset.val };
      el.classList.add('selected');
      updateSelectionLabel();
    });
  });

  document.getElementById('roulette-clear-btn').addEventListener('click', () => {
    if (spinning) return;
    container.querySelectorAll('.rb-cell.selected, .rb-outside.selected').forEach(e => e.classList.remove('selected'));
    selectedBet = null;
    updateSelectionLabel();
  });

  container.querySelectorAll('.quick-bet-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.getElementById('roulette-bet').value = btn.dataset.amt; });
  });

  // ── Payout calculator ────────────────────────────────────────────────────
  function checkWin(result, bet) {
    const col = numColor(result);
    switch (bet.type) {
      case 'number': return parseInt(bet.val) === result ? 35 : 0;
      case 'color':  return result !== 0 && col === bet.val ? 1 : 0;
      case 'parity': return result !== 0 && (bet.val === 'even' ? result % 2 === 0 : result % 2 !== 0) ? 1 : 0;
      case 'half':   return result !== 0 && (bet.val === 'low' ? result <= 18 : result >= 19) ? 1 : 0;
      case 'dozen': {
        const d = bet.val === '1' ? [1,12] : bet.val === '2' ? [13,24] : [25,36];
        return result >= d[0] && result <= d[1] ? 2 : 0;
      }
      case 'col': {
        // Columns: col1 = 1,4,7..34 col2 = 2,5,8..35 col3 = 3,6,9..36
        return result !== 0 && result % 3 === parseInt(bet.val) % 3 ? 2 : 0;
      }
    }
    return 0;
  }

  // ── Spin ─────────────────────────────────────────────────────────────────
  document.getElementById('roulette-spin-btn').addEventListener('click', () => {
    if (spinning) return;
    if (!selectedBet) { showToast('Select a bet first.'); return; }
    const bet = parseBet(document.getElementById('roulette-bet'));
    if (!validateBet(bet)) return;

    deductBalance(bet);
    spinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;
    document.getElementById('roulette-result-num').style.display = 'none';
    document.getElementById('roulette-result').style.display = 'none';
    document.getElementById('roulette-result-label').textContent = '';

    // Pick result
    const resultNum = Math.floor(Math.random() * 37); // 0–36
    const resultIdx = WHEEL_NUMS.indexOf(resultNum);

    // Target angle: pointer (top = -PI/2) points at resultIdx slice center
    const targetSliceAngle = -(resultIdx * SLICE + SLICE / 2);
    const fullSpins = (Math.PI * 2) * (5 + Math.floor(Math.random() * 3));
    const startAngle = wheelAngle;
    const endAngle = startAngle + fullSpins + (targetSliceAngle - ((startAngle + fullSpins) % (Math.PI * 2)));

    const duration = 4000;
    const startTime = performance.now();

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      wheelAngle = startAngle + (endAngle - startAngle) * easeOut(t);
      drawWheel(wheelAngle);
      if (t < 1) {
        animFrame = requestAnimationFrame(animate);
      } else {
        wheelAngle = endAngle;
        drawWheel(wheelAngle);
        finishSpin(resultNum, bet);
      }
    }

    animFrame = requestAnimationFrame(animate);
  });

  function finishSpin(result, bet) {
    spinning = false;
    document.getElementById('roulette-spin-btn').disabled = false;

    const col = numColor(result);
    const numEl = document.getElementById('roulette-result-num');
    numEl.textContent = result;
    numEl.className = `roulette-result-num ${col}`;
    numEl.style.display = 'block';

    const labelEl = document.getElementById('roulette-result-label');
    labelEl.textContent = col.charAt(0).toUpperCase() + col.slice(1);
    labelEl.style.color = col === 'red' ? '#f87171' : col === 'green' ? 'var(--green)' : 'var(--text-dim)';

    const mult = checkWin(result, selectedBet);
    const resultEl = document.getElementById('roulette-result');
    resultEl.style.display = 'block';

    if (mult > 0) {
      const payout = bet + bet * mult;
      addBalance(payout);
      resultEl.textContent = `Won ${payout.toLocaleString()} tokens (${mult}:1)`;
      resultEl.className = 'result-msg win';
      showToast(`+${payout.toLocaleString()} tokens`, 'win');
    } else {
      resultEl.textContent = `Lost ${bet.toLocaleString()} tokens.`;
      resultEl.className = 'result-msg lose';
      showToast(`-${bet.toLocaleString()} tokens`, 'lose');
    }
  }
}
