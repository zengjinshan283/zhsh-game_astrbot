<?php
/**
 * 纵横四海 - 排行榜
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();
$tab = $_GET['tab'] ?? 'level';

// 等级排行
$levelRank = db()->getAll("SELECT id, username, sex, level, exp FROM `user` ORDER BY `level` DESC, `exp` DESC LIMIT 20");

// 财富排行
$wealthRank = db()->getAll("SELECT id, username, sex, money, bank_money FROM `user` ORDER BY (money + bank_money) DESC LIMIT 20");

// 战力排行（基础属性+装备加成）
$powerRank = db()->getAll("
    SELECT u.id, u.username, u.sex, u.level, u.atk_min, u.atk_max, u.def, u.agility,
           COALESCE(SUM(CASE WHEN i.subtype IN('weapon','armor') THEN 
               ROUND((i.atk + i.def_val) * (1 + inv.enhance_level * 0.03)) ELSE 0 END), 0) AS equip_bonus
    FROM `user` u
    LEFT JOIN `inventory` inv ON inv.user_id = u.id AND inv.equipped = 1
    LEFT JOIN `item` i ON inv.item_id = i.id
    GROUP BY u.id
    ORDER BY (u.atk_max + u.def + u.agility + COALESCE(SUM(CASE WHEN i.subtype IN('weapon','armor') THEN 
               ROUND((i.atk + i.def_val) * (1 + inv.enhance_level * 0.03)) ELSE 0 END), 0)) DESC
    LIMIT 20
");

// 帮会排行
$guildRank = db()->getAll("
    SELECT g.id, g.name, g.level, g.exp,
           (SELECT COUNT(*) FROM `guild_member` gm WHERE gm.guild_id = g.id) AS member_count,
           (SELECT SUM(u.level) FROM `guild_member` gm JOIN `user` u ON gm.user_id = u.id WHERE gm.guild_id = g.id) AS total_level
    FROM `guild` g
    HAVING member_count > 0
    ORDER BY total_level DESC
    LIMIT 10
");

$rankIcons = ['🥇', '🥈', '🥉'];

renderHeader('排行榜');
?>

<div class="location-bar">
    <div class="location-name">🏆 排行榜</div>
    <div class="location-path"><?php echo e($role->username); ?> · Lv.<?php echo $role->level; ?></div>
</div>

<!-- 标签切换 -->
<div style="display:flex;margin-bottom:12px;gap:0;">
    <a href="/rank/index.php?tab=level" class="btn <?php echo $tab == 'level' ? 'btn-primary' : 'btn-secondary'; ?>" style="flex:1;border-radius:6px 0 0 6px;font-size:13px;">⭐ 等级</a>
    <a href="/rank/index.php?tab=wealth" class="btn <?php echo $tab == 'wealth' ? 'btn-primary' : 'btn-secondary'; ?>" style="flex:1;border-radius:0;font-size:13px;">💰 财富</a>
    <a href="/rank/index.php?tab=power" class="btn <?php echo $tab == 'power' ? 'btn-primary' : 'btn-secondary'; ?>" style="flex:1;border-radius:0;font-size:13px;">⚔️ 战力</a>
    <a href="/rank/index.php?tab=guild" class="btn <?php echo $tab == 'guild' ? 'btn-primary' : 'btn-secondary'; ?>" style="flex:1;border-radius:0 6px 6px 0;font-size:13px;">🏰 帮会</a>
</div>

<?php if ($tab == 'level'): ?>
<div class="card">
    <div class="card-title">⭐ 等级排行榜 TOP20</div>
    <?php foreach ($levelRank as $idx => $p): ?>
    <?php $isMe = ($p['id'] == $role->id); ?>
    <div style="padding:8px 0;border-bottom:1px solid rgba(226,183,20,0.05);display:flex;justify-content:space-between;align-items:center;<?php echo $isMe ? 'background:rgba(226,183,20,0.08);border-radius:6px;padding:8px;margin:0 -4px;' : ''; ?>">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:28px;text-align:center;font-size:<?php echo $idx < 3 ? '18px' : '14px'; ?>;">
                <?php echo $idx < 3 ? $rankIcons[$idx] : ($idx + 1); ?>
            </span>
            <span style="<?php echo $isMe ? 'color:#e2b714;font-weight:bold;' : ''; ?>">
                <?php echo ($p['sex'] == 2) ? '♀' : '♂'; ?>
                <?php echo e($p['username']); ?>
                <?php if ($isMe): ?><span style="font-size:11px;color:#e2b714;">[我]</span><?php endif; ?>
            </span>
        </div>
        <span style="color:#e2b714;font-weight:bold;font-size:14px;">Lv.<?php echo $p['level']; ?></span>
    </div>
    <?php endforeach; ?>
    <?php if (empty($levelRank)): ?>
    <div class="empty-state">暂无排行数据</div>
    <?php endif; ?>
</div>

<?php elseif ($tab == 'wealth'): ?>
<div class="card">
    <div class="card-title">💰 财富排行榜 TOP20</div>
    <?php foreach ($wealthRank as $idx => $p): ?>
    <?php $isMe = ($p['id'] == $role->id); $totalWealth = $p['money'] + $p['bank_money']; ?>
    <div style="padding:8px 0;border-bottom:1px solid rgba(226,183,20,0.05);display:flex;justify-content:space-between;align-items:center;<?php echo $isMe ? 'background:rgba(226,183,20,0.08);border-radius:6px;padding:8px;margin:0 -4px;' : ''; ?>">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:28px;text-align:center;font-size:<?php echo $idx < 3 ? '18px' : '14px'; ?>;">
                <?php echo $idx < 3 ? $rankIcons[$idx] : ($idx + 1); ?>
            </span>
            <span style="<?php echo $isMe ? 'color:#e2b714;font-weight:bold;' : ''; ?>">
                <?php echo ($p['sex'] == 2) ? '♀' : '♂'; ?>
                <?php echo e($p['username']); ?>
                <?php if ($isMe): ?><span style="font-size:11px;color:#e2b714;">[我]</span><?php endif; ?>
            </span>
        </div>
        <span style="color:#e2b714;font-weight:bold;font-size:14px;"><?php echo formatMoney($totalWealth); ?></span>
    </div>
    <?php endforeach; ?>
    <?php if (empty($wealthRank)): ?>
    <div class="empty-state">暂无排行数据</div>
    <?php endif; ?>
</div>

<?php elseif ($tab == 'power'): ?>
<div class="card">
    <div class="card-title">⚔️ 战力排行榜 TOP20</div>
    <?php foreach ($powerRank as $idx => $p): ?>
    <?php $isMe = ($p['id'] == $role->id); $power = $p['atk_max'] + $p['def'] + $p['agility'] + $p['equip_bonus']; ?>
    <div style="padding:8px 0;border-bottom:1px solid rgba(226,183,20,0.05);display:flex;justify-content:space-between;align-items:center;<?php echo $isMe ? 'background:rgba(226,183,20,0.08);border-radius:6px;padding:8px;margin:0 -4px;' : ''; ?>">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:28px;text-align:center;font-size:<?php echo $idx < 3 ? '18px' : '14px'; ?>;">
                <?php echo $idx < 3 ? $rankIcons[$idx] : ($idx + 1); ?>
            </span>
            <span style="<?php echo $isMe ? 'color:#e2b714;font-weight:bold;' : ''; ?>">
                <?php echo ($p['sex'] == 2) ? '♀' : '♂'; ?>
                <?php echo e($p['username']); ?>
                <?php if ($isMe): ?><span style="font-size:11px;color:#e2b714;">[我]</span><?php endif; ?>
            </span>
            <span class="text-muted" style="font-size:11px;">Lv.<?php echo $p['level']; ?></span>
        </div>
        <span style="color:#e74c3c;font-weight:bold;font-size:14px;"><?php echo $power; ?></span>
    </div>
    <?php endforeach; ?>
    <?php if (empty($powerRank)): ?>
    <div class="empty-state">暂无排行数据</div>
    <?php endif; ?>
</div>

<?php elseif ($tab == 'guild'): ?>
<div class="card">
    <div class="card-title">🏰 帮会排行榜 TOP10</div>
    <?php if (empty($guildRank)): ?>
    <div class="empty-state">暂无帮会数据</div>
    <?php else: ?>
    <?php foreach ($guildRank as $idx => $g): ?>
    <div style="padding:8px 0;border-bottom:1px solid rgba(226,183,20,0.05);display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:28px;text-align:center;font-size:<?php echo $idx < 3 ? '18px' : '14px'; ?>;">
                <?php echo $idx < 3 ? $rankIcons[$idx] : ($idx + 1); ?>
            </span>
            <span style="font-weight:bold;"><?php echo e($g['name']); ?></span>
        </div>
        <div style="text-align:right;">
            <div style="font-size:13px;color:#e2b714;">Lv.<?php echo $g['level']; ?> · <?php echo $g['member_count']; ?>人</div>
            <div style="font-size:11px;color:#8a7a5a;">总等级:<?php echo $g['total_level'] ?? 0; ?></div>
        </div>
    </div>
    <?php endforeach; ?>
    <?php endif; ?>
</div>
<?php endif; ?>

<div class="text-center text-muted mt-20" style="font-size:11px;">
    排行榜数据实时更新
</div>

<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>

<?php renderFooter(); ?>
