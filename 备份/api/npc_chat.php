<?php
/**
 * NPC对话 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

$npcId = (int)($_GET['npc'] ?? 0);
if ($npcId <= 0) { echo json_encode(['ok'=>false,'msg'=>'无效NPC']); exit; }

$npc = db()->getOne("SELECT * FROM npc WHERE id = ?", [$npcId]);
if (!$npc) { echo json_encode(['ok'=>false,'msg'=>'NPC不存在']); exit; }

// 硬编码对话数据
$npcDialogs = [
    1 => ['greet'=>'欢迎来到马可酒馆！外面风大浪急，进来喝杯朗姆酒暖暖身子吧。你要是闲得慌，我有些事情需要人帮忙……',
        'chat1'=>'最近城外的野狗闹得凶，好几个旅客被咬伤了。你要是有空，帮我料理几只？报酬不会少的！',
        'chat2'=>'听说码头那边的海盗越来越猖狂了，你要小心啊。不过打败他们能拿到不少铜币！',
        'chat3'=>'威尼斯是一座伟大的城市，王宫就在城的北边。你应该去见识一下！也许能发现什么秘密……',
        'chat4'=>'铁匠安芬尼奥的手艺不错，就是脾气有点怪。找他强化装备准没错。他在商业街的铁匠铺。'],
    2 => ['greet'=>'叮叮当当……哦，有客人！想让我帮你强化装备？我的手艺在整个威尼斯可是一绝！就是费用嘛……嘿嘿。',
        'chat1'=>'想强化装备？到铁匠铺来找我。虽然偶尔会失败，但成功的话装备会更强！+7以上失败了会降级哦！',
        'chat2'=>'我最近需要一些小回复药做辅助材料，你能帮我收集一些吗？我可以送你一把铁剑！',
        'chat3'=>'码头那帮海盗越来越嚣张了……哼，要是他们敢来我的铁匠铺闹事，有他们好看的！',
        'chat4'=>'好的武器能让你的攻击力翻倍。记得多来升级装备！打铁的声音就是胜利的号角！'],
    3 => ['greet'=>'金币放在身上可不太安全，海上的海盗可不长眼。存到我这里，我保证分文不少。当然，取款也不收手续费。',
        'chat1'=>'把多余的铜币存起来吧！在外面战斗被击败会损失5%的铜币，存在银行就安全了。',
        'chat2'=>'我们提供存取款服务，不收取任何手续费。这可是威尼斯最安全的金库！',
        'chat3'=>'理财有方，财源广进。存钱是一种好习惯，冒险者！稳健才是长久之道。'],
    4 => ['greet'=>'嘿嘿嘿，来试试手气吧！今天运气不错哦~输了可别赖账，赌场有赌场的规矩！',
        'chat1'=>'猜大小是最经典的游戏！两个骰子，猜总和大还是小。赢了翻倍，输了别哭鼻子！',
        'chat2'=>'每天有下注限额，等级越高限额越高。别想靠赌发财哦！不过嘛……万一呢？',
        'chat3'=>'小赌怡情，大赌伤身。记住，这只是娱乐！不过今天那位客人赢了不少呢……'],
    5 => ['greet'=>'客官里面请！我这有从东方运来的上好药材和武器防具，价格公道，童叟无欺！',
        'chat1'=>'武器能增加攻击力，防具能减少伤害。出门冒险一定要装备好！贫僧这里有上等好货。',
        'chat2'=>'回复药是野外冒险的必备品。小回复药便宜，大回复药效果更好。多备几瓶！',
        'chat3'=>'我也可以收购你不需要的物品，虽然回收价只有卖价的一半……没办法，生意嘛。'],
    6 => ['greet'=>'星座的排列告诉我……你今天将有一场奇遇。命运的丝线已经编织好了，你只需要……打开你的钱包。开玩笑的，进来坐坐吧。',
        'chat1'=>'我看到了你的未来……你将成为纵横四海的传奇航海家！星辰为你指引方向。',
        'chat2'=>'星象显示，今天对你来说是个冒险的好日子。去挑战一些强大的怪物吧！',
        'chat3'=>'命运掌握在你自己手中。我的占卜只是参考，真正的力量来自你的勇气和智慧。'],
];

// 判断触发类型
$hasReady = db()->getVar("SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=1", [$role->id, $npcId]);
$hasActive = db()->getVar("SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=0", [$role->id, $npcId]);
$totalQuests = db()->getVar("SELECT COUNT(*) FROM quest WHERE npc_id=?", [$npcId]);
$doneQuests = db()->getVar("SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=2", [$role->id, $npcId]);

$triggerType = 'idle';
if ($hasReady > 0) $triggerType = 'quest_ready';
elseif ($hasActive > 0) $triggerType = 'quest_active';
elseif ($totalQuests > 0 && $doneQuests >= $totalQuests) $triggerType = 'all_done';

// 获取NPC对话：优先从npc_dialog表取动态对话
$npcChat = $npcDialogs[$npcId] ?? [];
$dialog = $npcChat['greet'] ?? $npc['dialog'];

$nd = db()->getOne("SELECT content FROM npc_dialog WHERE npc_id=? AND trigger_type=? ORDER BY sort_order LIMIT 1", [$npcId, $triggerType]);
if ($nd) $dialog = $nd['content'];

// 收集闲聊话题（chat1~chatN）
$chatTopics = [];
if (!empty($npcChat)) {
    foreach ($npcChat as $key => $val) {
        if (strpos($key, 'chat') === 0) {
            $chatTopics[] = ['key' => $key, 'text' => $val];
        }
    }
}

// 随机选一个作为默认展示
$defaultChat = null;
if (!empty($chatTopics)) {
    $defaultChat = $chatTopics[array_rand($chatTopics)];
}

// 获取可用任务
$availableQuests = db()->getAll(
    "SELECT q.* FROM quest q WHERE q.npc_id=? AND q.level_req<=? AND q.id NOT IN (SELECT quest_id FROM user_quest WHERE user_id=?) AND (q.pre_quest_id=0 OR q.pre_quest_id IN (SELECT quest_id FROM user_quest WHERE user_id=? AND status>=1)) ORDER BY q.sort_order, q.id",
    [$npcId, $role->level, $role->id, $role->id]
);

$availList = [];
foreach ($availableQuests as $q) {
    $rt = '经验+'.$q['reward_exp'].' 铜币+'.$q['reward_money'];
    if ($q['reward_item_id'] > 0) {
        $ri = db()->getOne("SELECT name FROM item WHERE id = ?", [$q['reward_item_id']]);
        if ($ri) $rt .= ' '.$ri['name'].'×'.$q['reward_item_qty'];
    }
    $availList[] = [
        'id'=>$q['id'],'name'=>$q['name'],'desc'=>$q['description'],
        'level_req'=>$q['level_req'],'reward'=>$rt
    ];
}

// 获取进行中任务
$activeQuests = db()->getAll(
    "SELECT q.*, uq.progress, uq.status FROM quest q JOIN user_quest uq ON q.id=uq.quest_id WHERE uq.user_id=? AND q.npc_id=? AND uq.status<2 ORDER BY q.sort_order, q.id",
    [$role->id, $npcId]
);

echo json_encode([
    'ok'=>true,
    'trigger_type'=>$triggerType,
    'dialog'=>$dialog,
    'default_chat'=>$defaultChat,      // 随机选中的默认闲聊
    'chat_topics'=>$chatTopics,         // 所有可切换的闲聊话题
    'available_quests'=>$availList,
    'active_quests'=>$activeQuests
]);
