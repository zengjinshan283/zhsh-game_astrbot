<template>
<div class="page-wrap tr-page">

  <div class="page-hud"><div class="page-hud-title">💎 宝箱</div></div>  <!-- 顶部 HUD -->
  <div class="tr-hud">
    <div class="tr-title">🗺️ 藏宝图</div>
    <div class="tr-balance">
      <span class="tr-bal-item">💰 {{ formatMoney(userStore.money) }}</span>
      <span class="tr-bal-item">🪙 {{ userStore.user?.silver || 0 }}</span>
    </div>
  </div>

  <!-- 消息提示 -->
  <div v-if="error" class="tr-msg tr-err">❌ {{ error }}</div>
  <div v-if="success" class="tr-msg tr-ok">✅ {{ success }}</div>

  <!-- 标签：地点 / 我的宝图 / 碎片合成 -->
  <div class="tab-scroll">
    <button v-for="t in mainTabs" :key="t.key" class="tab-btn"
      :class="{active: activeTab === t.key}" @click="switchTab(t.key)">
      <span>{{ t.icon }}</span><span>{{ t.label }}</span>
    </button>
  </div>

  <!-- Tab1: 挖掘地点 -->
  <div v-if="activeTab === 'dig'" class="tr-content">
    <div v-if="!maps.length" class="tr-empty">背包中没有藏宝图</div>
    <div v-else>
      <div class="tr-section-title">📜 选择藏宝图</div>
      <div class="tr-map-list">
        <div v-for="m in maps" :key="m.id"
          class="tr-map-card" :class="{active: selectedItemId === m.id}"
          @click="selectedItemId = m.id">
          <div class="tmc-icon">{{ m.quality === 2 ? '🗺️' : '📜' }}</div>
          <div class="tmc-info">
            <div class="tmc-name" :class="'q' + m.quality">{{ m.name }}</div>
            <div class="tmc-meta">
              <span :class="'q-tag q' + m.quality">{{ qualityLabel(m.quality) }}</span>
              <span>×{{ m.quantity }}</span>
              <span>需要 Lv{{ m.level_req }}</span>
            </div>
            <div class="tmc-rate">成功率 {{ successRate(m.quality) }}%</div>
          </div>
        </div>
      </div>

      <div class="tr-section-title">📍 选择挖掘地点</div>
      <div v-if="loadingLocs" class="tr-loading">加载中...</div>
      <div v-else-if="!locations.length" class="tr-empty">当前等级没有可挖掘的地点</div>
      <div v-else class="tr-loc-list">
        <div v-for="loc in locations" :key="loc.id"
          class="tr-loc-card" :class="['q' + loc.quality, {selected: selectedLocId === loc.id}]"
          @click="selectedLocId = loc.id">
          <div class="tlc-name">📍 {{ loc.name }}</div>
          <div class="tlc-meta">
            <span>推荐 Lv{{ loc.min_level }} ~ Lv{{ loc.max_level }}</span>
            <span :class="'q-tag q' + loc.quality">{{ qualityLabel(loc.quality) }}</span>
          </div>
        </div>
      </div>

      <button class="tr-dig-btn" :disabled="!canDig || digging"
        @click="doDig">
        {{ digging ? '挖掘中...' : '⛏️ 开始挖掘' }}
      </button>
      <div class="tr-tip">提示：可选择藏宝图（指定品质奖励池）和挖掘地点。等级差越大成功率越低。</div>
    </div>
  </div>

  <!-- Tab2: 我的宝图库存 -->
  <div v-else-if="activeTab === 'inventory'" class="tr-content">
    <div v-if="!maps.length && !fragItems.length" class="tr-empty">背包中无藏宝图或碎片</div>
    <template v-else>
      <div v-if="maps.length" class="tr-section-title">📜 藏宝图</div>
      <div v-if="maps.length" class="tr-map-list">
        <div v-for="m in maps" :key="m.id" class="tr-map-card" :class="'q' + m.quality">
          <div class="tmc-icon">{{ m.quality === 2 ? '🗺️' : '📜' }}</div>
          <div class="tmc-info">
            <div class="tmc-name" :class="'q' + m.quality">{{ m.name }}</div>
            <div class="tmc-meta">
              <span :class="'q-tag q' + m.quality">{{ qualityLabel(m.quality) }}</span>
              <span>×{{ m.quantity }}</span>
            </div>
            <div class="tmc-rate">成功率 {{ successRate(m.quality) }}%</div>
          </div>
        </div>
      </div>

      <div v-if="fragItems.length" class="tr-section-title">🧩 藏宝图碎片 ({{ fragCount }}/3)</div>
      <div v-if="fragItems.length" class="tr-frag-list">
        <div v-for="f in fragItems" :key="f.inv_id" class="tr-frag-card">
          <div class="tfc-icon">🧩</div>
          <div class="tfc-name">{{ f.name }}</div>
          <div class="tfc-qty">×{{ f.quantity }}</div>
        </div>
      </div>

      <div v-if="fragCount >= 3" class="tr-assemble-bar">
        <div class="tab-msg">🗺️ 已收集 3 块碎片，可合成「古老的藏宝图」！</div>
        <button class="tr-assemble-btn" :disabled="assembling" @click="doAssemble">
          {{ assembling ? '合成中...' : '✨ 合成古老藏宝图' }}
        </button>
      </div>
    </template>
  </div>

  <!-- Tab3: 玩法说明 -->
  <div v-else-if="activeTab === 'help'" class="tr-content">
    <div class="tr-help">
      <div class="th-section">
        <div class="th-title">🗺️ 什么是藏宝图？</div>
        <div class="th-body">藏宝图是记载宝藏位置的古老地图，使用后可在野外对应地点进行挖掘，有几率获得铜币、银币、装备或货物。</div>
      </div>
      <div class="th-section">
        <div class="th-title">📜 藏宝图品质</div>
        <div class="th-row"><span class="q-tag q0">普通</span> 基础成功率 60%，奖励池最低</div>
        <div class="th-row"><span class="q-tag q1">精致</span> 基础成功率 50%，奖励池中等</div>
        <div class="th-row"><span class="q-tag q2">古老</span> 基础成功率 40%，奖励池最高</div>
      </div>
      <div class="th-section">
        <div class="th-title">⚙️ 成功率规则</div>
        <div class="th-body">每与推荐等级相差 5 级，成功率 -5%（最低 10%）。天赋「宝图」可提升基础成功率。</div>
      </div>
      <div class="th-section">
        <div class="th-title">🧩 碎片合成</div>
        <div class="th-body">收集 3 块「藏宝图碎片」(左/中/右)可合成为「古老的藏宝图」(Lv10)，奖励池覆盖银币与高级装备。</div>
      </div>
      <div class="th-section">
        <div class="th-title">💡 获取途径</div>
        <div class="th-body">· 商城（铜币/银币购买）<br/>· 航海随机事件<br/>· 副本 BOSS 掉落<br/>· 怪物掉落（monster_drop）<br/>· 日常活动奖励</div>
      </div>
    </div>
  </div>

  <!-- 挖掘动画全屏层 -->
  <transition name="dig-fade">
    <div v-if="digStage" class="dig-mask" @click.self="digStage === 'done' && (digStage = null)">
      <div class="dig-stage" :class="'dig-' + digStage">

        <!-- 阶段 1：挖地（⛏️ 抖动 + 灰尘粒子） -->
        <template v-if="digStage === 'digging'">
          <div class="dig-soil">
            <div class="dig-soil-dirt"></div>
            <div class="dig-soil-dig">.</div>
            <div class="dig-soil-dig">.</div>
            <div class="dig-soil-dig">.</div>
          </div>
          <div class="dig-pickaxe" :class="{shake: digStage === 'digging'}">⛏️</div>
          <div class="dig-dust" v-for="i in 6" :key="i" :style="{ '--i': i }">💨</div>
          <div class="dig-text">挖掘中...</div>
        </template>

        <!-- 阶段 2：揭示（成功/失败效果） -->
        <template v-else-if="digStage === 'reveal' || digStage === 'done'">
          <div class="dig-chest" :class="digResult?.success ? 'chest-open' : 'chest-fail'">
            {{ digResult?.success ? '🎁' : '📭' }}
          </div>
          <div class="dig-result-title" :class="digResult?.success ? 'rs-ok' : 'rs-fail'">
            {{ digResult?.success ? '挖掘成功！' : '挖掘失败' }}
          </div>
          <div v-if="digResult?.success && digResult.rewards?.length" class="dig-reward-list">
            <div v-for="(rw, i) in digResult.rewards" :key="i" class="dig-reward-item">
              <template v-if="rw.type === 'money'">💰 +{{ Number(rw.value).toLocaleString() }} 铜币</template>
              <template v-else-if="rw.type === 'silver'">🪙 +{{ rw.value }} 银币</template>
              <template v-else-if="rw.type === 'item'">🎁 {{ rw.name || '物品' }} ×{{ rw.value || 1 }}</template>
              <template v-else>{{ rw.type }} +{{ rw.value }}</template>
            </div>
          </div>
          <div v-if="digResult?.location" class="dig-loc">📍 {{ digResult.location }}</div>
          <div v-if="digStage === 'done'" class="dig-tip">点击任意处关闭</div>
        </template>

      </div>
    </div>
  </transition>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import { globalAlert } from '../composables/useConfirm';

