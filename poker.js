// ── VIDEO POKER (Jacks or Better) ─────────────────────────────────────────

function renderPoker(container) {
  container.innerHTML = `
    <div class="game-wrap">
      <div class="game-title">Video Poker</div>
      <div class="game-desc">Jacks or Better — five-card draw. Click cards to hold them, then draw.</div>

      <div class="poker-table">
        <div class="poker-hand-name" id="poker-hand-name"></div>
        <div class="poker-hand" id="poker-hand"></div>
        <div class="result-msg" id="poker-result" style="display:none"></div>
      </div>

      <div class="bet-row">
        <label>Bet</label>
        <input class="bet-input" id="poker-bet" type="number" min="1" value="10" />
        <div class="quick-bets">
          <button class="quick-bet-btn" data-amt="5">5</button>
          <button class="quick-bet-btn" data-amt="10">10</button>
          <button class="quick-bet-btn" data-amt="25">25</button>
          <button class="quick-bet-btn" data-amt="50">50</button>
        </div>
        <button class="btn-primary" id="poker-deal-btn">Deal</button>
      </div>

      <div class="poker-payouts">
        <span class="ph">Royal Flush</span>      <span class="pm">800x</span>
        <span class="ph">Straight Flush</span>   <span class="pm">50x</span>
        <span class="ph">Four of a Kind</span>   <span class="pm">25x</span>
        <span class="ph">Full House</span>        <span class="pm">9x</span>
        <span class="ph">Flush</span>             <span class="pm">6x</span>
        <span class="ph">Straight</span>          <span class="pm">4x</span>
        <span class="ph">Three of a Kind</span>  <span class="pm">3x</span>
        <span class="ph">Two Pair</span>          <span class="pm">2x</span>
        <span class="ph">Jacks or Better</span>  <span class="pm">1x</span>
      </div>
    </div>`;

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RED_SUITS = new Set(['♥','♦']);

  let deck = [], hand = [], held = [], phase = 'idle'; // idle → deal → draw → idle

  function buildDeck() {
    deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function dealCards(n) {
    return deck.splice(0, n);
  }

  // ── Hand evaluator ──────────────────────────────────────────────────────
  function rankVal(r) { return RANKS.indexOf(r); }

  function evaluate(cards) {
    const vals = cards.map(c => rankVal(c.r)).sort((a, b) => a - b);
    const suits = cards.map(c => c.s);
    const counts = {};
    vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const groups = Object.values(counts).sort((a, b) => b - a);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = vals[4] - vals[0] === 4 && groups[0] === 1;
    // Ace-low straight: A-2-3-4-5
    const isWheelStraight = JSON.stringify(vals) === JSON.stringify([0,1,2,3,12]);

    if (isFlush && (isStraight || isWheelStraight)) {
      return vals[4] === 12 && vals[3] === 11 ? { name: 'Royal Flush', mult: 800 }
                                               : { name: 'Straight Flush', mult: 50 };
    }
    if (groups[0] === 4) return { name: 'Four of a Kind', mult: 25 };
    if (groups[0] === 3 && groups[1] === 2) return { name: 'Full House', mult: 9 };
    if (isFlush) return { name: 'Flush', mult: 6 };
    if (isStraight || isWheelStraight) return { name: 'Straight', mult: 4 };
    if (groups[0] === 3) return { name: 'Three of a Kind', mult: 3 };
    if (groups[0] === 2 && groups[1] === 2) {
      // Two pair — check if either pair is J/Q/K/A for "Jacks or Better" consideration
      return { name: 'Two Pair', mult: 2 };
    }
    if (groups[0] === 2) {
      // Single pair — only pays if Jacks or Better
      const pairedVal = parseInt(Object.keys(counts).find(k => counts[k] === 2));
      if (pairedVal >= rankVal('J')) return { name: 'Jacks or Better', mult: 1 };
    }
    return { name: '', mult: 0 };
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  function renderHand(animate = false) {
    const handEl = document.getElementById('poker-hand');
    handEl.innerHTML = '';
    hand.forEach((card, i) => {
      const isRed = RED_SUITS.has(card.s);
      const wrap = document.createElement('div');
      wrap.className = 'poker-card-wrap';
      wrap.style.animationDelay = animate ? `${i * 60}ms` : '0ms';

      const cardEl = document.createElement('div');
      cardEl.className = `poker-card${isRed ? ' red' : ''}`;
      if (animate) cardEl.style.animationDelay = `${i * 60}ms`;
      cardEl.innerHTML = `
        <div class="card-corner">${card.r}<br>${card.s}</div>
        <div style="font-size:26px">${card.s}</div>`;

      if (phase === 'deal') {
        cardEl.title = 'Click to hold';
        cardEl.addEventListener('click', () => toggleHold(i, cardEl, wrap));
        if (held[i]) {
          cardEl.classList.add('held');
          const lbl = document.createElement('div');
          lbl.className = 'hold-label';
          lbl.textContent = 'HELD';
          wrap.appendChild(lbl);
        }
      }

      wrap.appendChild(cardEl);
      handEl.appendChild(wrap);
    });
  }

  function toggleHold(i, cardEl, wrap) {
    if (phase !== 'deal') return;
    held[i] = !held[i];
    cardEl.classList.toggle('held', held[i]);
    const existing = wrap.querySelector('.hold-label');
    if (held[i]) {
      if (!existing) {
        const lbl = document.createElement('div');
        lbl.className = 'hold-label';
        lbl.textContent = 'HELD';
        wrap.appendChild(lbl);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  function setResult(msg, type) {
    const el = document.getElementById('poker-result');
    el.textContent = msg;
    el.className = `result-msg ${type}`;
    el.style.display = 'block';
  }

  function clearResult() {
    const el = document.getElementById('poker-result');
    el.style.display = 'none';
    el.textContent = '';
  }

  // ── Game flow ───────────────────────────────────────────────────────────
  const dealBtn = document.getElementById('poker-deal-btn');
  const betInput = document.getElementById('poker-bet');

  document.querySelectorAll('#game-container .quick-bet-btn').forEach(btn => {
    btn.addEventListener('click', () => { betInput.value = btn.dataset.amt; });
  });

  dealBtn.addEventListener('click', () => {
    if (phase === 'idle') {
      const bet = parseBet(betInput);
      if (!validateBet(bet)) return;
      deductBalance(bet);
      buildDeck();
      hand = dealCards(5);
      held = [false, false, false, false, false];
      phase = 'deal';
      dealBtn.textContent = 'Draw';
      document.getElementById('poker-hand-name').textContent = '';
      clearResult();
      renderHand(true);
    } else if (phase === 'deal') {
      // Replace non-held cards
      hand = hand.map((card, i) => held[i] ? card : dealCards(1)[0]);
      phase = 'draw';
      renderHand(true);

      const result = evaluate(hand);
      const bet = parseBet(betInput);
      document.getElementById('poker-hand-name').textContent = result.name || 'No win';

      setTimeout(() => {
        if (result.mult > 0) {
          const winAmt = bet * result.mult;
          addBalance(winAmt);
          setResult(`${result.name} — you win ${winAmt.toLocaleString()} tokens`, 'win');
        } else {
          setResult('No winning hand. Better luck next time.', 'lose');
        }
        phase = 'idle';
        dealBtn.textContent = 'Deal';
      }, 400);
    }
  });
}
