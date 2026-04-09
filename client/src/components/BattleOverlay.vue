<template>
  <!-- 战斗进行中 -->
  <div class="battle-overlay" v-if="battle && !showResult" @click.self="preventClose">
    <div class="battle-block-bar battle-block-top">⚔️ 战斗中</div>
    <div class="battle-page-content">
      <div class="location-bar" style="margin-bottom:4px;">
        <div class="location-name">⚔️ 战斗中</div>
        <div class="location-path">第 {{ battle.round }} 回合{{ battle.pet_name ? ' · 🐾'+battle.pet_name+' 伴战' : '' }}</div>
      </div>
      <div class="card" :style="{borderColor:monsterHpPct<30?'#ff5544':'#e74c3c',padding:'4px 8px'}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="item-name" style="font-size:14px;">👾 {{ battle.monster_name }}</span>
          <span style="font-size:12px;">❤️ {{ Math.max(0,battle.monster_hp) }}/{{ battle.monster_hp_max }}</span>
        </div>
        <div class="status-bar bar-hp" :class="{'bar-low':monsterHpPct<30}" style="margin-top:3px;">
          <div class="bar-track"><div class="bar-fill" :style="{width:monsterHpPct+'%'}"></div></div>
        </div>
      </div>
      <div class="card" :style="{borderColor:playerHpPct<30?'#ff5544':'#3498db',padding:'4px 8px'}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;">{{ userStore.user?.sex===2?'♀':'♂' }} {{ userStore.username }}</span>
          <span style="font-size:12px;">❤️ {{ battle.player_hp }}/{{ battle.player_hp_max }}</span>
        </div>
        <div class="status-bar bar-hp" :class="{'bar-low':playerHpPct<30}" style="margin-top:3px;">
          <div class="bar-track"><div class="bar-fill" :style="{width:playerHpPct+'%'}"></div></div>
        </div>
      </div>
      <div class="card battle-log-card">
        <div class="card-title">📜 日志</div>
        <div class="battle-log" ref="logBox">
          <div v-for="(log,i) in displayLogs" :key="i" :class="'log-line log-'+log.type">{{ log.text }}</div>
        </div>
      </div>
    </div>
    <div class="battle-actions">
      <div class="action-row">
        <button class="btn btn-danger battle-action-btn" @click="doAction('attack')">⚔️ 攻击</button>
        <button class="btn btn-secondary battle-action-btn" @click="tryFlee">🏃 逃跑</button>
        <button v-if="battle.captureable" class="btn battle-action-btn" style="background:#f39c12;" @click="tryCapture">🦩 捕获 {{ currentCaptureRate }}%</button>
      </div>
      <div class="action-row shortcut-row">
        <template v-for="i in 3" :key="i">
          <button v-if="shortcuts[i-1]" class="btn btn-success shortcut-btn" @click="useShortcut(i)">
            <span class="sk-emoji">💊</span>
            <span class="sk-name">{{ shortcuts[i-1].name }}</span>
            <span class="sk-count">&times;{{ shortcuts[i-1].quantity }}</span>
          </button>
          <span v-else class="btn shortcut-empty">槽位{{ i }}</span>
        </template>
      </div>
    </div>
    <div class="battle-block-bar battle-block-bottom"></div>
  </div>

  <!-- 战斗结算页面 -->
  <div class="battle-overlay" v-if="battle && showResult" @click.self="preventClose">
    <div class="battle-block-bar battle-block-top">⚔️ 战斗结束</div>
    <div class="battle-result-page">
      <div class="location-bar">
        <div class="location-name">⚔️ 战斗结束</div>
        <div class="location-path">共 {{ battle.round }} 回合</div>
      </div>

      <!-- 胜利 -->
      <div v-if="battle.result === 'win'" class="card" style="border-color:#27ae60;">
        <div class="card-title" style="color:#27ae60;">🏆 胜利！</div>
        <p style="font-size:16px;">你成功击败了 <strong>{{ battle.monster_name }}</strong>！</p>
        <div class="divider"></div>
        <p>✨ 获得经验：<span class="text-gold">+{{ battle.exp_gained || 0 }}</span></p>
        <p>💰 获得铜币：<span class="text-gold">+{{ battle.money_gained || 0 }}</span></p>
      </div>

      <!-- 捕获成功 -->
      <div v-else-if="battle.result === 'capture'" class="card" style="border-color:#e2b714;">
        <div class="card-title" style="color:#e2b714;">🎉 捕获成功</div>
        <p style="font-size:16px;"><strong>{{ battle.monster_name }}</strong> 成为了你的伙伴！</p>
        <div class="divider"></div>
        <p>🐾 宠物等级：Lv.1</p>
      </div>

      <!-- 失败 -->
      <div v-else-if="battle.result === 'lose'" class="card" style="border-color:#e74c3c;">
        <div class="card-title" style="color:#e74c3c;">💀 战败</div>
        <p style="font-size:16px;">你被 <strong>{{ battle.monster_name }}</strong> 击败了……</p>
        <div class="divider"></div>
        <p>你被传送回了安全地点</p>
        <p>当前体力：<span class="text-red">{{ battle.player_hp || 0 }}/{{ battle.player_hp_max }}</span></p>
        <p v-if="battle.money_gained < 0">损失铜币：<span class="text-red">{{ Math.abs(battle.money_gained) }}</span></p>
      </div>

      <!-- 逃跑成功 -->
      <div v-else-if="battle.result === 'flee'" class="card" style="border-color:#f39c12;">
        <div class="card-title" style="color:#f39c12;">🏃 逃跑成功</div>
        <p style="font-size:16px;">你成功脱离了战斗！</p>
      </div>

      <!-- 战斗日志回顾 -->
      <div class="card">
        <div class="card-title">📜 战斗回顾</div>
        <div class="battle-log battle-log-full">
          <div v-for="(log,i) in battle.log" :key="i" :class="'log-line log-'+log.type">{{ log.text }}</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:11px;color:#8a7a5a;margin-bottom:8px;" v-if="autoRedirectCountdown > 0">
          {{ autoRedirectCountdown }}秒后自动返回地图…
        </div>
        <template v-if="battle.result === 'win'">
          <a href="javascript:void(0)" class="btn btn-danger" style="display:inline-block;padding:10px 28px;font-size:14px;border-radius:6px;text-decoration:none;color:#fff;" @click="continueBattle">⚔️ 继续战斗</a>
          <br>
        </template>
        <a href="javascript:void(0)" class="btn btn-secondary" style="display:inline-block;margin-top:8px;padding:10px 28px;font-size:14px;border-radius:6px;text-decoration:none;color:#f5e6c8;" @click="exitBattle">🗺️ 返回地图</a>
      </div>
    </div>
    <div class="battle-block-bar battle-block-bottom"></div>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { computed, ref, watch, nextTick, reactive, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { Api } from '../composables/useApi';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();
const logBox = ref(null);
const shortcuts = reactive([null, null, null]);
const petCount = ref(0);
const autoRedirectCountdown = ref(0);
let countdownTimer = null;

const battle = computed(() => gameStore.battleData);
const showResult = computed(() => battle.value?.finished === true && !!battle.value?.result);

const monsterHpPct = computed(() => {
  if (!battle.value) return 0;
  return Math.max(0, Math.round(Math.max(0, battle.value.monster_hp) / battle.value.monster_hp_max * 100));
});
const playerHpPct = computed(() => {
  if (!battle.value) return 0;
  return Math.max(0, Math.round(battle.value.player_hp / battle.value.player_hp_max * 100));
});
const displayLogs = computed(() => {
  if (!battle.value?.log) return [];
  return battle.value.log.slice(-20);
});
const currentCaptureRate = computed(() => {
  if (!battle.value?.captureable || !battle.value.monster_hp_max) return 0;
  const hpLoss = 1 - (Math.max(0, battle.value.monster_hp) / battle.value.monster_hp_max);
  return Math.min(99, Math.round((battle.value.capture_rate || 0) * (1 + hpLoss * 2)));
});

function preventClose() {}

watch(showResult, (val) => {
  if (val) {
    autoRedirectCountdown.value = 5;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      autoRedirectCountdown.value--;
      if (autoRedirectCountdown.value <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        exitBattle();
      }
    }, 1000);
  } else {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    autoRedirectCountdown.value = 0;
  }
});

