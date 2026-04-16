// ====== GAME CLIENT ======
const socket = io();

let state = null;
let selectedCardId = null;
let selectingTarget = false;
let selectTargetFor = null;
let lordSkillTargeting = false; // true when selecting target for 激将
let discardSelection = new Set(); // cards selected for discard phase

// ====== HERO DATA (client side) ======
const HERO_PORTRAITS = {
  liubei:'🐉', guanyu:'⚔️', zhangfei:'🔥', zhugeliang:'🪶', zhaoyun:'🐴',
  machao:'🏇', huangyueying:'📜',
  caocao:'🦅', simayi:'🦊', xiaohoudun:'🗡️', zhangliao:'🏹', xuchu:'💪',
  guojia:'🎭', zhenji:'🌙',
  sunquan:'🐯', ganning:'⚓', lvmeng:'📖', huanggai:'🔥', zhouyu:'🎵',
  daqiao:'🌸', luxun:'📚', sunshangxiang:'🏹',
  lvbu:'👹', huatuo:'💊', diaochan:'🌺', huaxiong:'⚔️',
};
const HERO_NAMES = {
  liubei:'刘备', guanyu:'关羽', zhangfei:'张飞', zhugeliang:'诸葛亮', zhaoyun:'赵云',
  machao:'马超', huangyueying:'黄月英',
  caocao:'曹操', simayi:'司马懿', xiaohoudun:'夏侯惇', zhangliao:'张辽', xuchu:'许褚',
  guojia:'郭嘉', zhenji:'甄姬',
  sunquan:'孙权', ganning:'甘宁', lvmeng:'吕蒙', huanggai:'黄盖', zhouyu:'周瑜',
  daqiao:'大乔', luxun:'陆逊', sunshangxiang:'孙尚香',
  lvbu:'吕布', huatuo:'华佗', diaochan:'貂蝉', huaxiong:'华雄',
};
const ROLE_NAMES = { lord:'主公', loyalist:'忠臣', rebel:'反贼', spy:'内奸' };
const ROLE_CLASS = { lord:'role-lord', loyalist:'role-loyalist', rebel:'role-rebel', spy:'role-spy' };

const NEEDS_TARGET = ['attack','duel','dismantle','snatch','indulgence'];

// ====== DOM REFS ======
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Screens
const screens = { lobby: $('#lobby'), waiting: $('#waiting'), heroSelect: $('#heroSelect'), gameBoard: $('#gameBoard'), gameOver: $('#gameOver') };

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ====== TOAST ======
function showToast(msg) {
  let t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2500);
}

// ====== LOBBY ======
$('#btnCreate').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  socket.emit('createRoom', { playerName: name });
};
$('#btnJoin').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  const code = $('#roomCode').value.trim().toUpperCase();
  if (!code) { showToast('请输入房间号'); return; }
  socket.emit('joinRoom', { roomId: code, playerName: name });
};
$('#btnStart').onclick = () => socket.emit('startGame');
$('#btnEndTurn').onclick = () => { socket.emit('endTurn'); selectedCardId = null; selectingTarget = false; lordSkillTargeting = false; };
$('#btnRespond').onclick = () => { socket.emit('playCard', {}); selectedCardId = null; };
$('#btnBackLobby').onclick = () => { location.reload(); };
$('#btnSkill').onclick = () => {
  if (!state) return;
  const me = state.players.find(p => p.id === state.myId);
  if (!me) return;
  if (me.hero === 'liubei') socket.emit('skillAction', { skillType: 'rende' });
  if (me.hero === 'sunquan') socket.emit('skillAction', { skillType: 'zhiheng' });
  if (me.hero === 'huanggai') socket.emit('skillAction', { skillType: 'kurou' });
  if (me.hero === 'huatuo') socket.emit('skillAction', { skillType: 'qingnang' });
};
$('#btnJijiang').onclick = () => {
  if (!state) return;
  // Enter target selection mode for 激将
  lordSkillTargeting = true;
  selectingTarget = true;
  selectTargetFor = null;
  selectedCardId = null;
  renderGame();
};
$('#btnHujia').onclick = () => {
  if (!state) return;
  socket.emit('lordSkill', { type: 'hujia' });
};
$('#btnConfirmDiscard').onclick = () => {
  if (!state) return;
  const pa = state.pendingAction;
  if (!pa || pa.type !== 'discard') return;
  if (discardSelection.size !== pa.count) {
    showToast(`请选择恰好 ${pa.count} 张牌`);
    return;
  }
  socket.emit('discardCards', { cardIds: [...discardSelection] });
  discardSelection.clear();
};

