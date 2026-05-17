/**
 * 竞技场路由 - 玩家挑战、排名、每日次数限制、奖励发放
 * 简化版回合制战斗
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
function randInt(min, max) { return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min); }

// 竞技场配置
const ARENA_CONFIG = {
  entry_fee: 100,         // 门票费（铜币）
  daily_challenges: 5,    // 每日挑战次数
  win_reward_silver: 10,  // 胜利奖励银币（=1000铜币）
  win_reward_prestige: 100, // 胜利奖励声望
  first_win_silver: 50,   // 首胜额外银币
  lose_reward_silver: 2,  // 失败参与奖银币
};

// 初始化用户竞技场数据
async function initUserArena(userId) {
  const record = await db.getOne('SELECT * FROM `user_arena` WHERE `user_id` = ?', [userId]);
  if (!record) {
    await db.insert('user_arena', {
      user_id: userId,
      rank: 0,
      score: 1000,
      win_count: 0,
      lose_count: 0,
      daily_challenge_count: 0,
      last_challenge_at: 0
    });
    return {
      rank: 0, score: 1000, win_count: 0, lose_count: 0,
      daily_challenge_count: 0, last_challenge_at: 0
    };
  }
  return record;
}

// 重置每日挑战次数（每日0点重置）
async function checkAndResetDaily(ua) {
  const now = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  if (ua.last_challenge_at < todayStart) {
    await db.query('UPDATE `user_arena` SET `daily_challenge_count` = 0 WHERE `user_id` = ?', [ua.user_id]);
    ua.daily_challenge_count = 0;
  }
  return ua;
}

// 获取用户竞技场状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const ua = await initUserArena(req.user.id);
    await checkAndResetDaily(ua);

    // 获取当前排名
    const rank = await db.getVar(
      'SELECT COUNT(*) + 1 FROM `user_arena` WHERE `score` > ?',
      [ua.score]
    );

    res.json({
      rank: rank || 1,
      score: ua.score,
      win_count: ua.win_count,
      lose_count: ua.lose_count,
      daily_challenge_count: ua.daily_challenge_count,
      daily_limit: ARENA_CONFIG.daily_challenges,
      entry_fee: ARENA_CONFIG.entry_fee
    });
  } catch (err) { next(err); }
});

// 获取可挑战对手列表（5个随机对手，等级接近）
router.get('/opponents', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, atk_min, atk_max, def, agility, money FROM `user` WHERE `id` = ?',
      [req.user.id]
    );
    const ua = await initUserArena(req.user.id);

    // 优先选取与玩家等级接近、分数相近的真实玩家
    // 分数范围：±300
    const opponents = await db.getAll(
      `SELECT ua.*, u.username, u.level, u.sex, u.atk_min, u.atk_max, u.def, u.agility,
              (SELECT COUNT(*) + 1 FROM user_arena WHERE score > ua.score) AS arena_rank
       FROM user_arena ua
       JOIN user u ON ua.user_id = u.id
       WHERE ua.user_id != ? AND ua.score BETWEEN ? AND ?
       ORDER BY ABS(ua.score - ?) + ABS(u.level - ?) * 50, RAND()
       LIMIT 10`,
      [req.user.id, ua.score - 300, ua.score + 300, ua.score, user.level]
    );

    // 如果不足5个，补充一些机器人
    if (opponents.length < 5) {
      const botCount = 5 - opponents.length;
      // 根据玩家等级生成机器人
      const bots = [];
      for (let i = 0; i < botCount; i++) {
        const botLevel = Math.max(1, user.level + randInt(-3, 3));
        bots.push({
          user_id: -1000 - i,
          username: ['东海霸主', '南海剑客', '西海拳师', '北海弓神', '四海豪杰'][i % 5] + randInt(10, 99),
          level: botLevel,
          sex: 1,
          atk_min: 10 + botLevel * 3,
          atk_max: 15 + botLevel * 4,
          def: 5 + Math.floor(botLevel * 1.5),
          agility: 10 + botLevel * 2,
          arena_rank: 0,
          is_bot: 1
        });
      }
      opponents.push(...bots);
    }

    // 计算对手属性用于战斗
    const opponentList = opponents.slice(0, 5).map(op => ({
      opponent_id: op.user_id,
      username: op.username,
      level: op.level,
      sex: op.sex || 1,
      atk_min: op.atk_min || (10 + op.level * 3),
      atk_max: op.atk_max || (15 + op.level * 4),
      def: op.def || (5 + Math.floor(op.level * 1.5)),
      agility: op.agility || (10 + op.level * 2),
      rank: op.arena_rank || 0,
      is_bot: op.is_bot || 0
    }));

    res.json({ opponents: opponentList });
  } catch (err) { next(err); }
});

// 发起挑战
router.post('/challenge/:opponentId', authMiddleware, async (req, res, next) => {
  try {
    const opponentId = parseInt(req.params.opponentId);
    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, atk_min, atk_max, def, agility, money, reputation FROM `user` WHERE `id` = ?',
      [req.user.id]
    );

    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.hp <= 0) return res.status(400).json({ error: '你已经倒下了，请回酒馆休息' });

    const ua = await initUserArena(req.user.id);
    await checkAndResetDaily(ua);

    // 检查挑战次数
    if (ua.daily_challenge_count >= ARENA_CONFIG.daily_challenges) {
      return res.status(400).json({ error: '今日挑战次数已用完，请明天再来' });
    }

    // 检查门票费
    if (user.money < ARENA_CONFIG.entry_fee) {
      return res.status(400).json({ error: `铜币不足，需要${ARENA_CONFIG.entry_fee}铜币作为门票` });
    }

    // 获取对手数据
    let opponent;
    if (opponentId < 0) {
      // 机器人
      const botLevel = Math.max(1, user.level + randInt(-3, 3));
      opponent = {
        id: opponentId,
        username: ['东海霸主', '南海剑客', '西海拳师', '北海弓神', '四海豪杰'][Math.abs(opponentId) % 5] + randInt(10, 99),
        level: botLevel,
        sex: 1,
        hp: 80 + botLevel * 20,
        hp_max: 80 + botLevel * 20,
        atk_min: 10 + botLevel * 3,
        atk_max: 15 + botLevel * 4,
        def: 5 + Math.floor(botLevel * 1.5),
        agility: 10 + botLevel * 2,
        is_bot: 1
      };
    } else {
      opponent = await db.getOne(
        'SELECT u.id, u.username, u.level, u.sex, u.hp, u.hp_max, u.atk_min, u.atk_max, u.def, u.agility FROM `user` u JOIN `user_arena` ua ON u.id = ua.user_id WHERE u.id = ?',
        [opponentId]
      );
      if (!opponent) return res.status(404).json({ error: '对手不存在' });
    }

    // 扣门票费
    await db.query('UPDATE `user` SET `money` = `money` - ? WHERE `id` = ?', [ARENA_CONFIG.entry_fee, req.user.id]);

    // 更新挑战次数
    await db.query('UPDATE `user_arena` SET `daily_challenge_count` = `daily_challenge_count` + 1, `last_challenge_at` = ? WHERE `user_id` = ?',
      [Math.floor(Date.now() / 1000), req.user.id]);

    // 调用每日活跃进度（竞技场挑战）
    try {
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, new Date().toISOString().slice(0,10), 'daily_arena', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, new Date().toISOString().slice(0,10), 'daily_arena']);
    } catch(e) { console.error('[daily] daily_arena progress error:', e.message); }

    // 简化版回合制战斗
    const battle = simulateBattle(user, opponent);

    // 根据战斗结果处理
    let reward = { silver: 0, reputation: 0, is_first_win: false };

    if (battle.winner === 'player') {
      // 胜利
      reward.silver = ARENA_CONFIG.win_reward_silver;
      reward.reputation = ARENA_CONFIG.win_reward_prestige;

      // 检查是否首胜
      const totalBattles = await db.getVar('SELECT win_count + lose_count FROM `user_arena` WHERE `user_id` = ?', [req.user.id]);
      if (totalBattles === 0) {
        reward.silver += ARENA_CONFIG.first_win_silver;
        reward.is_first_win = true;
      }

      // 更新竞技场数据
      const scoreGain = 20 + Math.floor(opponent.level || 1) * 2;
      await db.query(
        'UPDATE `user_arena` SET `win_count` = `win_count` + 1, `score` = `score` + ? WHERE `user_id` = ?',
        [scoreGain, req.user.id]
      );
    } else {
      // 失败
      reward.silver = ARENA_CONFIG.lose_reward_silver;

      // 更新竞技场数据
      const scoreLoss = 10;
      await db.query(
        'UPDATE `user_arena` SET `lose_count` = `lose_count` + 1, `score` = GREATEST(100, `score` - ?) WHERE `user_id` = ?',
        [scoreLoss, req.user.id]
      );
    }

    // 发放奖励（银币转铜币）
    const copperReward = reward.silver * 100;
    await db.query(
      'UPDATE `user` SET `money` = `money` + ?, `reputation` = `reputation` + ? WHERE `id` = ?',
      [copperReward, reward.reputation, req.user.id]
    );

    res.json({
      ...battle,
      reward,
      entry_fee: ARENA_CONFIG.entry_fee,
      player_money_after: user.money - ARENA_CONFIG.entry_fee + copperReward
    });
  } catch (err) { next(err); }
});

// 简化版回合制战斗模拟
function simulateBattle(player, opponent) {
  const log = [];
  log.push({ type: 'info', text: `⚔️ 竞技场挑战：你 vs ${opponent.username}` });

  // 初始化属性
  let pHp = player.hp_max || player.hp;
  let pHpMax = player.hp_max || player.hp;
  let mHp = opponent.hp_max || opponent.hp;
  let mHpMax = opponent.hp_max || opponent.hp;
  let round = 0;
  const maxRounds = 10;

  // 计算先攻（ agility 高者先手）
  let playerFirst = (player.agility || 10) >= (opponent.agility || 10);

  while (pHp > 0 && mHp > 0 && round < maxRounds) {
    round++;
    log.push({ type: 'system', text: `--- 第 ${round} 回合 ---` });

    // 玩家攻击
    if (playerFirst) {
      const pAtk = randInt(player.atk_min, player.atk_max);
      const pDmg = Math.max(1, pAtk - (opponent.def || 0));
      mHp -= pDmg;
      log.push({ type: 'attack', text: `你攻击 ${opponent.username}，造成 ${pDmg} 点伤害` });

      if (mHp <= 0) break;

      // 对手反击
      const mAtk = randInt(opponent.atk_min, opponent.atk_max);
      const mDmg = Math.max(1, mAtk - (player.def || 0));
      pHp -= mDmg;
      log.push({ type: 'attack', text: `${opponent.username}反击，造成 ${mDmg} 点伤害` });
    } else {
      // 对手先攻击
      const mAtk = randInt(opponent.atk_min, opponent.atk_max);
      const mDmg = Math.max(1, mAtk - (player.def || 0));
      pHp -= mDmg;
      log.push({ type: 'attack', text: `${opponent.username}攻击，造成 ${mDmg} 点伤害` });

      if (pHp <= 0) break;

      // 玩家反击
      const pAtk = randInt(player.atk_min, player.atk_max);
      const pDmg = Math.max(1, pAtk - (opponent.def || 0));
      mHp -= pDmg;
      log.push({ type: 'attack', text: `你反击 ${opponent.username}，造成 ${pDmg} 点伤害` });
    }

    log.push({ type: 'system', text: `生命值：你 ${Math.max(0, pHp)}/${pHpMax} | ${opponent.username} ${Math.max(0, mHp)}/${mHpMax}` });
  }

  const winner = pHp <= 0 ? 'opponent' : 'player';
  const result = winner === 'player' ? 'win' : 'lose';

  if (result === 'win') {
    log.push({ type: 'info', text: `🏆 胜利！你击败了 ${opponent.username}！` });
  } else {
    log.push({ type: 'info', text: `💀 战败！你被 ${opponent.username} 击败了…` });
  }

  return {
    result,
    winner,
    round,
    log,
    player_hp: Math.max(0, pHp),
    player_hp_max: pHpMax,
    opponent_hp: Math.max(0, mHp),
    opponent_hp_max: mHpMax,
    opponent_name: opponent.username,
    opponent_level: opponent.level
  };
}

// 获取排行榜
router.get('/rankings', authMiddleware, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const list = await db.getAll(
      `SELECT ua.rank, ua.score, ua.win_count, ua.lose_count, u.id, u.username, u.sex, u.level,
              (SELECT COUNT(*) + 1 FROM user_arena WHERE score > ua.score) AS arena_rank
       FROM user_arena ua
       JOIN user u ON ua.user_id = u.id
       ORDER BY ua.score DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const total = await db.getVar('SELECT COUNT(*) FROM user_arena');

    res.json({
      list: list.map((item, idx) => ({
        rank: (page - 1) * limit + idx + 1,
        user_id: item.id,
        username: item.username,
        sex: item.sex,
        level: item.level,
        score: item.score,
        win_count: item.win_count,
        lose_count: item.lose_count,
        win_rate: item.win_count + item.lose_count > 0
          ? Math.round(item.win_count / (item.win_count + item.lose_count) * 100) : 0
      })),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    });
  } catch (err) { next(err); }
});

// 获取我所在的排名范围
router.get('/my-rank-range', authMiddleware, async (req, res, next) => {
  try {
    const ua = await initUserArena(req.user.id);
    const myRank = await db.getVar(
      'SELECT COUNT(*) + 1 FROM `user_arena` WHERE `score` > ?',
      [ua.score]
    );

    // 获取前后各2名
    const list = await db.getAll(
      `SELECT ua.rank, ua.score, ua.win_count, ua.lose_count, u.id, u.username, u.sex, u.level,
              (SELECT COUNT(*) + 1 FROM user_arena WHERE score > ua.score) AS arena_rank
       FROM user_arena ua
       JOIN user u ON ua.user_id = u.id
       ORDER BY ua.score DESC
       LIMIT 5 OFFSET ?`,
      [Math.max(0, myRank - 3)]
    );

    res.json({
      my_rank: myRank,
      list: list.map((item, idx) => ({
        rank: myRank - 2 + idx,
        user_id: item.id,
        username: item.username,
        sex: item.sex,
        level: item.level,
        score: item.score,
        win_count: item.win_count,
        lose_count: item.lose_count,
        is_me: item.id === req.user.id
      }))
    });
  } catch (err) { next(err); }
});

module.exports = router;