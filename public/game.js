// ====== GAME CLIENT ======
const socket = io();

let state = null;
let selectedCardId = null;
let selectingTarget = false;
let selectTargetFor = null;
let lordSkillTargeting = false; // true when selecting target for 激将
let fanjianTargeting = false; // true when selecting target for 反间
let qixiMode = false; // true when in 奇袭 card+target selection mode
let qixiCardId = null; // selected black card for 奇袭
let discardSelection = new Set(); // cards selected for discard phase
let zhihengHandSelection = new Set(); // hand cards selected for zhiheng
let zhihengEquipSelection = new Set(); // equipment slots selected for zhiheng
let gsfHandSelection = new Set(); // hand cards selected for 贯石斧
let gsfEquipSelection = new Set(); // equipment slots selected for 贯石斧

// ====== BACKGROUND MUSIC (Web Audio API - Chinese pentatonic ambient) ======
const BGM = (() => {
  let ctx = null, masterGain = null, playing = false, muted = false;
  let intervalId = null;

  // Chinese pentatonic: C D E G A (gong shang jue zhi yu)
  const BASE_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 octave
  const OCTAVES = [0.5, 1, 2]; // lower, mid, upper

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);
  }

  function playNote(freq, startTime, duration, type, vol) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(vol || 0.3, startTime + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playPhrase() {
    if (!ctx || !playing) return;
    const now = ctx.currentTime;
    // Pick 3-5 random pentatonic notes with gentle timing
    const noteCount = 3 + Math.floor(Math.random() * 3);
    const octave = OCTAVES[Math.floor(Math.random() * OCTAVES.length)];
    for (let i = 0; i < noteCount; i++) {
      const note = BASE_NOTES[Math.floor(Math.random() * BASE_NOTES.length)];
      const freq = note * octave;
      const delay = i * (0.4 + Math.random() * 0.6);
      const dur = 1.2 + Math.random() * 2.0;
      playNote(freq, now + delay, dur, 'sine', 0.15 + Math.random() * 0.15);
      // Occasional triangle harmony
      if (Math.random() < 0.3) {
        const harm = BASE_NOTES[Math.floor(Math.random() * BASE_NOTES.length)] * (Math.random() < 0.5 ? 1 : 0.5);
        playNote(harm, now + delay + 0.1, dur * 0.8, 'triangle', 0.08);
      }
    }
  }

  // Gentle ambient pad (sustained chord)
  function playPad() {
    if (!ctx || !playing) return;
    const now = ctx.currentTime;
    const root = BASE_NOTES[Math.floor(Math.random() * 3)]; // C, D, or E
    const fifth = BASE_NOTES[(BASE_NOTES.indexOf(root) + 3) % 5];
    [root * 0.5, fifth * 0.5].forEach(f => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.04, now + 1.5);
      env.gain.setValueAtTime(0.04, now + 4);
      env.gain.exponentialRampToValueAtTime(0.001, now + 7);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now);
      osc.stop(now + 7.5);
    });
  }

  return {
    start() {
      if (playing) return;
      if (!ctx) init();
      if (ctx.state === 'suspended') ctx.resume();
      // Reconnect in case it was disconnected by stop()
      masterGain.connect(ctx.destination);
      playing = true;
      muted = false;
      playPhrase();
      playPad();
      intervalId = setInterval(() => {
        if (playing && !muted) {
          playPhrase();
          if (Math.random() < 0.4) playPad();
        }
      }, 3500 + Math.random() * 2000);
    },
    stop() {
      playing = false;
      muted = true;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      // Disconnect to silence any scheduled notes
      if (masterGain) masterGain.disconnect();
    },
    toggle() {
      if (muted || !playing) { this.start(); return true; }
      else { this.stop(); return false; }
    }
  };
})();

// Music toggle button
document.getElementById('musicToggle').addEventListener('click', () => {
  const on = BGM.toggle();
  const btn = document.getElementById('musicToggle');
  btn.textContent = on ? '♫' : '♪';
  btn.classList.toggle('muted', !on);
});
// Auto-start music on first user interaction
document.addEventListener('click', function startMusic() {
  BGM.start();
  document.removeEventListener('click', startMusic);
}, { once: true });

