<?php
/**
 * 管理后台 - 编辑玩家
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$db = db();
$id = intval($_GET['id'] ?? 0);
if ($id <= 0) {
    redirect('/admin/players/list.php');
}

$player = $db->getOne("SELECT * FROM `user` WHERE `id` = ?", [$id]);
if (!$player) {
    echo '<script>alert("玩家不存在");history.back();</script>';
    exit;
}

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = [];
    $fields = ['level', 'exp', 'exp_max', 'hp', 'hp_max', 'atk_min', 'atk_max', 'def', 'agility', 'money', 'gold'];
    foreach ($fields as $f) {
        $data[$f] = intval($_POST[$f] ?? 0);
    }
    $db->update('user', $data, '`id` = ?', [$id]);
    $msg = '修改成功！';
    $player = $db->getOne("SELECT * FROM `user` WHERE `id` = ?", [$id]);
}

adminHeader('玩家管理', [
    ['text' => '玩家列表', 'url' => '/admin/players/list.php'],
    ['text' => '编辑玩家 - ' . $player['username']]
]);
?>
<h2 class="page-title">编辑玩家：<?php echo e($player['username']); ?></h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;">
    <?php echo e($msg); ?>
</div>
<?php endif; ?>

<div class="panel">
    <div class="panel-header">基本信息（只读）</div>
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <tr><th width="120">ID</th><td><?php echo $player['id']; ?></td></tr>
                <tr><th>角色名</th><td><?php echo e($player['username']); ?></td></tr>
                <tr><th>性别</th><td><?php echo $player['sex'] == 1 ? '男' : '女'; ?></td></tr>
                <tr><th>注册时间</th><td><?php echo date('Y-m-d H:i:s', $player['regdate']); ?></td></tr>
                <tr><th>最后活跃</th><td><?php echo date('Y-m-d H:i:s', $player['lastdate']); ?></td></tr>
                <tr><th>注册IP</th><td><?php echo e($player['regip']); ?></td></tr>
            </table>
        </div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">属性编辑</div>
    <div class="panel-body panel-body-padded">
        <form method="POST">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-row">
                    <label>等级</label>
                    <input type="number" name="level" value="<?php echo $player['level']; ?>" min="1" max="999">
                </div>
                <div class="form-row">
                    <label>经验 / 最大经验</label>
                    <div style="display:flex;gap:8px;">
                        <input type="number" name="exp" value="<?php echo $player['exp']; ?>" min="0">
                        <span style="line-height:36px;color:#999;">/</span>
                        <input type="number" name="exp_max" value="<?php echo $player['exp_max']; ?>" min="1">
                    </div>
                </div>
                <div class="form-row">
                    <label>HP / 最大HP</label>
                    <div style="display:flex;gap:8px;">
                        <input type="number" name="hp" value="<?php echo $player['hp']; ?>" min="0">
                        <span style="line-height:36px;color:#999;">/</span>
                        <input type="number" name="hp_max" value="<?php echo $player['hp_max']; ?>" min="1">
                    </div>
                </div>
                <div class="form-row">
                    <label>攻击力范围</label>
                    <div style="display:flex;gap:8px;">
                        <input type="number" name="atk_min" value="<?php echo $player['atk_min']; ?>" min="0">
                        <span style="line-height:36px;color:#999;">~</span>
                        <input type="number" name="atk_max" value="<?php echo $player['atk_max']; ?>" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <label>防御</label>
                    <input type="number" name="def" value="<?php echo $player['def']; ?>" min="0">
                </div>
                <div class="form-row">
                    <label>敏捷</label>
                    <input type="number" name="agility" value="<?php echo $player['agility']; ?>" min="0">
                </div>
                <div class="form-row">
                    <label>金钱</label>
                    <input type="number" name="money" value="<?php echo $player['money']; ?>" min="0">
                </div>
                <div class="form-row">
                    <label>金币</label>
                    <input type="number" name="gold" value="<?php echo $player['gold']; ?>" min="0">
                </div>
            </div>
            <div style="margin-top:20px;">
                <button type="submit" class="btn btn-primary">保存修改</button>
                <a href="/admin/players/list.php" class="btn btn-default">返回列表</a>
            </div>
        </form>
    </div>
</div>

<?php adminFooter(); ?>
