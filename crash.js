function renderCrash(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Crash</div>
      <div class="game-desc">A multiplier climbs from 1x upward. Cash out before it crashes — wait too long and you lose everything. The longer it runs, the higher it can go.</div>
      <div class="crash-canvas-wrap">
        <canvas id="crash-canvas"></canvas>
        <div class="crash-multiplier" id="crash-mult">1.00x</div>
        <div class="crash-status" id="crash-status">Place a bet and start the round</div>
      </div>
      <div class="bet-row">
        <label>Bet</label>
        <input type="number" class="bet-input" id="cr2-bet" value="50" min="1"/>
        <div class="quick-bets">
          <button class="quick-bet-btn" onclick="document.getElementById('cr2-bet').value=25">25</button>
          <button class="quick-bet-btn" onclick="document.getElementById('cr2-bet').value=100">100</button>
          <button class="quick-bet-btn" onclick="document.getElementById('cr2-bet').value=250">250</button>
        </div>
        <button class="btn-primary" id="cr2-start">Start Round</button>
        <button class="btn-green" id="cr2-cashout" disabled>Cash Out</button>
      </div>
      <div id="cr2-result"></div>
    </div>`;

  const canvas = document.getElementById('crash-canvas');
  const area = canvas.parentElement;
  canvas.width = area.clientWidth || 700;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  let animId = null, running = false, crashed = false;
  let mult = 1.0, crashAt = 1.0, currentBet = 0;
  let elapsed = 0, lastTime = null;
  let history = []; // { mult, crashed }

  function genCrashPoint() {
    // Provably fair-ish: house edge ~5%, biased exponential
    const r = Math.random();
    if (r < 0.05) return 1.0; // instant crash 5%
    return Math.max(1.01, (1 / (1 - r * 0.95)).toFixed(2) * 1);
  }

  function drawGraph() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#16181c';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1e2026';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = H - (i / 4) * (H - 40) - 20;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 10, y); ctx.stroke();
      ctx.fillStyle = '#555a68'; ctx.font = '10px Arial'; ctx.textAlign = 'right';
      ctx.fillText((1 + i * 1).toFixed(1) + 'x', 36, y + 3);
    }

    if (history.length === 0) return;

    // Build curve points
    const maxMult = Math.max(mult * 1.1, 2);
    const points = [];
    const steps = Math.min(200, Math.floor(elapsed / 20));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const m = 1 + (mult - 1) * t * t;
      const px = 40 + t * (W - 50);
      const py = H - 20 - ((m - 1) / (maxMult - 1)) * (H - 60);
      points.push({ x: px, y: Math.max(10, py) });
    }

    if (points.length < 2) return;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (crashed) {
      grad.addColorStop(0, 'rgba(240,79,79,0.15)');
      grad.addColorStop(1, 'rgba(240,79,79,0.02)');
    } else {
      grad.addColorStop(0, 'rgba(62,207,116,0.15)');
      grad.addColorStop(1, 'rgba(62,207,116,0.02)');
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, H - 20);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, H - 20);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = crashed ? '#f04f4f' : '#3ecf74';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dot at tip
    if (!crashed) {
      const last = points[points.length - 1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#3ecf74'; ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(62,207,116,0.2)'; ctx.fill();
    }
  }

  function tick(ts) {
    if (!running) return;
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime; lastTime = ts;
    elapsed += dt;

    // Multiplier grows exponentially over time
    mult = Math.pow(1.0006, elapsed);
    history.push(mult);

    document.getElementById('crash-mult').textContent = mult.toFixed(2) + 'x';

    if (mult >= crashAt) {
      crashed = true; running = false;
      mult = crashAt;
      document.getElementById('crash-mult').textContent = mult.toFixed(2) + 'x';
      document.getElementById('crash-mult').classList.add('crashed');
      document.getElementById('crash-status').textContent = 'CRASHED';
      document.getElementById('cr2-start').disabled = false;
      document.getElementById('cr2-cashout').disabled = true;
      if (currentBet > 0) {
        document.getElementById('cr2-result').innerHTML = `<div class="result-msg lose">Crashed at ${mult.toFixed(2)}x — you lost ${currentBet.toLocaleString()} TKN.</div>`;
        currentBet = 0;
      }
      drawGraph();
      return;
    }

    drawGraph();
    animId = requestAnimationFrame(tick);
  }

  drawGraph();

  document.getElementById('cr2-start').addEventListener('click', () => {
    const bet = parseBet(document.getElementById('cr2-bet'));
    if (!validateBet(bet)) return;
    currentBet = bet;
    deductBalance(bet);
    crashed = false;
    running = true;
    elapsed = 0; lastTime = null; mult = 1.0; history = [];
    crashAt = genCrashPoint();
    document.getElementById('crash-mult').textContent = '1.00x';
    document.getElementById('crash-mult').classList.remove('crashed');
    document.getElementById('crash-status').textContent = 'Running...';
    document.getElementById('cr2-result').innerHTML = '';
    document.getElementById('cr2-start').disabled = true;
    document.getElementById('cr2-cashout').disabled = false;
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(tick);
  });

  document.getElementById('cr2-cashout').addEventListener('click', () => {
    if (!running || currentBet === 0) return;
    running = false;
    cancelAnimationFrame(animId);
    const win = currentBet * mult;
    addBalance(win);
    document.getElementById('cr2-start').disabled = false;
    document.getElementById('cr2-cashout').disabled = true;
    document.getElementById('cr2-result').innerHTML = `<div class="result-msg win">Cashed out at ${mult.toFixed(2)}x — won ${win.toFixed(2)} TKN!</div>`;
    document.getElementById('crash-status').textContent = 'Cashed out';
    currentBet = 0;
  });

  const observer = new MutationObserver(() => {
    if (!document.getElementById('crash-canvas')) { cancelAnimationFrame(animId); observer.disconnect(); }
  });
  observer.observe(document.getElementById('game-container'), { childList: true });
}
