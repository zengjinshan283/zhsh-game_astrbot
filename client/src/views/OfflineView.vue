<template>
  <div class="page-wrap offline-page">

  <div class="page-hud"><div class="page-hud-title">🌙 离线扫荡</div></div>    <div class="header">
      <h2>🌙 离线扫荡</h2>
      <p class="sub">离线也能积攒收益，VIP加成更高</p>
    </div>

    <!-- 离线状态卡 -->
    <div class="card status-card" :class="{ has: status && status.offlineSeconds > 60 }">
      <div class="card-title">
        <span>📦 离线收益</span>
        <span v-if="status && status.capped" class="badge warn">已达 12h 上限</span>
      </div>
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="!status" class="empty">数据加载失败</div>
      <div v-else-if="status.offlineSeconds < 60" class="empty">
        您当前在线，无离线收益可领
        <p class="sub-hint">退出游戏后再次登录即可领取</p>
      </div>
      <div v-else>
        <div class="row time-row">
          <span>离线时长</span>
          <strong>{{ status.offlineHours }} 小时</strong>
        </div>
        <div class="reward-grid">
          <div class="reward-cell">
            <div class="ico">💰</div>
            <div class="num">+{{ status.reward.money }}</div>
            <div class="lab">铜币</div>
          </div>
          <div class="reward-cell">
            <div class="ico">📘</div>
            <div class="num">+{{ status.reward.exp }}</div>
            <div class="lab">经验</div>
          </div>
          <div class="reward-cell">
            <div class="ico">🪙</div>
            <div class="num">+{{ status.reward.silver }}</div>
            <div class="lab">银币</div>
          </div>
        </div>
        <div class="vip-info" v-if="status.vipLevel > 0">
          ✨ VIP{{ status.vipLevel }} 收益加成 ×{{ status.reward.vipMult }}
        </div>
        <div class="vip-info no-vip" v-else>
          💡 开通 VIP 可享 1.1~1.3 倍收益加成
        </div>
        <button class="btn primary" :disabled="claiming" @click="claim">
          {{ claiming ? '领取中...' : '🎁 领取离线收益' }}
        </button>
      </div>
    </div>

    <!-- 扫荡模式 -->
    <div class="card">
      <div class="card-title">⚔️ 扫荡模式</div>
      <p class="sub">设置扫荡偏好，下次离线后生效</p>
      <div class="mode-grid">
        <div v-for="(m, key) in (status && status.modes) || {}" :key="key"
             class="mode-cell" :class="{ active: currentMode === key }"
             @click="setMode(key)">
          <div class="mode-name">{{ m.name }}</div>
          <div class="mode-label">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- 扫荡状态 -->
    <div class="card">
      <div class="card-title">
        <span>🌀 扫荡状态</span>
        <span v-if="status && status.sweeping" class="badge running">运行中</span>
        <span v-else class="badge">未启动</span>
      </div>
      <div v-if="status && status.sweeping">
        <div class="row">
          <span>当前模式</span>
          <strong>{{ (status.modes && status.modes[status.sweepMode] && status.modes[status.sweepMode].name) || status.sweepMode }}</strong>
        </div>
        <div class="row">
          <span>已扫荡</span>
          <strong>{{ Math.floor((status.sweepReward.seconds || 0) / 60) }} 分钟</strong>
        </div>
        <div class="reward-grid">
          <div class="reward-cell">
            <div class="ico">💰</div>
            <div class="num">+{{ status.sweepReward.money }}</div>
            <div class="lab">铜币</div>
          </div>
          <div class="reward-cell">
            <div class="ico">📘</div>
            <div class="num">+{{ status.sweepReward.exp }}</div>
            <div class="lab">经验</div>
          </div>
          <div class="reward-cell">
            <div class="ico">🪙</div>
            <div class="num">+{{ status.sweepReward.silver }}</div>
            <div class="lab">银币</div>
          </div>
        </div>
        <button class="btn danger" @click="stopSweep">⏸️ 停止扫荡</button>
      </div>
      <div v-else>
        <div class="empty">扫荡未启动</div>
        <button class="btn primary" @click="startSweep">▶️ 开启扫荡</button>
      </div>
    </div>

    <!-- 收益规则 -->
    <div class="card">
      <div class="card-title">📐 收益规则</div>
      <ul class="rule-list">
        <li>铜币：等级 × 60 / 小时</li>
        <li>经验：等级 × 40 / 小时</li>
        <li>银币：等级 × 5 / 小时</li>
        <li>📌 离线上限 12 小时（超出按 12h 计）</li>
        <li>📌 VIP 1/2/3 加成 ×1.1 / ×1.2 / ×1.3</li>
        <li>📌 每次离线只可领取一次</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../stores/user';
