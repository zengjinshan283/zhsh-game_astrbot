<template>
<div class="wb-page">
  <div class="wb-bg"></div>

  <div class="wb-header">
    <div class="wh-title">🌊 世界 BOSS</div>
    <div class="wh-meta">
      <span class="wh-participants">👥 {{ data?.total_participants || 0 }} 人参与</span>
    </div>
  </div>

  <div v-if="!data" class="wb-loading">🌊 远古海皇正在苏醒...</div>
  <div v-else class="wb-panel">
    <!-- BOSS 横幅 -->
    <div class="wb-banner">
      <div class="wb-icon">🌊</div>
      <div class="wb-info">
        <div class="wb-name">{{ data.boss.name }} <span class="wb-lv">Lv.{{ data.boss.level }}</span></div>
        <div class="wb-meta">每日重置 · 今日已打 {{ data.my.attack_count }} / {{ data.config.attack_limit }} 次</div>
      </div>
    </div>

    <!-- HP 血条 -->
    <div class="wb-hp">
      <div class="wh-label">
        <span>❤️ BOSS 血量</span>
        <span class="wh-pct">{{ data.boss.hp_pct }}%</span>
      </div>
      <div class="wh-bar"><div class="wh-fill" :style="{width: data.boss.hp_pct + '%'}"></div></div>
      <div class="wh-num">{{ data.boss.hp.toLocaleString() }} / {{ data.boss.hp_max.toLocaleString() }}</div>
    </div>

    <!-- 击败提示 -->
    <div v-if="data.boss.defeated" class="wb-killed">
      ✅ 已被 {{ data.boss.defeated_by }} 击杀！本轮结束，明日重置
    </div>

    <!-- 攻击按钮 -->
    <div v-else class="wb-action">
      <button class="wb-btn" :disabled="attacking || data.my.remaining <= 0" @click="attack">
        {{ attacking ? '⚔️ 出战中...' : (data.my.remaining <= 0 ? '今日次数已尽' : '⚔️ 攻击') }}
      </button>
      <button v-if="data.my.damage > 0 && !data.my.reward_claimed" class="wb-btn wb-btn-claim" @click="claim">
        🎁 领取奖励
      </button>
    </div>

    <div v-if="data.my.reward_claimed" class="wb-claimed">✅ 今日奖励已领取</div>

    <div v-if="lastAttack" class="wb-log" :class="lastAttack.crit ? 'log-crit' : 'log-hit'">
      {{ lastAttack.crit ? '💥 暴击！' : '⚔️' }} {{ lastAttack.damage.toLocaleString() }} 伤害
      <span class="log-meta">累计 {{ lastAttack.totalDamage.toLocaleString() }} · 剩 {{ lastAttack.remaining }} 次</span>
    </div>

    <!-- 全服 TOP 50 排行 -->
    <div class="wb-rank">
      <div class="wr-title">🏆 全服伤害榜 TOP50</div>
      <div v-if="!data.rank.length" class="wr-empty">暂无伤害记录</div>
      <div v-for="(r, i) in data.rank" :key="r.user_id" class="wr-row" :class="{me: r.user_id === me?.id}">
        <span class="wr-rank">{{ i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1) }}</span>
        <span class="wr-name">{{ r.username }}</span>
        <span class="wr-lv">Lv.{{ r.level }}</span>
        <span class="wr-dmg">{{ r.damage.toLocaleString() }}</span>
      </div>
    </div>
  </div>

  <!-- 浮动提示 -->
  <div v-if="msg" class="wb-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
    {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const me = userStore.user;

const data = ref(null);
const attacking = ref(false);
const lastAttack = ref(null);
const msg = ref('');
const msgType = ref('');
let pollTimer = null;

async function load() {
  try {
    const { Api } = await import('../composables/useApi');
    data.value = await Api.get('/worldboss/status');
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function attack() {
  if (attacking.value) return;
  attacking.value = true;
  try {
    const { Api } = await import('../composables/useApi');
    const d = await Api.post('/worldboss/attack');
    lastAttack.value = { damage: d.damage, totalDamage: d.totalDamage, remaining: d.remaining, crit: d.crit };
    msg.value = d.crit ? `💥 暴击！造成 ${d.damage.toLocaleString()} 伤害` : `⚔️ 造成 ${d.damage.toLocaleString()} 伤害`;
    msgType.value = 'success';
    await load();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  finally { attacking.value = false; }
}

async function claim() {
  try {
    const { Api } = await import('../composables/useApi');
    const d = await Api.post('/worldboss/claim');
    msg.value = d.msg;
    msgType.value = 'success';
    await load();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

onMounted(() => {
  load();
  // 每 10s 轮询（世界 BOSS 全服数据要新鲜）
  pollTimer = setInterval(load, 10000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.wb-page { position: relative; display: flex; flex-direction: column; min-height: 100vh; padding: 8px 10px; gap: 10px; }
.wb-bg { position: fixed; inset: 0; z-index: 0; background: linear-gradient(160deg, #0a1929 0%, #0d2a4a 50%, #0a1929 100%); pointer-events: none; }

.wb-header { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 12px; }
.wh-title { font-size: 16px; font-weight: 700; color: #5dade2; }
.wh-participants { font-size: 11px; color: rgba(255,255,255,0.6); }
.wb-loading { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); position: relative; z-index: 2; }
.wb-panel { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px; }

.wb-banner { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: linear-gradient(135deg, rgba(52,152,219,0.3), rgba(41,128,185,0.15)); border: 1px solid rgba(52,152,219,0.5); border-radius: 12px; }
.wb-icon { font-size: 56px; animation: wbPulse 2.5s ease-in-out infinite; }
@keyframes wbPulse { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.1) rotate(3deg); } }
.wb-info { flex: 1; }
.wb-name { font-size: 18px; font-weight: 700; color: #fff; }
.wb-lv { font-size: 11px; color: #f1c40f; font-weight: 400; margin-left: 6px; }
.wb-meta { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px; }

.wb-hp { padding: 14px 16px; background: rgba(0,0,0,0.4); border-radius: 12px; }
.wh-label { display: flex; justify-content: space-between; color: #fff; font-size: 13px; margin-bottom: 8px; font-weight: 600; }
.wh-pct { color: #5dade2; font-weight: 700; }
.wh-bar { height: 18px; background: rgba(0,0,0,0.6); border-radius: 9px; overflow: hidden; }
.wh-fill { height: 100%; background: linear-gradient(90deg, #1a4a6a, #3498db, #5dade2, #85c1e9); border-radius: 9px; transition: width 0.5s ease; box-shadow: 0 0 12px rgba(93,173,226,0.6); }
.wh-num { text-align: center; color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 6px; font-family: monospace; }

.wb-killed { padding: 12px; text-align: center; background: rgba(46,204,113,0.2); border: 1px solid rgba(46,204,113,0.4); border-radius: 10px; color: #2ecc71; font-weight: 700; }

.wb-action { display: flex; gap: 10px; }
.wb-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #2980b9, #3498db); color: #fff; border: 0; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(52,152,219,0.4); transition: transform 0.15s; }
.wb-btn:hover:not(:disabled) { transform: translateY(-2px); }
.wb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wb-btn-claim { background: linear-gradient(135deg, #f1c40f, #f39c12); box-shadow: 0 4px 12px rgba(241,196,15,0.4); }

.wb-claimed { padding: 10px 14px; text-align: center; background: rgba(46,204,113,0.15); border-radius: 8px; color: #2ecc71; font-size: 13px; }

.wb-log { padding: 10px 14px; background: rgba(0,0,0,0.4); border-radius: 8px; color: #fff; font-weight: 700; }
.log-hit { border-left: 3px solid #3498db; }
.log-crit { border-left: 3px solid #e74c3c; background: rgba(231,76,60,0.3); }
.log-meta { display: block; font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 400; margin-top: 4px; }

.wb-rank { padding: 12px 14px; background: rgba(0,0,0,0.3); border-radius: 12px; }
.wr-title { color: #5dade2; font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.wr-empty { color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; padding: 16px; }
.wr-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; font-size: 12px; }
.wr-row.me { background: rgba(93,173,226,0.15); }
.wr-row:nth-child(odd) { background: rgba(255,255,255,0.02); }
.wr-row.me { background: rgba(93,173,226,0.2); }
.wr-rank { font-size: 14px; width: 28px; text-align: center; flex-shrink: 0; }
.wr-name { flex: 1; color: #fff; font-weight: 600; }
.wr-lv { font-size: 9px; color: #7f8c8d; }
.wr-dmg { color: #5dade2; font-weight: 700; font-family: monospace; }

.wb-toast { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 8px; padding: 10px 16px; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
.toast-err { background: rgba(231,76,60,0.95); color: #fff; }
.toast-ok { background: rgba(46,204,113,0.95); color: #fff; }
</style>
