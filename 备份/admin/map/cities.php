<?php
/**
 * 管理后台 - 城市管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';
$selectedSea = intval($_GET['sea'] ?? 0);

// 获取所有海域
$allSeas = $db->getAll("SELECT * FROM `map` WHERE `parent_id` = 0 ORDER BY `sort_order` ASC, `id` ASC");
if (empty($selectedSea) && !empty($allSeas)) {
    $selectedSea = $allSeas[0]['id'];
}

// 处理POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        $parentId = intval($_POST['parent_id'] ?? 0);
        $sort = intval($_POST['sort_order'] ?? 0);
        if ($name === '' || $parentId <= 0) {
            $msg = '请填写名称并选择所属海域';
        } else {
            $db->insert('map', ['name' => $name, 'parent_id' => $parentId, 'type' => 1, 'sort_order' => $sort]);
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
            $placeCount = $db->getVar("SELECT COUNT(*) FROM `place` WHERE `city_id` = ?", [$id]);
            if ($placeCount > 0) {
                $msg = '该城市下还有地点，无法删除';
            } else {
                $db->delete('map', '`id` = ?', [$id]);
                $msg = '删除成功';
            }
        }
    }
}

// 获取城市列表
$cities = [];
$seaName = '';
if ($selectedSea > 0) {
    $cities = $db->getAll("SELECT m.*, (SELECT COUNT(*) FROM `place` p WHERE p.city_id = m.id) AS place_count FROM `map` m WHERE `parent_id` = ? ORDER BY `sort_order` ASC, `id` ASC", [$selectedSea]);
    $seaInfo = $db->getOne("SELECT * FROM `map` WHERE `id` = ?", [$selectedSea]);
    $seaName = $seaInfo ? $seaInfo['name'] : '';
}

adminHeader('地图管理', [
    ['text' => '海域管理', 'url' => '/admin/map/seas.php'],
    ['text' => '城市管理']
]);
?>
<h2 class="page-title">🏙️ 城市管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="toolbar">
    <div class="form-row" style="margin-bottom:0;">
        <label style="margin-bottom:0;">选择海域：</label>
        <select id="seaSelect" onchange="location.href='?sea='+this.value" style="width:180px;padding:8px;border:1px solid #ddd;border-radius:4px;">
            <?php foreach ($allSeas as $s): ?>
            <option value="<?php echo $s['id']; ?>" <?php echo $s['id'] == $selectedSea ? 'selected' : ''; ?>><?php echo e($s['name']); ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<!-- 添加城市 -->
<div class="panel">
    <div class="panel-header">
        <?php if ($seaName): ?>
        在「<?php echo e($seaName); ?>」下添加城市
        <?php else: ?>
        添加城市
        <?php endif; ?>
    </div>
    <div class="panel-body panel-body-padded">
        <form method="POST">
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="parent_id" value="<?php echo $selectedSea; ?>">
            <div style="display:flex;gap:12px;align-items:flex-end;">
                <div class="form-row" style="margin-bottom:0;">
                    <label>城市名称</label>
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

<!-- 城市列表 -->
<div class="panel">
    <div class="panel-header">城市列表（<?php echo e($seaName); ?>）</div>
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>名称</th><th>排序</th><th>地点数</th><th>操作</th></tr>
                </thead>
                <tbody>
                    <?php foreach ($cities as $c): ?>
                    <tr>
                        <td><?php echo $c['id']; ?></td>
                        <td><strong><?php echo e($c['name']); ?></strong></td>
                        <td><?php echo $c['sort_order']; ?></td>
                        <td><?php echo $c['place_count']; ?></td>
                        <td class="actions">
                            <button class="btn btn-primary btn-xs" onclick="editCity(<?php echo $c['id']; ?>, '<?php echo addslashes($c['name']); ?>', <?php echo $c['sort_order']; ?>)">编辑</button>
                            <a href="/admin/map/places.php?city=<?php echo $c['id']; ?>" class="btn btn-success btn-xs">地点</a>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该城市？')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo $c['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">删除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($cities)): ?>
                    <tr><td colspan="5" style="text-align:center;color:#999;padding:30px;">暂无城市</td></tr>
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
            编辑城市
            <button class="modal-close" onclick="document.getElementById('editModal').classList.remove('show')">&times;</button>
        </div>
        <form method="POST">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editId">
            <div class="modal-body">
                <div class="form-row">
                    <label>城市名称</label>
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
function editCity(id, name, sort) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editSort').value = sort;
    document.getElementById('editModal').classList.add('show');
}
</script>

<?php adminFooter(); ?>
