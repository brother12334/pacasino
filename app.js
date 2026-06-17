// ── VAULTBET APP CORE ──────────────────────────────────────────────────────

const FAKE_USERS = [
  { login: 'player_one', avatar: null },
  { login: 'highroller99', avatar: null },
  { login: 'tokenmaster', avatar: null },
];

const State = {
  balance: 1000,
  user: null,
  currentGame: 'lobby',
};

// Balance helpers
function getBalance() { return State.balance; }
function setBalance(v) {
  State.balance = Math.max(0, Math.round(v * 100) / 100);
  renderBalance();
}
function addBalance(v) { setBalance(State.balance + v); }
function deductBalance(v) { setBalance(State.balance - v); }

function renderBalance() {
  const el = document.getElementById('balance-display');
  if (el) el.textContent = State.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function parseBet(inputEl) {
  const v = parseFloat(inputEl.value);
  return isNaN(v) || v <= 0 ? 0 : v;
}

function validateBet(bet) {
  if (bet <= 0) { showToast('Enter a valid bet amount.'); return false; }
  if (bet > State.balance) { showToast('Not enough tokens.'); return false; }
  return true;
}

// Toast
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type==='win'?'#3ecf74':type==='lose'?'#f04f4f':'#252830'};color:${type==='win'||type==='lose'?'#fff':'#e8e9ec'};padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:999;animation:fadeIn 0.2s ease;box-shadow:0 4px 20px rgba(0,0,0,0.4);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// Auth
document.getElementById('github-login-btn').addEventListener('click', () => {
  const u = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
  State.user = u;
  document.getElementById('user-name').textContent = u.login;
  document.getElementById('user-avatar').textContent = u.login[0].toUpperCase();
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  State.balance = 1000;
  renderBalance();
  navigate('lobby');
});

document.getElementById('logout-btn').addEventListener('click', () => {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('auth-modal').classList.remove('active');
  void document.getElementById('auth-modal').offsetWidth;
  document.getElementById('auth-modal').classList.add('active');
  State.balance = 1000;
  State.user = null;
});

// Navigation
function navigate(game) {
  State.currentGame = game;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.game === game);
  });
  const gc = document.getElementById('game-container');
  gc.innerHTML = '';
  gc.className = 'fade-in';
  void gc.offsetWidth;
  gc.className = 'fade-in';

 const renderers = {
    lobby: renderLobby,
    mines: typeof renderMines !== 'undefined' ? renderMines : null,
    chicken: typeof renderChicken !== 'undefined' ? renderChicken : null,
    blackjack: typeof renderBlackjack !== 'undefined' ? renderBlackjack : null,
    plinko: typeof renderPlinko !== 'undefined' ? renderPlinko : null,
    keno: typeof renderKeno !== 'undefined' ? renderKeno : null,
    crash: typeof renderCrash !== 'undefined' ? renderCrash : null,
    poker: typeof renderPoker !== 'undefined' ? renderPoker : null,
    roulette: typeof renderRoulette !== 'undefined' ? renderRoulette : null,
    dice: typeof renderDice !== 'undefined' ? renderDice : null,
  };
  if (renderers[game]) renderers[game](gc);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.game); });
});

// Lobby
function renderLobby(container) {
  const games = [
    { id:'mines', icon:'💎', name:'Mines', desc:'Avoid bombs, collect gems. Cash out before you blow up.' },
    { id:'chicken', icon:'🐔', name:'Chicken Road', desc:'Jump past ovens. Every oven raises the multiplier — get hit and lose it all.' },
    { id:'blackjack', icon:'🃏', name:'Blackjack', desc:'Beat the dealer to 21 without going over.' },
    { id:'plinko', icon:'🔴', name:'Plinko', desc:'Drop a ball and watch it bounce down to a prize slot.' },
    { id:'keno', icon:'🎯', name:'Keno', desc:'Pick your numbers, see how many the draw matches.' },
    { id:'crash', icon:'📈', name:'Crash', desc:'A multiplier climbs until it crashes. Cash out in time or lose everything.' },
    { id:'poker', icon:'♠️', name:'Video Poker', desc:'Five-card draw — build the best hand and get paid.' },
    { id:'roulette', icon:'🎡', name:'Roulette', desc:'Bet on numbers, colors, or ranges and spin the wheel.' },
    { id:'dice', icon:'🎲', name:'Dice', desc:'Roll two dice. Bet whether the total will be over or under your target.' },
  ];
  container.innerHTML = `
    <div class="lobby-hero">
      <h1>Good luck out there.</h1>
      <p>You have ${State.balance.toLocaleString()} tokens. They're yours — no strings, no real money, no deposits. Pick a game and play.</p>
    </div>
    <div class="games-grid">
      ${games.map(g => `<div class="game-card" data-game="${g.id}">
        <div class="game-card-icon">${g.icon}</div>
        <div class="game-card-name">${g.name}</div>
        <div class="game-card-desc">${g.desc}</div>
      </div>`).join('')}
    </div>`;
  container.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.game));
  });
}
