function renderChicken(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Chicken Road</div>
      <div class="game-desc">Place your bet, then watch the chicken jump from road to road. Each oven it passes raises the multiplier. Cash out any time — or lose it all if a car strikes.</div>
      <div class="chicken-hud">
        <div class="chicken-stat"><span class="s-label">Multiplier</span><span class="s-value" id="cr-mult">1.00x</span></div>
        <div class="chicken-stat"><span class="s-label">Payout</span><span class="s-value" id="cr-payout">0</span></div>
        <div class="chicken-stat"><span class="s-label">Ovens Passed</span><span class="s-value" id="cr-ovens">0</span></div>
      </div>
      <div class="chicken-canvas-area">
        <canvas id="chicken-canvas"></canvas>
      </div>
      <div class="bet-row">
        <label>Bet</label>
        <input type="number" class="bet-input" id="cr-bet" value="50" min="1"/>
        <div class="quick-bets">
          <button class="quick-bet-btn" onclick="document.getElementById('cr-bet').value=25">25</button>
          <button class="quick-bet-btn" onclick="document.getElementById('cr-bet').value=100">100</button>
          <button class="quick-bet-btn" onclick="document.getElementById('cr-bet').value=250">250</button>
        </div>
        <button class="btn-primary" id="cr-start">Start</button>
        <button class="btn-green" id="cr-cashout" disabled>Cash Out</button>
      </div>
      <div id="cr-result"></div>
    </div>`;

  const canvas = document.getElementById('chicken-canvas');
  const area = canvas.parentElement;
  let W, H;
  function resize() {
    W = area.clientWidth; H = area.clientHeight;
    canvas.width = W; canvas.height = H;
  }
  resize();

  // Game state
  let active = false, currentBet = 0, mult = 1.0, ovens = 0;
  let animId = null;
  let roads = [], chicken = {}, particles = [], cars = [];
  let phase = 'idle'; // idle | jumping | celebrating | dead
  let jumpProgress = 0, jumpFrom = 0, jumpTo = 0;
  let cameraX = 0, targetCameraX = 0;
  const ROAD_W = 110, ROAD_GAP = 30, ROAD_H_FRAC = 0.55;
  const NUM_ROADS = 20;

  function buildLevel() {
    roads = [];
    for (let i = 0; i < NUM_ROADS; i++) {
      roads.push({
        x: i * (ROAD_W + ROAD_GAP),
        hasOven: i > 0 && i < NUM_ROADS - 1,
        ovenLit: i > 0 && i < NUM_ROADS - 1,
      });
    }
    chicken = { roadIdx: 0, y: 0, vy: 0, bobT: 0, dead: false, celebrating: false };
    cars = [];
    cameraX = 0; targetCameraX = 0;
    phase = 'idle';
    mult = 1.0; ovens = 0;
    updateHUD();
  }

  function updateHUD() {
    const m = document.getElementById('cr-mult');
    const p = document.getElementById('cr-payout');
    const o = document.getElementById('cr-ovens');
    if (m) m.textContent = mult.toFixed(2) + 'x';
    if (p) p.textContent = (currentBet * mult).toFixed(2);
    if (o) o.textContent = ovens;
  }

  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      particles.push({
        x, y, vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3) - 2,
        life: 1, decay: 0.03 + Math.random() * 0.02, color,
        size: 4 + Math.random() * 4
      });
    }
  }

  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function draw(ts) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const groundY = H * ROAD_H_FRAC;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#0a1628'); sky.addColorStop(1, '#1a2a40');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);

    // Ground
    ctx.fillStyle = '#1a1d22'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#22262e'; ctx.fillRect(0, groundY, W, 3);

    // Camera smoothing
    cameraX += (targetCameraX - cameraX) * 0.08;

    // Draw roads
    roads.forEach((road, i) => {
      const rx = road.x - cameraX + W * 0.25;
      if (rx < -ROAD_W - 20 || rx > W + 20) return;

      // Road surface
      const rd = ctx.createLinearGradient(rx, groundY - 60, rx, groundY + 20);
      rd.addColorStop(0, '#2a2f3a'); rd.addColorStop(1, '#1e2228');
      ctx.fillStyle = rd;
      ctx.beginPath();
      ctx.roundRect(rx, groundY - 55, ROAD_W, 60, [6,6,0,0]);
      ctx.fill();

      // Road stripe
      ctx.strokeStyle = '#3a3f4d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx + ROAD_W/2, groundY - 50); ctx.lineTo(rx + ROAD_W/2, groundY - 5);
      ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);

      // Oven
      if (road.hasOven) {
        const ox = rx + ROAD_W/2 - 14;
        const oy = groundY - 90;
        // Oven body
        ctx.fillStyle = '#3d4050';
        ctx.beginPath(); ctx.roundRect(ox, oy, 28, 32, 4); ctx.fill();
        ctx.strokeStyle = '#555868'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(ox, oy, 28, 32, 4); ctx.stroke();
        // Oven window
        ctx.fillStyle = road.ovenLit ? '#ff6b35' : '#2a2a35';
        ctx.beginPath(); ctx.roundRect(ox + 4, oy + 6, 20, 14, 3); ctx.fill();
        if (road.ovenLit) {
          // Flame glow
          const flicker = 0.6 + 0.4 * Math.sin(ts * 0.01 + i);
          ctx.save();
          ctx.globalAlpha = flicker * 0.4;
          const g = ctx.createRadialGradient(ox+14, oy+13, 0, ox+14, oy+13, 20);
          g.addColorStop(0, '#ff6b35'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox+14, oy+13, 20, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
        // Multiplier label above oven
        if (i > 0) {
          const m = (1 + i * 0.22 + (i > 5 ? (i-5)*0.15 : 0)).toFixed(2);
          ctx.fillStyle = '#c8a96e'; ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center'; ctx.fillText(m + 'x', rx + ROAD_W/2, oy - 6);
        }
      }
      // Road number
      ctx.fillStyle = '#555a68'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`Road ${i + 1}`, rx + ROAD_W/2, groundY + 18);
    });

    // Cars
    cars.forEach(car => {
      car.x += car.vx;
      const cy = groundY - 30;
      ctx.save();
      if (car.vx < 0) { ctx.scale(-1, 1); ctx.translate(-2*car.x, 0); }
      // Body
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.roundRect(car.x - cameraX + W*0.25 - 22, cy - 14, 44, 22, 5); ctx.fill();
      // Windows
      ctx.fillStyle = '#aad4ff';
      ctx.beginPath(); ctx.roundRect(car.x - cameraX + W*0.25 - 14, cy - 22, 28, 12, 3); ctx.fill();
      // Wheels
      ctx.fillStyle = '#111';
      [-12, 12].forEach(wx => {
        ctx.beginPath(); ctx.arc(car.x - cameraX + W*0.25 + wx, cy + 10, 7, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    });
    cars = cars.filter(c => c.x > -200 && c.x < W + 200);

    // Chicken
    const chickenRoad = roads[chicken.roadIdx];
    const cr_screenX = chickenRoad.x - cameraX + W * 0.25 + ROAD_W / 2;
    let chickenX = cr_screenX, chickenY = groundY - 68;

    if (phase === 'jumping') {
      jumpProgress = Math.min(1, jumpProgress + 0.04);
      const t = easeInOut(jumpProgress);
      const fromRoad = roads[jumpFrom];
      const toRoad = roads[jumpTo];
      const sx = fromRoad.x - cameraX + W * 0.25 + ROAD_W / 2;
      const ex = toRoad.x - cameraX + W * 0.25 + ROAD_W / 2;
      chickenX = sx + (ex - sx) * t;
      chickenY = groundY - 68 - Math.sin(t * Math.PI) * 60;
      if (jumpProgress >= 1) {
        chicken.roadIdx = jumpTo;
        phase = 'idle';
        if (jumpTo > 0 && roads[jumpTo].hasOven) {
          ovens = jumpTo;
          mult = parseFloat((1 + jumpTo * 0.22 + (jumpTo > 5 ? (jumpTo-5)*0.15 : 0)).toFixed(2));
          spawnParticles(chickenX, chickenY, '#c8a96e', 10);
          updateHUD();
          // Spawn a car on this road with increasing probability
          if (Math.random() < 0.08 + jumpTo * 0.06) {
            triggerCarHit();
          } else {
            scheduleNextJump();
          }
        } else if (jumpTo === 0) {
          phase = 'idle';
        }
      }
    }

    // Bob animation when idle
    if (phase === 'idle' && !chicken.dead) {
      chicken.bobT = (chicken.bobT || 0) + 0.06;
      chickenY += Math.sin(chicken.bobT) * 2;
    }

    if (!chicken.dead) {
      drawChicken(ctx, chickenX, chickenY, phase === 'celebrating', ts);
    } else {
      drawDeadChicken(ctx, chickenX, chickenY);
    }

    // Particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.decay;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
    particles = particles.filter(p => p.life > 0);

    animId = requestAnimationFrame(draw);
  }

  function drawChicken(ctx, x, y, celebrating, ts) {
    ctx.save();
    if (celebrating) {
      const bounce = Math.sin(ts * 0.015) * 5;
      y += bounce;
    }
    // Body
    ctx.fillStyle = '#f5d76e';
    ctx.beginPath(); ctx.ellipse(x, y, 14, 16, 0, 0, Math.PI*2); ctx.fill();
    // Wing
    ctx.fillStyle = '#e8c55a';
    ctx.beginPath(); ctx.ellipse(x + 8, y + 2, 7, 10, 0.4, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#f5d76e';
    ctx.beginPath(); ctx.arc(x, y - 18, 10, 0, Math.PI*2); ctx.fill();
    // Comb
    ctx.fillStyle = '#e74c3c';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(x + i*4, y - 27 - Math.abs(i)*2, 4, 0, Math.PI*2); ctx.fill();
    }
    // Beak
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.moveTo(x + 8, y - 18); ctx.lineTo(x + 14, y - 15); ctx.lineTo(x + 8, y - 12); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 4, y - 20, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(x + 5, y - 20, 2, 0, Math.PI*2); ctx.fill();
    // Legs
    ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 14); ctx.lineTo(x - 5, y + 26); ctx.lineTo(x - 10, y + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y + 14); ctx.lineTo(x + 5, y + 26); ctx.lineTo(x + 10, y + 30); ctx.stroke();
    ctx.restore();
  }

  function drawDeadChicken(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.4);
    ctx.fillStyle = '#f5d76e'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function triggerCarHit() {
    const road = roads[chicken.roadIdx];
    const rx = road.x;
    const fromRight = Math.random() < 0.5;
    cars.push({ x: fromRight ? rx + W : rx - W, vx: fromRight ? -6 : 6, color: ['#e74c3c','#3498db','#2ecc71','#f39c12'][Math.floor(Math.random()*4)] });
    setTimeout(() => {
      phase = 'dead'; chicken.dead = true;
      const cx = road.x - cameraX + W*0.25 + ROAD_W/2;
      spawnParticles(cx, H * ROAD_H_FRAC - 60, '#f04f4f', 16);
      spawnParticles(cx, H * ROAD_H_FRAC - 60, '#f5d76e', 10);
      active = false;
      document.getElementById('cr-start').disabled = false;
      document.getElementById('cr-cashout').disabled = true;
      document.getElementById('cr-result').innerHTML = `<div class="result-msg lose">The chicken got hit on road ${chicken.roadIdx + 1}! You lost ${currentBet.toLocaleString()} TKN.</div>`;
    }, 500);
  }

  let jumpTimeout = null;
  function scheduleNextJump() {
    if (!active) return;
    if (chicken.roadIdx >= NUM_ROADS - 1) {
      // Reached the end!
      phase = 'celebrating';
      const win = currentBet * mult;
      addBalance(win);
      active = false;
      document.getElementById('cr-start').disabled = false;
      document.getElementById('cr-cashout').disabled = true;
      document.getElementById('cr-result').innerHTML = `<div class="result-msg win">The chicken made it! Won ${win.toFixed(2)} TKN at ${mult.toFixed(2)}x.</div>`;
      return;
    }
    jumpTimeout = setTimeout(() => {
      if (!active) return;
      startJump(chicken.roadIdx + 1);
    }, 900);
  }

  function startJump(toIdx) {
    if (!active) return;
    jumpFrom = chicken.roadIdx;
    jumpTo = toIdx;
    jumpProgress = 0;
    phase = 'jumping';
    targetCameraX = roads[toIdx].x - W * 0.15;
  }

  buildLevel();
  animId = requestAnimationFrame(draw);

  document.getElementById('cr-start').addEventListener('click', () => {
    const bet = parseBet(document.getElementById('cr-bet'));
    if (!validateBet(bet)) return;
    currentBet = bet;
    deductBalance(bet);
    active = true;
    buildLevel();
    document.getElementById('cr-result').innerHTML = '';
    document.getElementById('cr-start').disabled = true;
    document.getElementById('cr-cashout').disabled = false;
    scheduleNextJump();
  });

  document.getElementById('cr-cashout').addEventListener('click', () => {
    if (!active) return;
    clearTimeout(jumpTimeout);
    active = false;
    const win = currentBet * mult;
    addBalance(win);
    phase = 'celebrating';
    document.getElementById('cr-start').disabled = false;
    document.getElementById('cr-cashout').disabled = true;
    document.getElementById('cr-result').innerHTML = `<div class="result-msg win">Cashed out at ${mult.toFixed(2)}x — won ${win.toFixed(2)} TKN!</div>`;
  });

  // Cleanup on navigation
  const origNavigate = window.navigate;
  const observer = new MutationObserver(() => {
    if (!document.getElementById('chicken-canvas')) {
      cancelAnimationFrame(animId);
      clearTimeout(jumpTimeout);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('game-container'), { childList: true });
}
