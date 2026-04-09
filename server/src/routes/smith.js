const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

function getEnhanceRate(l){if(l>=9)return 30;if(l>=6)return 70;return 90;}
function getEnhanceCost(l){return(l+1)*200;}

router.get('/items', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll("SELECT inv.id AS inv_id, inv.enhance_level, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor') ORDER BY inv.enhance_level DESC, i.atk+i.def_val DESC", [req.user.id]);
    res.json({ items });
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
    const cost = getEnhanceCost(currentLevel);
    const user = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `铜币不足！需要 ${cost}` });
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [cost, req.user.id]);
    const rate = getEnhanceRate(currentLevel);
    const roll = Math.floor(Math.random()*100)+1;
    const success = roll <= rate;
    if (success) {
      const newLevel = currentLevel + 1;
      await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
      res.json({ success: true, name: inv.name, level: newLevel, msg: `✨ 强化成功！${inv.name} +${newLevel}！` });
    } else {
      if (currentLevel >= 7) {
        const newLevel = Math.max(0, currentLevel - 1);
        await db.update('inventory', { enhance_level: newLevel }, '`id` = ?', [inventory_id]);
        res.json({ success: false, level: newLevel, msg: `😡 强化失败！降级到 +${newLevel}`, downgraded: true });
      } else {
        res.json({ success: false, level: currentLevel, msg: `😡 强化失败！仍是 +${currentLevel}` });
      }
    }
  } catch(e){next(e);}
});

module.exports = router;
