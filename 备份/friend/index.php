<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType=''; $tab=$_GET['tab']??'list';
$now=time();
if (isPost() && isset($_POST['add_friend'])) {
    $friendName = trim($_POST['friend_name']);
    if (empty($friendName)) { $msg='请输入角色名'; $msgType='error'; }
    else { $target=db()->getOne("SELECT `id`, `username` FROM `user` WHERE `username` = ?",[$friendName]);
        if (!$target) { $msg='该角色不存在'; $msgType='error'; }
        elseif ($target['id']==$role->id) { $msg='不能添加自己'; $msgType='error'; }
        else { $exists=db()->getVar("SELECT COUNT(*) FROM `friend` WHERE `user_id` = ? AND `friend_id` = ?",[$role->id,$target['id']]);
            if ($exists>0) { $msg='已发送或已是好友'; $msgType='error'; }
            else { db()->insert('friend',['user_id'=>$role->id,'friend_id'=>$target['id'],'status'=>0,'created_at'=>time()]); $msg='已向 '.$target['username'].' 发送请求'; $msgType='success'; }
        }
    }
}
if (isset($_GET['accept'])) { $fId=(int)$_GET['accept']; $req=db()->getOne("SELECT * FROM `friend` WHERE `id` = ? AND `friend_id` = ? AND `status` = 0",[$fId,$role->id]); if($req){db()->update('friend',['status'=>1],'`id` = ?',[$fId]); $reverse=db()->getVar("SELECT COUNT(*) FROM `friend` WHERE `user_id` = ? AND `friend_id` = ?",[$role->id,$req['user_id']]); if($reverse==0){db()->insert('friend',['user_id'=>$role->id,'friend_id'=>$req['user_id'],'status'=>1,'created_at'=>time()]);} redirect('/friend/index.php?tab=requests');} }
if (isset($_GET['reject'])) { $fId=(int)$_GET['reject']; db()->delete('friend','`id` = ?',[$fId]); redirect('/friend/index.php?tab=requests'); }
if (isset($_GET['delete'])) { $friendId=(int)$_GET['delete']; db()->delete('friend','`user_id` = ? AND `friend_id` = ? AND `status` = 1',[$role->id,$friendId]); db()->delete('friend','`user_id` = ? AND `friend_id` = ? AND `status` = 1',[$friendId,$role->id]); redirect('/friend/index.php'); }
$friends = db()->getAll("SELECT f.id AS friend_row_id, f.created_at, u.id AS uid, u.username, u.sex, u.level, u.place_id, u.lastdate FROM `friend` f JOIN `user` u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 1 ORDER BY u.lastdate DESC",[$role->id]);
$requests = db()->getAll("SELECT f.id, f.created_at, u.id AS uid, u.username, u.sex, u.level FROM `friend` f JOIN `user` u ON f.user_id = u.id WHERE f.friend_id = ? AND f.status = 0 ORDER BY f.created_at DESC",[$role->id]);
renderHeader('好友');
?>
<div class="location-bar">
    <div class="location-name">👥 好友</div>
    <div class="location-path">好友 <?php echo count($friends); ?> · 请求 <?php echo count($requests); ?></div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:11px;margin:0;"><?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<div class="card" style="padding:4px 8px;">
    <div class="inline-form">
        <input type="text" name="friend_name" maxlength="20" placeholder="输入角色名" form="friendForm" required style="flex:1;">
        <button type="submit" form="friendForm" class="btn btn-primary">添加</button>
    </div>
</div>
<form id="friendForm" method="POST" action="/friend/index.php" style="display:none;"></form>

<div class="tab-bar">
    <a href="/friend/index.php?tab=list" class="btn <?php echo $tab=='list'?'btn-primary':'btn-secondary'; ?>">👥好友(<?php echo count($friends); ?>)</a>
    <a href="/friend/index.php?tab=requests" class="btn <?php echo $tab=='requests'?'btn-primary':'btn-secondary'; ?>">📨请求(<?php echo count($requests); ?>)</a>
</div>

<?php if ($tab == 'list'): ?>
<?php if (empty($friends)): ?>
<div class="card"><div class="empty-state">还没有好友</div></div>
<?php else: ?>
<div class="card">
    <?php foreach ($friends as $f):
    $isOnline = ($f['lastdate'] > $now - ONLINE_TIMEOUT);
    ?>
    <div class="compact-row">
        <div>
            <span style="font-size:9px;color:<?php echo $isOnline?'#27ae60':'#8a7a5a'; ?>">● </span>
            <?php echo ($f['sex']==2)?'♀':'♂'; ?>
            <span class="player-name" style="font-size:12px;"><?php echo e($f['username']); ?></span>
            <span class="player-level">Lv.<?php echo $f['level']; ?></span>
        </div>
        <a href="/friend/index.php?delete=<?php echo $f['uid']; ?>" class="btn btn-danger btn-small" onclick="return confirm('确定删除?');">删</a>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php elseif ($tab == 'requests'): ?>
<?php if (empty($requests)): ?>
<div class="card"><div class="empty-state">没有待处理的请求</div></div>
<?php else: ?>
<?php foreach ($requests as $r): ?>
<div class="card" style="border-color:#3498db;padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;"><?php echo ($r['sex']==2)?'♀':'♂'; ?> <span class="player-name"><?php echo e($r['username']); ?></span> <span class="player-level">Lv.<?php echo $r['level']; ?></span></span>
        <span class="text-muted" style="font-size:10px;"><?php echo date('m/d H:i', $r['created_at']); ?></span>
    </div>
    <div style="display:flex;gap:4px;margin-top:3px;">
        <a href="/friend/index.php?accept=<?php echo $r['id']; ?>" class="btn btn-success btn-small">✅ 接受</a>
        <a href="/friend/index.php?reject=<?php echo $r['id']; ?>" class="btn btn-danger btn-small">❌ 拒绝</a>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>
<?php endif; ?>
<?php renderFooter(); ?>