const userStore = useUserStore();
const error = ref('');
const success = ref('');

const mainTabs = [
  { key: 'dig', icon: '⛏️', label: '挖掘' },
  { key: 'inventory', icon: '🎒', label: '我的宝图' },
  { key: 'help', icon: '❓', label: '玩法' }
];
const activeTab = ref('dig');

const maps = ref([]);     // 我的藏宝图
const fragItems = ref([]); // 我的碎片（带 inv_id/quantity）
const fragCount = computed(() => fragItems.value.reduce((s, f) => s + f.quantity, 0));
const locations = ref([]);
const loadingLocs = ref(false);
const selectedItemId = ref(null);
const selectedLocId = ref(null);
const digging = ref(false);
const assembling = ref(false);
// 挖掘动画状态
const digStage = ref(null); // null | 'digging' | 'reveal' | 'done'
const digResult = ref(null); // 后端返回的完整结果
const digElapsed = ref(0);   // 动画用计时

const canDig = computed(() => selectedItemId.value && selectedLocId.value);

function qualityLabel(q) { return ['', '普通', '精致', '古老'][q] || '普通'; }
function successRate(q) { return [0, 60, 50, 40][q] || 60; }
function formatMoney(n) { return Number(n || 0).toLocaleString(); }

function flashMsg(type, text, ms = 2500) {
  if (type === 'ok') { success.value = text; error.value = ''; }
  else { error.value = text; success.value = ''; }
  setTimeout(() => { success.value = ''; error.value = ''; }, ms);
}

