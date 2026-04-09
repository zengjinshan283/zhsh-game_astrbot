<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType=''; $tab=$_GET['tab']??'my';
$myGuildMember=db()->getOne("SELECT gm.*, g.name AS guild_name, g.level AS guild_level, g.exp AS guild_exp, g.exp_max AS guild_exp_max, g.notice, g.member_max FROM `guild_member` gm JOIN `guild` g ON gm.guild_id = g.id WHERE gm.user_id = ?",[$role->id]);
$myGuildId=$myGuildMember?(int)$myGuildMember['guild_id']:0; $myGuildRole=$myGuildMember?(int)$myGuildMember['role']:0;
$isLeader=($myGuildRole===3); $isViceLeader=($myGuildRole>=2);
$roleNames=[0=>'成员',1=>'长老',2=>'副会长',3=>'会长']; $roleColors=[0=>'#c4a87c',1=>'#3498db',2=>'#e67e22',3=>'#e2b714'];

if (isPost() && isset($_POST['create_guild']) && !$myGuildId) {
    $guildName=trim($_POST['guild_name']);
    if (empty($guildName)||mb_strlen($guildName)<2||mb_strlen($guildName)>12) { $msg='帮会名2-12字符'; $msgType='error'; }
    elseif ($role->level<5) { $msg='需要等级≥5'; $msgType='error'; }
    elseif ($role->money<5000) { $msg='铜币不足！需5000'; $msgType='error'; }
    else { $exists=db()->getVar("SELECT COUNT(*) FROM `guild` WHERE `name` = ?",[$guildName]);
        if ($exists>0) { $msg='名称已被使用'; $msgType='error'; }
        else { $role->spendMoney(5000); $guildId=db()->insert('guild',['name'=>$guildName,'leader_id'=>$role->id,'notice'=>'欢迎加入！','created_at'=>time()]); db()->insert('guild_member',['guild_id'=>$guildId,'user_id'=>$role->id,'role'=>3,'joined_at'=>time(),'contribution'=>0]); $msg='🎉 帮会「'.$guildName.'」创建成功！'; $msgType='success'; $myGuildMember=db()->getOne("SELECT gm.*, g.name AS guild_name FROM `guild_member` gm JOIN `guild` g ON gm.guild_id = g.id WHERE gm.user_id = ?",[$role->id]); $myGuildId=$guildId; $myGuildRole=3; $isLeader=true; }
    }
}
if (isPost() && isset($_POST['join_guild']) && !$myGuildId) {
    $guildName=trim($_POST['join_name']); $guild=db()->getOne("SELECT * FROM `guild` WHERE `name` = ?",[$guildName]);
    if (!$guild) { $msg='帮会不存在'; $msgType='error'; }
    else { $memberCount=db()->getVar("SELECT COUNT(*) FROM `guild_member` WHERE `guild_id` = ?",[$guild['id']]);
        if ($memberCount>=$guild['member_max']) { $msg='人数已满'; $msgType='error'; }
        else { db()->insert('guild_member',['guild_id'=>$guild['id'],'user_id'=>$role->id,'role'=>0,'joined_at'=>time(),'contribution'=>0]); $msg='🎉 成功加入「'.$guild['name'].'」'; $msgType='success'; $myGuildMember=db()->getOne("SELECT gm.*, g.name AS guild_name FROM `guild_member` gm JOIN `guild` g ON gm.guild_id = g.id WHERE gm.user_id = ?",[$role->id]); $myGuildId=(int)$guild['id']; $myGuildRole=0; }
    }
}
if (isset($_GET['leave'])&&$myGuildId&&!$isLeader) { db()->delete('guild_member','user_id = ?',[$role->id]); $myGuildId=0; $myGuildMember=null; $msg='已退出'; $msgType='success'; }
if (isPost() && isset($_POST['edit_notice'])&&$isViceLeader&&$myGuildId) { $notice=mb_substr(trim($_POST['notice']),0,200); db()->update('guild',['notice'=>$notice],'id = ?',[$myGuildId]); $myGuildMember['notice']=$notice; $msg='公告已更新'; $msgType='success'; }
if (isset($_GET['disband'])&&$isLeader&&$myGuildId&&isset($_GET['confirm'])&&$_GET['confirm']==1) { db()->delete('guild_member','guild_id = ?',[$myGuildId]); db()->delete('guild','id = ?',[$myGuildId]); $myGuildId=0; $myGuildMember=null; $msg='帮会已解散'; $msgType='success'; }
$guildList=db()->getAll("SELECT g.*, (SELECT COUNT(*) FROM `guild_member` gm WHERE gm.guild_id = g.id) AS member_count FROM `guild` g ORDER BY g.level DESC, g.id ASC");
renderHeader('帮会');
?>
<div class="location-bar">
    <div class="location-name">🏰 帮会</div>
    <div class="location-path"><?php echo $myGuildMember?'「'.e($myGuildMember['guild_name']).'」'.$roleNames[$myGuildRole]:'未加入帮会'; ?></div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:11px;margin:0;"><?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<?php if ($myGuildMember): ?>
