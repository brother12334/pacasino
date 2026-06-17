function renderPlinko(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Plinko</div>
      <div class="game-desc">Drop a ball from the top. It bounces off pegs on the way down and lands in a prize slot. Higher-risk slots pay more.</div>
      <canvas id="plinko-canvas" width="520" height="480"></canvas>
      <div class="bet-row" style="margin-top:14px;">
        <label>Bet</label>
        <input type="number" class="bet-input" id="pk-bet" value="50" min="1"/>
        <div class="quick-bets">
          <button class="quick-bet-btn" onclick="document.getElementById('pk-bet').value=25">25</button>
          <button class="quick-bet-btn" onclick="document.getElementById('pk-bet').value=50">50</button>
          <button class="quick-bet-btn" onclick="document.getElementById('pk-bet').value=100">100</button>
        </div>
        <button class="btn-primary" id="pk-drop">Drop Ball</button>
      </div>
      <div id="pk-result"></div>
    </div>`;

  const canvas = document.getElementById('plinko-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const ROWS = 10, PEG_R = 5, BALL_R = 9;
  const MULTS = [10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10];
  const MULT_COLORS = ['#c8a96e','#9a7d4a','#4f8ef0','#555a68','#444','#333','#444','#555a68','#4f8ef0','#9a7d4a','#c8a96e'];

  let pegs = [], balls = [], animId = null;
  let dropping = false;

  function buildPegs() {
    pegs = [];
    for (let row = 0; row < ROWS; row++) {
      const cols = row + 2;
      const rowW = (cols - 1) * 44;
      const startX = W / 2 - rowW / 2;
      for (let col = 0; col < cols; col++) {
        pegs.push({ x: startX + col * 44, y: 70 + row * 36 });
      }
    }
  }

  function drawPegs() {
    pegs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
      ctx.fillStyle = '#3a3f52';
      ctx.fill();
      ctx.strokeStyle = '#555a68';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawBuckets() {
    const numBuckets = MULTS.length;
    const bucketW = W / numBuckets;
    MULTS.forEach((m, i) => {
      const x = i * bucketW;
      const y = H - 52;
      ctx.fillStyle = MULT_COLORS[i] + '33';
      ctx.fillRect(x + 2, y, bucketW - 4, 44);
      ctx.strokeStyle = MULT_COLORS[i];
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y, bucketW - 4, 44);
      ctx.fillStyle = MULT_COLORS[i];
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(m + 'x', x + bucketW / 2, y + 28);
    });
  }

  function dropBall(startX) {
    balls.push({
      x: startX, y: 30,
      vx: (Math.random() - 0.5) * 0.5, vy: 2,
      landed: false, landSlot: -1,
      trail: []
    });
  }

  function updateBalls() {
    balls.forEach(ball => {
      if (ball.landed) return;
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 12) ball.trail.shift();

      ball.vy += 0.25;
      ball.vx *= 0.99;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Collide with pegs
      pegs.forEach(p => {
        const dx = ball.x - p.x, dy = ball.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PEG_R + BALL_R) {
          const nx = dx / dist, ny = dy / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;
          ball.vx += (Math.random() - 0.5) * 0.8;
          ball.vy = Math.abs(ball.vy) * 0.7;
          ball.x = p.x + nx * (PEG_R + BALL_R + 1);
          ball.y = p.y + ny * (PEG_R + BALL_R + 1);
        }
      });

      // Walls
      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }

      // Landing
      if (ball.y > H - 55) {
        ball.landed = true;
        ball.y = H - 55;
        const slot = Math.min(MULTS.length - 1, Math.floor(ball.x / (W / MULTS.length)));
        ball.landSlot = slot;
      }
    });
  }

  function drawBalls() {
    balls.forEach(ball => {
      // Trail
      ball.trail.forEach((t, i) => {
        const alpha = i / ball.trail.length * 0.4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,169,110,${alpha})`;
        ctx.fill();
      });
      // Ball
      const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
      grad.addColorStop(0, '#e8c870');
      grad.addColorStop(1, '#9a7d4a');
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  let pendingResolve = null;

  function loop() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#16181c';
    ctx.fillRect(0, 0, W, H);
    drawBuckets();
    drawPegs();
    updateBalls();
    drawBalls();

    // Check landed
    balls.forEach(ball => {
      if (ball.landed && ball.landSlot >= 0 && pendingResolve) {
        const mult = MULTS[ball.landSlot];
        const resolve = pendingResolve;
        pendingResolve = null;
        ball.landSlot = -99; // prevent double resolve
        setTimeout(() => resolve(mult, ball.x, ball.y), 300);
      }
    });

    animId = requestAnimationFrame(loop);
  }

  buildPegs();
  animId = requestAnimationFrame(loop);

  document.getElementById('pk-drop').addEventListener('click', () => {
    if (dropping) return;
    const bet = parseBet(document.getElementById('pk-bet'));
    if (!validateBet(bet)) return;
    deductBalance(bet);
    dropping = true;
    document.getElementById('pk-drop').disabled = true;
    document.getElementById('pk-result').innerHTML = '';
    dropBall(W / 2 + (Math.random() - 0.5) * 20);
    pendingResolve = (mult) => {
      const win = bet * mult;
      addBalance(win);
      dropping = false;
      document.getElementById('pk-drop').disabled = false;
      const type = mult >= 1.5 ? 'win' : mult >= 1 ? 'push' : 'lose';
      document.getElementById('pk-result').innerHTML = `<div class="result-msg ${type}">Landed on ${mult}x — ${mult >= 1 ? 'won' : 'lost'} ${Math.abs(win - bet).toFixed(2)} TKN${mult >= 1 ? '!' : '.'}</div>`;
    };
  });

  const observer = new MutationObserver(() => {
    if (!document.getElementById('plinko-canvas')) { cancelAnimationFrame(animId); observer.disconnect(); }
  });
  observer.observe(document.getElementById('game-container'), { childList: true });
}
