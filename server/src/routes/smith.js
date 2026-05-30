const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { triggerAchievements } = require('./achievement');
const router = express.Router();

function randInt(min, max) { return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min); }

// 从 game_config 读取强化配置
async function getEnhanceConfig(level) {
  const key = `success_rate_${level}`;
  const row = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = ? AND `category` = 'enhance'", [key]);
  return row ? parseInt(row.config_value) : 90;
}

async function getEnhanceCost(level) {
  const base = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'cost_base' AND `category` = 'enhance'");
  return (level + 1) * (parseInt(base?.config_value) || 200);
}

async function getFailReturnRate() {
  const row = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'fail_return_rate' AND `category` = 'enhance'");
  return row ? parseInt(row.config_value) : 50;
}

async function getDegradeLevel() {
  const row = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'degrade_level' AND `category` = 'enhance'");
  return row ? parseInt(row.config_value) : 7;
}

// 强化保护符道具ID
const PROTECT_ITEM_ID = 95090;

// ─── 装备鉴定 ────────────────────────────────────────────
// 词缀表（随机属性池）
// 鉴定费用 = 500 + item.level_req * 100 铜币
// 普通装备=1条词缀, 精英装备=2条, BOSS装=3条

async function getIdentifyCost(levelReq) {
  return 500 + (parseInt(levelReq) || 1) * 100;
}

async function getAffixCountByQuality(quality) {
  // 1白/2绿/3蓝/4紫/5橙
  if (quality >= 5) return parseInt((await db.getOne("SELECT config_value FROM `game_config` WHERE config_key='boss_affix_count'"))?.config_value || '3');
  if (quality >= 4) return parseInt((await db.getOne("SELECT config_value FROM `game_config` WHERE config_key='elite_affix_count'"))?.config_value || '2');
  return parseInt((await db.getOne("SELECT config_value FROM `game_config` WHERE config_key='normal_affix_count'"))?.config_value || '1');
}

function rollAffixValue(affix) {
  return Math.floor(Math.random() * (affix.stat_max - affix.stat_min + 1)) + affix.stat_min;
}

// GET /api/smith/identify-items   未鉴定装备列表
router.get('/identify-items', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      `SELECT inv.id AS inv_id, inv.is_identified, inv.enhance_level,
              i.id AS item_id, i.name, i.subtype, i.atk, i.def_val, i.level_req, i.quality, i.price_buy
       FROM inventory inv
       JOIN item i ON inv.item_id = i.id
       WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor')
         AND (inv.is_identified IS NULL OR inv.is_identified = 0)
       ORDER BY i.quality DESC, i.level_req DESC`,
      [req.user.id]
    );
    res.json({ items });
  } catch (e) { next(e); }
});