<div class="card" style="border-color:#e2b714;">
    <div class="card-title">🏰 <?php echo e($myGuildMember['guild_name']); ?></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:2px;font-size:11px;text-align:center;">
        <div><span style="color:#c4a87c;">⭐等级</span><br><span class="text-gold" style="font-weight:bold;">Lv.<?php echo $myGuildMember['guild_level']; ?></span></div>
        <?php $mc=db()->getVar("SELECT COUNT(*) FROM `guild_member` WHERE guild_id = ?",[$myGuildId]); ?>
        <div><span style="color:#c4a87c;">👥人数</span><br><?php echo $mc; ?>/<?php echo $myGuildMember['member_max']; ?></div>
        <div><span style="color:#c4a87c;">📋职位</span><br><span style="color:<?php echo $roleColors[$myGuildRole]; ?>;font-weight:bold;"><?php echo $roleNames[$myGuildRole]; ?></span></div>
        <div><span style="color:#c4a87c;">💰贡献</span><br><?php echo $myGuildMember['contribution']; ?></div>
    </div>
    <?php if($myGuildMember['notice']):?><div style="margin-top:4px;padding:4px;background:rgba(226,183,20,0.05);border-radius:4px;border-left:2px solid #e2b714;font-size:11px;color:#f5e6c8;">📢 <?php echo e($myGuildMember['notice']); ?></div><?php endif; ?>
</div>

<div class="tab-bar">
    <a href="/guild/index.php?tab=members" class="btn <?php echo $tab=='members'?'btn-primary':'btn-secondary'; ?>">👥成员</a>
    <a href="/guild/index.php?tab=list" class="btn <?php echo $tab=='list'?'btn-primary':'btn-secondary'; ?>">🏰列表</a>
</div>

<?php if ($tab == 'members'): ?>
<?php $members=db()->getAll("SELECT gm.*, u.username, u.sex, u.level, u.lastdate FROM `guild_member` gm JOIN `user` u ON gm.user_id = u.id WHERE gm.guild_id = ? ORDER BY gm.role DESC, u.level DESC",[$myGuildId]); ?>
<div class="card">
    <?php foreach ($members as $m): $mRole=(int)$m['role']; $isOnline=($m['lastdate']>time()-ONLINE_TIMEOUT); ?>
    <div class="compact-row">
        <div><span style="font-size:9px;color:<?php echo $isOnline?'#27ae60':'#8a7a5a'; ?>">●</span> <?php echo ($m['sex']==2)?'♀':'♂'; ?> <span style="color:<?php echo $roleColors[$mRole]; ?>;font-weight:<?php echo $mRole>=2?'bold':'normal'; ?>;"><?php echo e($m['username']); ?></span> <span class="text-muted">Lv.<?php echo $m['level']; ?>[<?php echo $roleNames[$mRole]; ?>]</span></div>
        <?php if($isLeader&&(int)$m['user_id']!==$role->id):?><a href="/guild/index.php?tab=members&kick=<?php echo $m['user_id']; ?>" class="btn btn-danger btn-small" style="font-size:10px;padding:1px 4px;" onclick="return confirm('踢出?');">踢</a><?php endif; ?>
    </div>
    <?php endforeach; ?>
</div>
<?php if ($isViceLeader): ?>
<div class="card" style="padding:4px 8px;">
    <div class="inline-form">
        <input type="text" name="notice" maxlength="200" placeholder="帮会公告..." form="noticeForm" style="flex:1;">
        <button type="submit" form="noticeForm" class="btn btn-primary btn-small">保存</button>
    </div>
</div>
<form id="noticeForm" method="POST" action="/guild/index.php?tab=members"><input type="hidden" name="edit_notice" value="1"></form>
<?php endif; ?>
<div style="display:flex;gap:4px;">
    <?php if(!$isLeader):?><a href="/guild/index.php?leave=1" class="btn btn-danger btn-small" onclick="return confirm('确定退出?');">🚪 退出</a><?php else:?>
    <?php if(isset($_GET['disband'])):?><a href="/guild/index.php?disband=1&confirm=1" class="btn btn-danger btn-small">⚠️ 确认解散</a><a href="/guild/index.php" class="btn btn-secondary btn-small">取消</a><?php else:?><a href="/guild/index.php?disband=1" class="btn btn-danger btn-small" onclick="return confirm('确定解散？不可恢复！');">⚠️ 解散</a><?php endif;?>
    <?php endif; ?>
</div>
<?php elseif ($tab == 'list'): ?>
<?php foreach ($guildList as $g): ?>
<div class="card" style="padding:4px 8px;<?php echo $g['id']==$myGuildId?'border-color:#e2b714;':''; ?>">
    <div class="compact-row">
        <span class="item-name" style="font-size:12px;"><?php echo $g['id']==$myGuildId?'⭐ ':''; ?><?php echo e($g['name']); ?></span>
        <span class="text-muted" style="font-size:11px;">Lv.<?php echo $g['level']; ?> · <?php echo $g['member_count']; ?>人</span>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>

<?php else: ?>
<div class="card" style="border-color:#e2b714;padding:4px 8px;">
    <div class="card-title">🏗️ 创建帮会</div>
    <div class="text-muted" style="font-size:11px;margin-bottom:4px;">等级≥5，花费5000铜币</div>
    <form method="POST" action="/guild/index.php">
        <input type="hidden" name="create_guild" value="1">
        <div class="inline-form"><input type="text" name="guild_name" maxlength="12" placeholder="帮会名称(2-12字)" required style="flex:1;"><button type="submit" class="btn btn-primary btn-small" <?php echo($role->level<5||$role->money<5000)?'disabled style="opacity:0.5;"':''; ?>>创建(5000铜)</button></div>
    </form>
</div>
<div class="card" style="padding:4px 8px;">
    <div class="card-title">🔍 加入帮会</div>
    <div class="inline-form"><input type="text" name="join_name" maxlength="12" placeholder="输入帮会名称" form="joinForm" required style="flex:1;"><button type="submit" form="joinForm" class="btn btn-success btn-small">申请</button></div>
</div>
<form id="joinForm" method="POST" action="/guild/index.php"><input type="hidden" name="join_guild" value="1"></form>
<?php endif; ?>
<?php renderFooter(); ?>
