<?php
/**
 * 纵横四海 - 开篇剧情
 */
require_once __DIR__ . '/inc/functions.php';

$role = getCurrentRole();
if (!$role->isLoggedIn()) {
    redirect('/');
}

// 剧情数据
$stories = [
    1 => [
        'title' => '序章：威尼斯的黎明',
        'text' => '1453年的春天，威尼斯的清晨笼罩在一层薄薄的雾气中。圣马可广场的钟声在远处回荡，运河上已有船只开始忙碌起来。',
        'bg' => '你站在威尼斯酒店门口，海风带着咸味拂过你的面庞。昨夜，你做了一个决定——成为一名航海冒险者。',
    ],
    2 => [
        'title' => '第一幕：远方的消息',
        'text' => '"听说了吗？君士坦丁堡陷落了！"酒店里，一个水手激动地拍着桌子。',
        'bg' => '奥斯曼帝国的军队攻破了拜占庭帝国的首都，东西方贸易路线被彻底切断。从此，通往东方的香料、丝绸和瓷器变得无比珍贵……',
    ],
    3 => [
        'title' => '第二幕：航海家的号召',
        'text' => '威尼斯总督府发布了告示：招募勇敢的航海家，开辟新的贸易航线！丰厚报酬，荣耀加身！',
        'bg' => '你站在告示牌前，心跳加速。这就是你等待已久的机会。你决定从地中海出发，寻找通往东方的新航路。',
    ],
    4 => [
        'title' => '第三幕：启程准备',
        'text' => '你走进了威尼斯的铁匠铺，挑选了一把结实的木剑。又到商店买了几瓶回复药，为即将到来的冒险做好了准备。',
        'bg' => '"年轻人，大海是残酷的，但也是最公平的。"老铁匠看着你，眼中闪过一丝赞赏。"祝你好运，孩子。"',
    ],
    5 => [
        'title' => '第四幕：地中海的召唤',
        'text' => '你来到威尼斯的码头，无数帆船停泊在港湾中。地中海的海水在阳光下闪耀着金色的光芒。',
        'bg' => '从这里出发，你可以前往里斯本、伦敦、北非的港口……也可以沿着古老的贸易路线，向东航行到亚历山大和伊斯坦布尔。',
    ],
    6 => [
        'title' => '第五幕：未知的旅途',
        'text' => '大海的深处隐藏着无数的宝藏和危险——海盗、风暴、神秘的岛屿……但同样也有无尽的荣耀和财富等待着你。',
        'bg' => '你深吸一口气，感受着海风的气息。纵横四海的冒险，从今天开始！',
    ],
    7 => [
        'title' => '尾声：新的开始',
        'text' => '你回到了威尼斯酒店，这里将是你的起点。走出酒店，去探索这个广阔的世界吧！',
        'bg' => '威尼斯城中有许多可以去的地方——广场、商店、铁匠铺、码头……城外还有森林、荒野等着你去冒险。祝你一路顺风，年轻的冒险者！',
    ],
];

$step = (int)($_GET['step'] ?? 1);
if ($step < 1) $step = 1;
if ($step > 7) $step = 7;

$story = $stories[$step];
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?php echo e($story['title']); ?> - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="container story-page">
    <div class="main-content">
        <div class="game-title" style="padding:16px 20px 8px;">
            <h1 style="font-size:20px;"><?php echo e($story['title']); ?></h1>
        </div>

        <!-- 进度条 -->
        <div style="margin:0 0 10px 0;">
            <div class="bar-track" style="height:5px;border-radius:3px;">
                <div class="bar-fill" style="width:<?php echo round(($step / 7) * 100); ?>%;background:linear-gradient(90deg,#e2b714,#f0c530);border-radius:3px;"></div>
            </div>
            <p class="text-muted" style="font-size:11px;margin-top:3px;text-align:center;"><?php echo $step; ?> / 7</p>
        </div>

        <div class="story-box">
            <p class="story-text"><?php echo nl2br(e($story['text'])); ?></p>
            <div class="divider" style="margin:10px 0;"></div>
            <p class="story-text"><?php echo nl2br(e($story['bg'])); ?></p>
        </div>

        <div class="text-center" style="margin-bottom:16px;">
            <?php if ($step < 7): ?>
            <a href="/step.php?step=<?php echo $step + 1; ?>" class="btn btn-primary btn-block">继续 →</a>
            <?php if ($step > 1): ?>
            <a href="/step.php?step=<?php echo $step - 1; ?>" class="btn btn-secondary btn-small" style="margin-top:6px;">← 上一页</a>
            <?php endif; ?>
            <?php else: ?>
            <a href="/map/index.php" class="btn btn-success btn-block">🗺️ 开始冒险</a>
            <?php endif; ?>
            <a href="/map/index.php" class="btn btn-secondary btn-small" style="margin-top:6px;">跳过剧情</a>
        </div>
    </div>

    <div class="footer">
        <p>⚓ <?php echo SITE_NAME; ?> v<?php echo SITE_VERSION; ?></p>
    </div>
</div>
</body>
</html>
