<?php
/**
 * 管理后台 - 怪物管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';

// 获取所有地点（用于选择出现地点）
$allPlaces = $db->getAll("SELECT p.id, p.name, m.name AS city_name FROM `place` p LEFT JOIN `map` m ON p.city_id = m.id ORDER BY m.id, p.id");

// 处理POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add' || $action === 'edit') {
        $data = [
            'name' => trim($_POST['name'] ?? ''),
            'hp' => intval($_POST['hp'] ?? 50),
            'atk_min' => intval($_POST['atk_min'] ?? 1),
            'atk_max' => intval($_POST['atk_max'] ?? 10),
            'def' => intval($_POST['def'] ?? 0),
            'exp_reward' => intval($_POST['exp_reward'] ?? 10),
            'money_reward_min' => intval($_POST['money_reward_min'] ?? 1),
            'money_reward_max' => intval($_POST['money_reward_max'] ?? 10),
            'place_id' => intval($_POST['place_id'] ?? 0),
            'description' => trim($_POST['description'] ?? ''),
        ];
        if ($data['name'] === '') {
            $msg = '怪物名称不能为空';
        } elseif ($action === 'add') {
            $db->insert('monster', $data);
            $msg = '添加成功';
        } else {
            $id = intval($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->update('monster', $data, '`id` = ?', [$id]);
                $msg = '修改成功';
            }
        }
    } elseif ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            $db->delete('monster', '`id` = ?', [$id]);
            $msg = '删除成功';
        }
    }
}

$monsters = $db->getAll("SELECT mo.*, p.name AS place_name, m.name AS city_name FROM `monster` mo LEFT JOIN `place` p ON mo.place_id = p.id LEFT JOIN `map` m ON p.city_id = m.id ORDER BY mo.id ASC");

// 构建地点选项（分组）
$placesByCity = [];
foreach ($allPlaces as $ap) {
    $cityKey = $ap['city_name'] ?? '未知城市';
    if (!isset($placesByCity[$cityKey])) {
        $placesByCity[$cityKey] = [];
    }
    $placesByCity[$cityKey][] = $ap;
}

adminHeader('怪物管理', [['text' => '怪物列表']]);
?>
<h2 class="page-title">👹 怪物管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="toolbar">
    <button class="btn btn-primary" onclick="showMonsterForm()">+ 添加怪物</button>
    <span style="color:#999;font-size:13px;">共 <?php echo count($monsters); ?> 个怪物</span>
</div>

<div class="panel">
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>名称</th>
                        <th>HP</th>
                        <th>攻击范围</th>
                        <th>防御</th>
                        <th>经验奖励</th>
                        <th>金钱奖励</th>
                        <th>出现地点</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($monsters as $m): ?>
                    <tr>
                        <td><?php echo $m['id']; ?></td>
                        <td><strong><?php echo e($m['name']); ?></strong></td>
                        <td><?php echo $m['hp']; ?></td>
                        <td><?php echo $m['atk_min']; ?> ~ <?php echo $m['atk_max']; ?></td>
                        <td><?php echo $m['def']; ?></td>
                        <td><?php echo $m['exp_reward']; ?></td>
                        <td><?php echo $m['money_reward_min']; ?> ~ <?php echo $m['money_reward_max']; ?></td>
                        <td><?php echo e(($m['city_name'] ?? '?') . ' > ' . ($m['place_name'] ?? '-')); ?></td>
                        <td class="actions">
                            <button class="btn btn-primary btn-xs" onclick='editMonster(<?php echo $m['id']; ?>, <?php echo json_encode($m, JSON_UNESCAPED_UNICODE); ?>)'>编辑</button>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该怪物？')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo $m['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">删除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($monsters)): ?>
                    <tr><td colspan="9" style="text-align:center;color:#999;padding:30px;">暂无怪物</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- 添加/编辑弹窗 -->
<div class="modal-overlay" id="monsterModal">
    <div class="modal">
        <div class="modal-header">
            <span id="monsterModalTitle">添加怪物</span>
            <button class="modal-close" onclick="document.getElementById('monsterModal').classList.remove('show')">&times;</button>
        </div>
        <form method="POST" id="monsterForm">
            <input type="hidden" name="action" value="add" id="monsterAction">
            <input type="hidden" name="id" id="monsterId">
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-row">
                        <label>怪物名称 *</label>
                        <input type="text" name="name" id="monsterName" required>
                    </div>
                    <div class="form-row">
                        <label>出现地点</label>
                        <select name="place_id" id="monsterPlace">
                            <option value="0">无</option>
                            <?php foreach ($placesByCity as $city => $places): ?>
                            <optgroup label="<?php echo e($city); ?>">
                                <?php foreach ($places as $p): ?>
                                <option value="<?php echo $p['id']; ?>"><?php echo e($p['name']); ?></option>
                                <?php endforeach; ?>
                            </optgroup>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>HP</label>
                        <input type="number" name="hp" id="monsterHp" value="50" min="1">
                    </div>
                    <div class="form-row">
                        <label>防御</label>
                        <input type="number" name="def" id="monsterDef" value="0" min="0">
                    </div>
                    <div class="form-row">
                        <label>最小攻击</label>
                        <input type="number" name="atk_min" id="monsterAtkMin" value="1" min="0">
                    </div>
                    <div class="form-row">
                        <label>最大攻击</label>
                        <input type="number" name="atk_max" id="monsterAtkMax" value="10" min="0">
                    </div>
                    <div class="form-row">
                        <label>经验奖励</label>
                        <input type="number" name="exp_reward" id="monsterExp" value="10" min="0">
                    </div>
                    <div class="form-row">
                        <label>最小金钱</label>
                        <input type="number" name="money_reward_min" id="monsterMoneyMin" value="1" min="0">
                    </div>
                    <div class="form-row">
                        <label>最大金钱</label>
                        <input type="number" name="money_reward_max" id="monsterMoneyMax" value="10" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <label>描述</label>
                    <input type="text" name="description" id="monsterDesc">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" onclick="document.getElementById('monsterModal').classList.remove('show')">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    </div>
</div>

<script>
function showMonsterForm() {
    document.getElementById('monsterModalTitle').textContent = '添加怪物';
    document.getElementById('monsterAction').value = 'add';
    document.getElementById('monsterId').value = '';
    document.getElementById('monsterName').value = '';
    document.getElementById('monsterPlace').value = '0';
    document.getElementById('monsterHp').value = '50';
    document.getElementById('monsterDef').value = '0';
    document.getElementById('monsterAtkMin').value = '1';
    document.getElementById('monsterAtkMax').value = '10';
    document.getElementById('monsterExp').value = '10';
    document.getElementById('monsterMoneyMin').value = '1';
    document.getElementById('monsterMoneyMax').value = '10';
    document.getElementById('monsterDesc').value = '';
    document.getElementById('monsterModal').classList.add('show');
}

function editMonster(id, m) {
    document.getElementById('monsterModalTitle').textContent = '编辑怪物';
    document.getElementById('monsterAction').value = 'edit';
    document.getElementById('monsterId').value = id;
    document.getElementById('monsterName').value = m.name;
    document.getElementById('monsterPlace').value = m.place_id;
    document.getElementById('monsterHp').value = m.hp;
    document.getElementById('monsterDef').value = m.def;
    document.getElementById('monsterAtkMin').value = m.atk_min;
    document.getElementById('monsterAtkMax').value = m.atk_max;
    document.getElementById('monsterExp').value = m.exp_reward;
    document.getElementById('monsterMoneyMin').value = m.money_reward_min;
    document.getElementById('monsterMoneyMax').value = m.money_reward_max;
    document.getElementById('monsterDesc').value = m.description;
    document.getElementById('monsterModal').classList.add('show');
}
</script>

<?php adminFooter(); ?>