onUnmounted(() => {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
});

async function continueBattle() {
  const mid = battle.value?.monster_id;
  gameStore.clearBattle();
  if (!mid) return;
  try {
    const data = await Api.post('/battle/start', { monster_id: mid });
    gameStore.setBattle(data);
  } catch (e) { await globalAlert(e.message) }
}

function exitBattle() {
  gameStore.clearBattle();
  router.push('/map');
}

async function loadShortcuts() {
  try {
    const d = await Api.get('/user/status');
    if (d.shortcuts) {
      for (let i = 0; i < 3; i++) shortcuts[i] = d.shortcuts[i] || null;
    }
  } catch(e) {}
}

watch(() => battle.value?.log?.length, async () => {
  await nextTick();
  if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
});

watch(battle, (val) => { if (val) { loadShortcuts(); loadPetCount(); } }, { immediate: true });

async function loadPetCount() {
  try { const d = await Api.get('/pet/info'); petCount.value = (d.pets||[]).length; } catch(e) {}
}

async function doAction(action) {
  try {
    const data = await Api.post('/battle/action', { action });
    gameStore.setBattle(data);
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    if (data.finished) loadShortcuts();
  } catch (e) { await globalAlert(e.message) }
}

async function useShortcut(slot) {
  try {
    const data = await Api.post('/battle/action', { action: 'use_shortcut', slot });
    gameStore.setBattle(data);
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    loadShortcuts();
  } catch (e) { await globalAlert(e.message) }
}

