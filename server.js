const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ============== GAME DATA ==============

const HEROES = {
  // 蜀
  liubei:    { name: '刘备', hp: 4, maxHp: 4, gender: 'male', kingdom: '蜀', skill: '仁德', skillDesc: '出牌阶段，你可以将任意数量的手牌交给其他角色，若给出≥2张，回复1点体力。主公技【激将】：当你需要使用【杀】时，你可以令其他蜀势力角色代为出杀' },
  guanyu:    { name: '关羽', hp: 4, maxHp: 4, gender: 'male', kingdom: '蜀', skill: '武圣', skillDesc: '你可以将一张红色牌当【杀】使用或打出' },
  zhangfei:  { name: '张飞', hp: 4, maxHp: 4, gender: 'male', kingdom: '蜀', skill: '咆哮', skillDesc: '出牌阶段，你使用【杀】无次数限制' },
  zhugeliang:{ name: '诸葛亮', hp: 3, maxHp: 3, gender: 'male', kingdom: '蜀', skill: '观星/空城', skillDesc: '观星：准备阶段观看牌堆顶X张牌并调整顺序；空城：锁定技，无手牌时不能被杀或决斗指定' },
  zhaoyun:   { name: '赵云', hp: 4, maxHp: 4, gender: 'male', kingdom: '蜀', skill: '龙胆', skillDesc: '你可以将【杀】当【闪】、【闪】当【杀】使用或打出' },
  machao:    { name: '马超', hp: 4, maxHp: 4, gender: 'male', kingdom: '蜀', skill: '马术/铁骑', skillDesc: '马术：锁定技，你与其他角色距离-1；铁骑：使用杀后可判定，红色则不可被闪抵消' },
  huangyueying:{ name: '黄月英', hp: 3, maxHp: 3, gender: 'female', kingdom: '蜀', skill: '集智/奇才', skillDesc: '集智：使用锦囊牌时可摸一张牌；奇才：锁定技，使用锦囊无距离限制' },
  // 魏
  caocao:    { name: '曹操', hp: 4, maxHp: 4, gender: 'male', kingdom: '魏', skill: '奸雄', skillDesc: '当你受到伤害后，你可以获得造成此伤害的牌。主公技【护驾】：当你需要使用【闪】时，你可以令其他魏势力角色代为出闪' },
  simayi:    { name: '司马懿', hp: 3, maxHp: 3, gender: 'male', kingdom: '魏', skill: '反馈/鬼才', skillDesc: '反馈：受到伤害后获得来源一张牌；鬼才：可打出手牌替换判定牌' },
  xiaohoudun:{ name: '夏侯惇', hp: 4, maxHp: 4, gender: 'male', kingdom: '魏', skill: '刚烈', skillDesc: '受到伤害后可判定，非♥则来源选择弃一牌或受1点伤害' },
  zhangliao: { name: '张辽', hp: 4, maxHp: 4, gender: 'male', kingdom: '魏', skill: '突袭', skillDesc: '摸牌阶段可放弃摸牌，改为获得至多两名角色各一张手牌' },
  xuchu:     { name: '许褚', hp: 4, maxHp: 4, gender: 'male', kingdom: '魏', skill: '裸衣', skillDesc: '摸牌阶段可少摸一张牌，此回合杀和决斗伤害+1' },
  guojia:    { name: '郭嘉', hp: 3, maxHp: 3, gender: 'male', kingdom: '魏', skill: '天妒/遗计', skillDesc: '天妒：判定牌生效后获得之；遗计：受到1点伤害后摸两张牌' },
  zhenji:    { name: '甄姬', hp: 3, maxHp: 3, gender: 'female', kingdom: '魏', skill: '倾国/洛神', skillDesc: '倾国：黑色手牌可当闪使用；洛神：准备阶段判定，黑色则获得并可重复' },
  // 吴
  sunquan:   { name: '孙权', hp: 4, maxHp: 4, gender: 'male', kingdom: '吴', skill: '制衡', skillDesc: '出牌阶段限一次，弃置任意张牌然后摸等量的牌。主公技【救援】：锁定技，其他吴势力角色对你使用【桃】时，回复值+1' },
  ganning:   { name: '甘宁', hp: 4, maxHp: 4, gender: 'male', kingdom: '吴', skill: '奇袭', skillDesc: '你可以将一张黑色牌当【过河拆桥】使用' },
  lvmeng:    { name: '吕蒙', hp: 4, maxHp: 4, gender: 'male', kingdom: '吴', skill: '克己', skillDesc: '若出牌阶段未使用或打出过杀，可跳过弃牌阶段' },
  huanggai:  { name: '黄盖', hp: 4, maxHp: 4, gender: 'male', kingdom: '吴', skill: '苦肉', skillDesc: '出牌阶段，你可以失去1点体力，然后摸两张牌' },
  zhouyu:    { name: '周瑜', hp: 3, maxHp: 3, gender: 'male', kingdom: '吴', skill: '英姿/反间', skillDesc: '英姿：摸牌阶段多摸一张牌；反间：出牌阶段可令一名角色猜花色，猜错受1伤' },
  daqiao:    { name: '大乔', hp: 3, maxHp: 3, gender: 'female', kingdom: '吴', skill: '国色/流离', skillDesc: '国色：♦牌可当乐不思蜀使用；流离：被杀时可弃一牌转移给攻击范围内另一角色' },
  luxun:     { name: '陆逊', hp: 3, maxHp: 3, gender: 'male', kingdom: '吴', skill: '谦逊/连营', skillDesc: '谦逊：不能成为顺手牵羊和乐不思蜀的目标；连营：失去最后手牌时摸一张' },
  sunshangxiang:{ name: '孙尚香', hp: 3, maxHp: 3, gender: 'female', kingdom: '吴', skill: '结姻/枭姬', skillDesc: '结姻：弃两牌令你与一名受伤男性各回复1血；枭姬：失去装备时摸两张牌' },
  // 群
  lvbu:      { name: '吕布', hp: 4, maxHp: 4, gender: 'male', kingdom: '群', skill: '无双', skillDesc: '锁定技，你的杀需两闪抵消，决斗时对方需出两杀' },
  huatuo:    { name: '华佗', hp: 3, maxHp: 3, gender: 'male', kingdom: '群', skill: '急救/青囊', skillDesc: '急救：回合外可将红色牌当桃使用；青囊：出牌阶段可弃一牌令一名角色回复1血' },
  diaochan:  { name: '貂蝉', hp: 3, maxHp: 3, gender: 'female', kingdom: '群', skill: '离间/闭月', skillDesc: '离间：弃一牌令两名男性角色决斗；闭月：结束阶段摸一张牌' },
  huaxiong:  { name: '华雄', hp: 6, maxHp: 6, gender: 'male', kingdom: '群', skill: '耀武', skillDesc: '锁定技，红色杀对你造成伤害时，来源回复1血或摸一牌' },
};

