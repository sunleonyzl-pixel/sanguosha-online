// ====== GAME CLIENT ======
const socket = io({ transports: ['polling', 'websocket'] });

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
  let voicesReady = false;

  function findVoice() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return;
    voicesReady = true;
    // Prefer zh-CN, fallback to any zh, then any voice
    zhVoice = voices.find(v => v.lang === 'zh-CN')
           || voices.find(v => v.lang.startsWith('zh'))
           || voices.find(v => v.lang === 'en-US')
           || voices[0]
           || null;
  }

  // Voices load asynchronously in some browsers
  if (typeof speechSynthesis !== 'undefined') {
    findVoice();
    speechSynthesis.onvoiceschanged = findVoice;
    // Some browsers need a polling fallback
    let retries = 0;
    const pollVoices = setInterval(() => {
      findVoice();
      retries++;
      if (voicesReady || retries > 20) clearInterval(pollVoices);
    }, 250);
  }

  return {
    unlock() {
      if (typeof speechSynthesis === 'undefined') return;
      if (!unlocked) {
        unlocked = true;
        findVoice();
        // Speak a silent utterance to unlock the API
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        u.lang = 'zh-CN';
        speechSynthesis.speak(u);
      }
    },
    speak(text) {
      if (!unlocked || typeof speechSynthesis === 'undefined') return;
      // Re-find voice if not ready yet
      if (!voicesReady) findVoice();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.1;
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

// Unlock speech on user interactions (click/touch/keydown)
['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, () => SpeechEngine.unlock(), { once: true });
});

// Listen for card sound events from server
socket.on('cardSound', (text) => {
  CardAnnounce.announce(text);
});



// ====== HERO DATA (client side) ======

// Kingdom color schemes for portraits
const KINGDOM_COLORS = {
  '蜀': { bg: '#b8342a', ring: '#e8534a', text: '#fff' },
  '魏': { bg: '#2a5fa8', ring: '#4a8ae8', text: '#fff' },
  '吴': { bg: '#1a8a4a', ring: '#3ab86a', text: '#fff' },
  '群': { bg: '#7a5a2a', ring: '#a88a4a', text: '#fff' },
};
const HERO_KINGDOM_MAP = {
  liubei:'蜀', guanyu:'蜀', zhangfei:'蜀', zhugeliang:'蜀', zhaoyun:'蜀', machao:'蜀', huangyueying:'蜀',
  caocao:'魏', simayi:'魏', xiaohoudun:'魏', zhangliao:'魏', xuchu:'魏', guojia:'魏', zhenji:'魏',
  sunquan:'吴', ganning:'吴', lvmeng:'吴', huanggai:'吴', zhouyu:'吴', daqiao:'吴', luxun:'吴', sunshangxiang:'吴',
  lvbu:'群', huatuo:'群', diaochan:'群', huaxiong:'群',
};

// ====== IMAGE PATHS ======
const CARD_IMG = {
  // basic
  attack: 'img/cards/sha.png', dodge: 'img/cards/shan.png',
  peach: 'img/cards/tao.png', wine: 'img/cards/jiu.png',
  // tricks
  duel: 'img/cards/juedou.png', barbarian: 'img/cards/nanman.png',
  arrow: 'img/cards/wanjian.png', draw2: 'img/cards/wuzhong.png',
  dismantle: 'img/cards/guohe.png', snatch: 'img/cards/shunshou.png',
  peachgarden: 'img/cards/taoyuan.png', indulgence: 'img/cards/lebusishu.png',
  famine: 'img/cards/bingliang.png', lightning: 'img/cards/shandian.png',
  nullify: 'img/cards/wuxie.png',
};
const EQUIP_IMG = {
  '诸葛连弩':'img/cards/zhugenu.png', '青龙偃月刀':'img/cards/qinglong.png',
  '丈八蛇矛':'img/cards/zhangba.png', '雌雄双股剑':'img/cards/cixiong.png',
  '青釭剑':'img/cards/qinggang.png', '寒冰剑':'img/cards/hanbing.png',
  '古锭刀':'img/cards/guding.png', '贯石斧':'img/cards/guanshi.png',
  '方天画戟':'img/cards/fangtian.png', '朱雀羽扇':'img/cards/zhuque.png',
  '麒麟弓':'img/cards/qilin.png',
  '八卦阵':'img/cards/bagua.png', '仁王盾':'img/cards/renwang.png',
  '藤甲':'img/cards/tengjia.png', '白银狮子':'img/cards/bayin.png',
  '的卢':'img/cards/dilu.png', '绝影':'img/cards/jueying.png',
  '爪黄飞电':'img/cards/zhuahuang.png',
  '赤兔':'img/cards/chitu.png', '大宛':'img/cards/dawan.png',
  '紫骍':'img/cards/zixing.png',
};
const ROLE_IMG = {
  lord:'img/roles/lord.png', loyalist:'img/roles/loyalist.png',
  rebel:'img/roles/rebel.png', spy:'img/roles/spy.png',
};

function getCardImg(card) {
  if (card.type === 'equipment') return EQUIP_IMG[card.name] || CARD_IMG[card.subtype] || '';
  return CARD_IMG[card.subtype] || '';
}

const HERO_NAMES = {
  liubei:'刘备', guanyu:'关羽', zhangfei:'张飞', zhugeliang:'诸葛亮', zhaoyun:'赵云',
  machao:'马超', huangyueying:'黄月英',
  caocao:'曹操', simayi:'司马懿', xiaohoudun:'夏侯惇', zhangliao:'张辽', xuchu:'许褚',
  guojia:'郭嘉', zhenji:'甄姬',
  sunquan:'孙权', ganning:'甘宁', lvmeng:'吕蒙', huanggai:'黄盖', zhouyu:'周瑜',
  daqiao:'大乔', luxun:'陆逊', sunshangxiang:'孙尚香',
  lvbu:'吕布', huatuo:'华佗', diaochan:'貂蝉', huaxiong:'华雄',
};

// Hero portrait as real image (with fallback to colored circle)
function heroPortraitSVG(heroKey, size) {
  const s = size || 48;
  const src = `img/heroes/${heroKey}.png`;
  return `<img src="${src}" alt="${heroKey}" style="width:${s}px;height:${s}px;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none;width:${s}px;height:${s}px;line-height:${s}px;text-align:center;border-radius:50%;background:${(KINGDOM_COLORS[HERO_KINGDOM_MAP[heroKey]]||KINGDOM_COLORS['群']).bg};color:#fff;font-size:${Math.round(s*0.45)}px;font-family:'Ma Shan Zheng',serif">${HERO_NAMES[heroKey]?.[0]||'?'}</span>`;
}

const HERO_PORTRAITS = {};
Object.keys(HERO_NAMES).forEach(k => { HERO_PORTRAITS[k] = heroPortraitSVG(k, 48); });

function heroPortraitSmall(heroKey) { return heroPortraitSVG(heroKey, 36); }
function heroPortraitLarge(heroKey) { return heroPortraitSVG(heroKey, 72); }

const ROLE_NAMES = { lord:'主公', loyalist:'忠臣', rebel:'反贼', spy:'内奸' };
const ROLE_CLASS = { lord:'role-lord', loyalist:'role-loyalist', rebel:'role-rebel', spy:'role-spy' };

const NEEDS_TARGET = ['attack','duel','dismantle','snatch','indulgence','famine'];

// ====== EQUIPMENT DESCRIPTIONS ======
const EQUIP_DESC = {
  '诸葛连弩': '攻击范围1｜出牌阶段，你使用【杀】无次数限制',
  '青龙偃月刀': '攻击范围3｜当你使用的【杀】被目标角色的【闪】抵消时，你可以对其再使用一张【杀】',
  '丈八蛇矛': '攻击范围3｜你可以将两张手牌当【杀】使用或打出',
  '雌雄双股剑': '攻击范围2｜当你使用【杀】指定异性角色为目标后，其须弃一张手牌或你摸一张牌',
  '青釭剑': '攻击范围2｜锁定技，当你使用【杀】时，无视目标角色的防具',
  '寒冰剑': '攻击范围2｜当你使用【杀】造成伤害时，可防止此伤害并依次弃置目标两张牌',
  '古锭刀': '攻击范围2｜锁定技，当你使用【杀】对目标造成伤害时，若其无手牌，此伤害+1',
  '贯石斧': '攻击范围3｜当你使用的【杀】被【闪】抵消时，你可以弃置两张牌使此【杀】强制命中',
  '方天画戟': '攻击范围4｜锁定技，你使用最后一张手牌【杀】时，可额外指定至多两个目标',
  '朱雀羽扇': '攻击范围4｜你可以将普通【杀】当火【杀】使用',
  '麒麟弓': '攻击范围5｜当你使用【杀】对目标造成伤害时，你可以弃置其装备区的一匹马',
  '八卦阵': '防具｜当你需要使用或打出【闪】时，你可以进行判定：若为红色，视为你使用了【闪】',
  '仁王盾': '防具｜锁定技，黑色【杀】对你无效',
  '藤甲': '防具｜锁定技，【南蛮入侵】【万箭齐发】和非火属性【杀】对你无效；火焰伤害+1',
  '白银狮子': '防具｜锁定技，当你受到伤害时，若伤害>1则改为1；失去装备区的此牌时回复1血',
  '的卢': '+1马｜锁定技，其他角色与你的距离+1',
  '绝影': '+1马｜锁定技，其他角色与你的距离+1',
  '爪黄飞电': '+1马｜锁定技，其他角色与你的距离+1',
  '赤兔': '-1马｜锁定技，你与其他角色的距离-1',
  '大宛': '-1马｜锁定技，你与其他角色的距离-1',
  '紫骍': '-1马｜锁定技，你与其他角色的距离-1',
};

// ====== INFO POPUP ======
function showInfoPopup(title, content, event, imgSrc) {
  // Remove existing
  const old = document.getElementById('infoPopup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'infoPopup';
  popup.innerHTML = `
    ${imgSrc ? `<div class="info-popup-img"><img src="${imgSrc}" alt="" draggable="false"></div>` : ''}
    <div class="info-popup-text">
      <div class="info-popup-title">${title}</div>
      <div class="info-popup-body">${content}</div>
    </div>
  `;
  document.body.appendChild(popup);

  // Position near click
  const rect = popup.getBoundingClientRect();
  let x = event.clientX;
  let y = event.clientY - rect.height - 12;
  if (y < 8) y = event.clientY + 16;
  if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
  if (x < 8) x = 8;
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  popup.style.opacity = '1';
  popup.style.transform = 'translateY(0)';

  // Close on any click elsewhere
  function close(e) {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', close, true);
    }
  }
  setTimeout(() => document.addEventListener('click', close, true), 10);
}

function equipTag(icon, equipObj) {
  if (!equipObj) return '';
  const name = equipObj.name;
  const desc = EQUIP_DESC[name] || '';
  return `<span class="equip-clickable" data-equip-name="${name}" data-equip-desc="${desc.replace(/"/g,'&quot;')}">${icon} ${name}</span> `;
}

function heroClickTag(heroKey, size, playerName) {
  const p = state?.players?.find(pp => pp.hero === heroKey && pp.name === playerName);
  const skillName = p?.skill || '';
  const skillDesc = p?.skillDesc || '';
  return `<span class="hero-clickable" data-hero-key="${heroKey}" data-hero-skill="${skillName}" data-hero-desc="${(skillDesc||'').replace(/"/g,'&quot;')}">${size === 'small' ? heroPortraitSmall(heroKey) : heroPortraitSVG(heroKey, size)}</span>`;
}

// Global delegated click handler for info popups
document.addEventListener('click', (e) => {
  const equipEl = e.target.closest('.equip-clickable');
  if (equipEl) {
    e.stopPropagation();
    const name = equipEl.dataset.equipName;
    const desc = equipEl.dataset.equipDesc;
    const img = EQUIP_IMG[name] || '';
    showInfoPopup(`${name}`, desc || '无描述', e, img);
    return;
  }
  const heroEl = e.target.closest('.hero-clickable');
  if (heroEl) {
    e.stopPropagation();
    const skill = heroEl.dataset.heroSkill;
    const desc = heroEl.dataset.heroDesc;
    const heroKey = heroEl.dataset.heroKey;
    const heroName = HERO_NAMES[heroKey] || heroKey;
    const img = `img/heroes/${heroKey}.png`;
    showInfoPopup(`${heroName}【${skill}】`, desc || '无描述', e, img);
    return;
  }
});

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

// Admin key toggle
$('#adminToggle').onclick = () => {
  const inp = $('#adminKey');
  const visible = inp.style.display !== 'none';
  inp.style.display = visible ? 'none' : '';
  $('#adminToggle').textContent = visible ? '管理员 ▸' : '管理员 ▾';
};

function getAdminKey() {
  return ($('#adminKey').value || '').trim();
}

$('#btnCreate').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  localStorage.setItem('sgz_playerName', name);
  socket.emit('createRoom', { playerName: name, adminKey: getAdminKey() });
};
$('#btnJoin').onclick = () => {
  const name = $('#playerName').value.trim() || '无名侠';
  localStorage.setItem('sgz_playerName', name);
  const code = $('#roomCode').value.trim().toUpperCase();
  if (!code) { showToast('请输入房间号'); return; }
  socket.emit('joinRoom', { roomId: code, playerName: name, adminKey: getAdminKey() });
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
  const restartBtn = document.getElementById('btnRestart');
  if (restartBtn) restartBtn.remove();
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
      <div class="hero-card-img"><img src="img/heroes/${h.key}.png" alt="${h.name}" onerror="this.style.display='none'"></div>
      <div class="hero-card-info">
        <div class="hero-name">${h.name}</div>
        <div class="hero-kingdom">${h.kingdom}</div>
        <div class="hero-stats">❤ ${h.hp}</div>
        <div class="hero-skill-name">【${h.skill}】</div>
        <div class="hero-skill-desc">${h.desc}</div>
      </div>
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
    equipStr += equipTag('⚔', p.equipment?.weapon);
    equipStr += equipTag('🛡', p.equipment?.armor);
    equipStr += equipTag('🐎+1', p.equipment?.plusHorse);
    equipStr += equipTag('🐎-1', p.equipment?.minusHorse);
    let judgeStr = (p.judgments && p.judgments.length > 0) ? p.judgments.map(j => `📜${j.name}`).join(' ') : '';

    let roleBadge = '';
    if (p.role) {
      roleBadge = `<span class="opp-role-badge ${ROLE_CLASS[p.role]}">${ROLE_NAMES[p.role]}</span>`;
    }

    const isLowHp = p.alive && p.hp <= 1 && p.hp > 0;

    return `<div class="opponent-card ${isCurrent?'is-current':''} ${isDead?'is-dead':''} ${canTarget?'is-target-selectable':''} ${isLowHp?'low-hp':''}" data-pid="${p.id}">
      <div class="opp-header">
        <div class="opp-portrait">${p.hero ? heroClickTag(p.hero, 'small', p.name) : '?'}</div>
        <div>
          <div class="opp-name">${p.name} ${roleBadge}${p.disconnected ? ' <span style="color:#aaa;font-size:10px">(离线)</span>' : ''}</div>
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
  // Show "跳过" button only for admin when there's a stuck pendingAction
  const canForceSkip = state.isAdmin && pa;
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
  myEquip += equipTag('⚔', me.equipment?.weapon);
  myEquip += equipTag('🛡', me.equipment?.armor);
  myEquip += equipTag('🐎+1', me.equipment?.plusHorse);
  myEquip += equipTag('🐎-1', me.equipment?.minusHorse);
  let myJudge = (me.judgments && me.judgments.length > 0) ? me.judgments.map(j => `📜${j.name}`).join(' ') : '';
  const wineActive = state.turnWineUsed && isMyTurn;
  const myLowHp = me.alive !== false && me.hp <= 1 && me.hp > 0;

  // Apply low-hp class to my area
  const myAreaEl = document.getElementById('myArea');
  if (myAreaEl) {
    myAreaEl.classList.toggle('low-hp', myLowHp);
  }

  $('#myInfo').innerHTML = `
    <div class="my-portrait">${me.hero ? heroClickTag(me.hero, 48, me.name) : '?'}</div>
    <div class="my-details">
      <div class="my-name-hero">
        ${me.name}
        <span class="hero-label">${me.hero ? HERO_NAMES[me.hero] : ''}</span>
        <span class="my-role-badge ${ROLE_CLASS[me.role]}">${ROLE_NAMES[me.role]}</span>
        ${wineActive ? '<span class="wine-badge">🍺 酒</span>' : ''}
        ${me.alive === false ? '<span class="spectator-badge">观战中</span>' : ''}
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
    const imgSrc = getCardImg(c);
    return `<div class="hand-card ${typeClass} ${isSelected ? 'selected' : ''} ${isDiscardSelected ? 'discard-selected' : ''} ${isZhihengSelected || isGsfSelected ? 'discard-selected' : ''}" data-cid="${c.id}" data-subtype="${c.subtype}">
      ${imgSrc ? `<div class="card-art"><img src="${imgSrc}" alt="${c.name}" draggable="false"></div>` : ''}
      <div class="card-header">
        <span class="card-suit-number ${isRed ? 'red' : 'black'}">${c.suit}${c.number}</span>
        <span class="card-name-inline">${c.name}</span>
      </div>
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

  const isHost = state.myId === state.hostId;
  const connectedCount = state.players.filter(p => !p.disconnected).length;

  $('#finalRoles').innerHTML = state.players.map(p =>
    `<div class="final-role-entry ${p.disconnected ? 'disconnected' : ''}">
      ${p.name} — ${p.hero ? HERO_NAMES[p.hero] : '?'} — ${ROLE_NAMES[p.role]} ${p.alive ? '✓ 存活' : '✗ 阵亡'}${p.disconnected ? ' (已离开)' : ''}
    </div>`
  ).join('');

  // Show restart button for host
  let restartBtn = document.getElementById('btnRestart');
  if (!restartBtn) {
    restartBtn = document.createElement('button');
    restartBtn.id = 'btnRestart';
    restartBtn.className = 'btn btn-gold';
    restartBtn.textContent = '再来一局';
    restartBtn.onclick = () => socket.emit('restartGame');
    $('#btnBackLobby').parentNode.insertBefore(restartBtn, $('#btnBackLobby'));
  }
  if (isHost && connectedCount >= 2) {
    restartBtn.style.display = '';
    restartBtn.textContent = `再来一局 (${connectedCount}人)`;
  } else if (isHost) {
    restartBtn.style.display = '';
    restartBtn.disabled = true;
    restartBtn.textContent = '等待更多玩家...';
  } else {
    restartBtn.style.display = 'none';
  }
}

// ====== GAME BOARD WATERMARK (Canvas) ======
(function drawWatermark() {
  const canvas = document.getElementById('gameBoardWatermark');
  if (!canvas) return;

  function render() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Calligraphy characters scattered across the board
    const chars = [
      { ch:'魏', color:'rgba(41,95,168,0.07)', size: 52 },
      { ch:'蜀', color:'rgba(184,52,42,0.07)', size: 50 },
      { ch:'吴', color:'rgba(26,138,74,0.07)', size: 48 },
      { ch:'忠', color:'rgba(160,130,80,0.055)', size: 40 },
      { ch:'义', color:'rgba(160,130,80,0.055)', size: 38 },
      { ch:'勇', color:'rgba(160,130,80,0.055)', size: 42 },
      { ch:'智', color:'rgba(160,130,80,0.055)', size: 36 },
      { ch:'信', color:'rgba(160,130,80,0.05)', size: 34 },
      { ch:'仁', color:'rgba(160,130,80,0.05)', size: 36 },
      { ch:'德', color:'rgba(160,130,80,0.05)', size: 38 },
    ];

    // Tile the characters across the canvas
    const tileW = 420, tileH = 400;
    const positions = [
      [0.07, 0.12], [0.50, 0.22], [0.82, 0.10],
      [0.25, 0.42], [0.65, 0.48],
      [0.12, 0.70], [0.45, 0.75],
      [0.80, 0.68], [0.30, 0.92], [0.70, 0.90]
    ];

    for (let tx = -tileW; tx < W + tileW; tx += tileW) {
      for (let ty = -tileH; ty < H + tileH; ty += tileH) {
        chars.forEach((item, i) => {
          const x = tx + positions[i][0] * tileW;
          const y = ty + positions[i][1] * tileH;
          if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;

          ctx.save();
          ctx.translate(x, y);
          // Slight rotation for natural feel
          ctx.rotate((Math.sin(i * 1.7 + tx * 0.001) * 0.15));
          ctx.font = item.size + "px 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif";
          ctx.fillStyle = item.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.ch, 0, 0);
          ctx.restore();
        });

        // Decorative circles (seal motifs)
        const seals = [
          { x: 0.38, y: 0.58, r: 22, color: 'rgba(184,134,11,0.035)' },
          { x: 0.85, y: 0.35, r: 26, color: 'rgba(192,57,43,0.03)' },
          { x: 0.18, y: 0.30, r: 18, color: 'rgba(39,174,96,0.03)' },
        ];
        seals.forEach(s => {
          const sx = tx + s.x * tileW;
          const sy = ty + s.y * tileH;
          if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) return;
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });

        // Decorative horizontal lines
        const lines = [
          { x1: 0.22, x2: 0.38, y: 0.28 },
          { x1: 0.58, x2: 0.76, y: 0.62 },
        ];
        lines.forEach(l => {
          const lx1 = tx + l.x1 * tileW;
          const lx2 = tx + l.x2 * tileW;
          const ly = ty + l.y * tileH;
          ctx.beginPath();
          ctx.moveTo(lx1, ly);
          ctx.lineTo(lx2, ly);
          ctx.strokeStyle = 'rgba(184,134,11,0.035)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        });
      }
    }
  }

  // Wait for fonts to load, then render
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render);
  } else {
    setTimeout(render, 800);
  }
  window.addEventListener('resize', render);
})();