// ====== SOCKET EVENTS ======
socket.on('roomCreated', ({ roomId }) => {
  $('#displayRoomCode').textContent = roomId;
  showScreen('waiting');
});
socket.on('roomJoined', ({ roomId }) => {
  $('#displayRoomCode').textContent = roomId;
  showScreen('waiting');
});
socket.on('error', msg => showToast(msg));
socket.on('log', msg => {}); // handled in gameState

socket.on('gameState', (gs) => {
  const prevPa = state?.pendingAction;
  state = gs;
  // Clear discard selection if we're no longer in discard phase
  if (!gs.pendingAction || gs.pendingAction.type !== 'discard' || gs.pendingAction.playerId !== gs.myId) {
    discardSelection.clear();
  }
  render();
});

// ====== RENDER ======
function render() {
  if (!state) return;

  if (state.state === 'waiting') {
    showScreen('waiting');
    renderWaiting();
  } else if (state.state === 'hero_select') {
    showScreen('heroSelect');
    renderHeroSelect();
  } else if (state.state === 'playing') {
    showScreen('gameBoard');
    renderGame();
  } else if (state.state === 'finished') {
    showScreen('gameOver');
    renderGameOver();
  }
}

function renderWaiting() {
  const count = state.players.length;
  $('.waiting-hint').textContent = `当前 ${count}/8 人 — ${count >= 2 ? '可以开始游戏，也可以继续等待更多玩家' : '至少需要 2 名玩家才能开始'}`;
  $('#btnStart').disabled = count < 2;
  $('#btnStart').textContent = count >= 2 ? `开始游戏 (${count}人)` : '等待玩家加入...';

  const list = $('#playerList');
  list.innerHTML = state.players.map((p, i) =>
    `<div class="player-entry">${i === 0 ? '👑 房主 · ' : ''}${p.name}${p.id === state.myId ? ' (你)' : ''}</div>`
  ).join('');
}