const CARD_SUITS = ['♠','♥','♣','♦'];
const CARD_NUMBERS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function createDeck() {
  const deck = [];
  let id = 0;
  const add = (type, subtype, name, suit, number, count = 1) => {
    for (let i = 0; i < count; i++) {
      const s = suit || CARD_SUITS[Math.floor(Math.random() * 4)];
      const n = number || CARD_NUMBERS[Math.floor(Math.random() * 13)];
      deck.push({ id: id++, type, subtype, name, suit: s, number: n });
    }
  };
  // Basic cards (scaled for 8 players)
  for (let i = 0; i < 45; i++) add('basic','attack','杀', i < 20 ? '♠' : i < 35 ? '♣' : '♥', CARD_NUMBERS[i % 13]);
  for (let i = 0; i < 24; i++) add('basic','dodge','闪', i < 12 ? '♥' : '♦', CARD_NUMBERS[i % 13]);
  for (let i = 0; i < 12; i++) add('basic','peach','桃', '♥', CARD_NUMBERS[i % 13]);
  // Trick cards
  add('trick','duel','决斗', '♠', 'A', 4);
  add('trick','barbarian','南蛮入侵', '♠', '7', 3);
  add('trick','arrow','万箭齐发', '♥', 'A', 2);
  add('trick','draw2','无中生有', '♥', '7', 6);
  add('trick','dismantle','过河拆桥', '♠', '3', 5);
  add('trick','snatch','顺手牵羊', '♠', '3', 5);
  add('trick','peachgarden','桃园结义', '♥', 'A', 2);
  add('trick','indulgence','乐不思蜀', '♠', '6', 3);
  add('trick','nullify','无懈可击', '♠', 'Q', 4);
  // Basic: wine
  add('basic','wine','酒', '♠', '3', 6);
  // Equipment - Weapons
  add('equipment','weapon','诸葛连弩', '♣', 'A', 2);
  add('equipment','weapon','青龙偃月刀', '♠', '5', 1);
  add('equipment','weapon','丈八蛇矛', '♠', '2', 1);
  add('equipment','weapon','雌雄双股剑', '♠', '2', 1);
  add('equipment','weapon','青釭剑', '♠', '6', 1);
  add('equipment','weapon','寒冰剑', '♠', '2', 1);
  add('equipment','weapon','古锭刀', '♠', 'A', 1);
  add('equipment','weapon','贯石斧', '♦', '5', 1);
  add('equipment','weapon','方天画戟', '♦', 'Q', 1);
  add('equipment','weapon','朱雀羽扇', '♦', 'A', 1);
  add('equipment','weapon','麒麟弓', '♥', '5', 1);
  // Equipment - Armor
  add('equipment','armor','八卦阵', '♠', '2', 2);
  add('equipment','armor','仁王盾', '♣', '2', 1);
  add('equipment','armor','藤甲', '♠', '2', 1);
  add('equipment','armor','白银狮子', '♣', '1', 1);
  // Equipment - Horses
  add('equipment','plusHorse','的卢', '♣', '5', 1);
  add('equipment','plusHorse','绝影', '♠', '5', 1);
  add('equipment','plusHorse','爪黄飞电', '♠', 'K', 1);
  add('equipment','minusHorse','赤兔', '♥', '5', 1);
  add('equipment','minusHorse','大宛', '♠', '5', 1);
  add('equipment','minusHorse','紫骍', '♦', '5', 1);

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const WEAPON_RANGE = {
  '诸葛连弩': 1, '青釭剑': 2, '雌雄双股剑': 2, '寒冰剑': 2, '古锭刀': 2,
  '青龙偃月刀': 3, '丈八蛇矛': 3, '贯石斧': 3,
  '方天画戟': 4, '朱雀羽扇': 4,
  '麒麟弓': 5,
};

// ============== ROOM MANAGEMENT ==============

const rooms = new Map();

function createRoom(roomId, hostName) {
  return {
    id: roomId,
    players: [],
    state: 'waiting', // waiting, hero_select, playing, finished
    deck: [],
    discard: [],
    currentPlayerIdx: 0,
    turnPhase: null,
    log: [],
    pendingAction: null,
    turnAttackCount: 0,
    turnWineUsed: false, // has wine been used this turn (for +1 damage on next attack)
    luoyiActive: false, // 许褚 裸衣 active this turn
  };
}

function addLog(room, msg) {
  room.log.push({ time: Date.now(), msg });
  io.to(room.id).emit('log', msg);
}

function getPlayerView(room, playerId) {
  const me = room.players.find(p => p.id === playerId);
  if (!me) return null;
  return {
    roomId: room.id,
    state: room.state,
    myId: playerId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      hp: p.hp,
      maxHp: p.maxHp,
      role: (room.state === 'finished' || p.id === playerId || p.role === 'lord') ? p.role : null,
      handCount: p.hand.length,
      hand: p.id === playerId ? p.hand : [],
      equipment: p.equipment,
      judgments: p.judgments || [],
      alive: p.alive,
      kingdom: p.hero ? HEROES[p.hero]?.kingdom : null,
      skill: p.hero ? HEROES[p.hero]?.skill : null,
      skillDesc: p.hero ? HEROES[p.hero]?.skillDesc : null,
    })),
    currentPlayerIdx: room.currentPlayerIdx,
    turnPhase: room.turnPhase,
    deckCount: room.deck.length,
    log: room.log.slice(-50),
    pendingAction: room.pendingAction,
    turnAttackCount: room.turnAttackCount,
    turnWineUsed: room.turnWineUsed,
  };
}

function broadcastState(room) {
  room.players.forEach(p => {
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) sock.emit('gameState', getPlayerView(room, p.id));
  });
}

function drawCards(room, player, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.deck.length === 0) {
      // Reshuffle discard
      room.deck = room.discard.splice(0);
      for (let j = room.deck.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [room.deck[j], room.deck[k]] = [room.deck[k], room.deck[j]];
      }
      if (room.deck.length === 0) break;
    }
    const card = room.deck.pop();
    player.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

function removeCardFromHand(player, cardId) {
  const idx = player.hand.findIndex(c => c.id === cardId);
  if (idx >= 0) return player.hand.splice(idx, 1)[0];
  return null;
}

