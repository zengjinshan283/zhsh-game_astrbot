<template>
<div class="page">
  <div class="location-bar">
    <div class="location-name">🎯 推广中心</div>
    <div class="location-path">邀请好友，共享福利</div>
  </div>

  <div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
    <p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msg }}</p>
  </div>

  <!-- 我的邀请码 -->
  <div class="card" style="border-color:#c9a758;">
    <div class="card-title">🔗 我的邀请码</div>
    <div style="text-align:center;padding:8px 0;">
      <div style="font-size:28px;font-weight:bold;color:#c9a758;letter-spacing:4px;">{{ userId }}</div>
      <div style="font-size:11px;color:#8b784e;margin-top:4px;">邀请码：复制发给好友</div>
      <button class="btn btn-primary" style="margin-top:8px;" @click="copyCode">📋 复制邀请码</button>
    </div>
  </div>

  <!-- 邀请统计 -->
  <div class="card">
    <div class="card-title">📊 邀请统计</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <div class="stat-box">
        <div style="font-size:20px;font-weight:bold;color:#c9a758;">{{ status.total_invited }}</div>
        <div style="font-size:11px;color:#8b784e;">已邀请人数</div>
      </div>
      <div class="stat-box">
        <div style="font-size:20px;font-weight:bold;color:#c9a758;">{{ status.total_earned_silver }}</div>
        <div style="font-size:11px;color:#8b784e;">累计获得银币</div>
      </div>
    </div>
  </div>

  <!-- 奖励规则 -->
  <div class="card">
    <div class="card-title">🎁 邀请奖励规则</div>
    <div v-for="r in status.rewards_config" :key="r.level" class="compact-row" style="border-bottom:1px solid #2a2a3a;">
      <span style="color:#cfc19e;font-size:12px;">{{ r.desc }}</span>
    </div>
    <div style="font-size:11px;color:#8b784e;margin-top:8px;padding:4px;background:rgba(196,168,124,0.05);border-radius:4px;">
      💡 好友注册时填入您的邀请码，好友升级时您自动获得奖励
    </div>
  </div>

  <!-- 邀请记录 -->
  <div class="card">
    <div class="card-title">👥 已邀请的好友</div>
    <div v-if="status.invited_list && status.invited_list.length">
      <div v-for="inv in status.invited_list" :key="inv.invited_id" class="compact-row" style="flex-direction:column;align-items:flex-start;gap:4px;">
        <div style="display:flex;justify-content:space-between;width:100%;">
          <span style="color:#cfc19e;font-size:13px;">{{ inv.username }}</span>
          <span style="color:#8b784e;font-size:11px;">Lv.{{ inv.invited_level }}</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <span
            v-for="rw in inv.rewards" :key="rw.level"
            :style="{
              fontSize:'10px',
              padding:'2px 6px',
              borderRadius:'4px',
              background: rw.claimed ? '#2e5a3b' : (rw.eligible ? '#c9a758' : '#333'),
              color: rw.claimed ? '#4caf50' : (rw.eligible ? '#1a1a2e' : '#555')
            }"
          >{{ rw.claimed ? '✓' : (rw.eligible ? '待领' : '未达') }} Lv.{{ rw.level }}</span>
        </div>
      </div>
    </div>
    <div v-else style="font-size:13px;color:#8b784e;text-align:center;padding:16px 0;">
      还没有邀请过好友，快去分享邀请码吧！
    </div>
  </div>

  <button @click="$router.back()" class="btn btn-secondary btn-block">返回</button>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const status = ref({ total_invited: 0, total_earned_silver: 0, rewards_config: [], invited_list: [] });
const msg = ref('');
const msgType = ref('info');
const userId = ref('');

async function load() {
  try {
    const d = await Api.get('/invite/status');
    status.value = d;
    // 我的邀请码就是用户ID
    const me = await Api.get('/auth/me')
    userId.value = me.user?.id || '';
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

function showMsg(txt, type = 'info') {
  msg.value = txt;
  msgType.value = type;
  setTimeout(() => { msg.value = ''; }, 3000);
}

function copyCode() {
  navigator.clipboard.writeText(String(userId.value)).then(() => {
    showMsg('邀请码已复制！', 'success');
  }).catch(() => {
    showMsg('复制失败，请手动复制', 'error');
  });
}

onMounted(load);
</script>

<style scoped>
.stat-box {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #333;
}
</style>