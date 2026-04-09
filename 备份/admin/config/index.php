<?php
/**
 * 管理后台 - 系统配置
 */
require_once __DIR__ . '/../../inc/config.php';
require_once __DIR__ . '/../../inc/functions.php';
checkAdmin();

$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $configs = [
        'game_name' => '游戏名称',
        'start_money' => '新手初始金钱',
        'start_hp' => '新手初始HP',
        'exp_growth' => '每级经验增长量',
        'level_hp_bonus' => '每级HP增长量',
        'level_atk_min_bonus' => '每级最小攻击增长',
        'level_atk_max_bonus' => '每级最大攻击增长',
        'level_def_bonus' => '每级防御增长',
        'online_timeout' => '在线判定时间(秒)',
        'register_open' => '注册是否开放',
        'announcement' => '公告内容',
    ];
    foreach ($configs as $key => $label) {
        $value = trim($_POST[$key] ?? '');
        setSetting($key, $value);
    }
    $msg = '配置已保存';
}

// 读取配置
$settings = [
    'game_name' => getSetting('game_name', SITE_NAME),
    'start_money' => getSetting('start_money', '10000'),
    'start_hp' => getSetting('start_hp', '100'),
    'exp_growth' => getSetting('exp_growth', EXP_GROWTH),
    'level_hp_bonus' => getSetting('level_hp_bonus', LEVEL_HP_BONUS),
    'level_atk_min_bonus' => getSetting('level_atk_min_bonus', LEVEL_ATK_MIN_BONUS),
    'level_atk_max_bonus' => getSetting('level_atk_max_bonus', LEVEL_ATK_MAX_BONUS),
    'level_def_bonus' => getSetting('level_def_bonus', LEVEL_DEF_BONUS),
    'online_timeout' => getSetting('online_timeout', ONLINE_TIMEOUT),
    'register_open' => getSetting('register_open', '1'),
    'announcement' => getSetting('announcement', ''),
];

adminHeader('系统配置', [['text' => '系统配置']]);
?>
<h2 class="page-title">⚙️ 系统配置</h2>

<?php if ($msg): ?>
<div style="padding:10px 16px;background:#d5f5e3;color:#1e8449;border-radius:4px;margin-bottom:16px;"><?php echo e($msg); ?></div>
<?php endif; ?>

<div class="panel">
    <div class="panel-header">基本配置</div>
    <div class="panel-body panel-body-padded">
        <form method="POST">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-row">
                    <label>游戏名称</label>
                    <input type="text" name="game_name" value="<?php echo e($settings['game_name']); ?>">
                </div>
                <div class="form-row">
                    <label>注册是否开放</label>
                    <select name="register_open">
                        <option value="1" <?php echo $settings['register_open'] == '1' ? 'selected' : ''; ?>>开放</option>
                        <option value="0" <?php echo $settings['register_open'] == '0' ? 'selected' : ''; ?>>关闭</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <label>公告内容</label>
                <textarea name="announcement" rows="3"><?php echo e($settings['announcement']); ?></textarea>
                <div class="hint">在游戏页面显示的公告，留空则不显示</div>
            </div>

            <h4 style="margin:24px 0 16px;color:#2c3e50;border-bottom:1px solid #eee;padding-bottom:8px;">新手初始属性</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-row">
                    <label>初始金钱</label>
                    <input type="number" name="start_money" value="<?php echo e($settings['start_money']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>初始HP</label>
                    <input type="number" name="start_hp" value="<?php echo e($settings['start_hp']); ?>" min="1">
                </div>
            </div>

            <h4 style="margin:24px 0 16px;color:#2c3e50;border-bottom:1px solid #eee;padding-bottom:8px;">升级参数</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                <div class="form-row">
                    <label>每级经验增长量</label>
                    <input type="number" name="exp_growth" value="<?php echo e($settings['exp_growth']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>每级HP增长量</label>
                    <input type="number" name="level_hp_bonus" value="<?php echo e($settings['level_hp_bonus']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>每级防御增长量</label>
                    <input type="number" name="level_def_bonus" value="<?php echo e($settings['level_def_bonus']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>每级最小攻击增长</label>
                    <input type="number" name="level_atk_min_bonus" value="<?php echo e($settings['level_atk_min_bonus']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>每级最大攻击增长</label>
                    <input type="number" name="level_atk_max_bonus" value="<?php echo e($settings['level_atk_max_bonus']); ?>" min="0">
                </div>
                <div class="form-row">
                    <label>在线判定时间(秒)</label>
                    <input type="number" name="online_timeout" value="<?php echo e($settings['online_timeout']); ?>" min="60">
                    <div class="hint">默认900秒(15分钟)</div>
                </div>
            </div>

            <div style="margin-top:24px;">
                <button type="submit" class="btn btn-primary">保存配置</button>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-header">当前常量值（config.php，仅供参考）</div>
    <div class="panel-body">
        <div class="table-wrap">
            <table class="admin-table">
                <tr><th>常量</th><th>当前值</th><th>说明</th></tr>
                <tr><td>ONLINE_TIMEOUT</td><td><?php echo ONLINE_TIMEOUT; ?></td><td>在线判定时间(秒)</td></tr>
                <tr><td>START_PLACE_ID</td><td><?php echo START_PLACE_ID; ?></td><td>新手出生地点ID</td></tr>
                <tr><td>SHOP_PLACE_ID</td><td><?php echo SHOP_PLACE_ID; ?></td><td>商店地点ID</td></tr>
                <tr><td>LEVEL_HP_BONUS</td><td><?php echo LEVEL_HP_BONUS; ?></td><td>每级HP增长</td></tr>
                <tr><td>LEVEL_ATK_MIN_BONUS</td><td><?php echo LEVEL_ATK_MIN_BONUS; ?></td><td>每级最小攻击增长</td></tr>
                <tr><td>LEVEL_ATK_MAX_BONUS</td><td><?php echo LEVEL_ATK_MAX_BONUS; ?></td><td>每级最大攻击增长</td></tr>
                <tr><td>LEVEL_DEF_BONUS</td><td><?php echo LEVEL_DEF_BONUS; ?></td><td>每级防御增长</td></tr>
                <tr><td>BASE_EXP_MAX</td><td><?php echo BASE_EXP_MAX; ?></td><td>基础最大经验</td></tr>
                <tr><td>EXP_GROWTH</td><td><?php echo EXP_GROWTH; ?></td><td>每级经验增长</td></tr>
                <tr><td>MAX_CHAT_MESSAGES</td><td><?php echo MAX_CHAT_MESSAGES; ?></td><td>聊天最大消息数</td></tr>
            </table>
        </div>
    </div>
</div>

<?php adminFooter(); ?>
