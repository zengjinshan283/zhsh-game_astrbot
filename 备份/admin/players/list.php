<?php
/**
 * 管理后台 - 玩家列表
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$page = max(1, intval($_GET['page'] ?? 1));
$pageSize = 20;
$search = trim($_GET['search'] ?? '');

// 构建查询
$where = '1=1';
$params = [];
if ($search !== '') {
    $where .= ' AND u.username LIKE ?';
    $params[] = '%' . $search . '%';
}

// 总数
$total = $db->getVar("SELECT COUNT(*) FROM `user` u WHERE {$where}", $params);
$totalPages = max(1, ceil($total / $pageSize));
$offset = ($page - 1) * $pageSize;

// 玩家列表（含位置信息）
$players = $db->getAll(
    "SELECT u.*, p.name AS place_name, m.name AS city_name
     FROM `user` u
     LEFT JOIN `place` p ON u.place_id = p.id
     LEFT JOIN `map` m ON p.city_id = m.id
     WHERE {$where}
     ORDER BY u.id DESC
     LIMIT {$pageSize} OFFSET {$offset}",
    $params
);

// 封禁/解封操作
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    $uid = intval($_POST['id'] ?? 0);
    if ($uid > 0) {
        if ($action === 'ban') {
            // 用 sid 清空实现封禁
            $db->update('user', ['sid' => 'banned_' . bin2hex(random_bytes(8))], '`id` = ?', [$uid]);
        } elseif ($action === 'unban') {
            $db->update('user', ['sid' => bin2hex(random_bytes(16))], '`id` = ?', [$uid]);
        }
        redirect('/admin/players/list.php?page=' . $page . '&search=' . urlencode($search));
    }
}

adminHeader('玩家管理', [['text' => '玩家列表']]);

$isBanned = function($sid) {
    return strpos($sid, 'banned_') === 0;
};
?>
<h2 class="page-title">👥 玩家管理</h2>

<div class="toolbar">
    <form method="GET" class="search-box">
        <input type="text" name="search" value="<?php echo e($search); ?>" placeholder="搜索角色名...">
        <button type="submit">搜索</button>
    </form>
    <?php if ($search): ?>
    <a href="/admin/players/list.php" class="btn btn-default btn-sm">清除搜索</a>
    <?php endif; ?>
    <span style="color:#999;font-size:13px;">共 <?php echo number_format($total); ?> 个玩家</span>
</div>

<div class="panel">
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>角色名</th>
                        <th>等级</th>
                        <th>金钱</th>
                        <th>金币</th>
                        <th>当前位置</th>
                        <th>最后活跃</th>
                        <th>注册IP</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($players as $p): ?>
                    <tr>
                        <td><?php echo $p['id']; ?></td>
                        <td><strong><?php echo e($p['username']); ?></strong></td>
                        <td><?php echo $p['level']; ?></td>
                        <td><?php echo number_format($p['money']); ?></td>
                        <td><?php echo $p['gold']; ?></td>
                        <td><?php echo e($p['city_name'] ?? '-') . ' > ' . e($p['place_name'] ?? '-'); ?></td>
                        <td><?php echo $p['lastdate'] > 0 ? date('Y-m-d H:i', $p['lastdate']) : '-'; ?></td>
                        <td><?php echo e($p['regip']); ?></td>
                        <td>
                            <?php if ($isBanned($p['sid'])): ?>
                            <span class="tag tag-red">已封禁</span>
                            <?php else: ?>
                            <span class="tag tag-green">正常</span>
                            <?php endif; ?>
                        </td>
                        <td class="actions">
                            <a href="/admin/players/edit.php?id=<?php echo $p['id']; ?>" class="btn btn-primary btn-xs">编辑</a>
                            <?php if ($isBanned($p['sid'])): ?>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定解封该玩家？')">
                                <input type="hidden" name="action" value="unban">
                                <input type="hidden" name="id" value="<?php echo $p['id']; ?>">
                                <button type="submit" class="btn btn-success btn-xs">解封</button>
                            </form>
                            <?php else: ?>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定封禁该玩家？封禁后将无法登录。')">
                                <input type="hidden" name="action" value="ban">
                                <input type="hidden" name="id" value="<?php echo $p['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">封禁</button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($players)): ?>
                    <tr><td colspan="10" style="text-align:center;color:#999;padding:30px;">暂无玩家数据</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php if ($totalPages > 1): ?>
<div class="pagination">
    <?php if ($page > 1): ?>
    <a href="?page=1&search=<?php echo urlencode($search); ?>">首页</a>
    <a href="?page=<?php echo $page - 1; ?>&search=<?php echo urlencode($search); ?>">上一页</a>
    <?php else: ?>
    <span class="disabled">首页</span>
    <span class="disabled">上一页</span>
    <?php endif; ?>

    <?php
    $start = max(1, $page - 2);
    $end = min($totalPages, $page + 2);
    for ($i = $start; $i <= $end; $i++):
    ?>
    <?php if ($i == $page): ?>
    <span class="active"><?php echo $i; ?></span>
    <?php else: ?>
    <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>"><?php echo $i; ?></a>
    <?php endif; ?>
    <?php endfor; ?>

    <?php if ($page < $totalPages): ?>
    <a href="?page=<?php echo $page + 1; ?>&search=<?php echo urlencode($search); ?>">下一页</a>
    <a href="?page=<?php echo $totalPages; ?>&search=<?php echo urlencode($search); ?>">末页</a>
    <?php else: ?>
    <span class="disabled">下一页</span>
    <span class="disabled">末页</span>
    <?php endif; ?>
</div>
<?php endif; ?>

<?php adminFooter(); ?>