const auth = useUserStore();
const status = ref(null);
const toast = useToast();
const loading = ref(false);
const claiming = ref(false);
const currentMode = ref('balanced');

const headers = computed(() => ({ Authorization: `Bearer ${auth.token}` }));

async function load() {
  loading.value = true;
  try {
    const r = await fetch('/api/offline/status', { headers: headers.value });
    const j = await r.json();
    if (r.ok) {
      status.value = j;
      currentMode.value = j.sweepMode || 'balanced';
    }
  } catch (e) { console.error(e); }
  loading.value = false;
}

async function claim() {
  if (claiming.value) return;
  claiming.value = true;
  try {
    const r = await fetch('/api/offline/claim', { method: 'POST', headers: headers.value });
    const j = await r.json();
    if (r.ok && j.success) {
      toast.info(j.msg);
      await auth.fetchUser();
      await load();
    } else {
      toast.error(j.error || '领取失败');
    }
  } catch (e) { toast.error('网络错误'); }
  claiming.value = false;
}

async function setMode(m) {
  currentMode.value = m;
  try {
    const r = await fetch('/api/offline/start', {
      method: 'POST',
      headers: { ...headers.value, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: m })
    });
    const j = await r.json();
    if (r.ok) {
      toast.info(`扫荡模式已切换为：${m}`);
      await load();
    } else {
      toast.error(j.error || '设置失败');
    }
  } catch (e) { toast.error('网络错误'); }
}

async function startSweep() {
  await setMode(currentMode.value);
}

async function stopSweep() {
  try {
    const r = await fetch('/api/offline/stop', { method: 'POST', headers: headers.value });
    const j = await r.json();
    if (r.ok) { toast.info('扫荡已停止'); await load(); }
    else toast.info(j.error);
  } catch (e) { toast.error('网络错误'); }
}

onMounted(load);
</script>

<style scoped>
.offline-view { max-width: 720px; margin: 0 auto; padding: 16px; }
.header { text-align: center; margin-bottom: 18px; }
.header h2 { color: #ffd700; margin: 0; }
.header .sub { color: #999; margin: 4px 0 0; font-size: 13px; }
.card { background: rgba(20,20,30,0.6); border: 1px solid #333; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
.card-title { font-size: 16px; font-weight: bold; color: #d4af37; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.sub { color: #999; font-size: 12px; margin: 0 0 12px; }
.badge { background: #444; color: #ddd; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.badge.warn { background: #c0392b; }
.badge.running { background: #27ae60; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.empty { text-align: center; color: #888; padding: 20px; }
.sub-hint { font-size: 12px; color: #666; margin-top: 6px; }
.status-card.has { border-color: #d4af37; box-shadow: 0 0 12px rgba(212,175,55,0.2); }
.time-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #444; }
.row { display: flex; justify-content: space-between; padding: 6px 0; color: #ccc; }
.reward-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
.reward-cell { background: rgba(212,175,55,0.1); border: 1px solid #5a4a2a; border-radius: 8px; padding: 12px 4px; text-align: center; }
.reward-cell .ico { font-size: 24px; }
.reward-cell .num { font-size: 18px; font-weight: bold; color: #ffd700; margin: 4px 0; }
.reward-cell .lab { font-size: 11px; color: #aaa; }
.vip-info { background: rgba(155,89,182,0.15); padding: 8px; border-radius: 6px; text-align: center; font-size: 12px; color: #d4af37; margin-bottom: 12px; }
.vip-info.no-vip { background: rgba(255,255,255,0.05); color: #888; }
.btn { width: 100%; padding: 10px; border: none; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.btn.primary { background: linear-gradient(135deg, #d4af37, #b8941f); color: #1a1a1a; }
.btn.primary:hover { filter: brightness(1.1); }
.btn.primary:disabled { background: #555; color: #999; cursor: not-allowed; }
.btn.danger { background: #c0392b; color: #fff; }
.btn.danger:hover { background: #e74c3c; }
.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mode-cell { background: rgba(255,255,255,0.05); border: 2px solid #444; border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; }
.mode-cell:hover { border-color: #d4af37; }
.mode-cell.active { border-color: #d4af37; background: rgba(212,175,55,0.15); }
.mode-name { font-weight: bold; color: #ffd700; }
.mode-label { font-size: 11px; color: #999; margin-top: 4px; }
.rule-list { padding-left: 20px; color: #ccc; line-height: 1.8; font-size: 13px; }
</style>