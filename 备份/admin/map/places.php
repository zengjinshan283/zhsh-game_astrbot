<?php
/**
 * 管理后台 - 地点管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';
$selectedCity = intval($_GET['city'] ?? 0);

// 获取城市列表（含海域信息）
$allCities = $db->getAll("SELECT c.*, s.name AS sea_name FROM `map` c LEFT JOIN `map` s ON c.parent_id = s.id WHERE c.parent_id > 0 ORDER BY s.sort_order, c.sort_order, c.id");
if (empty($selectedCity) && !empty($allCities)) {
    $selectedCity = $allCities[0]['id'];
}

// 处理POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        $cityId = intval($_POST['city_id'] ?? 0);
        $notice = trim($_POST['notice'] ?? '');
        $type = intval($_POST['type'] ?? 0);
        if ($name === '' || $cityId <= 0) {
            $msg = '请填写名称并选择所属城市';
        } else {
            $db->insert('place', ['city_id' => $cityId, 'name' => $name, 'n' => 0, 's' => 0, 'e' => 0, 'w' => 0, 'notice' => $notice, 'type' => $type]);
            $msg = '添加成功';
        }
    } elseif ($action === 'edit') {
        $id = intval($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $notice = trim($_POST['notice'] ?? '');
        $type = intval($_POST['type'] ?? 0);
        if ($id > 0 && $name !== '') {
            $db->update('place', ['name' => $name, 'notice' => $notice, 'type' => $type], '`id` = ?', [$id]);
            $msg = '修改成功';
        }
    } elseif ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            $db->delete('place', '`id` = ?', [$id]);
            $msg = '删除成功';
        }
    } elseif ($action === 'update_dirs') {
        // 更新方向连接
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            $dirs = ['n', 's', 'e', 'w'];
            foreach ($dirs as $dir) {
                $val = intval($_POST['dir_' . $dir] ?? 0);
                $db->update('place', [$dir => $val], '`id` = ?', [$id]);
            }
            $msg = '方向连接已更新';
        }
    }
}

// 获取地点列表
$places = [];
$cityName = '';
$seaName = '';
if ($selectedCity > 0) {
    $places = $db->getAll("SELECT * FROM `place` WHERE `city_id` = ? ORDER BY `id` ASC", [$selectedCity]);
    $cityInfo = $db->getOne("SELECT c.*, s.name AS sea_name FROM `map` c LEFT JOIN `map` s ON c.parent_id = s.id WHERE c.id = ?", [$selectedCity]);
    $cityName = $cityInfo ? $cityInfo['name'] : '';
    $seaName = $cityInfo ? $cityInfo['sea_name'] : '';
}

// 该城市所有地点（用于方向选择）
$allPlaces = $selectedCity > 0 ? $db->getAll("SELECT id, name FROM `place` WHERE `city_id` = ? ORDER BY `id`", [$selectedCity]) : [];

adminHeader('地图管理', [
    ['text' => '海域管理', 'url' => '/admin/map/seas.php'],
    ['text' => '城市管理', 'url' => '/admin/map/cities.php'],
    ['text' => '地点管理']
]);
?>
<h2 class="page-title">📍 地点管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="toolbar">
    <div class="form-row" style="margin-bottom:0;">
        <label style="margin-bottom:0;">选择城市：</label>
        <select id="citySelect" onchange="location.href='?city='+this.value" style="width:220px;padding:8px;border:1px solid #ddd;border-radius:4px;">
            <?php foreach ($allCities as $c): ?>
            <option value="<?php echo $c['id']; ?>" <?php echo $c['id'] == $selectedCity ? 'selected' : ''; ?>><?php echo e($c['sea_name'] . ' > ' . $c['name']); ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<?php if ($selectedCity > 0): ?>
<!-- 添加地点 -->
<div class="panel">
    <div class="panel-header">添加地点（<?php echo e($seaName . ' > ' . $cityName); ?>）</div>
    <div class="panel-body panel-body-padded">
        <form method="POST">
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="city_id" value="<?php echo $selectedCity; ?>">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                <div class="form-row">
                    <label>地点名称</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-row">
                    <label>类型</label>
                    <select name="type">
                        <option value="0">普通</option>
                        <option value="1">商店</option>
                        <option value="2">战斗区</option>
                        <option value="3">安全区</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>描述/公告</label>
                    <input type="text" name="notice">
                </div>
            </div>
            <div style="margin-top:12px;">
                <button type="submit" class="btn btn-primary">添加</button>
            </div>
        </form>
    </div>
</div>

<!-- 地点列表 -->
<div class="panel">
    <div class="panel-header">地点列表（<?php echo count($places); ?> 个）</div>
    <div class="panel-body">
        <?php foreach ($places as $p): ?>
        <div style="border-bottom:1px solid #f0f0f0;padding:16px 20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <strong style="font-size:15px;color:#2c3e50;">ID:<?php echo $p['id']; ?> - <?php echo e($p['name']); ?></strong>
                    <span class="tag tag-blue" style="margin-left:8px;">
                        <?php
                        $typeNames = [0 => '普通', 1 => '商店', 2 => '战斗区', 3 => '安全区'];
                        echo $typeNames[$p['type']] ?? '未知';
                        ?>
                    </span>
                    <?php if ($p['notice']): ?>
                    <span style="color:#999;font-size:12px;margin-left:8px;"><?php echo e($p['notice']); ?></span>
                    <?php endif; ?>
                </div>
                <div class="actions">
                    <button class="btn btn-primary btn-xs" onclick="editPlace(<?php echo $p['id']; ?>, '<?php echo addslashes($p['name']); ?>', '<?php echo addslashes($p['notice'] ?? ''); ?>', <?php echo $p['type']; ?>)">编辑</button>
                    <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该地点？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?php echo $p['id']; ?>">
                        <button type="submit" class="btn btn-danger btn-xs">删除</button>
                    </form>
                </div>
            </div>
            <!-- 方向连接编辑 -->
            <form method="POST" style="display:inline;">
                <input type="hidden" name="action" value="update_dirs">
                <input type="hidden" name="id" value="<?php echo $p['id']; ?>">
                <div class="dir-editor">
                    <div class="dir-n">
                        <div class="dir-label">北</div>
                        <select name="dir_n">
                            <option value="0">无</option>
                            <?php foreach ($allPlaces as $ap): ?>
                            <option value="<?php echo $ap['id']; ?>" <?php echo $ap['id'] == $p['n'] ? 'selected' : ''; ?>><?php echo e($ap['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="dir-w">
                        <div class="dir-label">西</div>
                        <select name="dir_w">
                            <option value="0">无</option>
                            <?php foreach ($allPlaces as $ap): ?>
                            <option value="<?php echo $ap['id']; ?>" <?php echo $ap['id'] == $p['w'] ? 'selected' : ''; ?>><?php echo e($ap['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="dir-center"><?php echo e($p['name']); ?></div>
                    <div class="dir-e">
                        <div class="dir-label">东</div>
                        <select name="dir_e">
                            <option value="0">无</option>
                            <?php foreach ($allPlaces as $ap): ?>
                            <option value="<?php echo $ap['id']; ?>" <?php echo $ap['id'] == $p['e'] ? 'selected' : ''; ?>><?php echo e($ap['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="dir-s">
                        <div class="dir-label">南</div>
                        <select name="dir_s">
                            <option value="0">无</option>
                            <?php foreach ($allPlaces as $ap): ?>
                            <option value="<?php echo $ap['id']; ?>" <?php echo $ap['id'] == $p['s'] ? 'selected' : ''; ?>><?php echo e($ap['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-success btn-xs" style="margin-top:6px;">更新方向</button>
            </form>
        </div>
        <?php endforeach; ?>
        <?php if (empty($places)): ?>
        <div class="empty">暂无地点</div>
        <?php endif; ?>
    </div>
</div>
<?php endif; ?>

<!-- 编辑弹窗 -->
<div class="modal-overlay" id="editModal">
    <div class="modal">
        <div class="modal-header">
            编辑地点
            <button class="modal-close" onclick="document.getElementById('editModal').classList.remove('show')">&times;</button>
        </div>
        <form method="POST">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editId">
            <div class="modal-body">
                <div class="form-row">
                    <label>地点名称</label>
                    <input type="text" name="name" id="editName" required>
                </div>
                <div class="form-row">
                    <label>类型</label>
                    <select name="type" id="editType">
                        <option value="0">普通</option>
                        <option value="1">商店</option>
                        <option value="2">战斗区</option>
                        <option value="3">安全区</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>描述/公告</label>
                    <input type="text" name="notice" id="editNotice">
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
function editPlace(id, name, notice, type) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editNotice').value = notice;
    document.getElementById('editType').value = type;
    document.getElementById('editModal').classList.add('show');
}
</script>

<?php adminFooter(); ?>
