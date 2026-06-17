function renderBlackjack(container) {
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  let deck=[], playerHand=[], dealerHand=[], active=false, currentBet=0;

  function buildDeck() {
    deck=[];
    for(let s of SUITS) for(let r of RANKS) deck.push({r,s});
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  }
  function deal(){return deck.pop();}
  function cardVal(c){if(['J','Q','K'].includes(c.r))return 10;if(c.r==='A')return 11;return parseInt(c.r);}
  function handVal(hand){
    let v=hand.reduce((a,c)=>a+cardVal(c),0);
    let aces=hand.filter(c=>c.r==='A').length;
    while(v>21&&aces>0){v-=10;aces--;}
    return v;
  }
  function isRed(c){return c.s==='♥'||c.s==='♦';}
  function cardHTML(c,faceDown=false){
    if(faceDown) return `<div class="card face-down"></div>`;
    return `<div class="card${isRed(c)?' red':''}"><div class="card-corner">${c.r}<br>${c.s}</div>${c.r}<br><span style="font-size:14px">${c.s}</span></div>`;
  }

  function render(dealerReveal=false){
    const dv=handVal(dealerReveal?dealerHand:[dealerHand[0]]);
    document.getElementById('bj-dealer-hand').innerHTML=dealerHand.map((c,i)=>cardHTML(c,!dealerReveal&&i>0)).join('');
    document.getElementById('bj-dealer-val').textContent=`${dealerReveal?handVal(dealerHand):cardVal(dealerHand[0])}${!dealerReveal&&dealerHand.length>1?' + ?':''}`;
    document.getElementById('bj-player-hand').innerHTML=playerHand.map(c=>cardHTML(c)).join('');
    document.getElementById('bj-player-val').textContent=handVal(playerHand);
    const pv=handVal(playerHand);
    document.getElementById('bj-hit').disabled=!active;
    document.getElementById('bj-stand').disabled=!active;
    const canDouble=active&&playerHand.length===2&&getBalance()>=currentBet;
    document.getElementById('bj-double').disabled=!canDouble;
  }

  function endGame(msg,type){
    active=false;
    document.getElementById('bj-result').innerHTML=`<div class="result-msg ${type}">${msg}</div>`;
    document.getElementById('bj-deal').disabled=false;
    render(true);
  }

  function dealerPlay(){
    let v=handVal(dealerHand);
    const go=()=>{
      v=handVal(dealerHand);
      if(v<17){
        setTimeout(()=>{dealerHand.push(deal());render(true);go();},500);
      } else {
        const pv=handVal(playerHand);
        if(v>21) endGame(`Dealer busts at ${v}. You win ${(currentBet*2).toFixed(2)} TKN!`,'win'),addBalance(currentBet*2);
        else if(v>pv) endGame(`Dealer wins (${v} vs ${pv}). You lost ${currentBet.toLocaleString()} TKN.`,'lose');
        else if(v<pv) endGame(`You win! (${pv} vs ${v}) — +${currentBet.toFixed(2)} TKN`,'win'),addBalance(currentBet*2);
        else endGame(`Push — ${pv} vs ${v}. Bet returned.`,'push'),addBalance(currentBet);
      }
    };
    go();
  }

  container.innerHTML=`
    <div class="game-wrap">
      <div class="game-title">Blackjack</div>
      <div class="game-desc">Beat the dealer to 21. Go over and you bust. Blackjack (A + 10-value) pays 1.5x your bet.</div>
      <div class="bj-table">
        <div class="bj-hand-label">Dealer</div>
        <div class="bj-hand" id="bj-dealer-hand"></div>
        <div class="bj-hand-value" id="bj-dealer-val"></div>
        <div class="bj-hand-label">You</div>
        <div class="bj-hand" id="bj-player-hand"></div>
        <div class="bj-hand-value" id="bj-player-val"></div>
      </div>
      <div class="bet-row">
        <label>Bet</label>
        <input type="number" class="bet-input" id="bj-bet" value="50" min="1"/>
        <div class="quick-bets">
          <button class="quick-bet-btn" onclick="document.getElementById('bj-bet').value=25">25</button>
          <button class="quick-bet-btn" onclick="document.getElementById('bj-bet').value=50">50</button>
          <button class="quick-bet-btn" onclick="document.getElementById('bj-bet').value=100">100</button>
        </div>
        <button class="btn-primary" id="bj-deal">Deal</button>
      </div>
      <div class="bj-actions">
        <button class="btn-secondary" id="bj-hit" disabled>Hit</button>
        <button class="btn-secondary" id="bj-stand" disabled>Stand</button>
        <button class="btn-secondary" id="bj-double" disabled>Double Down</button>
      </div>
      <div id="bj-result"></div>
    </div>`;

  document.getElementById('bj-deal').addEventListener('click',()=>{
    const bet=parseBet(document.getElementById('bj-bet'));
    if(!validateBet(bet))return;
    currentBet=bet; deductBalance(bet);
    buildDeck();
    playerHand=[deal(),deal()]; dealerHand=[deal(),deal()];
    active=true;
    document.getElementById('bj-result').innerHTML='';
    document.getElementById('bj-deal').disabled=true;
    render(false);
    // Check blackjack
    if(handVal(playerHand)===21){
      if(handVal(dealerHand)===21){endGame('Both blackjack — push. Bet returned.','push');addBalance(currentBet);}
      else{const win=currentBet*2.5;addBalance(win);endGame(`Blackjack! You win ${win.toFixed(2)} TKN.`,'win');}
    }
  });

  document.getElementById('bj-hit').addEventListener('click',()=>{
    if(!active)return;
    playerHand.push(deal()); render(false);
    if(handVal(playerHand)>21){endGame(`Bust at ${handVal(playerHand)}. You lost ${currentBet.toLocaleString()} TKN.`,'lose');}
    else if(handVal(playerHand)===21){document.getElementById('bj-hit').disabled=true;dealerPlay();}
  });

  document.getElementById('bj-stand').addEventListener('click',()=>{if(!active)return;active=false;dealerPlay();});

  document.getElementById('bj-double').addEventListener('click',()=>{
    if(!active||playerHand.length!==2)return;
    deductBalance(currentBet); currentBet*=2;
    playerHand.push(deal()); render(false);
    if(handVal(playerHand)>21){endGame(`Bust at ${handVal(playerHand)}. You lost ${currentBet.toLocaleString()} TKN.`,'lose');}
    else{active=false;dealerPlay();}
  });
}
