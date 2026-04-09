<?php
/**
 * 管理后台 - 聊天管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';
$search = trim($_GET['search'] ?? '');

// 删除操作
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    if ($action === 'delete' && !empty($_POST['id'])) {
        $id = intval($_POST['id']);
        $db->delete('chat', '`id` = ?', [$id]);
        $msg = '已删除';
    } elseif ($action === 'clear') {
        $db->query("DELETE FROM `chat`");
        $msg = '已清空所有聊天记录';
    }
}

// 构建查询
$where = '1=1';
$params = [];
if ($search !== '') {
    $where .= ' AND c.message LIKE ?';
    $params[] = '%' . $search . '%';
}

$messages = $db->getAll(
    "SELECT c.*, u.username FROM `chat` c LEFT JOIN `user` u ON c.user_id = u.id WHERE {$where} ORDER BY c.id DESC LIMIT 200",
    $params
);

adminHeader('聊天管理', [['text' => '聊天记录']]);
?>
<h2 class="page-title">💬 聊天管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="toolbar">
    <form method="GET" class="search-box">
        <input type="text" name="search" value="<?php echo e($search); ?>" placeholder="搜索消息内容...">
        <button type="submit">搜索</button>
    </form>
    <?php if ($search): ?>
    <a href="/admin/chat/list.php" class="btn btn-default btn-sm">清除搜索</a>
    <?php endif; ?>
    <form method="POST" style="display:inline;" onsubmit="return confirm('确定清空所有聊天记录？此操作不可撤销！')">
        <input type="hidden" name="action" value="clear">
        <button type="submit" class="btn btn-danger btn-sm">清空所有</button>
    </form>
    <span style="color:#999;font-size:13px;">最近 <?php echo count($messages); ?> 条</span>
</div>

<div class="panel">
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th width="60">ID</th>
                        <th width="140">时间</th>
                        <th width="100">发送者</th>
                        <th>消息内容</th>
                        <th width="60">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($messages as $c): ?>
                    <tr>
                        <td><?php echo $c['id']; ?></td>
                        <td style="font-size:12px;color:#999;"><?php echo date('Y-m-d H:i:s', $c['created_at']); ?></td>
                        <td>
                            <?php if ($c['target_id'] > 0): ?>
                            <span class="tag tag-orange">私聊</span><br>
                            <?php endif; ?>
                            <?php echo e($c['username'] ?? 'ID:' . $c['user_id']); ?>
                        </td>
                        <td><?php echo e($c['message']); ?></td>
                        <td>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该消息？')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo $c['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">删除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($messages)): ?>
                    <tr><td colspan="5" style="text-align:center;color:#999;padding:30px;">暂无聊天记录</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php adminFooter(); ?>
