const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const MAX_APPRENTICES = 5;

// 拜师
router.post('/apprentice', authMiddleware, async (req, res, next) => {
  try {
    const { mentor_id } = req.body;
    if (!mentor_id) return res.status(400).json({ error: '请提供师父ID' });
    const user = await db.getOne('SELECT id, level, mentor_id FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.mentor_id > 0) return res.status(400).json({ error: '已有师父，无法重复拜师' });

    const mentor = await db.getOne('SELECT id, username, is_mentor, apprentice_count FROM `user` WHERE `id` = ? AND is_mentor = 1', [mentor_id]);
    if (!mentor) return res.status(400).json({ error: '该玩家不是认证师父或不存在' });
    if (mentor.apprentice_count >= MAX_APPRENTICES) return res.status(400).json({ error: '该师父徒弟已满（最多5人）' });

    await db.query('UPDATE `user` SET mentor_id = ?, mentor_join_time = NOW() WHERE `id` = ?', [mentor_id, req.user.id]);
    await db.query('UPDATE `user` SET apprentice_count = apprentice_count + 1 WHERE `id` = ?', [mentor_id]);
    res.json({ success: true, msg: `拜 ${mentor.username} 为师成功！` });
  } catch(e){next(e);}
});

// 收徒设置
router.post('/become-mentor', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT id, level, is_mentor FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.level < 50) return res.status(400).json({ error: '需要达到50级才能成为师父' });
    await db.query('UPDATE `user` SET is_mentor = 1 WHERE `id` = ?', [req.user.id]);
    res.json({ success: true, msg: '已成为认证师父，可以收徒了！' });
  } catch(e){next(e);}
});

// 徒弟列表
router.get('/apprentices', authMiddleware, async (req, res, next) => {
  try {
    const apprentices = await db.getAll(
      'SELECT u.id, u.username, u.level, u.mentor_join_time FROM `user` u WHERE u.mentor_id = ? ORDER BY u.mentor_join_time DESC',
      [req.user.id]
    );
    res.json({ apprentices });
  } catch(e){next(e);}
});

// 师父信息
router.get('/mentor', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT mentor_id FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user || !user.mentor_id) return res.json({ has_mentor: false });
    const mentor = await db.getOne('SELECT id, username, level, mentor_contribution FROM `user` WHERE `id` = ?', [user.mentor_id]);
    if (!mentor) return res.json({ has_mentor: false });
    res.json({ has_mentor: true, mentor });
  } catch(e){next(e);}
});

// 出师检测（等级达到时自动出师）
router.post('/graduate', authMiddleware, async (req, res, next) => {
  try {
    const maxLevelRow = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'apprentice_max_level' AND `category` = 'mentor'");
    const maxLevel = maxLevelRow ? parseInt(maxLevelRow.config_value) : 30;
    const rewardRow = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'apprentice_reward' AND `category` = 'mentor'");
    const reward = rewardRow ? parseInt(rewardRow.config_value) : 1000;
    const contribRow = await db.getOne("SELECT config_value FROM `game_config` WHERE `config_key` = 'mentor_contribution' AND `category` = 'mentor'");
    const contrib = contribRow ? parseInt(contribRow.config_value) : 10;

    const user = await db.getOne('SELECT id, level, mentor_id FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user || !user.mentor_id) return res.status(400).json({ error: '没有师父，无需出师' });

    if (user.level < maxLevel) return res.status(400).json({ error: `等级达到${maxLevel}级才能出师，当前${user.level}级` });

    const mentor_id = user.mentor_id;
    await db.query('UPDATE `user` SET mentor_id = 0 WHERE `id` = ?', [req.user.id]);
    await db.query('UPDATE `user` SET apprentice_count = GREATEST(apprentice_count-1,0), mentor_contribution = mentor_contribution + ? WHERE `id` = ?', [contrib, mentor_id]);
    await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [reward, mentor_id]);

    res.json({ success: true, msg: `🎉 出师成功！师父获得了${reward}铜币和${contrib}贡献度奖励！` });
  } catch(e){next(e);}
});

// 师徒排行榜
router.get('/ranking', async (req, res, next) => {
  try {
    const top = await db.getAll(
      'SELECT id, username, level, apprentice_count, mentor_contribution FROM `user` WHERE is_mentor = 1 ORDER BY mentor_contribution DESC, apprentice_count DESC LIMIT 20'
    );
    res.json({ ranking: top });
  } catch(e){next(e);}
});

module.exports = router;
