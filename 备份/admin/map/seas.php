<?php
/**
 * 管理后台 - 海域管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';

// 处理POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        if ($name === '') {
            $msg = '名称不能为空';
        } else {
            $sort = intval($_POST['sort_order'] ?? 0);
            $db->insert('map', ['name' => $name, 'parent_id' => 0, 'type' => 0, 'sort_order' => $sort]);
            $msg = '添加成功';
        }
    } elseif ($action === 'edit') {
        $id = intval($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $sort = intval($_POST['sort_order'] ?? 0);
        if ($id > 0 && $name !== '') {
            $db->update('map', ['name' => $name, 'sort_order' => $sort], '`id` = ?', [$id]);
            $msg = '修改成功';
        }
    } elseif ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            // 检查是否有子城市
            $childCount = $db->getVar("SELECT COUNT(*) FROM `map` WHERE `parent_id` = ?", [$id]);
            if ($childCount > 0) {
                $msg = '该海域下还有城市，无法删除';
            } else {
                $db->delete('map', '`id` = ?', [$id]);
                $msg = '删除成功';
            }
        }
    }
}

$seas = $db->getAll("SELECT m.*, (SELECT COUNT(*) FROM `map` c WHERE c.parent_id = m.id) AS city_count FROM `map` m WHERE `parent_id` = 0 ORDER BY `sort_order` ASC, `id` ASC");

adminHeader('地图管理', [
    ['text' => '海域管理']
]);
?>
<h2 class="page-title">🗺️ 海域管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<!-- 添加海域 -->
<div class="panel">
    <div class="panel-header">添加海域</div>
    <div class="panel-body panel-body-padded">
        <form method="POST">
            <input type="hidden" name="action" value="add">
            <div style="display:flex;gap:12px;align-items:flex-end;">
                <div class="form-row" style="margin-bottom:0;">
                    <label>海域名称</label>
                    <input type="text" name="name" required style="width:200px;">
                </div>
                <div class="form-row" style="margin-bottom:0;">
                    <label>排序</label>
                    <input type="number" name="sort_order" value="0" style="width:80px;">
                </div>
                <button type="submit" class="btn btn-primary">添加</button>
            </div>
        </form>
    </div>
</div>

<!-- 海域列表 -->
<div class="panel">
    <div class="panel-header">海域列表</div>
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>名称</th><th>排序</th><th>城市数</th><th>操作</th></tr>
                </thead>
                <tbody>
                    <?php foreach ($seas as $s): ?>
                    <tr>
                        <td><?php echo $s['id']; ?></td>
                        <td><strong><?php echo e($s['name']); ?></strong></td>
                        <td><?php echo $s['sort_order']; ?></td>
                        <td><?php echo $s['city_count']; ?></td>
                        <td class="actions">
                            <button class="btn btn-primary btn-xs" onclick="editSea(<?php echo $s['id']; ?>, '<?php echo addslashes($s['name']); ?>', <?php echo $s['sort_order']; ?>)">编辑</button>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该海域？')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo $s['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">删除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($seas)): ?>
                    <tr><td colspan="5" style="text-align:center;color:#999;padding:30px;">暂无海域</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- 编辑弹窗 -->
<div class="modal-overlay" id="editModal">
    <div class="modal">
        <div class="modal-header">
            编辑海域
            <button class="modal-close" onclick="document.getElementById('editModal').classList.remove('show')">&times;</button>
        </div>
        <form method="POST">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editId">
            <div class="modal-body">
                <div class="form-row">
                    <label>海域名称</label>
                    <input type="text" name="name" id="editName" required>
                </div>
                <div class="form-row">
                    <label>排序</label>
                    <input type="number" name="sort_order" id="editSort" value="0">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" onclick="document.getElementById('editModal').classList.remove('show')">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    </div>
</div>

<script>
function editSea(id, name, sort) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editSort').value = sort;
    document.getElementById('editModal').classList.add('show');
}
</script>

<?php adminFooter(); ?>
