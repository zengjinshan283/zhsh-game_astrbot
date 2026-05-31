/**
 * 星座答题活动路由
 * 占星师NPC入口，答题活动
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取中国时间(UTC+8)日期字符串 YYYY-MM-DD
function getCSTDate() {
  const now = new Date();
  const cst = new Date(now.getTime() + 8 * 3600000);
  return cst.toISOString().slice(0, 10);
}

// 星座名称映射
const ZODIAC_NAMES = {
  1: '白羊座', 2: '金牛座', 3: '双子座', 4: '巨蟹座',
  5: '狮子座', 6: '处女座', 7: '天秤座', 8: '天蝎座',
  9: '射手座', 10: '摩羯座', 11: '水瓶座', 12: '双鱼座'
};

// 获取所有分类
router.get('/categories', authMiddleware, async (req, res, next) => {
  try {
    const categories = await db.getAll('SELECT * FROM `quiz_category` ORDER BY `sort_order`');
    res.json({ categories });
  } catch (err) { next(err); }
});

// 答题状态（今日次数）
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = getCSTDate();
    const row = await db.getOne(
      'SELECT COUNT(*) as cnt FROM `quiz_session` WHERE `user_id` = ? AND DATE(`started_at`) = ? AND `status` = 1',
      [uid, today]
    );
    res.json({ today_count: row ? row.cnt : 0, max_per_day: 3 });
  } catch (err) { next(err); }
});

// 获取题目列表（按分类或综合）
router.get('/questions', authMiddleware, async (req, res, next) => {
  try {
    const { category_id, limit = 10 } = req.query;
    let sql = 'SELECT * FROM `quiz_question`';
    const params = [];
    if (category_id && category_id !== 'all') {
      sql += ' WHERE `category_id` = ?';
      params.push(category_id);
    }
    sql += ' ORDER BY RAND() LIMIT ?';
    params.push(parseInt(limit));
    const questions = await db.getAll(sql, params);
    // 不返回正确答案
    const safeQuestions = questions.map(q => ({
      id: q.id, category_id: q.category_id,
      question: q.question,
      option_a: q.option_a, option_b: q.option_b,
      option_c: q.option_c, option_d: q.option_d,
      difficulty: q.difficulty, points: q.points
    }));
    res.json({ questions: safeQuestions });
  } catch (err) { next(err); }
});

// 开始答题会话
router.post('/start', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { category_id } = req.body; // null = 综合

    // 每天限制3次答题
    const today = getCSTDate();
    const todayCount = await db.getOne(
      'SELECT COUNT(*) as cnt FROM `quiz_session` WHERE `user_id` = ? AND DATE(`started_at`) = ? AND `status` = 1',
      [uid, today]
    );
    if (todayCount && todayCount.cnt >= 3) {
      return res.status(400).json({ error: '今日答题次数已用完（每天最多3次）' });
    }

    const sessionId = await db.insert('quiz_session', {
      user_id: uid,
      category_id: category_id || null,
      status: 0,
      score: 0,
      correct_count: 0,
      total_count: 0
    });

    res.json({ session_id: sessionId, msg: '答题会话已创建' });
  } catch (err) { next(err); }
});

// 提交答案
router.post('/answer', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { session_id, question_id, user_answer } = req.body;

    if (!session_id || !question_id || !user_answer) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const session = await db.getOne(
      'SELECT * FROM `quiz_session` WHERE `id` = ? AND `user_id` = ? AND `status` = 0',
      [session_id, uid]
    );
    if (!session) return res.status(400).json({ error: '答题会话不存在或已结束' });

    const question = await db.getOne('SELECT * FROM `quiz_question` WHERE `id` = ?', [question_id]);
    if (!question) return res.status(400).json({ error: '题目不存在' });

    // 防止重复作答
    const existingLog = await db.getOne(
      'SELECT id FROM `quiz_answer_log` WHERE `session_id` = ? AND `question_id` = ?',
      [session_id, question_id]
    );
    if (existingLog) return res.status(400).json({ error: '该题已作答' });

    const isCorrect = user_answer.toUpperCase() === question.correct.toUpperCase() ? 1 : 0;

    await db.insert('quiz_answer_log', {
      session_id,
      question_id,
      user_answer: user_answer.toUpperCase(),
      is_correct: isCorrect
    });

    // 更新会话统计
    await db.query(
      'UPDATE `quiz_session` SET `correct_count` = `correct_count` + ?, `total_count` = `total_count` + 1, `score` = `score` + ? WHERE `id` = ?',
      [isCorrect, isCorrect ? question.points : 0, session_id]
    );

    res.json({
      is_correct: isCorrect,
      correct_answer: question.correct,
      points_earned: isCorrect ? question.points : 0,
      msg: isCorrect ? '✅ 回答正确！' : `❌ 正确答案是 ${question.correct}`
    });
  } catch (err) { next(err); }
});

// 结束答题会话
router.post('/finish', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { session_id } = req.body;

    const session = await db.getOne(
      'SELECT * FROM `quiz_session` WHERE `id` = ? AND `user_id` = ? AND `status` = 0',
      [session_id, uid]
    );
    if (!session) return res.status(400).json({ error: '答题会话不存在或已结束' });

    await db.query(
      'UPDATE `quiz_session` SET `status` = 1, `finished_at` = NOW() WHERE `id` = ?',
      [session_id]
    );

    // 计算奖励：答对题数 * 20 铜币
    const rewardMoney = session.correct_count * 20;
    if (rewardMoney > 0) {
      await db.query('UPDATE `user` SET `money` = `money` + ? WHERE `id` = ?', [rewardMoney, uid]);
      await db.query('UPDATE `quiz_session` SET `reward_money` = ? WHERE `id` = ?', [rewardMoney, session_id]);
    }

    const categoryName = session.category_id ? ZODIAC_NAMES[session.category_id] || '综合' : '综合';
    res.json({
      success: true,
      score: session.score + (session.correct_count > 0 && session.total_count === session.correct_count ? session.correct_count * 20 : 0) + rewardMoney,
      correct_count: session.correct_count,
      total_count: session.total_count,
      reward_money: rewardMoney,
      msg: `🎁 答题完成！答对${session.correct_count}/${session.total_count}题，奖励${rewardMoney}铜币`
    });
  } catch (err) { next(err); }
});

// 获取答题记录（历史）
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const sessions = await db.getAll(
      'SELECT qs.*, qc.name as category_name FROM `quiz_session` qs LEFT JOIN `quiz_category` qc ON qs.category_id = qc.id WHERE qs.`user_id` = ? AND qs.`status` = 1 ORDER BY qs.`finished_at` DESC LIMIT 20',
      [uid]
    );
    res.json({ sessions });
  } catch (err) { next(err); }
});

// 获取占星师对话（NPC触发）
router.get('/npc-dialog', authMiddleware, async (req, res, next) => {
  try {
    const dialogs = [
      { type: 'text', content: '✨ 旅行者，我是占星师塔薇尔。星星告诉我，你对宇宙的奥秘充满好奇...' },
      { type: 'text', content: '📜 我这里有12星座的知识问答挑战，完成答题可获得铜币奖励。' },
      { type: 'text', content: '🌟 每次答题共10题，答对越多奖励越丰厚。每天可挑战3次。' },
      { type: 'action', content: '你想挑战哪个星座的题目？', actions: [
        { label: '♈ 白羊座', action: 'quiz_start', param: 1 },
        { label: '♉ 金牛座', action: 'quiz_start', param: 2 },
        { label: '♊ 双子座', action: 'quiz_start', param: 3 },
        { label: '♋ 巨蟹座', action: 'quiz_start', param: 4 },
        { label: '♌ 狮子座', action: 'quiz_start', param: 5 },
        { label: '♍ 处女座', action: 'quiz_start', param: 6 },
        { label: '♎ 天秤座', action: 'quiz_start', param: 7 },
        { label: '♏ 天蝎座', action: 'quiz_start', param: 8 },
        { label: '♐ 射手座', action: 'quiz_start', param: 9 },
        { label: '♑ 摩羯座', action: 'quiz_start', param: 10 },
        { label: '♒ 水瓶座', action: 'quiz_start', param: 11 },
        { label: '♓ 双鱼座', action: 'quiz_start', param: 12 },
        { label: '🌌 综合题库（12星座混合）', action: 'quiz_start', param: 0 }
      ]}
    ];
    res.json({ dialogs });
  } catch (err) { next(err); }
});

// 占星师NPC ID（需在npc表预先创建），检查是否存在
router.get('/npc-exists', authMiddleware, async (req, res, next) => {
  try {
    const npc = await db.getOne("SELECT id FROM `npc` WHERE `type` = 'astrologer' LIMIT 1");
    res.json({ exists: !!npc, npc_id: npc ? npc.id : null });
  } catch (err) { next(err); }
});

module.exports = router;