// POST /api/smith/identify   鉴定一件装备
router.post('/identify', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne(
      `SELECT inv.id, inv.is_identified, inv.enhance_level, i.name, i.level_req, i.quality, i.atk, i.def_val
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.id = ? AND inv.user_id = ?`,
      [inventory_id, req.user.id]
    );
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (inv.is_identified == 1) return res.status(400).json({ error: '该装备已鉴定过' });

    const cost = await getIdentifyCost(inv.level_req);
    const user = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `铜币不足！需要 ${cost}，你只有 ${user.money}` });

    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [cost, req.user.id]);

    // 按品质决定词缀数量和稀有度权重
    const affixCount = await getAffixCountByQuality(inv.quality);
    const rollRarity = inv.quality >= 5 ? 3 : inv.quality >= 4 ? 2 : 1;

    // 随机抽取词缀（优先同阶，溢出时降阶）
    const pool = await db.getAll(
      'SELECT * FROM item_affix WHERE level_req <= ? AND rarity <= ? ORDER BY rarity DESC',
      [inv.level_req, rollRarity + 1]
    );
    if (!pool.length) return res.status(500).json({ error: '词缀库为空，请联系管理员' });

    // 打乱顺序取前affixCount个（去重stat_key）
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = [];
    const usedStats = new Set();
    for (const a of shuffled) {
      if (usedStats.has(a.stat_key)) continue;
      usedStats.add(a.stat_key);
      selected.push(a);
      if (selected.length >= affixCount) break;
    }

    const affixes = selected.map(a => ({
      name: a.affix_name,
      stat_key: a.stat_key,
      value: rollAffixValue(a)
    }));

    // 存储词缀JSON到inventory（后续扩展可新建item_affix_record表）
    await db.query(
      'UPDATE `inventory` SET is_identified = 1, identify_affixes = ? WHERE `id` = ?',
      [JSON.stringify(affixes), inventory_id]
    );

    // Daily activity: 装备鉴定
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_identify', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_identify']);
    } catch(e) {}

    const totalAtk = affixes.filter(a => a.stat_key === 'atk').reduce((s, a) => s + a.value, 0);
    const totalDef = affixes.filter(a => a.stat_key === 'def').reduce((s, a) => s + a.value, 0);
    const bonusStats = affixes.map(a => `${a.stat_key}+${a.value}`).join(' ');

    res.json({
      success: true,
      name: inv.name,
      affixes,
      bonusStats,
      msg: `鉴定成功！${inv.name} 获得：${affixes.map(a => `${a.name}(${a.stat_key}+${a.value})`).join('、')}`
    });
    // 成就触发：鉴定数量（非阻塞）
    (async () => {
      try {
        const row = await db.getOne('SELECT COUNT(*) as c FROM inventory WHERE user_id=? AND is_identified=1', [req.user.id]);
        const achs = await triggerAchievements(req.user.id, 'identify', (row?.c || 0) + 1);
        if (achs.length) console.log(`[成就] 用户${req.user.id}达成：${achs.map(a=>a.name).join('、')}`);
      } catch(e) {}
    })();
  } catch (e) { next(e); }
});

// 获取已鉴定装备的词缀信息
router.get('/identify/:invId', authMiddleware, async (req, res, next) => {
  try {
    const inv = await db.getOne(
      `SELECT inv.id, inv.identify_affixes, inv.is_identified, i.name
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.id = ? AND inv.user_id = ?`,
      [req.params.invId, req.user.id]
    );
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    const affixes = inv.identify_affixes ? JSON.parse(inv.identify_affixes) : [];
    res.json({ name: inv.name, is_identified: inv.is_identified, affixes });
  } catch (e) { next(e); }
});

// 获取强化材料道具ID（玄铁石）
function getEnhanceMaterialItemId() {
  return 50; // 玄铁石
}

router.get('/items', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      `SELECT inv.id AS inv_id, inv.enhance_level, inv.item_id, inv.is_identified, inv.identify_affixes,
              i.name, i.subtype, i.atk, i.def_val, i.level_req, i.quality, i.price_buy
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor')
       ORDER BY inv.enhance_level DESC, i.atk+i.def_val DESC`,
      [req.user.id]
    );
    // 附加强化后有效属性
    const result = items.map(inv => ({
      ...inv,
      eff_atk: Math.round((inv.atk || 0) * (1 + (inv.enhance_level || 0) * 0.03)),
      eff_def: Math.round((inv.def_val || 0) * (1 + (inv.enhance_level || 0) * 0.03)),
      cost: (inv.enhance_level || 0 + 1) * 200,
      rate: (inv.enhance_level || 0) >= 9 ? 30 : (inv.enhance_level || 0) >= 7 ? 70 : 90,
      is_max: (inv.enhance_level || 0) >= 10,
    }));
    res.json({ items: result });
  } catch(e){next(e);}
});

router.get('/config', authMiddleware, async (req, res, next) => {
  try {
    const configs = await db.getAll("SELECT config_key, config_value FROM `game_config` WHERE `category` = 'enhance'");
    const cfg = {};
    configs.forEach(r => cfg[r.config_key] = r.config_value);
    res.json({ config: cfg });
  } catch(e){next(e);}
});