async function tryFlee() { if (await globalConfirm('\u786e\u5b9a\u9003\u8dd1\uff1f(50%\u6210\u529f\u7387)')) doAction('flee'); }
async function tryCapture() { if (await globalConfirm(`\u5c1d\u8bd5\u6355\u6349\uff1f(\u6210\u529f\u7387${currentCaptureRate.value}%)`)) doAction('capture'); }
</script>

<style>
.battle-overlay {
  max-width: 480px;
  margin: 0 auto;
  left: 0;
  right: 0;
  position: fixed;
  inset: 0;
  background: #0a0a1a;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  padding: 0;
  pointer-events: auto;
}
.battle-page-content { flex:1;display:flex;flex-direction:column;padding:4px 6px;gap:4px;min-height:0;overflow:hidden; }
.battle-result-page { flex:1;overflow-y:auto;padding:4px 6px 60px; }
.battle-log-card { flex:1;display:flex;flex-direction:column;min-height:0;padding:4px 6px !important; }
.battle-log { flex:1;min-height:0;overflow-y:auto;background:#0f0f2e;border:1px solid #2a2a4e;border-radius:4px;padding:4px 6px;font-size:11px;line-height:1.4; }
.battle-log-full { max-height:40vh;overflow-y:auto;background:#0f0f2e;border:1px solid #2a2a4e;border-radius:4px;padding:6px 8px;font-size:11px;line-height:1.4; }
.battle-actions { flex-shrink:0;padding:6px 6px; }
.action-row { display:flex;gap:4px;margin-bottom:4px; }
.action-row:last-child { margin-bottom:0; }
.battle-action-btn { flex:1;text-align:center;padding:10px 4px;font-size:13px;border-radius:6px;border:none;cursor:pointer; }
.shortcut-row .shortcut-btn, .shortcut-row .shortcut-empty { flex:1;text-align:center;padding:7px 2px;font-size:11px;border-radius:6px;display:flex;flex-direction:column;align-items:center;gap:1px; }
.shortcut-btn .sk-emoji { font-size:14px; }
.shortcut-btn .sk-name { font-size:10px;line-height:1.1; }
.shortcut-btn .sk-count { font-size:9px;color:#8a7a5a; }
.shortcut-empty { color:#555;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:default; }
.battle-block-bar { flex-shrink:0;text-align:center;font-size:11px;color:#8a7a5a;padding:2px 0; }
.text-gold { color:#e2b714; }
.text-red { color:#e74c3c; }
.divider { border:none;border-top:1px solid rgba(226,183,20,0.1);margin:8px 0; }
</style>
