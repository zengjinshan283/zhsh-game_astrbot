<template>
<div class="status-page">
  <div class="status-bg"></div>

  <!-- 角色顶栏 -->
  <div class="char-hud">
    <div class="ch-avatar">⚓</div>
    <div class="ch-info">
      <div class="ch-name">{{ data.user?.sex === 2 ? '♀' : '♂' }} {{ data.user?.username }}</div>
      <div class="ch-sub">Lv.{{ data.user?.level }} · {{ data.user?.sex === 2 ? '女' : '男' }}{{ data.pet ? ' · 🐾' + data.pet.nickname : '' }}</div>
    </div>
    <div class="ch-stats-mini">
      <div class="csm-item">
        <span>⚔️</span><span>{{ data.battleCount }}</span>
      </div>
      <div class="csm-item csm-win">
        <span>🏆</span><span>{{ data.winCount }}</span>
      </div>
    </div>
  </div>

  <!-- HP/EXP 条 -->
  <div class="bars-card">
    <div class="bar-row" :class="{'bar-low': hpPct < 30}">
      <div class="br-header">
        <span class="br-label">❤️ HP</span>
        <span class="br-val">{{ data.user?.hp }}/{{ data.user?.hp_max }}</span>
      </div>
      <div class="br-track">
        <div class="br-fill hp-fill" :style="{width: hpPct+'%'}"></div>
      </div>
    </div>
    <div class="bar-row">
      <div class="br-header">
        <span class="br-label">✨ EXP</span>
        <span class="br-val">{{ data.user?.exp }}/{{ data.user?.exp_max }}</span>
      </div>
      <div class="br-track">
        <div class="br-fill exp-fill" :style="{width: expPct+'%'}"></div>
      </div>
    </div>
  </div>

  <!-- 状态效果 -->
  <div class="status-effects" v-if="activeStatuses.length">
    <div class="se-title">💫 当前状态</div>
    <div class="se-list">
      <div v-for="s in activeStatuses" :key="s.id" class="se-item" :class="s.type === 2 ? 'se-debuff' : 'se-buff'">
        <div class="sei-icon">{{ s.icon }}</div>
        <div class="sei-body">
          <div class="sei-name">{{ s.name }}</div>
          <div class="sei-time">
            <span :class="s.type === 2 ? 'tag-debuff' : 'tag-buff'">{{ s.type === 2 ? '负面' : '增益' }}</span>
            <span v-if="s.end_time" class="sei-countdown"> · {{ fmtTime(s) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 属性面板 -->
  <div class="attr-card">
    <div class="ac-title">📊 属性</div>
    <div class="ac-grid">
      <div class="ac-item"><span class="aci-l">⚔️ 攻击</span><span class="aci-v">{{ data.stats?.atk_min }}-{{ data.stats?.atk_max }}<span v-if="data.stats?.bonusAtk>0" class="aci-bonus">+{{ data.stats.bonusAtk }}</span></span></div>
      <div class="ac-item"><span class="aci-l">🛡️ 防御</span><span class="aci-v">{{ data.stats?.def }}<span v-if="data.stats?.bonusDef>0" class="aci-bonus">+{{ data.stats.bonusDef }}</span></span></div>
      <div class="ac-item"><span class="aci-l">❤️ 生命</span><span class="aci-v">{{ data.stats?.hp_max }}<span v-if="data.stats?.bonusHp>0" class="aci-bonus">+{{ data.stats.bonusHp }}</span></span></div>
      <div class="ac-item"><span class="aci-l">💨 敏捷</span><span class="aci-v">{{ data.user?.agility }}</span></div>
      <div class="ac-item"><span class="aci-l">💰 铜币</span><span class="aci-v text-gold">{{ formatMoney(data.user?.money) }}</span></div>
      <div class="ac-item"><span class="aci-l">🏦 存款</span><span class="aci-v" style="color:#2ecc71">{{ formatMoney(data.user?.bank_money) }}</span></div>
    </div>
  </div>

  <!-- 已装备 -->
  <div class="equips-card" v-if="data.equips?.length">
    <div class="ec-title">⚔️ 已装备</div>
    <div v-for="eq in data.equips" :key="eq.inv_id" class="eq-row">
      <span class="eqr-name">{{ eq.name }}<span v-if="eq.enhance_level > 0" style="color:#f1c40f">+{{ eq.enhance_level }}</span><span v-if="eq.set_name" style="color:#8b6914;font-size:10px;margin-left:4px;">[{{ eq.set_name }}]</span></span>
      <span class="eqr-stat">{{ eq.atk > 0 ? '⚔️' + Math.round(eq.atk * (1 + eq.enhance_level * 0.03)) : '' }}{{ eq.def_val > 0 ? ' 🛡️' + Math.round(eq.def_val * (1 + eq.enhance_level * 0.03)) : '' }}</span>
    </div>
    <div v-if="data.activeSets?.length" class="eq-sets">
      <div v-for="s in data.activeSets" :key="s.name" class="eq-set-item" @click="$router.push('/equipment')">
        ✨ {{ s.name }} {{ s.count }}件 → {{ s.bonus.description }}
      </div>
    </div>
  </div>

  <!-- 战斗快捷栏 -->
  <div class="shortcut-card">
    <div class="sc-title">⚡ 快捷栏</div>
    <div class="sc-slots">
      <template v-for="i in 3" :key="i">
        <router-link v-if="shortcuts[i-1]" :to="{}" @click.prevent="clearSlot(i)" class="sc-slot sc-filled">
          <div class="scs-icon">💊</div>
          <div class="scs-name">{{ shortcuts[i-1].name }}</div>
          <div class="scs-qty">×{{ shortcuts[i-1].quantity }}</div>
        </router-link>
        <div v-else class="sc-slot sc-empty" @click="openSlotPicker(i)">
          <div class="scs-icon">＋</div>
          <div class="scs-name">槽{{ i }}</div>
        </div>
      </template>
    </div>
  </div>

  <!-- Slot picker -->
  <Teleport to="body">
    <div v-if="showPicker" class="picker-overlay" @click.self="showPicker = false">
      <div class="picker-sheet">
        <div class="ps-handle"></div>
        <div class="ps-title">选择消耗品 — 槽位{{ pickerSlot }}</div>
        <div class="ps-list">
          <div v-for="c in consumables" :key="c.inv_id" class="ps-item" @click="setSlot(pickerSlot, c.inv_id)">
            <div class="psi-icon">💊</div>
            <div class="psi-info">
              <div class="psi-name">{{ c.name }}</div>
              <div class="psi-qty">×{{ c.quantity }}</div>
            </div>
          </div>
          <div v-if="!consumables.length" class="ps-empty">背包中没有可用的消耗品</div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 底部信息 -->
  <div class="info-strip">
    <span>🎒 {{ data.invCount }}种物品</span>
    <span>📍 {{ data.place?.name || '未知' }}</span>
    <span class="text-gold">距升级 {{ (data.user?.exp_max || 0) - (data.user?.exp || 0) }} exp</span>
  </div>

  <!-- 导航 -->
  <div class="status-nav">
    <router-link to="/inventory" class="sn-btn">🎒 背包</router-link>
    <router-link to="/equipment" class="sn-btn">⚔️ 装备</router-link>
    <router-link to="/talent" class="sn-btn">⚡ 天赋</router-link>
    <router-link to="/arena" class="sn-btn">🏟️ 竞技</router-link>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';

const data = ref({user:{}, stats:{}, equips:[], battleCount:0, winCount:0, pet:null, invCount:0, shortcuts:[], consumables:[], place:{}, statuses:[]});
const activeStatuses = computed(() => (data.value.statuses||[]).filter(s => s.type === 1 || s.type === 2));
const shortcuts = ref([]);
const consumables = ref([]);
const showPicker = ref(false);
const pickerSlot = ref(1);
const timer = ref(null);
const now = ref(Date.now());

const hpPct = computed(() => data.value.user?.hp_max > 0 ? Math.round(data.value.user.hp / data.value.user.hp_max * 100) : 0);
const expPct = computed(() => data.value.user?.exp_max > 0 ? Math.round(data.value.user.exp / data.value.user.exp_max * 100) : 0);

function formatMoney(n) { if (!n) return '0'; if (n >= 100000000) return (n/100000000).toFixed(1)+'亿'; if (n >= 10000) return (n/10000).toFixed(1)+'万'; return n.toLocaleString(); }
function fmtTime(s) {
  if (!s.end_time) return '';
  const sec = Math.max(0, Math.floor((new Date(s.end_time) - now.value) / 1000));
  if (sec === 0) return '已结束';
  const m = Math.floor(sec/60); const h = Math.floor(m/60);
  if (h > 0) return `${h}时${m%60}分`;
  if (m > 0) return `${m}分`;
  return `${sec}秒`;
}

async function load() {
  try {
    const d = await Api.get('/user/status');
    data.value = d;
    shortcuts.value = d.shortcuts || [];
    consumables.value = d.consumables || [];
  } catch (e) {}
}

function openSlotPicker(i) { pickerSlot.value = i; showPicker.value = true; }
async function setSlot(slot, invId) { try { await Api.post('/user/shortcut', {slot, inv_id: invId}); showPicker.value = false; await load(); } catch (e) {} }
async function clearSlot(slot) { try { await Api.post('/user/shortcut', {slot, inv_id: 0}); await load(); } catch (e) {} }

onMounted(() => { load(); timer.value = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { if (timer.value) clearInterval(timer.value); });
</script>

<style scoped>
.status-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.status-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0d1a0d 50%, #0d1117 100%);
  pointer-events: none;
}

/* 角色 HUD */
.char-hud {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 12px;
}
.ch-avatar {
  width: 46px; height: 46px; border-radius: 14px;
  background: linear-gradient(135deg, #1a3a2a, #0d2a1a);
  border: 2px solid rgba(39,174,96,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.ch-info { flex: 1; }
.ch-name { font-size: 15px; font-weight: 700; color: #f0f0f0; }
.ch-sub { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.ch-stats-mini { display: flex; gap: 8px; }
.csm-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: #7f8c8d; }
.csm-win { color: #f1c40f; }

/* HP/EXP 条 */
.bars-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.bar-row {}
.br-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.br-label { font-size: 11px; color: #7f8c8d; }
.br-val { font-size: 11px; color: #bdc3c7; font-weight: 600; }
.br-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.br-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.hp-fill { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.exp-fill { background: linear-gradient(90deg, #1a7a3a, #27ae60); }
.bar-low .hp-fill { animation: pulse-hp 1.5s ease-in-out infinite; }
@keyframes pulse-hp { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

/* 状态效果 */
.status-effects {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.se-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.se-list { display: flex; flex-wrap: wrap; gap: 6px; }
.se-item {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px; border-radius: 8px;
}
.se-buff { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.25); }
.se-debuff { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.25); }
.sei-icon { font-size: 16px; }
.sei-body {}
.sei-name { font-size: 11px; font-weight: 600; color: #f0f0f0; }
.sei-time { font-size: 9px; color: #7f8c8d; display: flex; gap: 3px; align-items: center; }
.tag-buff { background: rgba(39,174,96,0.15); color: #2ecc71; padding: 1px 4px; border-radius: 3px; }
.tag-debuff { background: rgba(231,76,60,0.15); color: #e74c3c; padding: 1px 4px; border-radius: 3px; }
.sei-countdown {}

/* 属性面板 */
.attr-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.ac-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.ac-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
.ac-item { display: flex; justify-content: space-between; align-items: center; }
.aci-l { font-size: 11px; color: #7f8c8d; }
.aci-v { font-size: 12px; font-weight: 600; color: #f0f0f0; }
.aci-bonus { font-size: 10px; color: #2ecc71; margin-left: 3px; }

/* 已装备 */
.equips-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.ec-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.eq-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.eq-row:last-of-type { border-bottom: none; }
.eqr-name { font-size: 12px; color: #f0f0f0; }
.eqr-stat { font-size: 11px; color: #95a5a6; }
.eq-sets { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
.eq-set-item { font-size: 11px; color: #f1c40f; cursor: pointer; padding: 3px 0; }

/* 快捷栏 */
.shortcut-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.sc-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.sc-slots { display: flex; gap: 8px; justify-content: center; }
.sc-slot {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 60px; padding: 8px 4px;
  border-radius: 10px; text-decoration: none;
  transition: all 0.2s;
}
.sc-filled {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #f0f0f0;
}
.sc-empty {
  background: rgba(255,255,255,0.03);
  border: 1px dashed rgba(255,255,255,0.12);
  color: #555; cursor: pointer;
}
.sc-slot:hover { transform: scale(1.05); }
.scs-icon { font-size: 18px; }
.scs-name { font-size: 9px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 54px; }
.scs-qty { font-size: 9px; color: #7f8c8d; }

/* Slot Picker */
.picker-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: flex-end; justify-content: center;
}
.picker-sheet {
  width: 100%; max-width: 480px;
  background: rgba(13,17,23,0.98); border-radius: 16px 16px 0 0;
  overflow-y: auto;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.ps-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 10px auto 4px; }
.ps-title { font-size: 13px; color: #bdc3c7; text-align: center; padding: 4px 0 10px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ps-list { padding: 8px; }
.ps-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 5px; cursor: pointer; transition: all 0.2s;
}
.ps-item:hover { background: rgba(255,255,255,0.08); }
.psi-icon { font-size: 20px; }
.psi-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.psi-name { font-size: 13px; color: #f0f0f0; }
.psi-qty { font-size: 11px; color: #7f8c8d; }
.ps-empty { text-align: center; font-size: 12px; color: #555; padding: 24px 0; }

/* 信息条 */
.info-strip {
  position: relative; z-index: 2;
  display: flex; gap: 12px; justify-content: center;
  font-size: 11px; color: #7f8c8d;
  flex-wrap: wrap;
}

/* 导航 */
.status-nav {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
}
.sn-btn {
  text-align: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #95a5a6; padding: 8px 4px; border-radius: 8px;
  font-size: 11px; text-decoration: none; transition: all 0.2s;
}
.sn-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>