async function loadInventory() {
  try {
    const inv = await Api.get('/user/inventory');
    const items = inv.items || [];
    maps.value = items.filter(i => i.subtype === 'treasure_map' || i.subtype === 'treasure_map_elite');
    fragItems.value = items.filter(i => i.subtype === 'treasure_fragment');
  } catch (e) { /* ignore */ }
}

async function loadFragments() {
  try {
    const r = await Api.get('/treasure/fragments');
    fragItems.value = r.items || [];
  } catch (e) { /* ignore */ }
}

async function loadLocations() {
  loadingLocs.value = true;
  try {
    const r = await Api.get('/treasure/locations');
    locations.value = r.locations || [];
  } catch (e) { flashMsg('err', e.message || '加载地点失败'); }
  finally { loadingLocs.value = false; }
}

async function doDig() {
  if (!canDig.value || digStage.value) return;
  error.value = ''; success.value = '';
  digResult.value = null;

  // 阶段 1：挖地（1.2s）
  digStage.value = 'digging';
  digElapsed.value = 0;
  const digTimer = setInterval(() => { digElapsed.value += 0.1; }, 100);

  // 阶段 2：发请求（在 600ms 后发，让玩家先看挖掘动作）
  await new Promise(r => setTimeout(r, 600));

  let result = null;
  try {
    result = await Api.post('/treasure/use', {
      item_id: selectedItemId.value,
      location_id: selectedLocId.value
    });
  } catch (e) {
    clearInterval(digTimer);
    digStage.value = null;
    flashMsg('err', e.message || '挖掘失败');
    return;
  }

  // 等挖掘动画满 1.2s
  await new Promise(r => setTimeout(r, 600));
  clearInterval(digTimer);

  // 阶段 3：揭示结果（1.5s）
  digStage.value = 'reveal';
  digResult.value = result;
  if (result.money !== undefined) userStore.updateUser({ money: result.money });
  if (result.silver !== undefined) userStore.updateUser({ silver: result.silver });

  await new Promise(r => setTimeout(r, 1500));

  // 阶段 4：完成，关闭动画层
  digStage.value = 'done';
  flashMsg('ok', result.msg || '挖掘完成');
  await loadInventory();
  if (!maps.value.find(m => m.id === selectedItemId.value)) selectedItemId.value = null;

  // 让 done 状态短暂保留让玩家看到 ✅，然后清掉
  setTimeout(() => { digStage.value = null; digResult.value = null; }, 800);
}