// ====== CARD SOUND & VISUAL ANNOUNCEMENT ======
const CardAnnounce = (() => {
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Different tones for card categories
  const TONES = {
    attack:  [523.25, 659.25],       // C5 E5 - sharp
    dodge:   [440, 523.25],           // A4 C5 - quick
    heal:    [392, 493.88, 587.33],   // G4 B4 D5 - warm rising
    trick:   [349.23, 440, 523.25],   // F4 A4 C5 - dramatic
    equip:   [261.63, 329.63],        // C4 E4 - solid
    skill:   [440, 587.33, 698.46],   // A4 D5 F5 - heroic
    default: [523.25, 440],           // C5 A4
  };

  const CARD_CATEGORY = {
    '杀': 'attack', '武圣': 'attack',
    '闪': 'dodge',
    '桃': 'heal', '酒': 'heal', '桃园结义': 'heal',
    '决斗': 'trick', '南蛮入侵': 'trick', '万箭齐发': 'trick',
    '无中生有': 'trick', '过河拆桥': 'trick', '顺手牵羊': 'trick',
    '乐不思蜀': 'trick', '兵粮寸断': 'trick', '闪电': 'trick',
    '无懈可击': 'trick',
    '装备': 'equip',
    '鬼才': 'skill', '奸雄': 'skill', '反馈': 'skill', '遗计': 'skill',
    '仁德': 'skill', '制衡': 'skill', '苦肉': 'skill', '反间': 'skill',
    '离间': 'skill', '结姻': 'skill', '奇袭': 'skill', '国色': 'skill',
  };

  function playTone(text) {
    try {
      const ctx = getCtx();
      const cat = CARD_CATEGORY[text] || 'default';
      const freqs = TONES[cat];
      const now = ctx.currentTime;
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = cat === 'skill' ? 'triangle' : cat === 'attack' ? 'sawtooth' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } catch(e) { /* ignore audio errors */ }
  }

  function showBanner(text) {
    // Remove existing banner
    const old = document.getElementById('cardBanner');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'cardBanner';
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      el.classList.add('fade');
      setTimeout(() => el.remove(), 500);
    }, 1200);
  }

  return {
    announce(text) {
      playTone(text);
      showBanner(text);
      speakText(text);
    }
  };
})();

// ====== SPEECH SYNTHESIS (语音播报) ======
const SpeechEngine = (() => {
  let unlocked = false;
  let zhVoice = null;

  function findVoice() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    // Prefer zh-CN, fallback to any zh
    zhVoice = voices.find(v => v.lang === 'zh-CN')
           || voices.find(v => v.lang.startsWith('zh'))
           || null;
  }

  // Voices load asynchronously in some browsers
  if (typeof speechSynthesis !== 'undefined') {
    findVoice();
    speechSynthesis.onvoiceschanged = findVoice;
  }

  return {
    unlock() {
      // Must be called from a user gesture (click) to unlock speech
      if (unlocked) return;
      if (typeof speechSynthesis === 'undefined') return;
      unlocked = true;
      findVoice();
      // Speak a silent utterance to unlock the API
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      u.lang = 'zh-CN';
      speechSynthesis.speak(u);
    },
    speak(text) {
      if (!unlocked || typeof speechSynthesis === 'undefined') return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      if (zhVoice) u.voice = zhVoice;
      speechSynthesis.speak(u);
    }
  };
})();

function speakText(text) {
  SpeechEngine.speak(text);
}

// Unlock speech on first user click
document.addEventListener('click', function unlockSpeech() {
  SpeechEngine.unlock();
}, { once: true });

// Listen for card sound events from server
socket.on('cardSound', (text) => {
  CardAnnounce.announce(text);
});



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

const NEEDS_TARGET = ['attack','duel','dismantle','snatch','indulgence','famine'];

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
// Restore saved player name
const savedName = localStorage.getItem('sgz_playerName');
if (savedName) $('#playerName').value = savedName;

