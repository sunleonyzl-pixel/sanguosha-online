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
  add('trick','famine','兵粮寸断', '♣', '4', 3);
  add('trick','lightning','闪电', '♠', 'A', 2);
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
    hostId: null, // socket id of room creator
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

function emitSound(room, text) {
  io.to(room.id).emit('cardSound', text);
}

function getPlayerView(room, playerId) {
  const me = room.players.find(p => p.id === playerId);
  if (!me) return null;
  return {
    roomId: room.id,
    hostId: room.hostId,
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
    pendingAction: room.pendingAction ? (() => {
      const pa = { ...room.pendingAction };
      delete pa.onResolve;
      delete pa.onNullify;
      // Hide fanjian card info from the guessing player
      if (pa.type === 'fanjian_guess' && playerId === pa.targetId) {
        delete pa.cardSuit;
        delete pa.cardName;
        delete pa.cardId;
      }
      return pa;
    })() : null,
    turnAttackCount: room.turnAttackCount,
    turnWineUsed: room.turnWineUsed,
    heroSelectPhase: room.heroSelectPhase || null,
    heroChoices: room.heroChoices?.[playerId] || null,
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

function isRedCard(card) {
  return card && (card.suit === '♥' || card.suit === '♦');
}

// 陆逊 连营: lose last hand card → draw 1
function checkLianying(room, player) {
  if (player.hero === 'luxun' && player.hand.length === 0 && player.alive) {
    drawCards(room, player, 1);
    addLog(room, `陆逊【连营】失去最后手牌，摸一张牌`);
  }
}

// 孙尚香 枭姬: when losing equipment, draw 2 cards
function checkXiaoji(room, player) {
  if (player.hero === 'sunshangxiang' && player.alive) {
    drawCards(room, player, 2);
    addLog(room, `孙尚香【枭姬】失去装备，摸两张牌`);
  }
}

// Post-damage skill chain: triggers character skills after damage is dealt
function triggerPostDamageSkills(room, target, attacker, card) {
  // 曹操 奸雄: obtain the card that caused damage
  if (target.hero === 'caocao' && card) {
    const dmgCard = room.discard.find(c => c.id === card.id);
    if (dmgCard) {
      room.discard = room.discard.filter(c => c.id !== dmgCard.id);
      target.hand.push(dmgCard);
      addLog(room, `曹操【奸雄】发动，获得了${dmgCard.name}`);
      emitSound(room, '奸雄');
    }
  }
  // 司马懿 反馈
  if (target.hero === 'simayi' && attacker && attacker.hand.length > 0) {
    const stolen = attacker.hand.splice(Math.floor(Math.random() * attacker.hand.length), 1)[0];
    target.hand.push(stolen);
    addLog(room, `司马懿【反馈】发动，获得${attacker.name}一张牌`);
    emitSound(room, '反馈');
    checkLianying(room, attacker);
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
          checkLianying(room, attacker);
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
    emitSound(room, '遗计');
  }
  // 华雄 耀武
  if (target.hero === 'huaxiong' && card && isRedCard(card) && attacker) {
    if (attacker.hp < attacker.maxHp) {
      attacker.hp++;
      addLog(room, `华雄【耀武】：红色杀造成伤害，${attacker.name}回复1点体力`);
    } else {
      drawCards(room, attacker, 1);
      addLog(room, `华雄【耀武】：红色杀造成伤害，${attacker.name}摸一张牌`);
    }
  }
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
  if (from.equipment.minusHorse) dist -= 1;
  // 马超 马术: distance -1
  if (from.hero === 'machao') dist -= 1;
  // +1 horse on target increases distance
  if (to.equipment.plusHorse) dist += 1;
  // Minimum distance is 1
  return Math.max(1, dist);
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
    // 华佗 急救: out of turn, red cards as peach to save dying player
    const huatuo = room.players.find(p => p.alive && p.hero === 'huatuo' && p.id !== player.id);
    if (huatuo && player.hp <= 0) {
      const redCard = huatuo.hand.find(c => isRedCard(c));
      if (redCard) {
        removeCardFromHand(huatuo, redCard.id);
        room.discard.push(redCard);
        player.hp = 1;
        addLog(room, `华佗【急救】将红色牌${redCard.name}当【桃】使用，${player.name}回复至1点体力`);
        checkLianying(room, huatuo);
        return false;
      }
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
  room.zhihengUsed = false;
  room.pendingAction = null;
  addLog(room, `── ${player.name} 的回合开始 ──`);

  // Judgment phase: resolve delayed tricks async (for 鬼才)
  const judgmentsToProcess = [...player.judgments].reverse(); // LIFO
  player.judgments = [];
  room._judgmentState = { skipPlayPhase: false, skipDrawPhase: false, lightningKilled: false, remaining: [] };

  processNextJudgment(room, player, judgmentsToProcess, 0);
}

// Async judgment processing (supports 鬼才 interruption and 无懈可击)
function processNextJudgment(room, player, judgments, idx) {
  const js = room._judgmentState;

  // Skip rest if player died from lightning
  while (idx < judgments.length && js.lightningKilled) {
    js.remaining.push(judgments[idx]);
    idx++;
  }

  if (idx >= judgments.length) {
    // All judgments processed — continue turn
    player.judgments = js.remaining;
    finishJudgmentPhase(room, player, js.skipPlayPhase, js.skipDrawPhase);
    return;
  }

  const judgeCard = judgments[idx];
  const trickName = judgeCard.subtype === 'lightning' ? '闪电'
    : judgeCard.subtype === 'indulgence' ? '乐不思蜀'
    : judgeCard.subtype === 'famine' ? '兵粮寸断' : judgeCard.name;

  // Give players a chance to use 无懈可击 before judgment resolves
  startNullifyChance(room, trickName, null, player.id, () => {
    // Not nullified — proceed with judgment
    const judgeResult = room.deck.length > 0 ? room.deck.pop() : null;
    if (!judgeResult) {
      js.remaining.push(judgeCard);
      player.judgments = js.remaining;
      finishJudgmentPhase(room, player, js.skipPlayPhase, js.skipDrawPhase);
      return;
    }

    // Check if 司马懿 can use 鬼才
    const simayi = room.players.find(p => p.hero === 'simayi' && p.alive && p.hand.length > 0);
    if (simayi) {
      room.discard.push(judgeResult);
      room.pendingAction = {
        type: 'guicai',
        simayiId: simayi.id,
        playerId: player.id,
        judgeCard,
        judgeResult,
        judgments,
        judgmentIdx: idx,
        trickName: judgeCard.name,
      };
      addLog(room, `${player.name} 的【${judgeCard.name}】判定为 ${judgeResult.suit}${judgeResult.number}，等待${simayi.name}是否发动【鬼才】...`);
      broadcastState(room);
      return;
    }

    // No Sima Yi — resolve directly
    resolveJudgment(room, player, judgeCard, judgeResult, judgments, idx);
  }, () => {
    // Nullified — skip this judgment, discard the delayed trick card
    room.discard.push(judgeCard);
    addLog(room, `【${trickName}】被无懈可击抵消，不进行判定`);
    broadcastState(room);
    processNextJudgment(room, player, judgments, idx + 1);
  });
}

function resolveJudgment(room, player, judgeCard, judgeResult, judgments, idx) {
  const js = room._judgmentState;

  // 郭嘉 天妒: obtain judgment card
  if (player.hero === 'guojia') {
    // Remove from discard if it was put there
    room.discard = room.discard.filter(c => c.id !== judgeResult.id);
    player.hand.push(judgeResult);
    addLog(room, `郭嘉【天妒】获得判定牌 ${judgeResult.suit}${judgeResult.number}`);
  } else if (!room.discard.includes(judgeResult)) {
    room.discard.push(judgeResult);
  }

  if (judgeCard.subtype === 'indulgence') {
    room.discard.push(judgeCard);
    const isHeart = judgeResult.suit === '♥';
    addLog(room, `${player.name} 的【乐不思蜀】判定结果: ${judgeResult.suit}${judgeResult.number} — ${isHeart ? '判定为♥，乐不思蜀无效！' : '判定生效，跳过出牌阶段'}`);
    if (!isHeart) js.skipPlayPhase = true;
  } else if (judgeCard.subtype === 'famine') {
    room.discard.push(judgeCard);
    const isClub = judgeResult.suit === '♣';
    addLog(room, `${player.name} 的【兵粮寸断】判定结果: ${judgeResult.suit}${judgeResult.number} — ${isClub ? '判定为♣，兵粮寸断无效！' : '判定生效，跳过摸牌阶段'}`);
    if (!isClub) js.skipDrawPhase = true;
  } else if (judgeCard.subtype === 'lightning') {
    const num = judgeResult.number;
    const numVal = num === 'A' ? 1 : num === 'J' ? 11 : num === 'Q' ? 12 : num === 'K' ? 13 : parseInt(num);
    const isLightningStrike = judgeResult.suit === '♠' && numVal >= 2 && numVal <= 9;
    if (isLightningStrike) {
      room.discard.push(judgeCard);
      addLog(room, `⚡ ${player.name} 的【闪电】判定结果: ${judgeResult.suit}${judgeResult.number} — 闪电命中！受到3点雷电伤害！`);
      player.hp -= 3;
      addLog(room, `${player.name} 受到3点伤害（当前体力: ${player.hp}/${player.maxHp}）`);
      if (player.hp <= 0) {
        checkDeath(room, player, null);
        if (!player.alive) js.lightningKilled = true;
      }
    } else {
      addLog(room, `${player.name} 的【闪电】判定结果: ${judgeResult.suit}${judgeResult.number} — 安全！闪电传给下家`);
      const aliveOthers = room.players.filter(p => p.alive && p.id !== player.id);
      if (aliveOthers.length > 0) {
        let nextIdx = (room.players.indexOf(player) + 1) % room.players.length;
        while (!room.players[nextIdx].alive || room.players[nextIdx].id === player.id) {
          nextIdx = (nextIdx + 1) % room.players.length;
        }
        room.players[nextIdx].judgments.push(judgeCard);
        addLog(room, `闪电移动到 ${room.players[nextIdx].name} 的判定区`);
      } else {
        room.discard.push(judgeCard);
      }
    }
  }

  processNextJudgment(room, player, judgments, idx + 1);
}

function finishJudgmentPhase(room, player, skipPlayPhase, skipDrawPhase) {
  delete room._judgmentState;

  // If player died from lightning, skip rest of turn
  if (!player.alive) {
    nextTurn(room);
    return;
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
  if (skipDrawPhase) {
    addLog(room, `${player.name} 被【兵粮寸断】跳过摸牌阶段`);
  } else if (player.hero === 'zhangliao') {
    // 张辽 突袭: instead of drawing, steal 1 card from up to 2 other players
    const stealTargets = room.players.filter(p => p.alive && p.id !== player.id && p.hand.length > 0);
    const stealCount = Math.min(2, stealTargets.length);
    if (stealCount > 0) {
      // Shuffle and pick up to 2
      for (let i = stealTargets.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [stealTargets[i], stealTargets[j]] = [stealTargets[j], stealTargets[i]]; }
      for (let i = 0; i < stealCount; i++) {
        const t = stealTargets[i];
        const stolenIdx = Math.floor(Math.random() * t.hand.length);
        const stolen = t.hand.splice(stolenIdx, 1)[0];
        player.hand.push(stolen);
        addLog(room, `张辽【突袭】获得 ${t.name} 的一张手牌`);
        checkLianying(room, t);
      }
    } else {
      // No targets with hand cards, draw normally
      const drawn = drawCards(room, player, 2);
      addLog(room, `${player.name} 摸了${drawn.length}张牌`);
    }
  } else {
    let drawCount = 2;
    if (player.hero === 'zhugeliang') drawCount = 2; // Simplified
    // 周瑜 英姿: draw 3 instead of 2
    if (player.hero === 'zhouyu') drawCount = 3;
    // 许褚 裸衣: draw 1 less, damage +1 this turn (auto-activates; TODO: make optional with UI)
    if (player.hero === 'xuchu') {
      room.luoyiActive = true;
      drawCount -= 1;
      addLog(room, `许褚【裸衣】发动，少摸一张牌，本回合杀和决斗伤害+1`);
    }
    const drawn = drawCards(room, player, drawCount);
    addLog(room, `${player.name} 摸了${drawn.length}张牌`);
  }

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

// ====== NULLIFY (无懈可击) SYSTEM ======
// Check if any player has 无懈可击 and give them a chance to use it
function startNullifyChance(room, trickName, sourceId, targetId, onResolve, onNullify) {
  // Find all alive players who have 无懈可击
  const playersWithNullify = room.players.filter(p =>
    p.alive && p.hand.some(c => c.subtype === 'nullify')
  );
  if (playersWithNullify.length === 0) {
    // No one can nullify, resolve immediately
    onResolve();
    return;
  }
  // Build list of player IDs to ask, starting from the target (if any), then others in seat order
  const askOrder = [];
  const startIdx = targetId
    ? room.players.findIndex(p => p.id === targetId)
    : room.players.findIndex(p => p.id === sourceId);
  for (let i = 0; i < room.players.length; i++) {
    const idx = (startIdx + i) % room.players.length;
    const p = room.players[idx];
    if (p.alive && p.hand.some(c => c.subtype === 'nullify')) {
      askOrder.push(p.id);
    }
  }
  room.pendingAction = {
    type: 'nullify_chance',
    trickName,
    sourceId,
    targetId,
    askOrder,
    currentAskerIdx: 0,
    onResolve,   // callback if no one nullifies
    onNullify,   // callback if nullified (optional)
  };
  const asker = room.players.find(p => p.id === askOrder[0]);
  addLog(room, `是否有人对【${trickName}】使用【无懈可击】？等待 ${asker.name} 决定...`);
  broadcastState(room);
}

// AOE per-target nullify: process targets one by one with nullify chance
function advanceAoeTarget(room, type, sourceId, targets, idx) {
  // Skip dead targets
  while (idx < targets.length) {
    const t = room.players.find(p => p.id === targets[idx]);
    if (t?.alive) break;
    idx++;
  }
  if (idx >= targets.length) {
    room.pendingAction = null;
    broadcastState(room);
    return;
  }
  const target = room.players.find(p => p.id === targets[idx]);
  const trickName = type === 'barbarian' ? '南蛮入侵' : type === 'arrow' ? '万箭齐发' : '桃园结义';

  startNullifyChance(room, `${trickName}→${target.name}`, sourceId, target.id, () => {
    // Not nullified
    if (type === 'peachgarden') {
      if (target.hp < target.maxHp) {
        target.hp++;
        addLog(room, `${target.name} 回复1点体力`);
      }
      advanceAoeTarget(room, type, sourceId, targets, idx + 1);
    } else {
      // barbarian or arrow: need target to respond
      room.pendingAction = {
        type, source: sourceId, targets, currentIdx: idx,
        aoeAdvance: true, // flag for response handler to use advanceAoeTarget
      };
      broadcastState(room);
    }
  }, () => {
    // Nullified for this target only
    addLog(room, `${target.name} 不受【${trickName}】影响`);
    advanceAoeTarget(room, type, sourceId, targets, idx + 1);
  });
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

  const origCard = player.hand.find(c => c.id === cardId);
  if (!origCard) return;

  // 关羽 武圣: red cards can be used as attack
  let card = origCard;
  if (player.hero === 'guanyu' && origCard.subtype !== 'attack' && (origCard.suit === '♥' || origCard.suit === '♦') && targetId) {
    card = { ...origCard, type: 'basic', subtype: 'attack', name: '杀' };
  }
  // 甘宁 奇袭: black cards can be used as 过河拆桥
  if (player.hero === 'ganning' && origCard.subtype !== 'dismantle' && (origCard.suit === '♠' || origCard.suit === '♣') && targetId && origCard.type !== 'equipment') {
    card = { ...origCard, type: 'trick', subtype: 'dismantle', name: '过河拆桥' };
  }
  // 大乔 国色: ♦ cards can be used as 乐不思蜀
  if (player.hero === 'daqiao' && origCard.subtype !== 'indulgence' && origCard.suit === '♦' && targetId) {
    card = { ...origCard, type: 'trick', subtype: 'indulgence', name: '乐不思蜀' };
  }

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
      checkLianying(room, player);
      if (origCard.subtype !== 'attack' && player.hero === 'guanyu') {
        addLog(room, `${player.name}【武圣】将${origCard.name}当【杀】对 ${target.name} 使用`);
        emitSound(room, '武圣');
      } else {
        addLog(room, `${player.name} 对 ${target.name} 使用了【杀】`);
        emitSound(room, '杀');
      }

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
            checkLianying(room, target);
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
            triggerPostDamageSkills(room, target, player, origCard);
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
      emitSound(room, '桃');
      checkLianying(room, player);
      broadcastState(room);
      break;
    }

    case 'duel': {
      if (!target || !target.alive || target.id === player.id) return;
      if (target.hero === 'zhugeliang' && target.hand.length === 0) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '诸葛亮【空城】：无手牌时不能被决斗指定');
        return;
      }
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 对 ${target.name} 使用了【决斗】`);
      emitSound(room, '决斗');
      checkLianying(room, player);
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      startNullifyChance(room, '决斗', player.id, target.id, () => {
        // 吕布 无双: opponent needs 2 attacks per round in duel
        const lvbuInDuel = player.hero === 'lvbu' || target.hero === 'lvbu';
        room.pendingAction = { type: 'duel', players: [target.id, player.id], currentIdx: 0, source: player.id, lvbuInDuel, attacksNeeded: lvbuInDuel ? 2 : 1, attacksGiven: 0 };
        broadcastState(room);
      });
      break;
    }

    case 'barbarian': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【南蛮入侵】`);
      emitSound(room, '南蛮入侵');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const targets = room.players.filter(p => p.alive && p.id !== player.id);
      advanceAoeTarget(room, 'barbarian', player.id, targets.map(t => t.id), 0);
      break;
    }

    case 'arrow': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【万箭齐发】`);
      emitSound(room, '万箭齐发');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const arrowTargets = room.players.filter(p => p.alive && p.id !== player.id);
      advanceAoeTarget(room, 'arrow', player.id, arrowTargets.map(t => t.id), 0);
      break;
    }

    case 'draw2': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【无中生有】`);
      emitSound(room, '无中生有');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      startNullifyChance(room, '无中生有', player.id, player.id, () => {
        drawCards(room, player, 2);
        addLog(room, `${player.name} 摸了2张牌`);
        broadcastState(room);
      });
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
      if (origCard.subtype !== 'dismantle' && player.hero === 'ganning') {
        addLog(room, `${player.name}【奇袭】将${origCard.name}当【过河拆桥】对 ${target.name} 使用`);
        emitSound(room, '过河拆桥');
      } else {
        addLog(room, `${player.name} 对 ${target.name} 使用【过河拆桥】`);
        emitSound(room, '过河拆桥');
      }
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const dismantleTarget = target;
      const dismantleSource = player;
      startNullifyChance(room, '过河拆桥', player.id, target.id, () => {
        const equipOptions = [];
        if (dismantleTarget.equipment.weapon) equipOptions.push({ slot: 'weapon', card: dismantleTarget.equipment.weapon });
        if (dismantleTarget.equipment.armor) equipOptions.push({ slot: 'armor', card: dismantleTarget.equipment.armor });
        if (dismantleTarget.equipment.plusHorse) equipOptions.push({ slot: 'plusHorse', card: dismantleTarget.equipment.plusHorse });
        if (dismantleTarget.equipment.minusHorse) equipOptions.push({ slot: 'minusHorse', card: dismantleTarget.equipment.minusHorse });
        const hasHand = dismantleTarget.hand.length > 0;
        if (equipOptions.length === 0 && !hasHand) { broadcastState(room); return; }
        // If only hand cards, random pick directly
        if (equipOptions.length === 0 && hasHand) {
          const idx = Math.floor(Math.random() * dismantleTarget.hand.length);
          const chosen = dismantleTarget.hand[idx];
          removeCardFromHand(dismantleTarget, chosen.id);
          room.discard.push(chosen);
          addLog(room, `拆掉了 ${dismantleTarget.name} 的一张手牌`);
          checkLianying(room, dismantleTarget);
          broadcastState(room);
          return;
        }
        room.pendingAction = {
          type: 'choose_dismantle',
          source: dismantleSource.id,
          targetId: dismantleTarget.id,
          equipOptions: equipOptions.map(e => ({ slot: e.slot, cardId: e.card.id, cardName: e.card.name })),
          hasHand,
        };
        broadcastState(room);
      });
      break;
    }

    case 'snatch': {
      if (!target || !target.alive || target.id === player.id) return;
      if (target.hero === 'luxun') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '陆逊【谦逊】不能被顺手牵羊指定');
        return;
      }
      const fromI = room.players.indexOf(player);
      const toI = room.players.indexOf(target);
      // 黄月英 奇才: trick cards have no distance limit
      if (player.hero !== 'huangyueying' && getDistance(room, fromI, toI) > 1) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '顺手牵羊只能对距离1的角色使用');
        return;
      }
      if (target.hand.length === 0 && !target.equipment.weapon && !target.equipment.armor && !target.equipment.plusHorse && !target.equipment.minusHorse) return;
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 对 ${target.name} 使用【顺手牵羊】`);
      emitSound(room, '顺手牵羊');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const snatchTarget = target;
      const snatchPlayer = player;
      startNullifyChance(room, '顺手牵羊', player.id, target.id, () => {
        const equipOptions = [];
        if (snatchTarget.equipment.weapon) equipOptions.push({ slot: 'weapon', card: snatchTarget.equipment.weapon });
        if (snatchTarget.equipment.armor) equipOptions.push({ slot: 'armor', card: snatchTarget.equipment.armor });
        if (snatchTarget.equipment.plusHorse) equipOptions.push({ slot: 'plusHorse', card: snatchTarget.equipment.plusHorse });
        if (snatchTarget.equipment.minusHorse) equipOptions.push({ slot: 'minusHorse', card: snatchTarget.equipment.minusHorse });
        const hasHand = snatchTarget.hand.length > 0;
        if (equipOptions.length === 0 && !hasHand) { broadcastState(room); return; }
        if (equipOptions.length === 0 && hasHand) {
          const idx = Math.floor(Math.random() * snatchTarget.hand.length);
          const chosen = snatchTarget.hand[idx];
          removeCardFromHand(snatchTarget, chosen.id);
          snatchPlayer.hand.push(chosen);
          addLog(room, `${snatchPlayer.name} 获得了 ${snatchTarget.name} 的一张手牌`);
          checkLianying(room, snatchTarget);
          broadcastState(room);
          return;
        }
        room.pendingAction = {
          type: 'choose_snatch',
          source: snatchPlayer.id,
          targetId: snatchTarget.id,
          equipOptions: equipOptions.map(e => ({ slot: e.slot, cardId: e.card.id, cardName: e.card.name })),
          hasHand,
        };
        broadcastState(room);
      });
      break;
    }

    case 'peachgarden': {
      removeCardFromHand(player, card.id);
      room.discard.push(card);
      addLog(room, `${player.name} 使用了【桃园结义】`);
      emitSound(room, '桃园结义');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const peachTargets = room.players.filter(p => p.alive);
      advanceAoeTarget(room, 'peachgarden', player.id, peachTargets.map(t => t.id), 0);
      break;
    }

    case 'weapon': {
      removeCardFromHand(player, card.id);
      const oldWeapon = player.equipment.weapon;
      if (oldWeapon) { room.discard.push(oldWeapon); checkXiaoji(room, player); }
      player.equipment.weapon = card;
      addLog(room, `${player.name} 装备了【${card.name}】`);
      emitSound(room, '装备');
      broadcastState(room);
      break;
    }

    case 'armor': {
      removeCardFromHand(player, card.id);
      const oldArmor = player.equipment.armor;
      if (oldArmor) { room.discard.push(oldArmor); checkXiaoji(room, player); }
      player.equipment.armor = card;
      addLog(room, `${player.name} 装备了【${card.name}】`);
      emitSound(room, '装备');
      broadcastState(room);
      break;
    }

    case 'plusHorse': {
      removeCardFromHand(player, card.id);
      const oldPH = player.equipment.plusHorse;
      if (oldPH) { room.discard.push(oldPH); checkXiaoji(room, player); }
      player.equipment.plusHorse = card;
      addLog(room, `${player.name} 装备了【${card.name}】(+1马)`);
      emitSound(room, '装备');
      broadcastState(room);
      break;
    }

    case 'minusHorse': {
      removeCardFromHand(player, card.id);
      const oldMH = player.equipment.minusHorse;
      if (oldMH) { room.discard.push(oldMH); checkXiaoji(room, player); }
      player.equipment.minusHorse = card;
      addLog(room, `${player.name} 装备了【${card.name}】(-1马)`);
      emitSound(room, '装备');
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
      emitSound(room, '酒');
      broadcastState(room);
      break;
    }

    case 'indulgence': {
      if (!target || !target.alive || target.id === player.id) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请选择一个目标');
        return;
      }
      if (target.hero === 'luxun') {
        io.sockets.sockets.get(player.socketId)?.emit('error', '陆逊【谦逊】不能被乐不思蜀指定');
        return;
      }
      if (target.judgments.some(j => j.subtype === 'indulgence')) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '目标已有乐不思蜀');
        return;
      }
      removeCardFromHand(player, card.id);
      if (origCard.subtype !== 'indulgence' && player.hero === 'daqiao') {
        addLog(room, `${player.name}【国色】将${origCard.name}当【乐不思蜀】对 ${target.name} 使用`);
        emitSound(room, '乐不思蜀');
      } else {
        addLog(room, `${player.name} 对 ${target.name} 使用了【乐不思蜀】`);
        emitSound(room, '乐不思蜀');
      }
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const indulgenceTarget = target;
      const indulgenceCard = card;
      startNullifyChance(room, '乐不思蜀', player.id, target.id, () => {
        indulgenceTarget.judgments.push(indulgenceCard);
        broadcastState(room);
      }, () => {
        // Nullified: card goes to discard
        room.discard.push(indulgenceCard);
        broadcastState(room);
      });
      break;
    }

    case 'famine': {
      if (!target || !target.alive || target.id === player.id) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请选择一个目标');
        return;
      }
      // 兵粮寸断只能对距离1的角色使用 (黄月英 奇才 skip distance)
      const fromI = room.players.indexOf(player);
      const toI = room.players.indexOf(target);
      if (player.hero !== 'huangyueying' && getDistance(room, fromI, toI) > 1) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '兵粮寸断只能对距离1的角色使用');
        return;
      }
      // 不能对已有兵粮寸断的角色使用
      if (target.judgments.some(j => j.subtype === 'famine')) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '目标已有兵粮寸断');
        return;
      }
      removeCardFromHand(player, card.id);
      addLog(room, `${player.name} 对 ${target.name} 使用了【兵粮寸断】`);
      emitSound(room, '兵粮寸断');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      const famineTarget = target;
      const famineCard = card;
      startNullifyChance(room, '兵粮寸断', player.id, target.id, () => {
        famineTarget.judgments.push(famineCard);
        broadcastState(room);
      }, () => {
        room.discard.push(famineCard);
        broadcastState(room);
      });
      break;
    }

    case 'lightning': {
      // 闪电对自己使用，放入自己判定区
      if (player.judgments.some(j => j.subtype === 'lightning')) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '你的判定区已有闪电');
        return;
      }
      removeCardFromHand(player, card.id);
      addLog(room, `${player.name} 使用了【闪电】`);
      emitSound(room, '闪电');
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      player.judgments.push(card);
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

  // ====== 无懈可击 (Nullify) chance ======
  if (pa.type === 'nullify_chance') {
    const currentAskerId = pa.askOrder[pa.currentAskerIdx];
    if (player.id !== currentAskerId) return;

    if (data.responseCardId) {
      const nullifyCard = player.hand.find(c => c.id === data.responseCardId && c.subtype === 'nullify');
      if (!nullifyCard) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请使用【无懈可击】');
        return;
      }
      removeCardFromHand(player, nullifyCard.id);
      room.discard.push(nullifyCard);
      addLog(room, `${player.name} 使用了【无懈可击】，抵消了【${pa.trickName}】`);
      emitSound(room, '无懈可击');
      // 黄月英 集智
      if (player.hero === 'huangyueying') { drawCards(room, player, 1); addLog(room, `黄月英【集智】发动，摸一张牌`); }
      room.pendingAction = null;
      if (pa.onNullify) pa.onNullify();
      broadcastState(room);
    } else {
      // Pass - move to next player
      pa.currentAskerIdx++;
      if (pa.currentAskerIdx >= pa.askOrder.length) {
        // No one nullified, resolve the trick
        room.pendingAction = null;
        pa.onResolve();
      } else {
        const nextAsker = room.players.find(p => p.id === pa.askOrder[pa.currentAskerIdx]);
        addLog(room, `${player.name} 放弃使用无懈可击。等待 ${nextAsker.name} 决定...`);
        broadcastState(room);
      }
    }
    return;
  }

  // ====== 鬼才 (Guicai) — Sima Yi replaces judgment ======
  if (pa.type === 'guicai') {
    if (player.id !== pa.simayiId) return;
    const judgePlayer = room.players.find(p => p.id === pa.playerId);
    if (!judgePlayer) return;

    if (data.responseCardId) {
      // Sima Yi uses a hand card to replace judgment
      const replaceCard = player.hand.find(c => c.id === data.responseCardId);
      if (!replaceCard) return;
      removeCardFromHand(player, replaceCard.id);
      checkLianying(room, player);

      // Swap: old judgeResult stays in discard, new card becomes judgeResult
      const oldResult = pa.judgeResult;
      const newResult = replaceCard;
      room.discard.push(newResult); // new card goes to discard (will be picked up by resolveJudgment)
      // Remove old result from discard so it can be re-added by resolveJudgment properly
      // Actually: old result is already in discard from processNextJudgment. Keep it there.
      // The newResult replaces it as the effective judgment.
      // Remove newResult from discard — resolveJudgment will handle it
      room.discard = room.discard.filter(c => c.id !== newResult.id);
      // Also remove oldResult from discard — resolveJudgment will re-add the effective one
      room.discard = room.discard.filter(c => c.id !== oldResult.id);
      room.discard.push(oldResult); // old card goes to discard pile permanently

      addLog(room, `${player.name} 发动【鬼才】，用 ${newResult.suit}${newResult.number} 替换了判定牌`);
      emitSound(room, '鬼才');

      room.pendingAction = null;
      resolveJudgment(room, judgePlayer, pa.judgeCard, newResult, pa.judgments, pa.judgmentIdx);
    } else {
      // Sima Yi passes
      addLog(room, `${player.name} 放弃发动【鬼才】`);
      const judgeResult = pa.judgeResult;
      room.pendingAction = null;
      resolveJudgment(room, judgePlayer, pa.judgeCard, judgeResult, pa.judgments, pa.judgmentIdx);
    }
    return;
  }

  // ====== 制衡 选择弃牌 ======
  if (pa.type === 'zhiheng_select') {
    if (player.id !== pa.playerId) return;
    const handIds = data.zhihengHandIds || [];
    const equipSlots = data.zhihengEquipSlots || [];
    const totalCount = handIds.length + equipSlots.length;
    if (totalCount === 0) {
      // Cancel zhiheng
      room.pendingAction = null;
      addLog(room, `${player.name} 取消了【制衡】`);
      broadcastState(room);
      return;
    }
    // Remove selected hand cards
    handIds.forEach(id => {
      const c = player.hand.find(h => h.id === id);
      if (c) {
        removeCardFromHand(player, id);
        room.discard.push(c);
      }
    });
    // Remove selected equipment
    equipSlots.forEach(slot => {
      const c = player.equipment[slot];
      if (c) {
        player.equipment[slot] = null;
        room.discard.push(c);
        checkXiaoji(room, player);
      }
    });
    checkLianying(room, player);
    drawCards(room, player, totalCount);
    room.zhihengUsed = true;
    room.pendingAction = null;
    addLog(room, `${player.name}【制衡】弃置${totalCount}张牌，摸${totalCount}张牌`);
    emitSound(room, '制衡');
    broadcastState(room);
    return;
  }

  // ====== 过河拆桥/顺手牵羊 选择目标牌 ======
  if (pa.type === 'choose_dismantle' || pa.type === 'choose_snatch') {
    if (player.id !== pa.source) return;
    const target = room.players.find(p => p.id === pa.targetId);
    if (!target) return;
    const isSnatch = pa.type === 'choose_snatch';
    const sourcePlayer = player;

    if (data.chooseSlot === 'hand') {
      // Random hand card
      if (target.hand.length === 0) return;
      const idx = Math.floor(Math.random() * target.hand.length);
      const chosen = target.hand[idx];
      removeCardFromHand(target, chosen.id);
      if (isSnatch) {
        sourcePlayer.hand.push(chosen);
        addLog(room, `${sourcePlayer.name} 获得了 ${target.name} 的一张手牌`);
        checkLianying(room, target);
      } else {
        room.discard.push(chosen);
        addLog(room, `拆掉了 ${target.name} 的一张手牌`);
        checkLianying(room, target);
      }
    } else if (data.chooseSlot) {
      // Specific equipment slot
      const slot = data.chooseSlot;
      const card = target.equipment[slot];
      if (!card) return;
      target.equipment[slot] = null;
      checkXiaoji(room, target);
      if (isSnatch) {
        sourcePlayer.hand.push(card);
        addLog(room, `${sourcePlayer.name} 获得了 ${target.name} 的${card.name}`);
      } else {
        room.discard.push(card);
        addLog(room, `拆掉了 ${target.name} 的${card.name}`);
      }
    } else {
      return;
    }
    room.pendingAction = null;
    broadcastState(room);
    return;
  }

  // ====== 反间 (Fanjian) - target guesses suit ======
  if (pa.type === 'fanjian_guess') {
    if (player.id !== pa.targetId) return;
    const guessSuit = data.guessSuit;
    if (!guessSuit || !['♠','♥','♣','♦'].includes(guessSuit)) return;
    const source = room.players.find(p => p.id === pa.source);
    const target = player;
    const card = source ? source.hand.find(c => c.id === pa.cardId) : null;
    if (!source || !card) { room.pendingAction = null; broadcastState(room); return; }
    const correct = guessSuit === pa.cardSuit;
    addLog(room, `${target.name} 猜测花色为 ${guessSuit}，展示的牌是 ${pa.cardSuit}${pa.cardName} — ${correct ? '猜对了！' : '猜错了！'}`);
    // Target gets the card regardless
    removeCardFromHand(source, card.id);
    target.hand.push(card);
    addLog(room, `${target.name} 获得了这张 ${card.name}`);
    if (!correct) {
      // Wrong guess: target takes 1 damage
      target.hp -= 1;
      addLog(room, `${target.name} 受到1点伤害（当前体力: ${target.hp}/${target.maxHp}）`);
      triggerPostDamageSkills(room, target, source, null);
      if (target.hp <= 0) {
        checkDeath(room, target, source);
      }
    }
    room.pendingAction = null;
    broadcastState(room);
    return;
  }

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

  // ====== 贯石斧 选择是否发动 ======
  if (pa.type === 'guanshifu_choice') {
    if (player.id !== pa.attackerId) return;
    if (data.responseCardId === 'activate') {
      // Enter selection mode
      room.pendingAction = {
        type: 'guanshifu_select',
        attackerId: pa.attackerId,
        targetId: pa.targetId,
        card: pa.card,
      };
      addLog(room, `${player.name} 发动贯石斧，请选择弃置两张牌`);
      broadcastState(room);
    } else {
      // Pass
      addLog(room, `${player.name} 放弃发动贯石斧`);
      room.pendingAction = null;
      broadcastState(room);
    }
    return;
  }

  // ====== 贯石斧 选择弃置的牌 ======
  if (pa.type === 'guanshifu_select') {
    if (player.id !== pa.attackerId) return;
    const handIds = data.gsfHandIds || [];
    const equipSlots = data.gsfEquipSlots || [];
    const totalCount = handIds.length + equipSlots.length;
    if (totalCount !== 2) {
      io.sockets.sockets.get(player.socketId)?.emit('error', '请选择恰好2张牌');
      return;
    }
    // Validate: equipment slots cannot include weapon (贯石斧 itself)
    if (equipSlots.includes('weapon')) {
      io.sockets.sockets.get(player.socketId)?.emit('error', '不能弃置贯石斧本身');
      return;
    }
    // Remove selected hand cards
    handIds.forEach(id => {
      const c = player.hand.find(h => h.id === id);
      if (c) { removeCardFromHand(player, id); room.discard.push(c); }
    });
    // Remove selected equipment
    equipSlots.forEach(slot => {
      const c = player.equipment[slot];
      if (c) { player.equipment[slot] = null; room.discard.push(c); checkXiaoji(room, player); }
    });
    checkLianying(room, player);
    addLog(room, `贯石斧发动：${player.name} 弃置${totalCount}张牌，强制命中`);

    const target = room.players.find(p => p.id === pa.targetId);
    let gsDmg = 1;
    if (room.turnWineUsed) { gsDmg = 2; room.turnWineUsed = false; }
    if (room.luoyiActive) { gsDmg += 1; }
    // 白银狮子
    if (target.equipment.armor?.name === '白银狮子') {
      gsDmg = Math.min(gsDmg, 1);
      addLog(room, `白银狮子限制伤害为1点`);
    }
    target.hp -= gsDmg;
    addLog(room, `${target.name} 受到${gsDmg}点伤害，体力值: ${target.hp}/${target.maxHp}`);
    triggerPostDamageSkills(room, target, player, pa.card);
    checkDeath(room, target, player);
    room.pendingAction = null;
    broadcastState(room);
    return;
  }

  // ====== 青龙偃月刀 选择是否再出杀 ======
  if (pa.type === 'qinglong_choice') {
    if (player.id !== pa.attackerId) return;
    const target = room.players.find(p => p.id === pa.targetId);
    if (data.responseCardId) {
      const attackCard = player.hand.find(c => c.id === data.responseCardId && c.subtype === 'attack');
      if (!attackCard) { io.sockets.sockets.get(player.socketId)?.emit('error', '请选择一张【杀】'); return; }
      removeCardFromHand(player, attackCard.id);
      room.discard.push(attackCard);
      addLog(room, `${player.name} 发动青龙偃月刀，再次对 ${target.name} 使用了【杀】`);
      checkLianying(room, player);
      room.pendingAction = { type: 'dodge', attacker: player.id, target: target.id, card: attackCard, dodgesNeeded: pa.dodgesNeeded || 1, dodgesGiven: 0 };
      broadcastState(room);
    } else {
      addLog(room, `${player.name} 放弃发动青龙偃月刀`);
      room.pendingAction = null;
      broadcastState(room);
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
      emitSound(room, '闪');
      checkLianying(room, player);

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

      // 青龙偃月刀: attacker can choose to attack again
      if (attacker.equipment.weapon?.name === '青龙偃月刀') {
        const hasAttack = attacker.hand.some(c => c.subtype === 'attack');
        if (hasAttack) {
          room.pendingAction = {
            type: 'qinglong_choice',
            attackerId: attacker.id,
            targetId: target.id,
            dodgesNeeded: pa.dodgesNeeded || 1,
          };
          addLog(room, `青龙偃月刀发动：${attacker.name} 可以对 ${target.name} 再出一张【杀】`);
          broadcastState(room);
          return;
        }
      }

      // 贯石斧: ask player whether to discard 2 cards to force hit
      if (attacker.equipment.weapon?.name === '贯石斧') {
        // Count available cards: hand cards + equipment (excluding 贯石斧 itself)
        let availCount = attacker.hand.length;
        ['armor', 'plusHorse', 'minusHorse'].forEach(s => { if (attacker.equipment[s]) availCount++; });
        if (availCount >= 2) {
          room.pendingAction = {
            type: 'guanshifu_choice',
            attackerId: attacker.id,
            targetId: target.id,
            card: pa.card,
          };
          addLog(room, `贯石斧：${attacker.name} 可以弃置两张牌强制命中 ${target.name}`);
          broadcastState(room);
          return;
        }
      }

      room.pendingAction = null;
      broadcastState(room);
    } else {
      // No dodge - take damage
      // 大乔 流离: when targeted by 杀, discard a card to redirect to another player
      if (target.hero === 'daqiao' && target.hand.length > 0 && target.alive) {
        const liuliCard = target.hand.shift();
        room.discard.push(liuliCard);
        addLog(room, `大乔【流离】弃置${liuliCard.name}，转移攻击目标`);
        checkLianying(room, target);
        // Find another alive player within attacker's range (not daqiao, not attacker)
        const candidates = room.players.filter(p => p.alive && p.id !== target.id && p.id !== attacker.id);
        const inRange = candidates.filter(p => {
          const aIdx = room.players.indexOf(attacker);
          const pIdx = room.players.indexOf(p);
          return getDistance(room, aIdx, pIdx) <= getAttackRange(attacker);
        });
        if (inRange.length > 0) {
          const newTarget = inRange[Math.floor(Math.random() * inRange.length)];
          addLog(room, `攻击转移至 ${newTarget.name}`);
          room.pendingAction = { type: 'dodge', attacker: attacker.id, target: newTarget.id, card: pa.card, dodgesNeeded: pa.dodgesNeeded || 1, dodgesGiven: 0 };
          broadcastState(room);
          return;
        } else {
          addLog(room, `流离无有效目标，攻击无效`);
          room.pendingAction = null;
          broadcastState(room);
          return;
        }
      }
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

      triggerPostDamageSkills(room, target, attacker, pa.card);

      // 麒麟弓: remove a horse from target
      if (attacker.equipment.weapon?.name === '麒麟弓') {
        if (target.equipment.plusHorse) {
          addLog(room, `麒麟弓发动：弃置${target.name}的${target.equipment.plusHorse.name}`);
          room.discard.push(target.equipment.plusHorse);
          target.equipment.plusHorse = null;
          checkXiaoji(room, target);
        } else if (target.equipment.minusHorse) {
          addLog(room, `麒麟弓发动：弃置${target.name}的${target.equipment.minusHorse.name}`);
          room.discard.push(target.equipment.minusHorse);
          target.equipment.minusHorse = null;
          checkXiaoji(room, target);
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
      let atkCard = player.hand.find(c => c.id === data.responseCardId && (c.subtype === 'attack' || (player.hero === 'guanyu' && isRedCard(c))));
      if (!atkCard) {
        io.sockets.sockets.get(player.socketId)?.emit('error', '请出【杀】');
        return;
      }
      removeCardFromHand(player, atkCard.id);
      room.discard.push(atkCard);
      addLog(room, `${player.name} 打出了【杀】`);
      checkLianying(room, player);
      pa.attacksGiven = (pa.attacksGiven || 0) + 1;
      // 吕布 无双: non-lvbu player needs 2 attacks per round
      const needed = pa.attacksNeeded || 1;
      if (pa.attacksGiven >= needed) {
        pa.currentIdx = (pa.currentIdx + 1) % 2;
        pa.attacksGiven = 0;
      }
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
      triggerPostDamageSkills(room, player, dealer, pa.card);
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
      // 关羽 武圣: red cards as 杀 in barbarian response
      } else if (rCard && player.hero === 'guanyu' && needType === 'attack' && isRedCard(rCard)) {
        // Allow red card as attack
      } else if (rCard && rCard.subtype !== needType) {
        io.sockets.sockets.get(player.socketId)?.emit('error', `请出【${needName}】`);
        return;
      }
      if (!rCard) return;
      removeCardFromHand(player, rCard.id);
      room.discard.push(rCard);
      addLog(room, `${player.name} 打出了【${needName}】`);
      checkLianying(room, player);
    } else {
      const source = room.players.find(p => p.id === pa.source);
      player.hp -= 1;
      addLog(room, `${player.name} 受到【${pa.type === 'barbarian' ? '南蛮入侵' : '万箭齐发'}】1点伤害`);
      triggerPostDamageSkills(room, player, source, pa.card);
      checkDeath(room, player, source);
    }

    // Advance to next target with per-target nullify chance
    if (pa.aoeAdvance) {
      advanceAoeTarget(room, pa.type, pa.source, pa.targets, pa.currentIdx + 1);
    } else {
      // Legacy fallback
      pa.currentIdx++;
      while (pa.currentIdx < pa.targets.length && !room.players.find(p => p.id === pa.targets[pa.currentIdx])?.alive) {
        pa.currentIdx++;
      }
      if (pa.currentIdx >= pa.targets.length) {
        room.pendingAction = null;
      }
      broadcastState(room);
    }
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
    room.hostId = socket.id;
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
    if (socket.id !== currentRoom.hostId) { socket.emit('error', '只有房主可以开始游戏'); return; }
    if (currentRoom.players.length < 2) { socket.emit('error', '至少需要2名玩家'); return; }
    if (currentRoom.state !== 'waiting') return;

    // Assign roles
    const roles = assignRoles(currentRoom.players.length);
    currentRoom.players.forEach((p, i) => { p.role = roles[i]; });
    currentRoom.state = 'hero_select';
    currentRoom.deck = createDeck();

    // Build hero pool (all hero keys)
    const allHeroes = Object.keys(HEROES);
    // Shuffle helper
    function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

    // Step 1: Lord gets 5 choices (曹操, 刘备, 孙权 + 3 random others)
    const lordCandidates = ['caocao', 'liubei', 'sunquan'];
    const otherHeroes = shuffle(allHeroes.filter(h => !lordCandidates.includes(h)));
    const lordChoices = [...lordCandidates, ...otherHeroes.splice(0, 2)];
    shuffle(lordChoices);

    // Store hero selection state on room
    currentRoom.heroSelectPhase = 'lord'; // 'lord' or 'others'
    currentRoom.heroPool = otherHeroes; // remaining heroes after lord picks
    currentRoom.heroChoices = {}; // playerId -> [heroKey, ...]

    const lordPlayer = currentRoom.players.find(p => p.role === 'lord');
    currentRoom.heroChoices[lordPlayer.id] = lordChoices;

    addLog(currentRoom, `身份已分配！${lordPlayer.name} 是本局【主公】`);
    addLog(currentRoom, '请主公先选择武将');
    broadcastState(currentRoom);
  });

  socket.on('selectHero', ({ heroKey }) => {
    if (!currentRoom || currentRoom.state !== 'hero_select') return;
    if (!HEROES[heroKey]) return;
    // Check player has this hero in their choices
    const myChoices = currentRoom.heroChoices?.[currentPlayer.id];
    if (!myChoices || !myChoices.includes(heroKey)) {
      socket.emit('error', '无效的武将选择');
      return;
    }
    if (currentPlayer.hero) {
      socket.emit('error', '你已选择了武将');
      return;
    }

    const hero = HEROES[heroKey];
    currentPlayer.hero = heroKey;
    currentPlayer.hp = hero.hp + (currentPlayer.role === 'lord' ? 1 : 0);
    currentPlayer.maxHp = hero.maxHp + (currentPlayer.role === 'lord' ? 1 : 0);
    addLog(currentRoom, `${currentPlayer.name} 选择了 ${hero.name}`);

    // If lord just picked, move to others phase
    if (currentRoom.heroSelectPhase === 'lord' && currentPlayer.role === 'lord') {
      // Return unpicked lord choices to pool
      const unpicked = myChoices.filter(h => h !== heroKey);
      currentRoom.heroPool.push(...unpicked);
      // Shuffle pool
      for (let i = currentRoom.heroPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentRoom.heroPool[i], currentRoom.heroPool[j]] = [currentRoom.heroPool[j], currentRoom.heroPool[i]];
      }
      // Deal 5 heroes to each non-lord player
      currentRoom.heroSelectPhase = 'others';
      const otherPlayers = currentRoom.players.filter(p => p.role !== 'lord');
      otherPlayers.forEach(p => {
        const choices = currentRoom.heroPool.splice(0, 5);
        currentRoom.heroChoices[p.id] = choices;
      });
      addLog(currentRoom, '主公已选武将，其他玩家请选择武将');
    }

    // Check if all selected
    if (currentRoom.players.every(p => p.hero)) {
      currentRoom.state = 'playing';
      delete currentRoom.heroSelectPhase;
      delete currentRoom.heroPool;
      delete currentRoom.heroChoices;
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
    checkLianying(currentRoom, currentPlayer);
    currentRoom.pendingAction = null;
    addLog(currentRoom, `${currentPlayer.name} 的回合结束`);
    nextTurn(currentRoom);
  });

  socket.on('skillAction', ({ skillType, targetId }) => {
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
      checkLianying(currentRoom, currentPlayer);
      addLog(currentRoom, `${currentPlayer.name} 【仁德】将一张牌交给了 ${target.name}`);
      emitSound(currentRoom, '仁德');
      broadcastState(currentRoom);
    }
    // 孙权 制衡
    if (currentPlayer.hero === 'sunquan' && skillType === 'zhiheng') {
      if (currentRoom.zhihengUsed) {
        socket.emit('gameError', '制衡每回合只能使用一次');
        return;
      }
      if (currentPlayer.hand.length === 0 && !Object.values(currentPlayer.equipment).some(e => e)) return;
      // Enter zhiheng selection mode
      currentRoom.pendingAction = {
        type: 'zhiheng_select',
        playerId: currentPlayer.id,
      };
      addLog(currentRoom, `${currentPlayer.name} 发动【制衡】，请选择要弃置的牌`);
      broadcastState(currentRoom);
    }
    // 黄盖 苦肉
    if (currentPlayer.hero === 'huanggai' && skillType === 'kurou') {
      currentPlayer.hp -= 1;
      addLog(currentRoom, `${currentPlayer.name}【苦肉】失去1点体力`);
      emitSound(currentRoom, '苦肉');
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
      checkLianying(currentRoom, currentPlayer);
      target.hp = Math.min(target.hp + 1, target.maxHp);
      addLog(currentRoom, `${currentPlayer.name}【青囊】弃一牌，${target.name}回复1点体力`);
      broadcastState(currentRoom);
    }
    // 周瑜 反间
    if (currentPlayer.hero === 'zhouyu' && skillType === 'fanjian') {
      if (currentPlayer.hand.length === 0) { socket.emit('error', '没有手牌'); return; }
      if (!targetId) { socket.emit('error', '请选择目标'); return; }
      const target = currentRoom.players.find(p => p.id === targetId);
      if (!target || !target.alive || target.id === currentPlayer.id) { socket.emit('error', '无效目标'); return; }
      // Pick a random card from Zhou Yu's hand to show
      const cardIdx = Math.floor(Math.random() * currentPlayer.hand.length);
      const card = currentPlayer.hand[cardIdx];
      addLog(currentRoom, `${currentPlayer.name} 对 ${target.name} 发动了【反间】`);
      emitSound(currentRoom, '反间');
      currentRoom.pendingAction = {
        type: 'fanjian_guess',
        source: currentPlayer.id,
        targetId: target.id,
        cardId: card.id,
        cardSuit: card.suit,
        cardName: card.name,
      };
      broadcastState(currentRoom);
    }
    // 貂蝉 离间: select 2 male characters, force them to duel
    if (currentPlayer.hero === 'diaochan' && skillType === 'lijian') {
      if (currentPlayer.hand.length === 0) { socket.emit('error', '没有手牌'); return; }
      const males = currentRoom.players.filter(p => p.alive && p.id !== currentPlayer.id && HEROES[p.hero]?.gender === 'male');
      if (males.length < 2) { socket.emit('error', '需要至少2名男性角色'); return; }
      // Discard a card
      const card = currentPlayer.hand.shift();
      currentRoom.discard.push(card);
      checkLianying(currentRoom, currentPlayer);
      // Pick 2 random males
      for (let i = males.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [males[i], males[j]] = [males[j], males[i]]; }
      const dueler1 = males[0];
      const dueler2 = males[1];
      addLog(currentRoom, `${currentPlayer.name}【离间】弃一牌，令 ${dueler1.name} 与 ${dueler2.name} 决斗`);
      emitSound(currentRoom, '离间');
      currentRoom.pendingAction = { type: 'duel', players: [dueler1.id, dueler2.id], currentIdx: 0, source: dueler2.id, lvbuInDuel: false, attacksNeeded: 1, attacksGiven: 0 };
      broadcastState(currentRoom);
    }
    // 孙尚香 结姻: discard 2 cards, both she and target male heal 1 HP
    if (currentPlayer.hero === 'sunshangxiang' && skillType === 'jieyin') {
      if (currentPlayer.hand.length < 2) { socket.emit('error', '需要至少2张手牌'); return; }
      const damagedMales = currentRoom.players.filter(p => p.alive && p.id !== currentPlayer.id && HEROES[p.hero]?.gender === 'male' && p.hp < p.maxHp);
      if (damagedMales.length === 0) { socket.emit('error', '没有受伤的男性角色'); return; }
      const target = damagedMales[Math.floor(Math.random() * damagedMales.length)];
      const c1 = currentPlayer.hand.shift();
      const c2 = currentPlayer.hand.shift();
      currentRoom.discard.push(c1, c2);
      checkLianying(currentRoom, currentPlayer);
      if (currentPlayer.hp < currentPlayer.maxHp) {
        currentPlayer.hp++;
        addLog(currentRoom, `${currentPlayer.name}【结姻】弃两牌，回复1点体力`);
        emitSound(currentRoom, '结姻');
      } else {
        addLog(currentRoom, `${currentPlayer.name}【结姻】弃两牌`);
        emitSound(currentRoom, '结姻');
      }
      target.hp = Math.min(target.hp + 1, target.maxHp);
      addLog(currentRoom, `${target.name} 回复1点体力（结姻）`);
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