function renderHeroSelect() {
  const me = state.players.find(p => p.id === state.myId);
  const roleSpan = $('#myRole');
  roleSpan.textContent = ROLE_NAMES[me.role] || '???';
  roleSpan.className = ROLE_CLASS[me.role] || '';

  const heroes = [
    { key:'liubei', name:'刘备', kingdom:'蜀', hp:4, skill:'仁德/激将', desc:'出牌阶段可将手牌交给其他角色；主公技：令蜀国武将代出杀' },
    { key:'guanyu', name:'关羽', kingdom:'蜀', hp:4, skill:'武圣', desc:'可将红色牌当【杀】使用' },
    { key:'zhangfei', name:'张飞', kingdom:'蜀', hp:4, skill:'咆哮', desc:'出牌阶段使用【杀】无次数限制' },
    { key:'zhugeliang', name:'诸葛亮', kingdom:'蜀', hp:3, skill:'观星/空城', desc:'观星调牌序；空城：无手牌不被杀/决斗' },
    { key:'zhaoyun', name:'赵云', kingdom:'蜀', hp:4, skill:'龙胆', desc:'【杀】和【闪】可以互相替代' },
    { key:'machao', name:'马超', kingdom:'蜀', hp:4, skill:'马术/铁骑', desc:'距离-1；杀判定红色则不可闪' },
    { key:'huangyueying', name:'黄月英', kingdom:'蜀', hp:3, skill:'集智/奇才', desc:'用锦囊摸牌；锦囊无距离限制' },
    { key:'caocao', name:'曹操', kingdom:'魏', hp:4, skill:'奸雄/护驾', desc:'受到伤害后可获得造成伤害的牌；主公技：令魏国武将代出闪' },
    { key:'simayi', name:'司马懿', kingdom:'魏', hp:3, skill:'反馈/鬼才', desc:'受伤后获来源一牌；替换判定牌' },
    { key:'xiaohoudun', name:'夏侯惇', kingdom:'魏', hp:4, skill:'刚烈', desc:'受伤后判定非♥则来源弃牌或受伤' },
    { key:'zhangliao', name:'张辽', kingdom:'魏', hp:4, skill:'突袭', desc:'摸牌阶段可改为获取他人手牌' },
    { key:'xuchu', name:'许褚', kingdom:'魏', hp:4, skill:'裸衣', desc:'少摸一牌，本回合杀和决斗伤害+1' },
    { key:'guojia', name:'郭嘉', kingdom:'魏', hp:3, skill:'天妒/遗计', desc:'判定后获判定牌；受伤后摸两牌' },
    { key:'zhenji', name:'甄姬', kingdom:'魏', hp:3, skill:'倾国/洛神', desc:'黑牌当闪；准备阶段判黑获牌' },
    { key:'sunquan', name:'孙权', kingdom:'吴', hp:4, skill:'制衡/救援', desc:'出牌阶段可弃牌并摸等量的牌；主公技：吴国武将桃回复+1' },
    { key:'ganning', name:'甘宁', kingdom:'吴', hp:4, skill:'奇袭', desc:'黑色牌可当【过河拆桥】使用' },
    { key:'lvmeng', name:'吕蒙', kingdom:'吴', hp:4, skill:'克己', desc:'未出杀则可跳过弃牌阶段' },
    { key:'huanggai', name:'黄盖', kingdom:'吴', hp:4, skill:'苦肉', desc:'失去1血摸两张牌' },
    { key:'zhouyu', name:'周瑜', kingdom:'吴', hp:3, skill:'英姿/反间', desc:'多摸一牌；令人猜花色猜错受伤' },
    { key:'daqiao', name:'大乔', kingdom:'吴', hp:3, skill:'国色/流离', desc:'♦牌当乐；被杀时转移目标' },
    { key:'luxun', name:'陆逊', kingdom:'吴', hp:3, skill:'谦逊/连营', desc:'不被顺手/乐；失去最后手牌摸一张' },
    { key:'sunshangxiang', name:'孙尚香', kingdom:'吴', hp:3, skill:'结姻/枭姬', desc:'弃牌与男性各回血；失装备摸牌' },
    { key:'lvbu', name:'吕布', kingdom:'群', hp:4, skill:'无双', desc:'杀需两闪抵消，决斗需两杀' },
    { key:'huatuo', name:'华佗', kingdom:'群', hp:3, skill:'急救/青囊', desc:'红牌当桃；弃牌令人回血' },
    { key:'diaochan', name:'貂蝉', kingdom:'群', hp:3, skill:'离间/闭月', desc:'令两男决斗；结束阶段摸一牌' },
    { key:'huaxiong', name:'华雄', kingdom:'群', hp:6, skill:'耀武', desc:'6血武将；红杀伤害时来源回血或摸牌' },
  ];

  const taken = state.players.filter(p => p.hero).map(p => p.hero);
  const grid = $('#heroGrid');
  grid.innerHTML = heroes.map(h => {
    const isTaken = taken.includes(h.key);
    const isMe = me.hero === h.key;
    return `<div class="hero-card ${isTaken ? 'taken' : ''}" data-hero="${h.key}">
      <div class="hero-portrait">${HERO_PORTRAITS[h.key]}</div>
      <div class="hero-name">${h.name}</div>
      <div class="hero-kingdom">${h.kingdom}</div>
      <div class="hero-stats">❤ ${h.hp}</div>
      <div class="hero-skill-name">【${h.skill}】</div>
      <div class="hero-skill-desc">${h.desc}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.hero-card:not(.taken)').forEach(el => {
    el.onclick = () => {
      if (me.hero) return;
      socket.emit('selectHero', { heroKey: el.dataset.hero });
    };
  });
}

function renderGame() {
  const me = state.players.find(p => p.id === state.myId);
  const others = state.players.filter(p => p.id !== state.myId);
  const isMyTurn = state.players[state.currentPlayerIdx]?.id === state.myId;
  const pa = state.pendingAction;

  // Determine if I need to respond
  let myPendingResponse = false;
  let responseHint = '';
  if (pa) {
    if (pa.type === 'dodge' && pa.target === state.myId) {
      myPendingResponse = true;
      responseHint = '请打出【闪】或点击"不出"';
    } else if (pa.type === 'duel') {
      const currentDueler = pa.players[pa.currentIdx];
      if (currentDueler === state.myId) {
        myPendingResponse = true;
        responseHint = '决斗中，请打出【杀】或点击"不出"';
      }
    } else if (pa.type === 'barbarian') {
      const ct = pa.targets[pa.currentIdx];
      if (ct === state.myId) {
        myPendingResponse = true;
        responseHint = '南蛮入侵！请打出【杀】或点击"不出"';
      }
    } else if (pa.type === 'arrow') {
      const ct = pa.targets[pa.currentIdx];
      if (ct === state.myId) {
        myPendingResponse = true;
        responseHint = '万箭齐发！请打出【闪】或点击"不出"';
      }
    } else if (pa.type === 'jijiang') {
      const currentAsker = pa.kingdomPlayers[pa.currentAskerIdx];
      if (currentAsker === state.myId) {
        myPendingResponse = true;
        responseHint = '主公发动【激将】！请出【杀】或点击"不出"';
      }
    } else if (pa.type === 'hujia') {
      const currentAsker = pa.kingdomPlayers[pa.currentAskerIdx];
      if (currentAsker === state.myId) {
        myPendingResponse = true;
        responseHint = '主公发动【护驾】！请出【闪】或点击"不出"';
      }
    }
  }

  // Detect discard phase for me
  const isDiscardPhase = pa?.type === 'discard' && pa.playerId === state.myId;

  // ---- Render other players ----
  const oppArea = $('#otherPlayers');
  oppArea.innerHTML = others.map(p => {
    const isCurrent = state.players[state.currentPlayerIdx]?.id === p.id;
    const isDead = !p.alive;
    const canTarget = selectingTarget && p.alive && p.id !== state.myId;
    let hpPips = '';
    for (let i = 0; i < p.maxHp; i++) {
      hpPips += `<div class="opp-hp-pip ${i < p.hp ? 'filled' : ''}"></div>`;
    }
    let equipStr = '';
    if (p.equipment?.weapon) equipStr += `⚔ ${p.equipment.weapon.name} `;
    if (p.equipment?.armor) equipStr += `🛡 ${p.equipment.armor.name} `;
    if (p.equipment?.plusHorse) equipStr += `🐎+1 ${p.equipment.plusHorse.name} `;
    if (p.equipment?.minusHorse) equipStr += `🐎-1 ${p.equipment.minusHorse.name} `;
    let judgeStr = (p.judgments && p.judgments.length > 0) ? p.judgments.map(j => `📜${j.name}`).join(' ') : '';

    let roleBadge = '';
    if (p.role) {
      roleBadge = `<span class="opp-role-badge ${ROLE_CLASS[p.role]}">${ROLE_NAMES[p.role]}</span>`;
    }

    return `<div class="opponent-card ${isCurrent?'is-current':''} ${isDead?'is-dead':''} ${canTarget?'is-target-selectable':''}" data-pid="${p.id}">
      <div class="opp-header">
        <div class="opp-portrait">${p.hero ? HERO_PORTRAITS[p.hero] : '?'}</div>
        <div>
          <div class="opp-name">${p.name} ${roleBadge}</div>
          <div class="opp-hero">${p.hero ? HERO_NAMES[p.hero] : ''} ${p.skill ? '【'+p.skill+'】' : ''}</div>
        </div>
      </div>
      <div class="opp-hp-bar">${hpPips}</div>
      <div class="opp-meta">
        <span>手牌: ${p.handCount}</span>
      </div>
      ${equipStr ? `<div class="opp-equip">${equipStr}</div>` : ''}
      ${judgeStr ? `<div class="opp-judge">${judgeStr}</div>` : ''}
    </div>`;
  }).join('');

  // Target selection click handlers
  oppArea.querySelectorAll('.opponent-card.is-target-selectable').forEach(el => {
    el.onclick = () => {
      const targetId = el.dataset.pid;
      if (lordSkillTargeting) {
        // 激将 target selection
        socket.emit('lordSkill', { type: 'jijiang', targetId });
        lordSkillTargeting = false;
      } else {
        socket.emit('playCard', { cardId: selectTargetFor, targetId });
      }
      selectedCardId = null;
      selectingTarget = false;
      selectTargetFor = null;
    };
  });

  // ---- Render deck count ----
  $('#deckCount').textContent = state.deckCount;

  // ---- Render game log ----
  const logEl = $('#gameLog');
  logEl.innerHTML = state.log.map(l =>
    `<div class="log-entry">${l.msg}</div>`
  ).join('');
  logEl.scrollTop = logEl.scrollHeight;

  // ---- Action hint ----
  const hintEl = $('#actionHint');
  if (isDiscardPhase) {
    hintEl.textContent = `弃牌阶段 — 请选择 ${pa.count} 张牌弃置（已选 ${discardSelection.size}/${pa.count}）`;
  } else if (myPendingResponse) {
    hintEl.textContent = responseHint;
  } else if (lordSkillTargeting && selectingTarget) {
    hintEl.textContent = '【激将】请选择一个攻击目标';
  } else if (isMyTurn && !pa) {
    hintEl.textContent = selectingTarget ? '请选择一个目标' : '你的回合 — 请出牌或结束回合';
  } else {
    const cp = state.players[state.currentPlayerIdx];
    hintEl.textContent = cp ? `等待 ${cp.name} 操作...` : '';
  }

  // ---- Action buttons ----
  $('#btnEndTurn').style.display = (isMyTurn && !pa) ? '' : 'none';
  $('#btnRespond').style.display = myPendingResponse ? '' : 'none';

  // Discard confirm button
  const discardBtn = $('#btnConfirmDiscard');
  discardBtn.style.display = isDiscardPhase ? '' : 'none';
  if (isDiscardPhase) {
    discardBtn.disabled = discardSelection.size !== pa.count;
    discardBtn.textContent = `确认弃牌 (${discardSelection.size}/${pa.count})`;
  }

  // Skill button
  const skillHeroes = { liubei:'仁德', sunquan:'制衡', huanggai:'苦肉', huatuo:'青囊' };
  const showSkill = isMyTurn && !pa && skillHeroes[me.hero];
  $('#btnSkill').style.display = showSkill ? '' : 'none';
  if (showSkill) {
    $('#btnSkill').textContent = skillHeroes[me.hero];
  }

  // Lord skill buttons
  const isLord = me.role === 'lord';
  // 激将: Liu Bei Lord, during play phase, no pending action
  const showJijiang = isLord && me.hero === 'liubei' && isMyTurn && !pa;
  $('#btnJijiang').style.display = showJijiang ? '' : 'none';
  // 护驾: Cao Cao Lord, when I need to dodge (pending dodge targeting me)
  const showHujia = isLord && me.hero === 'caocao' && pa?.type === 'dodge' && pa.target === state.myId;
  $('#btnHujia').style.display = showHujia ? '' : 'none';

  // ---- Render my info ----
  let myHpPips = '';
  for (let i = 0; i < me.maxHp; i++) {
    myHpPips += `<div class="my-hp-pip ${i < me.hp ? 'filled' : ''}"></div>`;
  }
  let myEquip = '';
  if (me.equipment?.weapon) myEquip += `⚔ ${me.equipment.weapon.name} `;
  if (me.equipment?.armor) myEquip += `🛡 ${me.equipment.armor.name} `;
  if (me.equipment?.plusHorse) myEquip += `🐎+1 ${me.equipment.plusHorse.name} `;
  if (me.equipment?.minusHorse) myEquip += `🐎-1 ${me.equipment.minusHorse.name} `;
  let myJudge = (me.judgments && me.judgments.length > 0) ? me.judgments.map(j => `📜${j.name}`).join(' ') : '';
  const wineActive = state.turnWineUsed && isMyTurn;

  $('#myInfo').innerHTML = `
    <div class="my-portrait">${me.hero ? HERO_PORTRAITS[me.hero] : '?'}</div>
    <div class="my-details">
      <div class="my-name-hero">
        ${me.name}
        <span class="hero-label">${me.hero ? HERO_NAMES[me.hero] : ''}</span>
        <span class="my-role-badge ${ROLE_CLASS[me.role]}">${ROLE_NAMES[me.role]}</span>
        ${wineActive ? '<span class="wine-badge">🍺 酒</span>' : ''}
      </div>
      <div class="my-hp-bar">${myHpPips}</div>
      ${myEquip ? `<div class="my-equip">${myEquip}</div>` : ''}
      ${myJudge ? `<div class="my-judge">${myJudge}</div>` : ''}
    </div>
    <div class="my-skill-info">${me.skill ? '【'+me.skill+'】' + (me.skillDesc||'') : ''}</div>
  `;

  // ---- Render hand ----
  const handEl = $('#myHand');
  handEl.innerHTML = (me.hand || []).map(c => {
    const isRed = c.suit === '♥' || c.suit === '♦';
    const typeClass = c.type === 'basic' ? 'card-basic' : c.type === 'trick' ? 'card-trick' : 'card-equipment';
    const typeLabel = c.type === 'basic' ? '基本' : c.type === 'trick' ? '锦囊' : '装备';
    const isSelected = selectedCardId === c.id;
    const isDiscardSelected = discardSelection.has(c.id);
    return `<div class="hand-card ${typeClass} ${isSelected ? 'selected' : ''} ${isDiscardSelected ? 'discard-selected' : ''}" data-cid="${c.id}" data-subtype="${c.subtype}">
      <div class="card-suit-number ${isRed ? 'red' : 'black'}">${c.suit}${c.number}</div>
      <div class="card-name">${c.name}</div>
      <div class="card-type-label">${typeLabel}</div>
    </div>`;
  }).join('');

  handEl.querySelectorAll('.hand-card').forEach(el => {
    el.onclick = () => {
      const cardId = parseInt(el.dataset.cid);
      const subtype = el.dataset.subtype;

      // Discard phase: toggle selection
      if (isDiscardPhase) {
        if (discardSelection.has(cardId)) {
          discardSelection.delete(cardId);
        } else if (discardSelection.size < pa.count) {
          discardSelection.add(cardId);
        }
        renderGame();
        return;
      }

      // If responding to pending action
      if (myPendingResponse) {
        socket.emit('playCard', { responseCardId: cardId });
        selectedCardId = null;
        return;
      }

      if (!isMyTurn || pa) return;

      // If already selecting target, clicking card deselects
      if (selectingTarget) {
        selectedCardId = null;
        selectingTarget = false;
        selectTargetFor = null;
        lordSkillTargeting = false;
        renderGame();
        return;
      }

      // If card needs target
      if (NEEDS_TARGET.includes(subtype)) {
        selectedCardId = cardId;
        selectingTarget = true;
        selectTargetFor = cardId;
        renderGame();
        return;
      }

      // Play card directly (peach, draw2, peachgarden, equipment)
      socket.emit('playCard', { cardId });
      selectedCardId = null;
    };
  });
}

function renderGameOver() {
  // Find win message from log
  const winLog = state.log.find(l => l.msg.includes('获胜'));
  $('#winnerText').textContent = winLog ? winLog.msg : '游戏结束';

  $('#finalRoles').innerHTML = state.players.map(p =>
    `<div class="final-role-entry">
      ${p.name} — ${p.hero ? HERO_NAMES[p.hero] : '?'} — ${ROLE_NAMES[p.role]} ${p.alive ? '✓ 存活' : '✗ 阵亡'}
    </div>`
  ).join('');
}