$('#btnCreate').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  localStorage.setItem('sgz_playerName', name);
  socket.emit('createRoom', { playerName: name });
};
$('#btnJoin').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  localStorage.setItem('sgz_playerName', name);
  const code = $('#roomCode').value.trim().toUpperCase();
  if (!code) { showToast('请输入房间号'); return; }
  socket.emit('joinRoom', { roomId: code, playerName: name });
};
$('#btnStart').onclick = () => socket.emit('startGame');
$('#btnEndTurn').onclick = () => { socket.emit('endTurn'); selectedCardId = null; selectingTarget = false; lordSkillTargeting = false; fanjianTargeting = false; qixiMode = false; qixiCardId = null; };
$('#btnForceSkip').onclick = () => { socket.emit('forceSkip'); selectedCardId = null; selectingTarget = false; lordSkillTargeting = false; fanjianTargeting = false; qixiMode = false; qixiCardId = null; };
$('#btnRespond').onclick = () => { socket.emit('playCard', {}); selectedCardId = null; };
$('#btnBackLobby').onclick = () => {
  state = null;
  discardSelection.clear();
  zhihengHandSelection.clear();
  zhihengEquipSelection.clear();
  gsfHandSelection.clear();
  gsfEquipSelection.clear();
  selectedCardId = null;
  selectingTarget = false;
  selectTargetFor = null;
  lordSkillTargeting = false;
  fanjianTargeting = false;
  qixiMode = false;
  qixiCardId = null;
  showScreen('lobby');
};
$('#btnSkill').onclick = () => {
  if (!state) return;
  const me = state.players.find(p => p.id === state.myId);
  if (!me) return;
  if (me.hero === 'liubei') socket.emit('skillAction', { skillType: 'rende' });
  if (me.hero === 'sunquan') socket.emit('skillAction', { skillType: 'zhiheng' });
  if (me.hero === 'huanggai') socket.emit('skillAction', { skillType: 'kurou' });
  if (me.hero === 'huatuo') socket.emit('skillAction', { skillType: 'qingnang' });
  if (me.hero === 'diaochan') socket.emit('skillAction', { skillType: 'lijian' });
  if (me.hero === 'sunshangxiang') socket.emit('skillAction', { skillType: 'jieyin' });
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
$('#btnFanjian').onclick = () => {
  if (!state) return;
  fanjianTargeting = true;
  selectingTarget = true;
  selectTargetFor = null;
  selectedCardId = null;
  renderGame();
};
$('#btnQixi').onclick = () => {
  if (!state) return;
  qixiMode = true;
  qixiCardId = null;
  selectedCardId = null;
  selectingTarget = false;
  renderGame();
};
$('#btnConfirmDiscard').onclick = () => {
  if (!state) return;
  const pa = state.pendingAction;
  if (!pa) return;
  // Zhiheng confirm
  if (pa.type === 'zhiheng_select' && pa.playerId === state.myId) {
    const total = zhihengHandSelection.size + zhihengEquipSelection.size;
    if (total === 0) { showToast('请至少选择一张牌'); return; }
    socket.emit('playCard', {
      zhihengHandIds: [...zhihengHandSelection],
      zhihengEquipSlots: [...zhihengEquipSelection],
    });
    zhihengHandSelection.clear();
    zhihengEquipSelection.clear();
    return;
  }
  // Guanshifu confirm
  if (pa.type === 'guanshifu_select' && pa.attackerId === state.myId) {
    const total = gsfHandSelection.size + gsfEquipSelection.size;
    if (total !== 2) { showToast('请选择恰好2张牌'); return; }
    socket.emit('playCard', {
      gsfHandIds: [...gsfHandSelection],
      gsfEquipSlots: [...gsfEquipSelection],
    });
    gsfHandSelection.clear();
    gsfEquipSelection.clear();
    return;
  }
  // Normal discard
  if (pa.type !== 'discard') return;
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
  // Clear zhiheng selection if no longer in zhiheng phase
  if (!gs.pendingAction || gs.pendingAction.type !== 'zhiheng_select' || gs.pendingAction.playerId !== gs.myId) {
    zhihengHandSelection.clear();
    zhihengEquipSelection.clear();
  }
  // Clear guanshifu selection if no longer in gsf phase
  if (!gs.pendingAction || gs.pendingAction.type !== 'guanshifu_select' || gs.pendingAction.attackerId !== gs.myId) {
    gsfHandSelection.clear();
    gsfEquipSelection.clear();
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
  const isHost = state.myId === state.hostId;
  $('.waiting-hint').textContent = `当前 ${count}/8 人 — ${count >= 2 ? '可以开始游戏，也可以继续等待更多玩家' : '至少需要 2 名玩家才能开始'}`;

  if (isHost) {
    $('#btnStart').style.display = '';
    $('#btnStart').disabled = count < 2;
    $('#btnStart').textContent = count >= 2 ? `开始游戏 (${count}人)` : '等待玩家加入...';
  } else {
    $('#btnStart').style.display = 'none';
  }

  const list = $('#playerList');
  list.innerHTML = state.players.map((p, i) =>
    `<div class="player-entry">${p.id === state.hostId ? '👑 房主 · ' : ''}${p.name}${p.id === state.myId ? ' (你)' : ''}</div>`
  ).join('');
}

function renderHeroSelect() {
  const me = state.players.find(p => p.id === state.myId);
  const roleSpan = $('#myRole');
  roleSpan.textContent = ROLE_NAMES[me.role] || '???';
  roleSpan.className = ROLE_CLASS[me.role] || '';

  // Show lord identity to all players
  const lordRevealEl = document.getElementById('lordReveal');
  const lordPlayer = state.players.find(p => p.role === 'lord');
  if (lordPlayer) {
    const lordHeroName = lordPlayer.hero ? HERO_NAMES[lordPlayer.hero] : '选择中...';
    const isMe = lordPlayer.id === state.myId;
    lordRevealEl.innerHTML = `<span class="lord-icon">👑</span> 本局主公: <strong>${lordPlayer.name}</strong>${isMe ? ' (你)' : ''}${lordPlayer.hero ? ` — ${lordHeroName}` : ''}`;
    lordRevealEl.style.display = '';
  } else {
    lordRevealEl.style.display = 'none';
  }

  const allHeroes = [
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

  const grid = $('#heroGrid');

  // If I already chose, show waiting
  if (me.hero) {
    grid.innerHTML = '<div class="hero-select-wait">你已选择武将，等待其他玩家...</div>';
    return;
  }

  // If I have hero choices from server, only show those
  const myChoices = state.heroChoices;
  if (!myChoices) {
    // Lord is still picking, show waiting
    const phase = state.heroSelectPhase;
    grid.innerHTML = '<div class="hero-select-wait">等待主公选择武将...</div>';
    return;
  }

  const heroes = allHeroes.filter(h => myChoices.includes(h.key));

  grid.innerHTML = heroes.map(h => {
    return `<div class="hero-card" data-hero="${h.key}">
      <div class="hero-portrait">${HERO_PORTRAITS[h.key]}</div>
      <div class="hero-name">${h.name}</div>
      <div class="hero-kingdom">${h.kingdom}</div>
      <div class="hero-stats">❤ ${h.hp}</div>
      <div class="hero-skill-name">【${h.skill}】</div>
      <div class="hero-skill-desc">${h.desc}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.hero-card').forEach(el => {
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
      const dNeeded = pa.dodgesNeeded || 1;
      const dGiven = pa.dodgesGiven || 0;
      const dRemaining = dNeeded - dGiven;
      responseHint = dRemaining > 1 ? `【无双】请打出【闪】（还需${dRemaining}张）或"不出"` : '请打出【闪】或点击"不出"';
    } else if (pa.type === 'duel') {
      const currentDueler = pa.players[pa.currentIdx];
      if (currentDueler === state.myId) {
        myPendingResponse = true;
        const needed = pa.attacksNeeded || 1;
        const given = pa.attacksGiven || 0;
        const remaining = needed - given;
        responseHint = remaining > 1 ? `决斗【无双】请打出【杀】（还需${remaining}张）或"不出"` : '决斗中，请打出【杀】或点击"不出"';
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
    } else if (pa.type === 'nullify_chance') {
      const currentAsker = pa.askOrder[pa.currentAskerIdx];
      if (currentAsker === state.myId) {
        myPendingResponse = true;
        responseHint = `是否对【${pa.trickName}】使用【无懈可击】？点击无懈可击或"不出"`;
      }
    } else if (pa.type === 'choose_dismantle' || pa.type === 'choose_snatch') {
      if (pa.source === state.myId) {
        myPendingResponse = true;
        const trickName = pa.type === 'choose_dismantle' ? '过河拆桥' : '顺手牵羊';
        const targetPlayer = state.players.find(p => p.id === pa.targetId);
        responseHint = `【${trickName}】请选择${targetPlayer?.name || ''}的一张牌`;
      }
    } else if (pa.type === 'fanjian_guess') {
      if (pa.targetId === state.myId) {
        myPendingResponse = true;
        responseHint = '【反间】请猜测一种花色：♠黑桃 ♥红桃 ♣梅花 ♦方块';
      }
    } else if (pa.type === 'guicai') {
      if (pa.simayiId === state.myId) {
        myPendingResponse = true;
        responseHint = `【鬼才】判定牌为 ${pa.judgeResult?.suit||''}${pa.judgeResult?.number||''} — 选择一张手牌替换，或点击"不出"放弃`;
      }
    } else if (pa.type === 'qinglong_choice') {
      if (pa.attackerId === state.myId) {
        myPendingResponse = true;
        const targetPlayer = state.players.find(p => p.id === pa.targetId);
        responseHint = `青龙偃月刀：是否对 ${targetPlayer?.name||''} 再出一张【杀】？选择手中的杀或点击"不出"放弃`;
      }
    } else if (pa.type === 'luoyi_choice') {
      if (pa.playerId === state.myId) {
        myPendingResponse = true;
        responseHint = '是否发动【裸衣】？少摸一张牌，本回合杀和决斗伤害+1';
      }
    } else if (pa.type === 'guanshifu_choice') {
      if (pa.attackerId === state.myId) {
        myPendingResponse = true;
        responseHint = '贯石斧：是否弃置两张牌强制命中？点击"发动"或"不出"放弃';
      }
    } else if (pa.type === 'guanshifu_select') {
      // Handled separately below, not a simple response
    } else if (pa.type === 'liuli_choice') {
      if (pa.daqiaoId === state.myId) {
        myPendingResponse = true;
        responseHint = '是否发动【流离】？弃一张牌将此杀转移给攻击范围内的其他角色';
      }
    } else if (pa.type === 'liuli_select') {
      // Handled separately below
    }
  }

  // Detect zhiheng selection phase
  const isZhihengSelect = pa?.type === 'zhiheng_select' && pa.playerId === state.myId;
  const isGsfSelect = pa?.type === 'guanshifu_select' && pa.attackerId === state.myId;
  const isLiuliSelect = pa?.type === 'liuli_select' && pa.daqiaoId === state.myId;

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
      } else if (fanjianTargeting) {
        // 反间 target selection
        socket.emit('skillAction', { skillType: 'fanjian', targetId });
        fanjianTargeting = false;
      } else if (qixiMode && qixiCardId) {
        // 奇袭 target selection
        socket.emit('skillAction', { skillType: 'qixi', cardId: qixiCardId, targetId });
        qixiMode = false;
        qixiCardId = null;
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
  } else if (isZhihengSelect) {
    const total = zhihengHandSelection.size + zhihengEquipSelection.size;
    hintEl.textContent = `【制衡】请选择要弃置的手牌和/或装备（已选 ${total} 张），然后点击确认`;
  } else if (isGsfSelect) {
    const total = gsfHandSelection.size + gsfEquipSelection.size;
    hintEl.textContent = `【贯石斧】请选择弃置2张牌（已选 ${total}/2），不能弃贯石斧本身`;
  } else if (isLiuliSelect) {
    hintEl.textContent = selectedCardId ? '【流离】请选择转移目标角色' : '【流离】请选择弃置的手牌，然后选择转移目标';
  } else if (myPendingResponse) {
    hintEl.textContent = responseHint;
  } else if (lordSkillTargeting && selectingTarget) {
    hintEl.textContent = '【激将】请选择一个攻击目标';
  } else if (fanjianTargeting && selectingTarget) {
    hintEl.textContent = '【反间】请选择一个目标角色';
  } else if (qixiMode && !qixiCardId) {
    hintEl.textContent = '【奇袭】请选择一张黑色手牌（♠♣）';
  } else if (qixiMode && qixiCardId && selectingTarget) {
    hintEl.textContent = '【奇袭】请选择一个目标角色';
  } else if (isMyTurn && !pa) {
    hintEl.textContent = selectingTarget ? '请选择一个目标' : '你的回合 — 请出牌或结束回合';
  } else {
    const cp = state.players[state.currentPlayerIdx];
    hintEl.textContent = cp ? `等待 ${cp.name} 操作...` : '';
  }

  // ---- Action buttons ----
  $('#btnEndTurn').style.display = (isMyTurn && !pa) ? '' : 'none';
  // Show "跳过" button when there's a pendingAction and this player is involved
  const canForceSkip = pa && (
    isMyTurn ||
    myPendingResponse ||
    (pa.source === state.myId) ||
    (pa.playerId === state.myId) ||
    (pa.target === state.myId) ||
    (pa.attackerId === state.myId) ||
    (pa.daqiaoId === state.myId) ||
    (pa.targets && pa.targets[pa.currentIdx] === state.myId) ||
    (pa.kingdomPlayers && pa.kingdomPlayers[pa.currentAskerIdx] === state.myId) ||
    (pa.askOrder && pa.askOrder[pa.currentAskerIdx] === state.myId) ||
    (pa.players && pa.players[pa.currentIdx] === state.myId)
  );
  $('#btnForceSkip').style.display = canForceSkip ? '' : 'none';
  const isChooseAction = pa && (pa.type === 'choose_dismantle' || pa.type === 'choose_snatch') && pa.source === state.myId;
  const isFanjianGuess = pa && pa.type === 'fanjian_guess' && pa.targetId === state.myId;
  $('#btnRespond').style.display = (myPendingResponse && !isChooseAction && !isFanjianGuess) ? '' : 'none';

  // ---- Choose card area (过河拆桥/顺手牵羊/反间猜花色) ----
  const chooseArea = $('#chooseCardArea');
  if (isChooseAction) {
    const trickName = pa.type === 'choose_dismantle' ? '过河拆桥' : '顺手牵羊';
    let btns = '';
    pa.equipOptions.forEach(eq => {
      let slotLabel;
      if (eq.slot.startsWith('judgment_')) {
        slotLabel = '📜判定区';
      } else {
        slotLabel = eq.slot === 'weapon' ? '⚔武器' : eq.slot === 'armor' ? '🛡防具' : eq.slot === 'plusHorse' ? '🐎+1马' : '🐎-1马';
      }
      btns += `<button class="btn btn-choose-card" data-slot="${eq.slot}">${slotLabel} ${eq.cardName}</button>`;
    });
    if (pa.hasHand) {
      btns += `<button class="btn btn-choose-card" data-slot="hand">🃏 手牌（随机）</button>`;
    }
    chooseArea.innerHTML = btns;
    chooseArea.style.display = 'flex';
    chooseArea.querySelectorAll('.btn-choose-card').forEach(btn => {
      btn.onclick = () => {
        socket.emit('playCard', { chooseSlot: btn.dataset.slot });
      };
    });
  } else if (isFanjianGuess) {
    const suits = [
      { suit: '♠', label: '♠ 黑桃' },
      { suit: '♥', label: '♥ 红桃' },
      { suit: '♣', label: '♣ 梅花' },
      { suit: '♦', label: '♦ 方块' },
    ];
    chooseArea.innerHTML = suits.map(s =>
      `<button class="btn btn-choose-card btn-suit" data-suit="${s.suit}">${s.label}</button>`
    ).join('');
    chooseArea.style.display = 'flex';
    chooseArea.querySelectorAll('.btn-suit').forEach(btn => {
      btn.onclick = () => {
        socket.emit('playCard', { guessSuit: btn.dataset.suit });
      };
    });
  } else if (pa?.type === 'luoyi_choice' && pa.playerId === state.myId) {
    chooseArea.innerHTML = `<button class="btn btn-gold" id="btnLuoyiYes">发动裸衣</button><button class="btn btn-danger" id="btnLuoyiNo">放弃</button>`;
    chooseArea.style.display = 'flex';
    document.getElementById('btnLuoyiYes').onclick = () => {
      socket.emit('playCard', { activate: true });
    };
    document.getElementById('btnLuoyiNo').onclick = () => {
      socket.emit('playCard', { activate: false });
    };
    $('#btnRespond').style.display = 'none';
  } else if (pa?.type === 'guanshifu_choice' && pa.attackerId === state.myId) {
    // Show "发动" and "放弃" buttons
    chooseArea.innerHTML = `<button class="btn btn-gold" id="btnGsfActivate">发动贯石斧</button><button class="btn btn-danger" id="btnGsfPass">放弃</button>`;
    chooseArea.style.display = 'flex';
    document.getElementById('btnGsfActivate').onclick = () => {
      socket.emit('playCard', { responseCardId: 'activate' });
    };
    document.getElementById('btnGsfPass').onclick = () => {
      socket.emit('playCard', {});
    };
    // Hide the default respond button for this case
    $('#btnRespond').style.display = 'none';
  } else if (isGsfSelect) {
    // Show equipment selection for 贯石斧 (excluding weapon slot)
    const equipSlots = ['armor', 'plusHorse', 'minusHorse'];
    const slotLabels = { armor: '🛡防具', plusHorse: '🐎+1马', minusHorse: '🐎-1马' };
    let eqBtns = '';
    equipSlots.forEach(slot => {
      if (me.equipment?.[slot]) {
        const sel = gsfEquipSelection.has(slot);
        eqBtns += `<button class="btn btn-choose-card ${sel ? 'zhiheng-eq-selected' : ''}" data-gsfslot="${slot}">${slotLabels[slot]} ${me.equipment[slot].name}</button>`;
      }
    });
    if (eqBtns) eqBtns = '<span style="font-size:12px;color:var(--wood);margin-right:4px;">装备:</span>' + eqBtns;
    chooseArea.innerHTML = eqBtns;
    chooseArea.style.display = eqBtns ? 'flex' : 'none';
    chooseArea.querySelectorAll('[data-gsfslot]').forEach(btn => {
      btn.onclick = () => {
        const slot = btn.dataset.gsfslot;
        if (gsfEquipSelection.has(slot)) gsfEquipSelection.delete(slot);
        else {
          const total = gsfHandSelection.size + gsfEquipSelection.size;
          if (total < 2) gsfEquipSelection.add(slot);
        }
        renderGame();
      };
    });
    $('#btnRespond').style.display = 'none';
  } else if (pa?.type === 'liuli_choice' && pa.daqiaoId === state.myId) {
    chooseArea.innerHTML = `<button class="btn btn-gold" id="btnLiuliYes">发动流离</button><button class="btn btn-danger" id="btnLiuliNo">放弃</button>`;
    chooseArea.style.display = 'flex';
    document.getElementById('btnLiuliYes').onclick = () => {
      socket.emit('playCard', { activate: true });
    };
    document.getElementById('btnLiuliNo').onclick = () => {
      socket.emit('playCard', { activate: false });
    };
    $('#btnRespond').style.display = 'none';
  } else if (isLiuliSelect) {
    // Show candidate target buttons for 流离
    let targetBtns = '<span style="font-size:12px;color:var(--wood);margin-right:4px;">转移目标:</span>';
    pa.candidates.forEach(c => {
      targetBtns += `<button class="btn btn-choose-card" data-liulitarget="${c.id}">${c.name}</button>`;
    });
    chooseArea.innerHTML = targetBtns;
    chooseArea.style.display = 'flex';
    chooseArea.querySelectorAll('[data-liulitarget]').forEach(btn => {
      btn.onclick = () => {
        if (!selectedCardId) {
          alert('请先选择一张手牌弃置');
          return;
        }
        socket.emit('playCard', { liuliCardId: selectedCardId, liuliTargetId: btn.dataset.liulitarget });
        selectedCardId = null;
      };
    });
    $('#btnRespond').style.display = 'none';
  } else {
    chooseArea.style.display = 'none';
    chooseArea.innerHTML = '';
  }

  // Discard confirm button
  const discardBtn = $('#btnConfirmDiscard');
  if (isZhihengSelect) {
    // Reuse discard confirm button for zhiheng
    const zhTotal = zhihengHandSelection.size + zhihengEquipSelection.size;
    discardBtn.style.display = '';
    discardBtn.disabled = zhTotal === 0;
    discardBtn.textContent = zhTotal > 0 ? `确认制衡 (${zhTotal}张)` : '请选牌';
  } else if (isGsfSelect) {
    const gsfTotal = gsfHandSelection.size + gsfEquipSelection.size;
    discardBtn.style.display = '';
    discardBtn.disabled = gsfTotal !== 2;
    discardBtn.textContent = `确认弃牌 (${gsfTotal}/2)`;
  } else if (isDiscardPhase) {
    discardBtn.style.display = '';
    discardBtn.disabled = discardSelection.size !== pa.count;
    discardBtn.textContent = `确认弃牌 (${discardSelection.size}/${pa.count})`;
  } else {
    discardBtn.style.display = 'none';
  }

  // Zhiheng equipment selection area
  if (isZhihengSelect) {
    const equipSlots = ['weapon', 'armor', 'plusHorse', 'minusHorse'];
    const slotLabels = { weapon: '⚔武器', armor: '🛡防具', plusHorse: '🐎+1马', minusHorse: '🐎-1马' };
    let eqBtns = '';
    equipSlots.forEach(slot => {
      if (me.equipment?.[slot]) {
        const sel = zhihengEquipSelection.has(slot);
        eqBtns += `<button class="btn btn-choose-card ${sel ? 'zhiheng-eq-selected' : ''}" data-zhslot="${slot}">${slotLabels[slot]} ${me.equipment[slot].name}</button>`;
      }
    });
    if (eqBtns) {
      eqBtns = '<span style="font-size:12px;color:var(--wood);margin-right:4px;">装备:</span>' + eqBtns;
      eqBtns += `<button class="btn btn-danger" id="btnZhihengCancel" style="margin-left:8px;">取消</button>`;
    } else {
      eqBtns = `<button class="btn btn-danger" id="btnZhihengCancel">取消制衡</button>`;
    }
    chooseArea.innerHTML = eqBtns;
    chooseArea.style.display = 'flex';
    chooseArea.querySelectorAll('[data-zhslot]').forEach(btn => {
      btn.onclick = () => {
        const slot = btn.dataset.zhslot;
        if (zhihengEquipSelection.has(slot)) zhihengEquipSelection.delete(slot);
        else zhihengEquipSelection.add(slot);
        renderGame();
      };
    });
    const cancelBtn = document.getElementById('btnZhihengCancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        zhihengHandSelection.clear();
        zhihengEquipSelection.clear();
        socket.emit('playCard', { zhihengHandIds: [], zhihengEquipSlots: [] });
      };
    }
  }

  // Skill button
  const skillHeroes = { liubei:'仁德', sunquan:'制衡', huanggai:'苦肉', huatuo:'青囊', diaochan:'离间', sunshangxiang:'结姻' };
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
  // 反间: Zhou Yu, during play phase, no pending action, has hand cards
  const showFanjian = me.hero === 'zhouyu' && isMyTurn && !pa && me.hand.length > 0;
  $('#btnFanjian').style.display = showFanjian ? '' : 'none';
  // 奇袭: Gan Ning, during play phase, no pending action, has black hand cards
  const hasBlackCard = me.hand.some(c => c.suit === '♠' || c.suit === '♣');
  const showQixi = me.hero === 'ganning' && isMyTurn && !pa && hasBlackCard;
  $('#btnQixi').style.display = showQixi ? '' : 'none';

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
    const isZhihengSelected = zhihengHandSelection.has(c.id);
    const isGsfSelected = gsfHandSelection.has(c.id);
    return `<div class="hand-card ${typeClass} ${isSelected ? 'selected' : ''} ${isDiscardSelected ? 'discard-selected' : ''} ${isZhihengSelected || isGsfSelected ? 'discard-selected' : ''}" data-cid="${c.id}" data-subtype="${c.subtype}">
      <div class="card-suit-number ${isRed ? 'red' : 'black'}">${c.suit}${c.number}</div>
      <div class="card-name">${c.name}</div>
      <div class="card-type-label">${typeLabel}</div>
    </div>`;
  }).join('');

  handEl.querySelectorAll('.hand-card').forEach(el => {
    el.onclick = () => {
      const cardId = parseInt(el.dataset.cid);
      const subtype = el.dataset.subtype;

      // Zhiheng phase: toggle selection
      if (isZhihengSelect) {
        if (zhihengHandSelection.has(cardId)) zhihengHandSelection.delete(cardId);
        else zhihengHandSelection.add(cardId);
        renderGame();
        return;
      }

      // Guanshifu select phase: toggle selection
      if (isGsfSelect) {
        if (gsfHandSelection.has(cardId)) {
          gsfHandSelection.delete(cardId);
        } else {
          const total = gsfHandSelection.size + gsfEquipSelection.size;
          if (total < 2) gsfHandSelection.add(cardId);
        }
        renderGame();
        return;
      }

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

      // Liuli select: pick a hand card to discard
      if (isLiuliSelect) {
        selectedCardId = (selectedCardId === cardId) ? null : cardId;
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

      // 奇袭 mode: select a black card
      if (qixiMode) {
        const card = me.hand.find(h => h.id === cardId);
        if (!card || (card.suit !== '♠' && card.suit !== '♣')) {
          showToast('奇袭只能使用黑色牌');
          return;
        }
        qixiCardId = cardId;
        selectedCardId = cardId;
        selectingTarget = true;
        renderGame();
        return;
      }

      // If already selecting target, clicking card deselects
      if (selectingTarget) {
        selectedCardId = null;
        selectingTarget = false;
        selectTargetFor = null;
        lordSkillTargeting = false;
        fanjianTargeting = false;
        qixiMode = false;
        qixiCardId = null;
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