router.post('/enhance', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id, protect } = req.body;
    const inv = await db.getOne("SELECT inv.*, i.name, i.subtype, i.atk, i.def_val FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0", [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (!['weapon','armor'].includes(inv.subtype)) return res.status(400).json({ error: '只有武器和防具可以强化' });

    const currentLevel = parseInt(inv.enhance_level) || 0;
    if (currentLevel >= 10) return res.status(400).json({ error: '已达最高等级 +10' });

    // 读取铜币费用
    const cost = await getEnhanceCost(currentLevel);
    const user = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `铜币不足！需要 ${cost}` });

    // 检查保护符（+7以上必须使用）
    const degradeLevel = await getDegradeLevel();
    if (currentLevel >= degradeLevel) {
      if (!protect) return res.status(400).json({ error: `+${currentLevel}强化需使用强化护符保护，传入 protect:true` });
      const hasProtect = await db.getOne('SELECT id,quantity FROM inventory WHERE user_id=? AND item_id=? AND equipped=0 AND quantity>=1', [req.user.id, PROTECT_ITEM_ID]);
      if (!hasProtect) return res.status(400).json({ error: '强化护符不足，请先在商城购买' });
      await db.query('UPDATE inventory SET quantity=quantity-1 WHERE id=?', [hasProtect.id]);
    }

    // 扣除铜币
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [cost, req.user.id]);

    // 成功率
    const rate = await getEnhanceConfig(currentLevel);
    const roll = Math.floor(Math.random()*100)+1;
    const success = roll <= rate;

    if (success) {
      const newLevel = currentLevel + 1;
      await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
      // Daily activity: 装备强化成功
      try {
        const today = new Date().toISOString().slice(0,10);
        await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
          [req.user.id, today, 'daily_enhance', Math.floor(Date.now()/1000)]);
        await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
          [Math.floor(Date.now()/1000), req.user.id, today, 'daily_enhance']);
      } catch(e) {}
      res.json({ success: true, name: inv.name, level: newLevel, msg: `✨ 强化成功！${inv.name} +${newLevel}！` });
      // 成就触发：强化等级（非阻塞）
      (async () => {
        try {
          const maxRow = await db.getOne('SELECT MAX(enhance_level) as ml FROM inventory WHERE user_id=? AND enhance_level IS NOT NULL', [req.user.id]);
          const achs = await triggerAchievements(req.user.id, 'enhance', maxRow?.ml || 0);
          if (achs.length) console.log(`[成就] 用户${req.user.id}达成：${achs.map(a=>a.name).join('、')}`);
        } catch(e) {}
      })();
    } else {
      if (currentLevel >= degradeLevel && !protect) {
        // 有保护符则不降级
        const newLevel = Math.max(0, currentLevel - 1);
        await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
        res.json({ success: false, level: newLevel, msg: `😡 强化失败！降级到 +${newLevel}`, downgraded: true });
      } else {
        res.json({ success: false, level: currentLevel, msg: protect ? `😡 强化失败！强化护符保护了装备，+${currentLevel}不变` : `😡 强化失败！仍是 +${currentLevel}` });
      }
    }
  } catch(e){next(e);}
});

// GET /api/smith/repair-items  可修理装备列表
router.get('/repair-items', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT place_id FROM `user` WHERE `id` = ?', [req.user.id]);
    const npc = await db.getOne('SELECT id FROM `npc` WHERE `place_id` = ? AND `type` = 2 LIMIT 1', [user.place_id]);
    if (!npc) return res.status(400).json({ error: '这里没有铁匠' });
    const items = await db.getAll(
      `SELECT inv.id AS inv_id, inv.durability, inv.durability_max, inv.enhance_level,
              i.name, i.subtype, i.atk, i.def_val, i.price_buy, i.level_req
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.user_id = ? AND i.subtype IN ('weapon','armor') AND inv.durability < inv.durability_max
       ORDER BY inv.durability ASC`,
      [req.user.id]
    );
    res.json({ items });
  } catch (e) { next(e); }
});

