<?php
/**
 * 纵横四海 - 城内地图
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();

// 处理快速传送
if (isset($_GET['goto'])) {
    $gotoId = (int)$_GET['goto'];
    $place = $role->getPlace();
    $cityId = (int)($_GET['city_id'] ?? ($place ? $place['city_id'] : 0));
    if ($cityId <= 0) $cityId = 101;
    $target = db()->getOne("SELECT * FROM `place` WHERE `id` = ? AND `city_id` = ?", [$gotoId, $cityId]);
    if ($target) {
        $role->move($gotoId);
        redirect('/map/index.php');
    }
    redirect('/map/index.php');
}

$place = $role->getPlace();
$cityId = (int)($_GET['city_id'] ?? ($place ? $place['city_id'] : 0));
if ($cityId <= 0) $cityId = $place ? $place['city_id'] : 101;

$city = db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$cityId]);
if (!$city) {
    redirect('/map/index.php');
}

$places = db()->getAll("SELECT * FROM `place` WHERE `city_id` = ? ORDER BY `id`", [$cityId]);

renderHeader('城内地图 - ' . $city['name']);
?>

<div class="location-bar">
    <div class="location-name">🗺️ <?php echo e($city['name']); ?> - 城内地图</div>
    <div class="location-path">点击地点可快速传送</div>
</div>

<div class="card">
    <div class="card-title">📍 地点列表（<?php echo count($places); ?>个）</div>
    <ul class="city-places">
        <?php foreach ($places as $p): ?>
        <li>
            <a href="/map/citymap.php?goto=<?php echo $p['id']; ?>&city_id=<?php echo $cityId; ?>"
               style="<?php echo ($p['id'] == $role->place_id) ? 'border-color:#e2b714;color:#e2b714;' : ''; ?>">
                <?php
                $icon = '🏠';
                if ($p['type'] == 1) $icon = '⚓';
                elseif ($p['type'] == 2) $icon = '⛪';
                elseif ($p['type'] == 3) $icon = '🕌';
                echo $icon . ' ' . e($p['name']);
                ?>
                <?php if ($p['id'] == $role->place_id): ?>
                <span style="font-size:10px;"> ← 当前</span>
                <?php endif; ?>
            </a>
        </li>
        <?php endforeach; ?>
    </ul>
</div>

<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>

<?php renderFooter(); ?>