function assignRoles(playerCount) {
  const roleMap = {
    2: ['lord','rebel'],
    3: ['lord','rebel','spy'],
    4: ['lord','loyalist','rebel','spy'],
    5: ['lord','loyalist','rebel','rebel','spy'],
    6: ['lord','loyalist','rebel','rebel','rebel','spy'],
    7: ['lord','loyalist','loyalist','rebel','rebel','rebel','spy'],
    8: ['lord','loyalist','loyalist','rebel','rebel','rebel','rebel','spy'],
  };
  const roles = [...(roleMap[playerCount] || roleMap[8])];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

const ROLE_NAMES = { lord: '主公', loyalist: '忠臣', rebel: '反贼', spy: '内奸' };

function getDistance(room, fromIdx, toIdx) {
  const alive = room.players.filter(p => p.alive);
  const from = room.players[fromIdx];
  const to = room.players[toIdx];
  const fromAliveIdx = alive.findIndex(p => p.id === from.id);
  const toAliveIdx = alive.findIndex(p => p.id === to.id);
  if (fromAliveIdx < 0 || toAliveIdx < 0) return 999;
  const n = alive.length;
  let dist = Math.min(Math.abs(fromAliveIdx - toAliveIdx), n - Math.abs(fromAliveIdx - toAliveIdx));
  // -1 horse on attacker reduces distance
  if (from.equipment.minusHorse) dist = Math.max(1, dist - 1);
  // 马超 马术: distance -1
  if (from.hero === 'machao') dist = Math.max(1, dist - 1);
  // +1 horse on target increases distance
  if (to.equipment.plusHorse) dist += 1;
  return dist;
}

function getAttackRange(player) {
  const weapon = player.equipment.weapon;
  if (weapon) return WEAPON_RANGE[weapon.name] || 1;
  return 1;
}

function checkDeath(room, player, killer) {
  if (player.hp <= 0) {
    // Ask for peach (simplified: auto-use if available)
    const peach = player.hand.find(c => c.subtype === 'peach');
    if (peach) {
      removeCardFromHand(player, peach.id);
      room.discard.push(peach);
      player.hp = 1;
      addLog(room, `${player.name} 使用【桃】自救，回复至1点体力`);
      return false;
    }
    // Try wine to self-save
    const wine = player.hand.find(c => c.subtype === 'wine');
    if (wine) {
      removeCardFromHand(player, wine.id);
      room.discard.push(wine);
      player.hp = 1;
      addLog(room, `${player.name} 使用【酒】自救，回复至1点体力`);
      return false;
    }
    // 孙权 救援 (Lord skill): Wu allies' peach heals 2 HP instead of 1
    if (player.hero === 'sunquan' && player.role === 'lord') {
      const wuAllies = room.players.filter(p => p.alive && p.id !== player.id && HEROES[p.hero]?.kingdom === '吴');
      for (const ally of wuAllies) {
        if (player.hp > 0) break;
        const allyPeach = ally.hand.find(c => c.subtype === 'peach');
        if (allyPeach) {
          removeCardFromHand(ally, allyPeach.id);
          room.discard.push(allyPeach);
          player.hp += 2; // 救援: +2 instead of +1
          addLog(room, `${ally.name} 响应【救援】使用【桃】，${player.name} 回复2点体力（至${player.hp}）`);
        }
      }
      if (player.hp > 0) return false;
    }
    player.alive = false;
    addLog(room, `💀 ${player.name} (${ROLE_NAMES[player.role]}) 阵亡！`);

    // Rewards & penalties
    if (player.role === 'rebel' && killer) {
      addLog(room, `${killer.name} 击杀反贼，摸3张牌`);
      drawCards(room, killer, 3);
    }
    if (player.role === 'loyalist' && killer && killer.role === 'lord') {
      addLog(room, `主公误杀忠臣！弃置所有手牌和装备`);
      killer.hand.forEach(c => room.discard.push(c));
      killer.hand = [];
      if (killer.equipment.weapon) { room.discard.push(killer.equipment.weapon); killer.equipment.weapon = null; }
      if (killer.equipment.armor) { room.discard.push(killer.equipment.armor); killer.equipment.armor = null; }
      if (killer.equipment.plusHorse) { room.discard.push(killer.equipment.plusHorse); killer.equipment.plusHorse = null; }
      if (killer.equipment.minusHorse) { room.discard.push(killer.equipment.minusHorse); killer.equipment.minusHorse = null; }
    }

    checkWinCondition(room);
    return true;
  }
  return false;
}

function checkWinCondition(room) {
  const alive = room.players.filter(p => p.alive);
  const lord = room.players.find(p => p.role === 'lord');

  if (!lord.alive) {
    // Lord dead
    if (alive.length === 1 && alive[0].role === 'spy') {
      room.state = 'finished';
      addLog(room, '🏆 内奸获胜！');
    } else {
      room.state = 'finished';
      addLog(room, '🏆 反贼获胜！');
    }
    broadcastState(room);
    return true;
  }

  const rebels = room.players.filter(p => p.role === 'rebel' && p.alive);
  const spies = room.players.filter(p => p.role === 'spy' && p.alive);
  if (rebels.length === 0 && spies.length === 0) {
    room.state = 'finished';
    addLog(room, '🏆 主公与忠臣获胜！');
    broadcastState(room);
    return true;
  }
  return false;
}

function startTurn(room) {
  if (room.state !== 'playing') return;
  const player = room.players[room.currentPlayerIdx];
  if (!player.alive) { nextTurn(room); return; }

  room.turnPhase = 'draw';
  room.turnAttackCount = 0;
  room.turnWineUsed = false;
  room.luoyiActive = false;
  room.pendingAction = null;
  addLog(room, `── ${player.name} 的回合开始 ──`);

  // Judgment phase: resolve delayed tricks (乐不思蜀)
  let skipPlayPhase = false;
  if (player.judgments.length > 0) {
    const judgeCard = player.judgments.shift();
    room.discard.push(judgeCard);
    // Judgment: if NOT ♥, skip play phase
    const judgeResult = room.deck.length > 0 ? room.deck.pop() : null;
    if (judgeResult) {
      room.discard.push(judgeResult);
      const isHeart = judgeResult.suit === '♥';
      addLog(room, `${player.name} 的【乐不思蜀】判定结果: ${judgeResult.suit}${judgeResult.number} — ${isHeart ? '判定为♥，乐不思蜀无效！' : '判定生效，跳过出牌阶段'}`);
      if (!isHeart) {
        skipPlayPhase = true;
      }
    }
  }

  // 甄姬 洛神: before draw phase
  if (player.hero === 'zhenji') {
    let luoshenCount = 0;
    while (room.deck.length > 0) {
      const judgeCard = room.deck.pop();
      if (judgeCard.suit === '♠' || judgeCard.suit === '♣') {
        player.hand.push(judgeCard);
        luoshenCount++;
        addLog(room, `甄姬【洛神】判定 ${judgeCard.suit}${judgeCard.number} — 黑色，获得此牌`);
      } else {
        room.discard.push(judgeCard);
        addLog(room, `甄姬【洛神】判定 ${judgeCard.suit}${judgeCard.number} — 红色，洛神结束`);
        break;
      }
      if (luoshenCount >= 3) break; // safety cap
    }
  }

  // Draw phase: draw 2 cards (诸葛亮 观星 simplified - just draw)
  let drawCount = 2;
  if (player.hero === 'zhugeliang') drawCount = 2; // Simplified
  // 周瑜 英姿: draw 3 instead of 2
  if (player.hero === 'zhouyu') drawCount = 3;
  // 许褚 裸衣: draw 1 less, damage +1 this turn
  if (player.hero === 'xuchu') {
    room.luoyiActive = true;
    drawCount -= 1;
    addLog(room, `许褚【裸衣】发动，少摸一张牌，本回合杀和决斗伤害+1`);
  }
  const drawn = drawCards(room, player, drawCount);
  addLog(room, `${player.name} 摸了${drawn.length}张牌`);

  if (skipPlayPhase) {
    room.turnPhase = 'discard';
    addLog(room, `${player.name} 被【乐不思蜀】跳过出牌阶段`);
    // Go to end-of-turn (闭月 + discard check)
    endCurrentTurn(room);
    return;
  }

  room.turnPhase = 'play';
  broadcastState(room);
}

function nextTurn(room) {
  if (room.state !== 'playing') return;

  // Find next alive player
  let next = (room.currentPlayerIdx + 1) % room.players.length;
  let safety = 0;
  while (!room.players[next].alive && safety < room.players.length) {
    next = (next + 1) % room.players.length;
    safety++;
  }
  room.currentPlayerIdx = next;
  startTurn(room);
}

// End-of-turn logic: 闭月 → check discard → nextTurn
function endCurrentTurn(room) {
  if (room.state !== 'playing') return;
  const curr = room.players[room.currentPlayerIdx];
  if (!curr.alive) { nextTurn(room); return; }

  // 貂蝉 闭月: end phase draw 1
  if (curr.hero === 'diaochan') {
    drawCards(room, curr, 1);
    addLog(room, `貂蝉【闭月】结束阶段摸一张牌`);
  }

  // Check if discard needed
  const excess = curr.hand.length - curr.maxHp;
  if (excess > 0) {
    // 吕蒙 克己: skip discard if no attack was used
    if (curr.hero === 'lvmeng' && room.turnAttackCount === 0) {
      addLog(room, `吕蒙【克己】未使用杀，跳过弃牌阶段`);
      addLog(room, `${curr.name} 的回合结束`);
      nextTurn(room);
      return;
    }
    room.turnPhase = 'discard';
    room.pendingAction = { type: 'discard', playerId: curr.id, count: excess };
    addLog(room, `${curr.name} 需要弃置 ${excess} 张牌`);
    broadcastState(room);
  } else {
    addLog(room, `${curr.name} 的回合结束`);
    nextTurn(room);
  }
}

function handlePlayCard(room, player, data) {
  const { cardId, targetId, responseCardId } = data;

  // Handle pending responses
  if (room.pendingAction) {
    handleResponse(room, player, data);
    return;
  }

  if (room.players[room.currentPlayerIdx].id !== player.id) return;
  if (room.turnPhase !== 'play') return;

  const card = player.hand.find(c => c.id === cardId);
  if (!card) return;

  const target = targetId ? room.players.find(p => p.id === targetId) : null;

  switch (card.subtype) {
    case 'attack': {
      // Check attack limit
      const hasZhugenu = player.equipment.weapon && player.equipment.weapon.name === '诸葛连弩';
      const isPaoxiao = player.hero === 'zhangfei';
      if (!hasZhugenu && !isPaoxiao && room.turnAttackCount >= 1) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '本回合已使用过【杀】');
        return;
      }
      if (!target || !target.alive || target.id === player.id) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请选择一个有效目标');
        return;
      }
      // 诸葛亮 空城: cannot be targeted by 杀 when no hand cards
      if (target.hero === 'zhugeliang' && target.hand.length === 0) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '诸葛亮【空城】：无手牌时不能被杀指定');
        return;
      }
      // Check distance
      const fromIdx = room.players.indexOf(player);
      const toIdx = room.players.indexOf(target);
      const dist = getDistance(room, fromIdx, toIdx);
      if (dist > getAttackRange(player)) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '目标超出攻击范围');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      room.turnAttackCount++;
      addLog(room, `${player.name} 对 ${target.name} 使用了【杀】`);

      // 雌雄双股剑 effect
      if (player.equipment.weapon?.name === '雌雄双股剑') {
        const pGender = HEROES[player.hero]?.gender;
        const tGender = HEROES[target.hero]?.gender;
        if (pGender !== tGender) {
          addLog(room, `雌雄双股剑发动：${target.name} 须弃一张手牌或让 ${player.name} 摸一张牌`);
          // Simplified: target loses a random card or attacker draws 1
          if (target.hand.length > 0) {
            const lost = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            room.discard.push(lost);
          } else {
            drawCards(room, player, 1);
          }
        }
      }

      // 马超 铁骑: judge, if red, skip dodge phase
      if (player.hero === 'machao') {
        const tieqiJudge = room.deck.length > 0 ? room.deck.pop() : null;
        if (tieqiJudge) {
          room.discard.push(tieqiJudge);
          const isRed = tieqiJudge.suit === '♥' || tieqiJudge.suit === '♦';
          if (isRed) {
            addLog(room, `马超【铁骑】判定 ${tieqiJudge.suit}${tieqiJudge.number} — 红色，此杀不可被闪抵消`);
            let tieqiDmg = 1;
            if (room.turnWineUsed) { tieqiDmg = 2; room.turnWineUsed = false; }
            if (room.luoyiActive && player.hero === 'xuchu') tieqiDmg += 1;
            target.hp -= tieqiDmg;
            addLog(room, `${target.name} 受到${tieqiDmg}点伤害，体力值: ${target.hp}/${target.maxHp}`);
            checkDeath(room, target, player);
            broadcastState(room);
            return;
          } else {
            addLog(room, `马超【铁骑】判定 ${tieqiJudge.suit}${tieqiJudge.number} — 黑色，无效`);
          }
        }
      }

      // Pending dodge (吕布 无双: need 2 dodges)
      const dodgesNeeded = player.hero === 'lvbu' ? 2 : 1;
      room.pendingAction = { type: 'dodge', attacker: player.id, target: target.id, card: card, dodgesNeeded: dodgesNeeded, dodgesGiven: 0 };
      broadcastState(room);
      break;
    }

    case 'peach': {
      if (player.hp >= player.maxHp) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '体力已满');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      player.hp = Math.min(player.hp + 1, player.maxHp);
      addLog(room, `${player.name} 使用了【桃】，回复至${player.hp}点体力`);
      broadcastState(room);
      break;
    }

    case 'duel': {
      if (!target || !target.alive || target.id === player.id) return;
      // 诸葛亮 空城: cannot be targeted by 决斗 when no hand cards
      if (target.hero === 'zhugeliang' && target.hand.length === 0) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '诸葛亮【空城】：无手牌时不能被决斗指定');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 对 ${target.name} 使用了【决斗】`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      room.pendingAction = { type: 'duel', players: [target.id, player.id], currentIdx: 0, source: player.id };
      broadcastState(room);
      break;
    }

    case 'barbarian': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【南蛮入侵】`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const targets = room.players.filter(p => p.alive && p.id !== player.id);
      room.pendingAction = { type: 'barbarian', source: player.id, targets: targets.map(t => t.id), currentIdx: 0 };
      broadcastState(room);
      break;
    }

    case 'arrow': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【万箭齐发】`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const arrowTargets = room.players.filter(p => p.alive && p.id !== player.id);
      room.pendingAction = { type: 'arrow', source: player.id, targets: arrowTargets.map(t => t.id), currentIdx: 0 };
      broadcastState(room);
      break;
    }

    case 'draw2': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      drawCards(room, player, 2);
      addLog(room, `${player.name} 使用了【无中生有】，摸了2张牌`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      broadcastState(room);
      break;
    }

    case 'dismantle': {
      if (!target || !target.alive || target.id === player.id) return;
      if (target.hand.length === 0 && !target.equipment.weapon && !target.equipment.armor && !target.equipment.plusHorse && !target.equipment.minusHorse) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '目标没有可拆的牌');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      // Remove a random card/equipment from target
      const options = [...target.hand];
      if (target.equipment.weapon) options.push(target.equipment.weapon);
      if (target.equipment.armor) options.push(target.equipment.armor);
      if (target.equipment.plusHorse) options.push(target.equipment.plusHorse);
      if (target.equipment.minusHorse) options.push(target.equipment.minusHorse);
      const chosen = options[Math.floor(Math.random() * options.length)];
      if (target.hand.includes(chosen)) {
        removeCardFromHand(target, chosen.id);
      } else if (target.equipment.weapon?.id === chosen.id) {
        target.equipment.weapon = null;
      } else if (target.equipment.armor?.id === chosen.id) {
        target.equipment.armor = null;
      } else if (target.equipment.plusHorse?.id === chosen.id) {
        target.equipment.plusHorse = null;
      } else if (target.equipment.minusHorse?.id === chosen.id) {
        target.equipment.minusHorse = null;
      }
      room.discard.push(chosen);
      addLog(room, `${player.name} 对 ${target.name} 使用【过河拆桥】，拆掉了一张${chosen.name}`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      broadcastState(room);
      break;
    }

    case 'snatch': {
      if (!target || !target.alive || target.id === player.id) return;
      // 陆逊 谦逊
      if (target.hero === 'luxun') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '陆逊【谦逊】不能被顺手牵羊指定');
        return;
      }
      const fromI = room.players.indexOf(player);
      const toI = room.players.indexOf(target);
      if (getDistance(room, fromI, toI) > 1) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '顺手牵羊只能对距离1的角色使用');
        return;
      }
      if (target.hand.length === 0 && !target.equipment.weapon && !target.equipment.armor && !target.equipment.plusHorse && !target.equipment.minusHorse) return;
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      const opts = [...target.hand];
      if (target.equipment.weapon) opts.push(target.equipment.weapon);
      if (target.equipment.armor) opts.push(target.equipment.armor);
      if (target.equipment.plusHorse) opts.push(target.equipment.plusHorse);
      if (target.equipment.minusHorse) opts.push(target.equipment.minusHorse);
      const pick = opts[Math.floor(Math.random() * opts.length)];
      if (target.hand.includes(pick)) {
        removeCardFromHand(target, pick.id);
      } else if (target.equipment.weapon?.id === pick.id) {
        target.equipment.weapon = null;
      } else if (target.equipment.armor?.id === pick.id) {
        target.equipment.armor = null;
      } else if (target.equipment.plusHorse?.id === pick.id) {
        target.equipment.plusHorse = null;
      } else if (target.equipment.minusHorse?.id === pick.id) {
        target.equipment.minusHorse = null;
      }
      player.hand.push(pick);
      addLog(room, `${player.name} 对 ${target.name} 使用【顺手牵羊】，获得了一张牌`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      broadcastState(room);
      break;
    }

    case 'peachgarden': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      room.players.filter(p => p.alive).forEach(p => {
        if (p.hp < p.maxHp) {
          p.hp++;
          addLog(room, `${p.name} 回复1点体力`);
        }
      });
      addLog(room, `${player.name} 使用了【桃园结义】`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      broadcastState(room);
      break;
    }

    case 'weapon': {
      removeCardFromHand(player, card.id);
      if (player.equipment.weapon) room.discard.push(player.equipment.weapon);
      player.equipment.weapon = card;
      addLog(room, `${player.name} 装备了【${card.name}】`);
      broadcastState(room);
      break;
    }

    case 'armor': {
      removeCardFromHand(player, card.id);
      if (player.equipment.armor) room.discard.push(player.equipment.armor);
      player.equipment.armor = card;
      addLog(room, `${player.name} 装备了【${card.name}】`);
      broadcastState(room);
      break;
    }

    case 'plusHorse': {
      removeCardFromHand(player, card.id);
      if (player.equipment.plusHorse) room.discard.push(player.equipment.plusHorse);
      player.equipment.plusHorse = card;
      addLog(room, `${player.name} 装备了【${card.name}】(+1马)`);
      broadcastState(room);
      break;
    }

    case 'minusHorse': {
      removeCardFromHand(player, card.id);
      if (player.equipment.minusHorse) room.discard.push(player.equipment.minusHorse);
      player.equipment.minusHorse = card;
      addLog(room, `${player.name} 装备了【${card.name}】(-1马)`);
      broadcastState(room);
      break;
    }

    case 'wine': {
      if (room.turnWineUsed) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '本回合已使用过【酒】');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      room.turnWineUsed = true;
      addLog(room, `${player.name} 使用了【酒】，下一次【杀】伤害+1`);
      broadcastState(room);
      break;
    }

    case 'indulgence': {
      if (!target || !target.alive || target.id === player.id) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请选择一个目标');
        return;
      }
      // 陆逊 谦逊
      if (target.hero === 'luxun') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '陆逊【谦逊】不能被乐不思蜀指定');
        return;
      }
      removeCardFromHand(player, card.id);
      target.judgments.push(card);
      addLog(room, `${player.name} 对 ${target.name} 使用了【乐不思蜀】`);
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      broadcastState(room);
      break;
    }

    case 'nullify': {
      // 无懈可击 can only be used in response, not proactively during play phase
      io.sockets.sockets.get(player.socketId)?.emit('error', '【无懈可击】只能在锦囊牌生效时使用');
      break;
    }

    default:
      io.sockets.sockets.get(player.socketId)?.emit('error', '无法使用此牌');
  }
}

function handleResponse(room, player, data) {
  const pa = room.pendingAction;
  if (!pa) return;

  // ====== 激将 (Jijiang) - Lord Liu Bei asks Shu allies for 杀 ======
  if (pa.type === 'jijiang') {
    const currentAskerId = pa.kingdomPlayers[pa.currentAskerIdx];
    if (player.id !== currentAskerId) return;

    if (data.responseCardId) {
      let atkCard = player.hand.find(c => c.id === data.responseCardId);
      // Allow 杀 card, or 赵云龙胆 (dodge as attack), or 关羽武圣 (red card as attack)
      if (atkCard && player.hero === 'zhaoyun' && atkCard.subtype === 'dodge') {
        // Allow via 龙胆
      } else if (atkCard && player.hero === 'guanyu' && (atkCard.suit === '♥' || atkCard.suit === '♦')) {
        // Allow via 武圣
      } else if (!atkCard || atkCard.subtype !== 'attack') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请出【杀】');
        return;
      }
      removeCardFromHand(player, atkCard.id);
      room.discard.push(atkCard);
      addLog(room, `${player.name} 响应【激将】，代为出【杀】`);

      const lord = room.players.find(p => p.id === pa.lordId);
      const target = room.players.find(p => p.id === pa.targetId);
      room.turnAttackCount++;

      // Create dodge pending as if lord attacked
      room.pendingAction = { type: 'dodge', attacker: lord.id, target: target.id, card: atkCard, dodgesNeeded: 1, dodgesGiven: 0 };
      broadcastState(room);
    } else {
      // Pass
      addLog(room, `${room.players.find(p => p.id === currentAskerId)?.name || '?'} 未响应【激将】`);
      pa.currentAskerIdx++;
      if (pa.currentAskerIdx >= pa.kingdomPlayers.length) {
        addLog(room, `无人响应【激将】`);
        room.pendingAction = null;
        broadcastState(room);
      } else {
        broadcastState(room);
      }
    }
    return;
  }

  // ====== 护驾 (Hujia) - Lord Cao Cao asks Wei allies for 闪 ======
  if (pa.type === 'hujia') {
    const currentAskerId = pa.kingdomPlayers[pa.currentAskerIdx];
    if (player.id !== currentAskerId) return;

    if (data.responseCardId) {
      let dodgeCard = player.hand.find(c => c.id === data.responseCardId);
      // Allow 闪 card, or 赵云龙胆 (attack as dodge), or 甄姬倾国 (black card as dodge)
      if (dodgeCard && player.hero === 'zhaoyun' && dodgeCard.subtype === 'attack') {
        // Allow via 龙胆
      } else if (dodgeCard && player.hero === 'zhenji' && (dodgeCard.suit === '♠' || dodgeCard.suit === '♣')) {
        // Allow via 倾国
      } else if (!dodgeCard || dodgeCard.subtype !== 'dodge') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请出【闪】');
        return;
      }
      removeCardFromHand(player, dodgeCard.id);
      room.discard.push(dodgeCard);
      addLog(room, `${player.name} 响应【护驾】，代为出【闪】`);

      // Dodge succeeds - wine bonus consumed
      if (room.turnWineUsed) {
        room.turnWineUsed = false;
        addLog(room, `【酒】加成被【闪】抵消`);
      }
      room.pendingAction = null;
      broadcastState(room);
    } else {
      // Pass
      addLog(room, `${room.players.find(p => p.id === currentAskerId)?.name || '?'} 未响应【护驾】`);
      pa.currentAskerIdx++;
      if (pa.currentAskerIdx >= pa.kingdomPlayers.length) {
        addLog(room, `无人响应【护驾】，${room.players.find(p => p.id === pa.lordId)?.name || '主公'}需自行出闪`);
        // Revert to original dodge pending
        room.pendingAction = pa.originalDodge;
        broadcastState(room);
      } else {
        broadcastState(room);
      }
    }
    return;
  }

  if (pa.type === 'dodge') {
    if (player.id !== pa.target) return;
    const target = room.players.find(p => p.id === pa.target);
    const attacker = room.players.find(p => p.id === pa.attacker);

    if (data.responseCardId) {
      let dodgeCard = player.hand.find(c => c.id === data.responseCardId);
      // 龙胆: 赵云 can use 杀 as 闪
      if (dodgeCard && player.hero === 'zhaoyun' && dodgeCard.subtype === 'attack') {
        // Allow it as dodge
      // 甄姬 倾国: black hand card as dodge
      } else if (dodgeCard && player.hero === 'zhenji' && (dodgeCard.suit === '♠' || dodgeCard.suit === '♣')) {
        // Allow black card as dodge
      } else if (dodgeCard && dodgeCard.subtype !== 'dodge') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请出【闪】');
        return;
      }
      if (!dodgeCard) return;
      removeCardFromHand(player, dodgeCard.id);
      room.discard.push(dodgeCard);
      addLog(room, `${target.name} 打出了【闪】`);

      // 吕布 无双: need multiple dodges
      if (pa.dodgesNeeded && pa.dodgesNeeded > 1) {
        pa.dodgesGiven = (pa.dodgesGiven || 0) + 1;
        if (pa.dodgesGiven < pa.dodgesNeeded) {
          addLog(room, `吕布【无双】：还需再出${pa.dodgesNeeded - pa.dodgesGiven}张【闪】`);
          broadcastState(room);
          return;
        }
      }

      // Wine is consumed even if dodged (bonus lost)
      if (room.turnWineUsed) {
        room.turnWineUsed = false;
        addLog(room, `【酒】加成被【闪】抵消`);
      }

      // 青龙偃月刀: attacker can attack again
      if (attacker.equipment.weapon?.name === '青龙偃月刀') {
        const attackCard = attacker.hand.find(c => c.subtype === 'attack');
        if (attackCard) {
          addLog(room, `青龙偃月刀发动：${attacker.name} 可以再出【杀】`);
          // Simplified: auto-use
          removeCardFromHand(attacker, attackCard.id);
          room.discard.push(attackCard);
          addLog(room, `${attacker.name} 再次对 ${target.name} 使用了【杀】`);
          room.pendingAction = { type: 'dodge', attacker: attacker.id, target: target.id, card: attackCard };
          broadcastState(room);
          return;
        }
      }

      // 贯石斧: discard 2 cards to force hit
      if (attacker.equipment.weapon?.name === '贯石斧' && attacker.hand.length >= 2) {
        const c1 = attacker.hand.shift();
        const c2 = attacker.hand.shift();
        room.discard.push(c1, c2);
        addLog(room, `贯石斧发动：${attacker.name} 弃两张牌，强制命中`);
        let gsDmg = 1;
        if (room.turnWineUsed) { gsDmg = 2; room.turnWineUsed = false; }
        target.hp -= gsDmg;
        addLog(room, `${target.name} 受到${gsDmg}点伤害`);
        checkDeath(room, target, attacker);
        room.pendingAction = null;
        broadcastState(room);
        return;
      }

      room.pendingAction = null;
      broadcastState(room);
    } else {
      // No dodge - take damage
      // 青釭剑: ignore armor
      const ignoreArmor = attacker.equipment.weapon?.name === '青釭剑';
      if (ignoreArmor) {
        addLog(room, `青釭剑发动：无视目标防具`);
      }
      // 八卦阵 check
      if (!ignoreArmor && target.equipment.armor?.name === '八卦阵') {
        const judge = Math.random() < 0.5; // Simplified judgement
        if (judge) {
          addLog(room, `八卦阵判定成功！${target.name} 回避了攻击`);
          room.pendingAction = null;
          broadcastState(room);
          return;
        } else {
          addLog(room, `八卦阵判定失败`);
        }
      }
      // 仁王盾: blocks black 杀
      if (!ignoreArmor && target.equipment.armor?.name === '仁王盾' && (pa.card.suit === '♠' || pa.card.suit === '♣')) {
        addLog(room, `仁王盾挡住了黑色【杀】`);
        room.pendingAction = null;
        broadcastState(room);
        return;
      }
      // 藤甲: blocks non-fire (non-♥) 杀
      if (!ignoreArmor && target.equipment.armor?.name === '藤甲' && pa.card.suit !== '♥') {
        addLog(room, `藤甲抵消了非火属性【杀】`);
        room.pendingAction = null;
        broadcastState(room);
        return;
      }

      let damage = 1;
      if (room.turnWineUsed) {
        damage = 2;
        room.turnWineUsed = false;
      }
      // 许褚 裸衣: +1 damage on 杀
      if (room.luoyiActive && attacker.hero === 'xuchu') {
        damage += 1;
        addLog(room, `许褚【裸衣】伤害+1`);
      }
      // 古锭刀: +1 damage if target has no hand cards
      if (attacker.equipment.weapon?.name === '古锭刀' && target.hand.length === 0) {
        damage += 1;
        addLog(room, `古锭刀发动：目标无手牌，伤害+1`);
      }
      // 白银狮子: cap damage at 1
      if (target.equipment.armor?.name === '白银狮子' && !ignoreArmor) {
        damage = Math.min(damage, 1);
        addLog(room, `白银狮子限制伤害为1点`);
      }
      target.hp -= damage;
      addLog(room, `${target.name} 受到${damage}点伤害，体力值: ${target.hp}/${target.maxHp}`);

      // 曹操 奸雄
      if (target.hero === 'caocao' && pa.card) {
        // In simplified version, Caocao draws a card instead
        drawCards(room, target, 1);
        addLog(room, `曹操【奸雄】发动，摸了1张牌`);
      }

      // 司马懿 反馈
      if (target.hero === 'simayi' && attacker && attacker.hand.length > 0) {
        const stolen = attacker.hand.splice(Math.floor(Math.random() * attacker.hand.length), 1)[0];
        target.hand.push(stolen);
        addLog(room, `司马懿【反馈】发动，获得${attacker.name}一张牌`);
      }

      // 夏侯惇 刚烈
      if (target.hero === 'xiaohoudun' && attacker) {
        const ganglie = room.deck.length > 0 ? room.deck.pop() : null;
        if (ganglie) {
          room.discard.push(ganglie);
          if (ganglie.suit !== '♥') {
            if (attacker.hand.length > 0) {
              const lost = attacker.hand.splice(Math.floor(Math.random() * attacker.hand.length), 1)[0];
              room.discard.push(lost);
              addLog(room, `夏侯惇【刚烈】判定${ganglie.suit}${ganglie.number}非♥，${attacker.name}弃置一张牌`);
            } else {
              attacker.hp -= 1;
              addLog(room, `夏侯惇【刚烈】判定${ganglie.suit}${ganglie.number}非♥，${attacker.name}受到1点伤害`);
              checkDeath(room, attacker, target);
            }
          } else {
            addLog(room, `夏侯惇【刚烈】判定${ganglie.suit}${ganglie.number}为♥，无效`);
          }
        }
      }

      // 郭嘉 遗计
      if (target.hero === 'guojia') {
        drawCards(room, target, 2);
        addLog(room, `郭嘉【遗计】发动，摸两张牌`);
      }

      // 麒麟弓: remove a horse from target
      if (attacker.equipment.weapon?.name === '麒麟弓') {
        if (target.equipment.plusHorse) {
          addLog(room, `麒麟弓发动：弃置${target.name}的${target.equipment.plusHorse.name}`);
          room.discard.push(target.equipment.plusHorse);
          target.equipment.plusHorse = null;
        } else if (target.equipment.minusHorse) {
          addLog(room, `麒麟弓发动：弃置${target.name}的${target.equipment.minusHorse.name}`);
          room.discard.push(target.equipment.minusHorse);
          target.equipment.minusHorse = null;
        }
      }

      room.pendingAction = null;
      checkDeath(room, target, attacker);
      broadcastState(room);
    }
    return;
  }

  if (pa.type === 'duel') {
    const currentDueler = room.players.find(p => p.id === pa.players[pa.currentIdx]);
    if (player.id !== currentDueler.id) return;

    if (data.responseCardId) {
      const atkCard = player.hand.find(c => c.id === data.responseCardId && c.subtype === 'attack');
      if (!atkCard) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请出【杀】');
        return;
      }
      removeCardFromHand(player, atkCard.id);
      room.discard.push(atkCard);
      addLog(room, `${player.name} 打出了【杀】`);
      pa.currentIdx = (pa.currentIdx + 1) % 2;
      broadcastState(room);
    } else {
      // Take damage
      const src = room.players.find(p => p.id === pa.source);
      const dmgDealer = pa.players[(pa.currentIdx + 1) % 2];
      const dealer = room.players.find(p => p.id === dmgDealer);
      let duelDmg = 1;
      // 许褚 裸衣: +1 damage on duel
      if (room.luoyiActive && dealer?.hero === 'xuchu') {
        duelDmg += 1;
        addLog(room, `许褚【裸衣】决斗伤害+1`);
      }
      player.hp -= duelDmg;
      addLog(room, `${player.name} 在决斗中受到${duelDmg}点伤害`);
      room.pendingAction = null;
      checkDeath(room, player, dealer);
      broadcastState(room);
    }
    return;
  }

  if (pa.type === 'barbarian' || pa.type === 'arrow') {
    const currentTarget = room.players.find(p => p.id === pa.targets[pa.currentIdx]);
    if (player.id !== currentTarget.id) return;
    const needType = pa.type === 'barbarian' ? 'attack' : 'dodge';
    const needName = pa.type === 'barbarian' ? '杀' : '闪';

    if (data.responseCardId) {
      let rCard = player.hand.find(c => c.id === data.responseCardId);
      // 赵云龙胆
      if (rCard && player.hero === 'zhaoyun') {
        if ((needType === 'attack' && rCard.subtype === 'dodge') || (needType === 'dodge' && rCard.subtype === 'attack')) {
          // Allow swap
        } else if (rCard.subtype !== needType) {
          io.sockets.sockets.get(player.socketId)?.emit('error', `请出【${needName}】`);
          return;
        }
      } else if (rCard && rCard.subtype !== needType) {
        io.sockets.sockets.get(player.socketId)?.emit('error', `请出【${needName}】`);
        return;
      }
      if (!rCard) return;
      removeCardFromHand(player, rCard.id);
      room.discard.push(rCard);
      addLog(room, `${player.name} 打出了【${needName}】`);
    } else {
      const source = room.players.find(p => p.id === pa.source);
      player.hp -= 1;
      addLog(room, `${player.name} 受到【${pa.type === 'barbarian' ? '南蛮入侵' : '万箭齐发'}】1点伤害`);
      checkDeath(room, player, source);
    }

    pa.currentIdx++;
    // Skip dead players
    while (pa.currentIdx < pa.targets.length && !room.players.find(p => p.id === pa.targets[pa.currentIdx])?.alive) {
      pa.currentIdx++;
    }
    if (pa.currentIdx >= pa.targets.length) {
      room.pendingAction = null;
    }
    broadcastState(room);
    return;
  }
}

// ============== SOCKET HANDLING ==============

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayer = null;

  socket.on('createRoom', ({ playerName }) => {
    const roomId = String(Math.floor(Math.random() * 90 + 10));
    const room = createRoom(roomId);
    const player = {
      id: socket.id,
      socketId: socket.id,
      name: playerName || '无名侠',
      hero: null,
      hp: 0,
      maxHp: 0,
      role: null,
      hand: [],
      equipment: { weapon: null, armor: null, plusHorse: null, minusHorse: null },
      judgments: [],
      alive: true,
    };
    room.players.push(player);
    rooms.set(roomId, room);
    socket.join(roomId);
    currentRoom = room;
    currentPlayer = player;
    socket.emit('roomCreated', { roomId });
    broadcastState(room);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', '房间不存在'); return; }
    if (room.state !== 'waiting') { socket.emit('error', '游戏已开始'); return; }
    if (room.players.length >= 8) { socket.emit('error', '房间已满（最多8人）'); return; }
    const player = {
      id: socket.id,
      socketId: socket.id,
      name: playerName || '无名侠',
      hero: null,
      hp: 0,
      maxHp: 0,
      role: null,
      hand: [],
      equipment: { weapon: null, armor: null, plusHorse: null, minusHorse: null },
      judgments: [],
      alive: true,
    };
    room.players.push(player);
    socket.join(roomId);
    currentRoom = room;
    currentPlayer = player;
    socket.emit('roomJoined', { roomId });
    broadcastState(room);
  });

  socket.on('startGame', () => {
    if (!currentRoom) return;
    if (currentRoom.players.length < 2) { socket.emit('error', '至少需要2名玩家'); return; }
    if (currentRoom.state !== 'waiting') return;

    // Assign roles
    const roles = assignRoles(currentRoom.players.length);
    currentRoom.players.forEach((p, i) => { p.role = roles[i]; });
    currentRoom.state = 'hero_select';
    currentRoom.deck = createDeck();

    addLog(currentRoom, '游戏开始！请选择武将');
    broadcastState(currentRoom);
  });

  socket.on('selectHero', ({ heroKey }) => {
    if (!currentRoom || currentRoom.state !== 'hero_select') return;
    if (!HEROES[heroKey]) return;
    // Check if hero already taken
    if (currentRoom.players.some(p => p.hero === heroKey)) {
      socket.emit('error', '该武将已被选择');
      return;
    }
    const hero = HEROES[heroKey];
    currentPlayer.hero = heroKey;
    currentPlayer.hp = hero.hp + (currentPlayer.role === 'lord' ? 1 : 0);
    currentPlayer.maxHp = hero.maxHp + (currentPlayer.role === 'lord' ? 1 : 0);

    addLog(currentRoom, `${currentPlayer.name} 选择了 ${hero.name}`);

    // Check if all selected
    if (currentRoom.players.every(p => p.hero)) {
      currentRoom.state = 'playing';
      // Deal initial hands (4 cards each)
      currentRoom.players.forEach(p => drawCards(currentRoom, p, 4));
      // Lord goes first
      const lordIdx = currentRoom.players.findIndex(p => p.role === 'lord');
      currentRoom.currentPlayerIdx = lordIdx >= 0 ? lordIdx : 0;
      addLog(currentRoom, '所有武将已选择，游戏正式开始！');
      startTurn(currentRoom);
    } else {
      broadcastState(currentRoom);
    }
  });

  socket.on('playCard', (data) => {
    if (!currentRoom || currentRoom.state !== 'playing') return;
    handlePlayCard(currentRoom, currentPlayer, data);
  });

  socket.on('endTurn', () => {
    if (!currentRoom || currentRoom.state !== 'playing') return;
    if (currentRoom.players[currentRoom.currentPlayerIdx].id !== socket.id) return;
    if (currentRoom.pendingAction) return;

    addLog(currentRoom, `${currentPlayer.name} 结束出牌阶段`);
    endCurrentTurn(currentRoom);
  });

  socket.on('discardCards', ({ cardIds }) => {
    if (!currentRoom || !currentPlayer) return;
    if (currentRoom.state !== 'playing') return;
    const pa = currentRoom.pendingAction;
    if (!pa || pa.type !== 'discard' || pa.playerId !== currentPlayer.id) return;

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length !== pa.count) {
      socket.emit('error', `请选择恰好 ${pa.count} 张牌弃置`);
      return;
    }

    // Validate all cards exist in hand
    for (const cid of cardIds) {
      if (!currentPlayer.hand.find(c => c.id === cid)) {
        socket.emit('error', '选择的牌无效');
        return;
      }
    }

    // Remove selected cards
    for (const cid of cardIds) {
      const card = removeCardFromHand(currentPlayer, cid);
      if (card) currentRoom.discard.push(card);
    }

    addLog(currentRoom, `${currentPlayer.name} 弃置了 ${cardIds.length} 张牌`);
    currentRoom.pendingAction = null;
    addLog(currentRoom, `${currentPlayer.name} 的回合结束`);
    nextTurn(currentRoom);
  });

  socket.on('skillAction', ({ skillType }) => {
    if (!currentRoom || !currentPlayer) return;
    if (currentRoom.players[currentRoom.currentPlayerIdx]?.id !== currentPlayer.id) return;
    if (currentRoom.pendingAction) return;
    // 刘备 仁德: give cards (simplified)
    if (currentPlayer.hero === 'liubei' && skillType === 'rende') {
      // Simplified: auto-give 1 card to a random player
      if (currentPlayer.hand.length === 0) return;
      const others = currentRoom.players.filter(p => p.alive && p.id !== currentPlayer.id);
      if (others.length === 0) return;
      const target = others[Math.floor(Math.random() * others.length)];
      const card = currentPlayer.hand.shift();
      target.hand.push(card);
      addLog(currentRoom, `${currentPlayer.name} 【仁德】将一张牌交给了 ${target.name}`);
      broadcastState(currentRoom);
    }
    // 孙权 制衡
    if (currentPlayer.hero === 'sunquan' && skillType === 'zhiheng') {
      if (currentPlayer.hand.length === 0) return;
      const discardCount = Math.min(2, currentPlayer.hand.length);
      for (let i = 0; i < discardCount; i++) {
        const c = currentPlayer.hand.shift();
        currentRoom.discard.push(c);
      }
      drawCards(currentRoom, currentPlayer, discardCount);
      addLog(currentRoom, `${currentPlayer.name} 【制衡】弃置${discardCount}张牌，摸${discardCount}张牌`);
      broadcastState(currentRoom);
    }
    // 黄盖 苦肉
    if (currentPlayer.hero === 'huanggai' && skillType === 'kurou') {
      currentPlayer.hp -= 1;
      addLog(currentRoom, `${currentPlayer.name}【苦肉】失去1点体力`);
      if (currentPlayer.hp <= 0) {
        checkDeath(currentRoom, currentPlayer, null);
      }
      if (currentPlayer.alive) {
        drawCards(currentRoom, currentPlayer, 2);
        addLog(currentRoom, `${currentPlayer.name}【苦肉】摸两张牌`);
      }
      broadcastState(currentRoom);
    }
    // 华佗 青囊
    if (currentPlayer.hero === 'huatuo' && skillType === 'qingnang') {
      if (currentPlayer.hand.length === 0) { socket.emit('error', '没有手牌'); return; }
      const damaged = currentRoom.players.filter(p => p.alive && p.hp < p.maxHp);
      if (damaged.length === 0) { socket.emit('error', '没有受伤的角色'); return; }
      const target = damaged[0];
      const card = currentPlayer.hand.shift();
      currentRoom.discard.push(card);
      target.hp = Math.min(target.hp + 1, target.maxHp);
      addLog(currentRoom, `${currentPlayer.name}【青囊】弃一牌，${target.name}回复1点体力`);
      broadcastState(currentRoom);
    }
  });

  // ====== LORD SKILLS (主公技) ======
  socket.on('lordSkill', ({ type, targetId }) => {
    if (!currentRoom || !currentPlayer) return;
    if (currentPlayer.role !== 'lord') return;

    // 激将 - Liu Bei (Lord) asks Shu allies to play 杀
    if (type === 'jijiang' && currentPlayer.hero === 'liubei') {
      if (currentRoom.pendingAction) return;
      if (currentRoom.players[currentRoom.currentPlayerIdx]?.id !== currentPlayer.id) return;
      if (currentRoom.turnPhase !== 'play') return;

      // Check attack limit
      const hasZhugenu = currentPlayer.equipment.weapon && currentPlayer.equipment.weapon.name === '诸葛连弩';
      if (!hasZhugenu && currentRoom.turnAttackCount >= 1) {
        socket.emit('error', '本回合已使用过【杀】');
        return;
      }

      const target = currentRoom.players.find(p => p.id === targetId);
      if (!target || !target.alive || target.id === currentPlayer.id) {
        socket.emit('error', '请选择一个有效目标');
        return;
      }

      // 空城 check
      if (target.hero === 'zhugeliang' && target.hand.length === 0) {
        socket.emit('error', '诸葛亮【空城】：无手牌时不能被杀指定');
        return;
      }

      // Distance check
      const fromIdx = currentRoom.players.indexOf(currentPlayer);
      const toIdx = currentRoom.players.indexOf(target);
      const dist = getDistance(currentRoom, fromIdx, toIdx);
      if (dist > getAttackRange(currentPlayer)) {
        socket.emit('error', '目标超出攻击范围');
        return;
      }

      // Find Shu kingdom allies
      const shuAllies = currentRoom.players.filter(p =>
        p.alive && p.id !== currentPlayer.id && HEROES[p.hero]?.kingdom === '蜀'
      ).map(p => p.id);

      if (shuAllies.length === 0) {
        socket.emit('error', '没有蜀国武将可以响应激将');
        return;
      }

      addLog(currentRoom, `${currentPlayer.name}（主公）发动【激将】！`);
      currentRoom.pendingAction = {
        type: 'jijiang',
        lordId: currentPlayer.id,
        targetId: targetId,
        kingdomPlayers: shuAllies,
        currentAskerIdx: 0
      };
      broadcastState(currentRoom);
    }

    // 护驾 - Cao Cao (Lord) asks Wei allies to play 闪
    if (type === 'hujia' && currentPlayer.hero === 'caocao') {
      if (!currentRoom.pendingAction || currentRoom.pendingAction.type !== 'dodge') return;
      if (currentRoom.pendingAction.target !== currentPlayer.id) return;

      const weiAllies = currentRoom.players.filter(p =>
        p.alive && p.id !== currentPlayer.id && HEROES[p.hero]?.kingdom === '魏'
      ).map(p => p.id);

      if (weiAllies.length === 0) {
        socket.emit('error', '没有魏国武将可以响应护驾');
        return;
      }

      addLog(currentRoom, `${currentPlayer.name}（主公）发动【护驾】！`);
      const originalDodge = { ...currentRoom.pendingAction };
      currentRoom.pendingAction = {
        type: 'hujia',
        lordId: currentPlayer.id,
        originalDodge: originalDodge,
        kingdomPlayers: weiAllies,
        currentAskerIdx: 0
      };
      broadcastState(currentRoom);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentPlayer) {
      currentPlayer.alive = false;
      addLog(currentRoom, `${currentPlayer.name} 断开连接`);
      // Remove from waiting room
      if (currentRoom.state === 'waiting') {
        currentRoom.players = currentRoom.players.filter(p => p.id !== currentPlayer.id);
      }
      if (currentRoom.players.filter(p => p.alive).length <= 1 && currentRoom.state === 'playing') {
        currentRoom.state = 'finished';
        addLog(currentRoom, '游戏因玩家断开而结束');
      }
      broadcastState(currentRoom);
      if (currentRoom.players.length === 0) {
        rooms.delete(currentRoom.id);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`三国杀服务器运行在端口 ${PORT}`);
});