// 修理装备耐久度
router.post('/repair', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    // Check player is at a smith NPC (place with npc type=2)
    const user = await db.getOne('SELECT place_id FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });
    const npc = await db.getOne(
      'SELECT id FROM `npc` WHERE `place_id` = ? AND `type` = 2 LIMIT 1',
      [user.place_id]
    );
    if (!npc) return res.status(400).json({ error: '这里没有铁匠，无法修理装备' });

    const inv = await db.getOne(
      "SELECT inv.id, inv.durability, inv.durability_max, i.name, i.price_buy, i.subtype FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?",
      [inventory_id, req.user.id]
    );
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (!['weapon', 'armor'].includes(inv.subtype)) return res.status(400).json({ error: '只有武器和防具可以修理' });
    if (inv.durability >= inv.durability_max) return res.status(400).json({ error: '该装备耐久度已满，无需修理' });

    const missing = inv.durability_max - inv.durability;
    const costPerPoint = Math.floor(inv.price_buy * 0.1);
    const totalCost = missing * costPerPoint;
    const player = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (player.money < totalCost) return res.status(400).json({ error: `铜币不足！需要 ${totalCost}，你只有 ${player.money}` });

    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [totalCost, req.user.id]);
    await db.query('UPDATE `inventory` SET durability = ? WHERE `id` = ?', [inv.durability_max, inv.id]);
    res.json({ success: true, msg: `✅ ${inv.name}修复完成！恢复了 ${missing} 点耐久度，消耗 ${totalCost} 铜币` });
  } catch(e){next(e);}
});

// GET /api/smith/refine-items  可精炼装备列表
router.get('/refine-items', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      `SELECT inv.id AS inv_id, inv.enhance_level, inv.refine_affixes, inv.is_identified,
              i.id AS item_id, i.name, i.subtype, i.atk, i.def_val, i.level_req, i.quality, i.price_buy
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor')
         AND inv.is_identified = 1 AND inv.enhance_level >= 3
       ORDER BY inv.enhance_level DESC`,
      [req.user.id]
    );
    const result = items.map(inv => {
      let refineAffixes = [];
      try { if (inv.refine_affixes) refineAffixes = JSON.parse(inv.refine_affixes); } catch (_) {}
      return { ...inv, refine_affixes: refineAffixes };
    });
    res.json({ items: result });
  } catch (e) { next(e); }
});

// 精炼费用：enhance_level * 300 铜币
async function getRefineCost(inv) {
  return Math.max(100, ((inv.enhance_level || 0) * 300));
}

// 精炼一件装备
router.post('/refine', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne(
      `SELECT inv.*, i.name, i.subtype, i.atk, i.def_val, i.level_req, i.quality
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0`,
      [inventory_id, req.user.id]
    );
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (!['weapon','armor'].includes(inv.subtype)) return res.status(400).json({ error: '只有武器和防具可以精炼' });
    if (!inv.is_identified) return res.status(400).json({ error: '该装备未鉴定，无法精炼' });
    if ((inv.enhance_level || 0) < 3) return res.status(400).json({ error: '需要强化+3以上才能精炼' });

    const cost = await getRefineCost(inv);
    const user = await db.getOne('SELECT money FROM user WHERE id = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `铜币不足，需要${cost}铜币` });

    // 已有精练词缀
    let existing = [];
    try { if (inv.refine_affixes) existing = JSON.parse(inv.refine_affixes); } catch (_) {}

    // 从 item_affix 池中抽取新词缀（取2条，去重stat_key）
    const pool = await db.getAll(
      'SELECT * FROM item_affix WHERE level_req <= ? AND rarity <= 3 ORDER BY RAND()',
      [inv.level_req]
    );
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const toAdd = [];
    const usedStats = new Set(existing.map(a => a.stat_key));
    for (const a of shuffled) {
      if (usedStats.has(a.stat_key)) continue;
      const val = Math.floor(Math.random() * (a.stat_max - a.stat_min + 1)) + a.stat_min;
      toAdd.push({ name: a.affix_name, stat_key: a.stat_key, value: val });
      usedStats.add(a.stat_key);
      if (toAdd.length >= 2) break;
    }
    if (toAdd.length === 0) return res.status(400).json({ error: '精炼词缀库不足，请稍后重试' });

    await db.query('UPDATE user SET money = money - ? WHERE id = ?', [cost, req.user.id]);
    const newAffixes = [...existing, ...toAdd];
    await db.query('UPDATE inventory SET refine_affixes = ? WHERE id = ?', [JSON.stringify(newAffixes), inventory_id]);

    const bonusStats = toAdd.map(a => `${a.name}(${a.stat_key}+${a.value})`).join('、');
    res.json({
      success: true,
      msg: `🔮 精炼成功！${inv.name} 新增词缀：${bonusStats}（精炼共${newAffixes.length}条）`,
      refine_affixes: newAffixes,
    });
  } catch (e) { next(e); }
});

module.exports = router;
