<?php
/**
 * 管理后台 - 物品管理
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$msg = '';

// 处理POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add' || $action === 'edit') {
        $data = [
            'name' => trim($_POST['name'] ?? ''),
            'type' => intval($_POST['type'] ?? 0),
            'subtype' => trim($_POST['subtype'] ?? ''),
            'atk' => intval($_POST['atk'] ?? 0),
            'def_val' => intval($_POST['def_val'] ?? 0),
            'hp' => intval($_POST['hp'] ?? 0),
            'price_buy' => intval($_POST['price_buy'] ?? 0),
            'price_sell' => intval($_POST['price_sell'] ?? 0),
            'description' => trim($_POST['description'] ?? ''),
            'level_req' => intval($_POST['level_req'] ?? 1),
        ];
        if ($data['name'] === '') {
            $msg = '物品名称不能为空';
        } elseif ($action === 'add') {
            $db->insert('item', $data);
            $msg = '添加成功';
        } else {
            $id = intval($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->update('item', $data, '`id` = ?', [$id]);
                $msg = '修改成功';
            }
        }
    } elseif ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            // 检查是否有玩家持有
            $invCount = $db->getVar("SELECT COUNT(*) FROM `inventory` WHERE `item_id` = ?", [$id]);
            if ($invCount > 0) {
                $msg = '有玩家持有该物品，无法删除';
            } else {
                $db->delete('item', '`id` = ?', [$id]);
                $msg = '删除成功';
            }
        }
    }
}

$items = $db->getAll("SELECT * FROM `item` ORDER BY `id` ASC");

$typeNames = [0 => '其他', 1 => '武器', 2 => '防具', 3 => '消耗品', 4 => '材料', 5 => '饰品'];

adminHeader('物品管理', [['text' => '物品列表']]);
?>
<h2 class="page-title">🗡️ 物品管理</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="toolbar">
    <button class="btn btn-primary" onclick="showItemForm()">+ 添加物品</button>
    <span style="color:#999;font-size:13px;">共 <?php echo count($items); ?> 个物品</span>
</div>

<div class="panel">
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>名称</th>
                        <th>类型</th>
                        <th>攻击</th>
                        <th>防御</th>
                        <th>体力</th>
                        <th>买入价</th>
                        <th>卖出价</th>
                        <th>需求等级</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($items as $item): ?>
                    <tr>
                        <td><?php echo $item['id']; ?></td>
                        <td><strong><?php echo e($item['name']); ?></strong></td>
                        <td><span class="tag tag-blue"><?php echo $typeNames[$item['type']] ?? '其他'; ?></span></td>
                        <td><?php echo $item['atk']; ?></td>
                        <td><?php echo $item['def_val']; ?></td>
                        <td><?php echo $item['hp']; ?></td>
                        <td><?php echo number_format($item['price_buy']); ?></td>
                        <td><?php echo number_format($item['price_sell']); ?></td>
                        <td><?php echo $item['level_req']; ?></td>
                        <td class="actions">
                            <button class="btn btn-primary btn-xs" onclick='editItem(<?php echo $item['id']; ?>, <?php echo json_encode($item, JSON_UNESCAPED_UNICODE); ?>)'>编辑</button>
                            <form method="POST" style="display:inline;" onsubmit="return confirm('确定删除该物品？')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo $item['id']; ?>">
                                <button type="submit" class="btn btn-danger btn-xs">删除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($items)): ?>
                    <tr><td colspan="10" style="text-align:center;color:#999;padding:30px;">暂无物品</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- 添加/编辑弹窗 -->
<div class="modal-overlay" id="itemModal">
    <div class="modal">
        <div class="modal-header">
            <span id="itemModalTitle">添加物品</span>
            <button class="modal-close" onclick="document.getElementById('itemModal').classList.remove('show')">&times;</button>
        </div>
        <form method="POST" id="itemForm">
            <input type="hidden" name="action" value="add" id="itemAction">
            <input type="hidden" name="id" id="itemId">
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-row">
                        <label>物品名称 *</label>
                        <input type="text" name="name" id="itemName" required>
                    </div>
                    <div class="form-row">
                        <label>类型</label>
                        <select name="type" id="itemType">
                            <?php foreach ($typeNames as $k => $v): ?>
                            <option value="<?php echo $k; ?>"><?php echo $v; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>子类型</label>
                        <input type="text" name="subtype" id="itemSubtype">
                    </div>
                    <div class="form-row">
                        <label>需求等级</label>
                        <input type="number" name="level_req" id="itemLevelReq" value="1" min="1">
                    </div>
                    <div class="form-row">
                        <label>攻击力</label>
                        <input type="number" name="atk" id="itemAtk" value="0" min="0">
                    </div>
                    <div class="form-row">
                        <label>防御力</label>
                        <input type="number" name="def_val" id="itemDef" value="0" min="0">
                    </div>
                    <div class="form-row">
                        <label>体力加成</label>
                        <input type="number" name="hp" id="itemHp" value="0" min="0">
                    </div>
                    <div class="form-row">
                        <label>买入价</label>
                        <input type="number" name="price_buy" id="itemBuyPrice" value="0" min="0">
                    </div>
                    <div class="form-row">
                        <label>卖出价</label>
                        <input type="number" name="price_sell" id="itemSellPrice" value="0" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <label>描述</label>
                    <input type="text" name="description" id="itemDesc">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" onclick="document.getElementById('itemModal').classList.remove('show')">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    </div>
</div>

<script>
function showItemForm() {
    document.getElementById('itemModalTitle').textContent = '添加物品';
    document.getElementById('itemAction').value = 'add';
    document.getElementById('itemId').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemType').value = '0';
    document.getElementById('itemSubtype').value = '';
    document.getElementById('itemLevelReq').value = '1';
    document.getElementById('itemAtk').value = '0';
    document.getElementById('itemDef').value = '0';
    document.getElementById('itemHp').value = '0';
    document.getElementById('itemBuyPrice').value = '0';
    document.getElementById('itemSellPrice').value = '0';
    document.getElementById('itemDesc').value = '';
    document.getElementById('itemModal').classList.add('show');
}

function editItem(id, item) {
    document.getElementById('itemModalTitle').textContent = '编辑物品';
    document.getElementById('itemAction').value = 'edit';
    document.getElementById('itemId').value = id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemType').value = item.type;
    document.getElementById('itemSubtype').value = item.subtype;
    document.getElementById('itemLevelReq').value = item.level_req;
    document.getElementById('itemAtk').value = item.atk;
    document.getElementById('itemDef').value = item.def_val;
    document.getElementById('itemHp').value = item.hp;
    document.getElementById('itemBuyPrice').value = item.price_buy;
    document.getElementById('itemSellPrice').value = item.price_sell;
    document.getElementById('itemDesc').value = item.description;
    document.getElementById('itemModal').classList.add('show');
}
</script>

<?php adminFooter(); ?>
