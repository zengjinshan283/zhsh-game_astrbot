<template>
  <div class="page-wrap invite-page">

  <div class="page-hud"><div class="page-hud-title">📨 邀请</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-icon">🎯</div>
      <div class="hud-info">
        <div class="hud-title">推广中心</div>
        <div class="hud-sub">邀请好友，共享福利</div>
      </div>
    </div>

    <!-- 结果提示 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">
      {{ msg }}
    </div>

    <!-- 邀请码卡片 -->
    <div class="code-card">
      <div class="cc-header">🔗 我的邀请码</div>
      <div class="cc-body">
        <div class="cc-code">{{ userId }}</div>
        <div class="cc-hint">复制发给好友，好友注册时填写</div>
        <button class="cc-btn" @click="copyCode">📋 复制邀请码</button>
      </div>
    </div>

    <!-- 邀请统计 -->
    <div class="stat-card">
      <div class="sc-header">📊 邀请统计</div>
      <div class="sc-grid">
        <div class="sc-item">
          <div class="sc-val">{{ status.total_invited }}</div>
          <div class="sc-label">已邀请人数</div>
        </div>
        <div class="sc-divider"></div>
        <div class="sc-item">
          <div class="sc-val">💰 {{ status.total_earned_silver }}</div>
          <div class="sc-label">累计获得银币</div>
        </div>
      </div>
    </div>

    <!-- 奖励规则 -->
    <div class="rule-card">
      <div class="rc-header">🎁 邀请奖励规则</div>
      <div class="rc-list">
        <div v-for="r in status.rewards_config" :key="r.level" class="rc-row">
          <span class="rc-desc">{{ r.desc }}</span>
        </div>
      </div>
      <div class="rc-tip">💡 好友注册时填入您的邀请码，好友升级时您自动获得奖励</div>
    </div>

    <!-- 邀请记录 -->
    <div class="friend-card">
      <div class="fc-header">👥 已邀请的好友</div>
      <div v-if="status.invited_list && status.invited_list.length" class="fc-list">
        <div v-for="inv in status.invited_list" :key="inv.invited_id" class="fc-row">
          <div class="fc-info">
            <span class="fc-name">{{ inv.username }}</span>
            <span class="fc-lv">Lv.{{ inv.invited_level }}</span>
          </div>
          <div class="fc-rewards">
            <span
              v-for="rw in inv.rewards"
              :key="rw.level"
              class="rw-badge"
              :class="{
                'rw-claimed': rw.claimed,
                'rw-eligible': rw.eligible && !rw.claimed,
                'rw-locked': !rw.eligible
              }"
            >
              {{ rw.claimed ? '✓' : (rw.eligible ? '待领' : '未达') }} Lv.{{ rw.level }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="fc-empty">
        <div class="fc-empty-icon">🤝</div>
        <div class="fc-empty-text">还没有邀请过好友，快去分享邀请码吧！</div>
      </div>
    </div>

    <button @click="$router.back()" class="back-btn">← 返回</button>
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
    const me = await Api.get('/auth/me');
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
.invite-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.hud-icon { font-size: 24px; }
.hud-info { display: flex; flex-direction: column; gap: 2px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-sub { font-size: 11px; color: #7f8c8d; }

.msg-card {
  position: relative;
  z-index: 2;
  background: rgba(39, 174, 96, 0.08);
  border: 1px solid rgba(39, 174, 96, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #27ae60;
  text-align: center;
}
.msg-card.error {
  background: rgba(184, 90, 58, 0.08);
  border-color: rgba(184, 90, 58, 0.3);
  color: #e74c3c;
}

.code-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(201, 165, 88, 0.3);
  border-radius: 14px;
  overflow: hidden;
}
.cc-header {
  background: rgba(201, 165, 88, 0.1);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #c9a758;
  border-bottom: 1px solid rgba(201, 165, 88, 0.15);
}
.cc-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cc-code {
  font-size: 28px;
  font-weight: 800;
  color: #c9a758;
  letter-spacing: 4px;
}
.cc-hint { font-size: 11px; color: #7f8c8d; }
.cc-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.cc-btn:hover { opacity: 0.9; }

.stat-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}
.sc-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #bdc3c7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.sc-grid {
  display: flex;
  align-items: center;
  padding: 14px;
  gap: 0;
}
.sc-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.sc-val { font-size: 22px; font-weight: 800; color: #c9a758; }
.sc-label { font-size: 11px; color: #7f8c8d; }
.sc-divider { width: 1px; height: 36px; background: rgba(255, 255, 255, 0.08); }

.rule-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}
.rc-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #bdc3c7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.rc-list { padding: 4px 0; }
.rc-row {
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.rc-desc { font-size: 12px; color: #cfc19e; }
.rc-tip {
  margin: 8px 12px 12px;
  padding: 8px;
  font-size: 10px;
  color: #7f8c8d;
  background: rgba(201, 165, 88, 0.05);
  border-radius: 6px;
}

.friend-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}
.fc-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #bdc3c7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.fc-list { padding: 4px 0; }
.fc-row {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.fc-info { display: flex; align-items: center; gap: 6px; }
.fc-name { font-size: 13px; color: #cfc19e; font-weight: 600; }
.fc-lv { font-size: 10px; color: #7f8c8d; }
.fc-rewards { display: flex; gap: 4px; flex-wrap: wrap; }
.rw-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.rw-claimed { background: rgba(39, 174, 96, 0.2); color: #27ae60; }
.rw-eligible { background: rgba(201, 165, 88, 0.2); color: #c9a758; }
.rw-locked { background: rgba(255, 255, 255, 0.05); color: #555; }

.fc-empty {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.fc-empty-icon { font-size: 32px; }
.fc-empty-text { font-size: 12px; color: #7f8c8d; text-align: center; }

.back-btn {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>