async function doAssemble() {
  if (fragCount.value < 3) return;
  assembling.value = true;
  try {
    const r = await Api.post('/treasure/assemble', {});
    flashMsg('ok', r.msg || '合成成功');
    await loadInventory();
    await loadFragments();
  } catch (e) { flashMsg('err', e.message || '合成失败'); }
  finally { assembling.value = false; }
}

function switchTab(k) {
  activeTab.value = k;
  error.value = ''; success.value = '';
  if (k === 'dig') {
    loadInventory();
    loadLocations();
  } else if (k === 'inventory') {
    loadInventory();
    loadFragments();
  }
}

onMounted(() => {
  loadInventory();
  loadFragments();
  loadLocations();
});
</script>

<style scoped>
.tr-page { min-height: 100vh; padding-bottom: 80px; position: relative; color: #e8e8e8; }
.tr-hud {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(201,167,88,0.2);
  position: sticky; top: 0; z-index: 10;
  backdrop-filter: blur(8px);
}
.tr-title { font-size: 18px; font-weight: 700; color: #c9a758; letter-spacing: 1px; }
.tr-balance { display: flex; gap: 12px; font-size: 13px; }
.tr-bal-item { color: #c9a758; font-weight: 600; }

.tr-msg {
  margin: 10px 16px; padding: 10px 12px; border-radius: 8px;
  font-size: 13px; line-height: 1.5;
}
.tr-err { background: rgba(220,80,80,0.15); color: #ffb4b4; border: 1px solid rgba(220,80,80,0.3); }
.tr-ok  { background: rgba(80,200,120,0.15); color: #a8e8c4; border: 1px solid rgba(80,200,120,0.3); }

.tab-scroll {
  display: flex; gap: 6px; padding: 8px 12px;
  overflow-x: auto; background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.tab-btn {
  flex: 1; min-width: 80px;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 8px 10px; border-radius: 8px; font-size: 12px;
  background: rgba(255,255,255,0.04); color: #9aa;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: rgba(201,167,88,0.15); color: #c9a758;
  border-color: rgba(201,167,88,0.4);
}
.tab-btn:active { transform: scale(0.96); }

.tr-content { padding: 12px 16px; }
.tr-empty, .tr-loading {
  text-align: center; padding: 60px 20px; color: #888; font-size: 14px;
}
.tr-section-title {
  font-size: 13px; color: #c9a758; font-weight: 700;
  margin: 14px 0 8px; letter-spacing: 0.5px;
}
.tr-section-title:first-child { margin-top: 0; }

/* 宝图卡片 */
.tr-map-list { display: flex; flex-direction: column; gap: 8px; }
.tr-map-card {
  display: flex; gap: 12px; padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; cursor: pointer; transition: all 0.2s;
}
.tr-map-card:hover { background: rgba(255,255,255,0.07); }
.tr-map-card.active { border-color: #c9a758; background: rgba(201,167,88,0.08); }
.tr-map-card.q2 { border-color: rgba(201,167,88,0.3); }
.tmc-icon { font-size: 28px; flex-shrink: 0; }
.tmc-info { flex: 1; min-width: 0; }
.tmc-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.tmc-name.q0 { color: #d8d8d8; }
.tmc-name.q1 { color: #6cd4ff; }
.tmc-name.q2 { color: #c9a758; }
.tmc-meta { display: flex; gap: 8px; font-size: 11px; color: #888; align-items: center; }
.tmc-rate { font-size: 11px; color: #c9a758; margin-top: 2px; }

/* 品质标签 */
.q-tag {
  display: inline-block; padding: 1px 6px; border-radius: 4px;
  font-size: 10px; font-weight: 700;
}
.q-tag.q0 { background: rgba(200,200,200,0.15); color: #d8d8d8; }
.q-tag.q1 { background: rgba(108,212,255,0.15); color: #6cd4ff; }
.q-tag.q2 { background: rgba(201,167,88,0.2); color: #c9a758; }

/* 地点卡片 */
.tr-loc-list { display: flex; flex-direction: column; gap: 6px; }
.tr-loc-card {
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;
}
.tr-loc-card:hover { background: rgba(255,255,255,0.07); }
.tr-loc-card.selected { background: rgba(201,167,88,0.1); border-color: #c9a758; }
.tr-loc-card.q1 { border-left: 3px solid #6cd4ff; }
.tr-loc-card.q2 { border-left: 3px solid #c9a758; background: rgba(201,167,88,0.05); }
.tlc-name { font-size: 14px; font-weight: 600; color: #e8e8e8; margin-bottom: 4px; }
.tlc-meta { display: flex; gap: 8px; font-size: 11px; color: #888; align-items: center; }

/* 按钮 */
.tr-dig-btn {
  display: block; width: 100%; margin-top: 16px;
  padding: 12px 0; border-radius: 10px;
  background: linear-gradient(180deg, #c9a758 0%, #a68537 100%);
  color: #1a1410; font-size: 15px; font-weight: 700;
  border: none; cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(201,167,88,0.3);
}
.tr-dig-btn:disabled { background: #555; color: #888; cursor: not-allowed; box-shadow: none; }
.tr-dig-btn:not(:disabled):active { transform: scale(0.98); }
.tr-tip { margin-top: 8px; font-size: 11px; color: #888; text-align: center; line-height: 1.5; }

/* 碎片 */
.tr-frag-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tr-frag-card {
  padding: 10px 6px; background: rgba(201,167,88,0.08);
  border: 1px solid rgba(201,167,88,0.25); border-radius: 8px;
  text-align: center;
}
.tfc-icon { font-size: 26px; margin-bottom: 4px; }
.tfc-name { font-size: 12px; color: #c9a758; font-weight: 600; }
.tfc-qty { font-size: 11px; color: #888; margin-top: 2px; }

.tr-assemble-bar { margin-top: 14px; text-align: center; }
.tab-msg { font-size: 13px; color: #c9a758; margin-bottom: 8px; }
.tr-assemble-btn {
  padding: 10px 24px; border-radius: 8px;
  background: linear-gradient(180deg, #c9a758 0%, #a68537 100%);
  color: #1a1410; font-size: 14px; font-weight: 700;
  border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(201,167,88,0.3);
}
.tr-assemble-btn:disabled { background: #555; color: #888; cursor: not-allowed; box-shadow: none; }

/* 玩法说明 */
.tr-help { display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }
.th-section {
  padding: 12px 14px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
}
.th-title { font-size: 14px; font-weight: 700; color: #c9a758; margin-bottom: 6px; }
.th-body { font-size: 12px; color: #ccc; line-height: 1.7; }
.th-row { font-size: 12px; color: #ccc; line-height: 1.8; display: flex; align-items: center; gap: 8px; }
.th-row .q-tag { flex-shrink: 0; }

/* ====== 挖掘动画层 ====== */
.dig-mask {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0, 0, 0, 0.78);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
}
.dig-stage {
  position: relative; width: 280px; height: 320px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px;
}

/* 阶段 1：挖地 */
.dig-soil {
  position: relative; width: 180px; height: 60px;
  background: linear-gradient(180deg, #6b4423 0%, #4a2e16 100%);
  border-radius: 50% 50% 30% 30% / 80% 80% 20% 20%;
  box-shadow: 0 6px 16px rgba(0,0,0,0.5), inset 0 -4px 8px rgba(0,0,0,0.3);
  overflow: visible;
}
.dig-soil-dirt {
  position: absolute; left: 0; right: 0; top: 0; height: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent);
  border-radius: 50%;
}
.dig-soil-dig {
  position: absolute; width: 4px; height: 4px;
  background: #2a1808; border-radius: 50%;
  top: 50%; left: 50%;
  animation: dig-clod 1.2s ease-out forwards;
  opacity: 0;
}
.dig-soil-dig:nth-child(2) { top: 30%; left: 30%; animation-delay: 0.2s; }
.dig-soil-dig:nth-child(3) { top: 30%; right: 30%; left: auto; animation-delay: 0.4s; }
.dig-soil-dig:nth-child(4) { top: 50%; left: 30%; animation-delay: 0.6s; }
@keyframes dig-clod {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--tx, 20px), var(--ty, -30px)) scale(1.2); }
}
.dig-soil-dig:nth-child(2) { --tx: -25px; --ty: -20px; }
.dig-soil-dig:nth-child(3) { --tx: 25px; --ty: -25px; }
.dig-soil-dig:nth-child(4) { --tx: -15px; --ty: -35px; }

.dig-pickaxe {
  position: absolute;
  top: 80px; left: 50%;
  font-size: 56px;
  transform-origin: 50% 90%;
  z-index: 2;
}
.dig-pickaxe.shake { animation: pickaxe-shake 0.25s ease-in-out infinite; }
@keyframes pickaxe-shake {
  0%, 100% { transform: translate(-50%, 0) rotate(-25deg); }
  50% { transform: translate(-50%, 8px) rotate(15deg); }
}

.dig-dust {
  position: absolute; top: 120px; left: 50%;
  font-size: 16px; opacity: 0;
  pointer-events: none;
  animation: dust-fly 1.2s ease-out infinite;
  animation-delay: calc(var(--i) * 0.15s);
}
@keyframes dust-fly {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
  30% { opacity: 0.8; }
  100% { opacity: 0; transform: translate(calc(-50% + (var(--i) - 3) * 18px), -40px) scale(1.2); }
}

.dig-text {
  margin-top: 80px;
  font-size: 15px; color: #c9a758; font-weight: 600;
  letter-spacing: 2px;
  animation: text-blink 0.8s ease-in-out infinite;
}
@keyframes text-blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 阶段 2：揭示 */
.dig-chest {
  font-size: 100px; line-height: 1;
  animation: chest-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  filter: drop-shadow(0 8px 24px rgba(201, 168, 76, 0.4));
}
.dig-chest.chest-fail {
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)) grayscale(0.3);
  animation: chest-shake 0.4s ease-in-out 2;
}
@keyframes chest-pop {
  0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(5deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes chest-shake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  25% { transform: translate(-6px, 0) rotate(-3deg); }
  75% { transform: translate(6px, 0) rotate(3deg); }
}

.dig-result-title {
  font-size: 20px; font-weight: 700; letter-spacing: 1px;
  animation: title-fadein 0.4s ease-out 0.3s both;
}
.dig-result-title.rs-ok { color: #f1c40f; text-shadow: 0 0 12px rgba(241,196,15,0.5); }
.dig-result-title.rs-fail { color: #95a5a6; }
@keyframes title-fadein {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

.dig-reward-list {
  display: flex; flex-direction: column; gap: 6px; align-items: center;
  animation: reward-slidein 0.5s ease-out 0.6s both;
}
.dig-reward-item {
  background: linear-gradient(135deg, rgba(201,168,76,0.2), rgba(241,196,15,0.1));
  border: 1px solid rgba(201,168,76,0.4);
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 14px; font-weight: 600; color: #f1c40f;
  min-width: 180px; text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
@keyframes reward-slidein {
  0% { opacity: 0; transform: translateY(20px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.dig-loc {
  font-size: 12px; color: #bdc3c7;
  animation: title-fadein 0.4s ease-out 0.8s both;
}
.dig-tip {
  position: absolute; bottom: 24px; left: 0; right: 0;
  text-align: center; font-size: 11px; color: #7f8c8d;
  animation: text-blink 1.2s ease-in-out infinite;
}

/* 遮罩淡入淡出 */
.dig-fade-enter-active, .dig-fade-leave-active { transition: opacity 0.3s; }
.dig-fade-enter-from, .dig-fade-leave-to { opacity: 0; }
</style>
