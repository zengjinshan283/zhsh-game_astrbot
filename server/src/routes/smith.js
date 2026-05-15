const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
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

// 获取强化材料道具ID（玄铁石）
function getEnhanceMaterialItemId() {
  return 50; // 玄铁石
}

router.get('/items', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll("SELECT inv.id AS inv_id, inv.enhance_level, inv.item_id, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor') ORDER BY inv.enhance_level DESC, i.atk+i.def_val DESC", [req.user.id]);
    res.json({ items });
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
    const { inventory_id } = req.body;
    const inv = await db.getOne("SELECT inv.*, i.name, i.subtype, i.atk, i.def_val FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0", [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (!['weapon','armor'].includes(inv.subtype)) return res.status(400).json({ error: '只有武器和防具可以强化' });

    const currentLevel = parseInt(inv.enhance_level) || 0;
    if (currentLevel >= 10) return res.status(400).json({ error: '已达最高等级 +10' });

    // 读取铜币费用
    const cost = await getEnhanceCost(currentLevel);
    const user = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `铜币不足！需要 ${cost}` });

    // 扣除铜币
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [cost, req.user.id]);

    // 成功率
    const rate = await getEnhanceConfig(currentLevel);
    const degradeLevel = await getDegradeLevel();
    const roll = Math.floor(Math.random()*100)+1;
    const success = roll <= rate;

    if (success) {
      const newLevel = currentLevel + 1;
      await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
      res.json({ success: true, name: inv.name, level: newLevel, msg: `✨ 强化成功！${inv.name} +${newLevel}！` });
    } else {
      if (currentLevel >= degradeLevel) {
        const newLevel = Math.max(0, currentLevel - 1);
        await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
        res.json({ success: false, level: newLevel, msg: `😡 强化失败！降级到 +${newLevel}`, downgraded: true });
      } else {
        res.json({ success: false, level: currentLevel, msg: `😡 强化失败！仍是 +${currentLevel}` });
      }
    }
  } catch(e){next(e);}
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
    res.json({ success: true, msg: `✅ ${inv.name} 修复完成！恢复了 ${missing} 点耐久度，消耗 ${totalCost} 铜币` });
  } catch(e){next(e);}
});

module.exports = router;
