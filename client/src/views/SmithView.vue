<template>
  <div class="smith-page">
    <div class="smith-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🔨</div>
        <div class="hud-title">铁匠铺</div>
      </div>
      <div class="hud-money">💰 {{ formatMoney(userStore.money) }}</div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'enhance' }" @click="tab = 'enhance'">⚒️ 强化</button>
      <button class="tab-btn" :class="{ active: tab === 'identify' }" @click="tab = 'identify'">🔍 鉴定</button>
      <button class="tab-btn" :class="{ active: tab === 'repair' }" @click="loadRepairItems">🔧 修理</button>
      <button class="tab-btn" :class="{ active: tab === 'refine' }" @click="tab = 'refine'">🔮 精炼</button>
    </div>

    <!-- ── 强化 ── -->
    <div v-if="tab === 'enhance'">
      <div class="rule-card">
        <div class="rule-grid">
          <div class="rule-item"><span class="rule-label">+1~5</span><span class="rule-rate rate-high">90%</span></div>
          <div class="rule-item"><span class="rule-label">+6~8</span><span class="rule-rate rate-mid">70%</span></div>
          <div class="rule-item"><span class="rule-label">+9~10</span><span class="rule-rate rate-low">30%</span></div>
        </div>
        <div class="rule-note">⚠️ +7以上失败会降级 · 💰费用=(等级+1)×200</div>
      </div>
    </div>

    <!-- ── 鉴定 ── -->
    <div v-if="tab === 'identify'">
      <div class="rule-card">
        <div class="rule-row">
          <span class="ri-label">🔍 鉴定费用</span>
          <span class="ri-val">500 + Lv×100 铜币</span>
        </div>
        <div class="rule-row">
          <span class="ri-label">📦 词缀数量</span>
          <span class="ri-val">白/绿装=1条 · 蓝装=2条 · 紫/橙装=3条</span>
        </div>
        <div class="rule-note">💡 鉴定后词缀随机（atk/def/hp/agility/crit/mp）</div>
      </div>
    </div>

    <!-- ── 修理 ── -->
    <div v-if="tab === 'repair'">
      <div class="rule-card">
        <div class="rule-row">
          <span class="ri-label">🔧 修理费用</span>
          <span class="ri-val">每1点耐久 = 购入价×10% 铜币</span>
        </div>
        <div class="rule-note">⚠️ 仅武器/防具可修理</div>
      </div>
    </div>

    <!-- 结果提示 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">{{ msg }}</div>

    <!-- 强化列表 -->
    <div v-if="tab === 'enhance'">
      <div class="empty-card" v-if="!items.length">
        <div class="empty-icon">🗡️</div><div class="empty-text">背包中没有可强化的装备</div>
      </div>
      <div class="equip-list">
        <div v-for="item in items" :key="item.inv_id" class="equip-card" :style="{ borderColor: getEnhColor(item.enhance_level) }">
          <div class="ec-top">
            <div class="ec-icon">{{ item.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
            <div class="ec-info">
              <div class="ec-name">
                {{ item.name }}<span class="ec-enh" v-if="item.enhance_level > 0" :style="{ color: getEnhColor(item.enhance_level) }">+{{ item.enhance_level }}</span>
              </div>
              <div class="ec-stats">
                <span class="ec-atk" v-if="item.atk">⚔️ {{ item.atk }} → {{ calcStat(item.atk, item.enhance_level) }}</span>
                <span class="ec-def" v-if="item.def_val">🛡️ {{ item.def_val }} → {{ calcStat(item.def_val, item.enhance_level) }}</span>
              </div>
              <!-- 词缀显示 -->
              <div v-if="item.identify_affixes" class="ec-affixes">
                <span v-for="(a, i) in JSON.parse(item.identify_affixes)" :key="i" class="affix-tag" :class="'rarity-' + getAffixRarity(a)">{{ a.name }} {{ a.stat_key }}+{{ a.value }}</span>
              </div>
            </div>
          </div>
          <div class="ec-bottom" v-if="item.enhance_level < 10">
            <div class="ec-cost">
              <span class="cost-coin">💰 {{ getCost(item.enhance_level) }}</span>
              <span class="cost-rate" :class="getRate(item.enhance_level) >= 70 ? 'rate-high' : 'rate-low'">{{ getRate(item.enhance_level) }}%</span>
            </div>
            <button class="ec-btn" @click="enhance(item.inv_id, item.name, item.enhance_level)">⚒️ 强化</button>
          </div>
          <div class="ec-max" v-else><span>👑 已满级</span></div>
        </div>
      </div>
    </div>

    <!-- 鉴定列表 -->
    <div v-if="tab === 'identify'">
      <div class="empty-card" v-if="!identifyItems.length">
        <div class="empty-icon">🔍</div><div class="empty-text">没有待鉴定的装备</div>
      </div>
      <div class="equip-list">
        <div v-for="item in identifyItems" :key="item.inv_id" class="equip-card id-card">
          <div class="ec-top">
            <div class="ec-icon">{{ item.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
            <div class="ec-info">
              <div class="ec-name">
                {{ item.name }}
                <span class="q-badge" :class="'q-' + item.quality">{{ qualityName(item.quality) }}</span>
                <span class="ec-lv">Lv.{{ item.level_req }}</span>
              </div>
              <div class="ec-stats">
                <span class="ec-atk" v-if="item.atk">⚔️ {{ item.atk }}</span>
                <span class="ec-def" v-if="item.def_val">🛡️ {{ item.def_val }}</span>
              </div>
            </div>
          </div>
          <div class="ec-bottom">
            <div class="ec-cost">
              <span class="cost-coin">💰 {{ getIdCost(item.level_req) }}</span>
              <span class="id-count">词缀×{{ getIdCount(item.quality) }}</span>
            </div>
            <button class="ec-btn id-btn" @click="identify(item.inv_id, item.name)">🔍 鉴定</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 修理列表 -->
    <div v-if="tab === 'repair'">
      <div class="empty-card" v-if="!repairItems.length">
        <div class="empty-icon">🔧</div><div class="empty-text">没有需要修理的装备</div>
      </div>
      <div class="equip-list">
        <div v-for="item in repairItems" :key="item.inv_id" class="equip-card repair-card"
          :style="{ borderColor: item.durability < item.durability_max * 0.3 ? '#e74c3c' : '#f39c12' }">
          <div class="ec-top">
            <div class="ec-icon">{{ item.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
            <div class="ec-info">
              <div class="ec-name">{{ item.name }}</div>
              <div class="ec-dur">
                <span>耐久 {{ item.durability }}/{{ item.durability_max }}</span>
                <div class="dur-bar-track">
                  <div class="dur-fill" :class="{ low: item.durability < item.durability_max * 0.3 }"
                    :style="{ width: (item.durability / item.durability_max * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="ec-bottom">
            <div class="ec-cost">
              <span class="cost-coin">💰 {{ getRepairCost(item) }}</span>
            </div>
            <button class="ec-btn repair-btn" @click="repair(item.inv_id, item.name)">🔧 修理</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 精炼 ── -->
    <div v-if="tab === 'refine'">
      <div class="rule-card">
        <div class="rule-row">
          <span class="ri-label">🔮 精炼费用</span>
          <span class="ri-val">强化等级 × 300 铜币</span>
        </div>
        <div class="rule-row">
          <span class="ri-label">📦 条件</span>
          <span class="ri-val">武器/防具 · 已鉴定 · 强化+3以上</span>
        </div>
        <div class="rule-row">
          <span class="ri-label">✨ 效果</span>
          <span class="ri-val">新增2条随机词缀（不重复）</span>
        </div>
        <div class="rule-note">💡 精炼次数越多，词缀越丰富</div>
      </div>

      <div class="empty-card" v-if="!refineItems.length">
        <div class="empty-icon">🔮</div><div class="empty-text">没有可精炼的装备</div>
      </div>
      <div class="equip-list">
        <div v-for="item in refineItems" :key="item.inv_id" class="equip-card"
          :style="{ borderColor: '#9b59b6' }">
          <div class="ec-top">
            <div class="ec-icon">{{ item.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
            <div class="ec-info">
              <div class="ec-name">
                {{ item.name }}<span class="ec-enh">+{{ item.enhance_level }}</span>
                <span class="q-badge" :class="'q-' + item.quality">{{ qualityName(item.quality) }}</span>
              </div>
              <div class="ec-stats">
                <span class="ec-atk" v-if="item.atk">⚔️ {{ item.atk }}</span>
                <span class="ec-def" v-if="item.def_val">🛡️ {{ item.def_val }}</span>
              </div>
              <div class="ec-affixes" v-if="item.refine_affixes && item.refine_affixes.length">
                <span v-for="(a, i) in item.refine_affixes" :key="i" class="affix-tag">{{ a.name }} {{ a.stat_key }}+{{ a.value }}</span>
              </div>
            </div>
          </div>
          <div class="ec-bottom">
            <div class="ec-cost">
              <span class="cost-coin">💰 {{ item.enhance_level * 300 }}</span>
              <span class="id-count">词缀×{{ (item.refine_affixes||[]).length }}/{{ (item.refine_affixes||[]).length + 2 }}</span>
            </div>
            <button class="ec-btn refine-btn" @click="refine(item.inv_id, item.name, item.enhance_level)">🔮 精炼</button>
          </div>
        </div>
      </div>
    </div>

    <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const userStore = useUserStore();
const tab = ref('enhance');
const items = ref([]);
const identifyItems = ref([]);
const repairItems = ref([]);
const refineItems = ref([]);
const msg = ref('');
const msgType = ref('');


function getCost(l) { return (l + 1) * 200; }
function getEnhColor(l) {
  return l >= 9 ? '#b85a3a' : l >= 7 ? '#6f5632' : l >= 5 ? '#9b59b6' : l >= 3 ? '#3f6a4a' : '#2e5a3b';
}
function calcStat(base, level) { return Math.round((base || 0) * (1 + level * 0.03)); }
function qualityName(q) { return ['', '白', '绿', '蓝', '紫', '橙'][q] || '白'; }
function getIdCost(lv) { return 500 + (parseInt(lv) || 1) * 100; }
function getIdCount(q) { return q >= 5 ? 3 : q >= 4 ? 2 : 1; }
function getAffixRarity(a) {
  const v = a.value || 0;
  if (v >= 25) return 3;
  if (v >= 10) return 2;
  return 1;
}
function getRepairCost(item) {
  const missing = (item.durability_max || 1) - (item.durability || 0);
  return Math.floor((item.price_buy || 100) * 0.1) * missing;
}

async function load() {
  try { const d = await Api.get('/smith/items'); items.value = d.items || []; }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function loadIdentify() {
  try { const d = await Api.get('/smith/identify-items'); identifyItems.value = d.items || []; }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function loadRepairItems() {
  tab.value = 'repair';
  try {
    const d = await Api.get('/smith/repair-items');
    repairItems.value = d.items || [];
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function enhance(id, name, level) {
  if (level >= 10) return;
  const protectHint = level >= 7 ? '⚠️ +7以上失败降级，使用保护符可防止降级' : '';
  const useProtect = { checkbox: { label: '💍 使用强化护符保护（防止降级）', checked: false } };
  const ok = await globalConfirm(
    '花费' + getCost(level) + '铜强化? 成功率' + getRate(level) + '%' + (level >= 7 ? ' 失败降级' : '') + '\n' + protectHint,
    '',
    useProtect
  );
  if (!ok) return;
  try {
    const protect = level >= 7 ? useProtect.checkbox.checked : false;
    const d = await Api.post('/smith/enhance', { inventory_id: id, protect });
    msg.value = d.msg; msgType.value = d.success ? 'success' : 'error';
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user);
    await load();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function identify(id, name) {
  if (!(await globalConfirm('花费鉴定费用确认鉴定 ' + name + '?'))) return;
  try {
    const d = await Api.post('/smith/identify', { inventory_id: id });
    msg.value = d.msg; msgType.value = 'success';
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user);
    await loadIdentify();
    await load();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function repair(id, name) {
  if (!(await globalConfirm('确认修理 ' + name + '?'))) return;
  try {
    const d = await Api.post('/smith/repair', { inventory_id: id });
    msg.value = d.msg; msgType.value = 'success';
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user);
    await loadRepairItems();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function loadRefineItems() {
  try {
    const d = await Api.get('/smith/refine-items');
    refineItems.value = d.items || [];
  } catch (e) { refineItems.value = []; }
}

async function refine(id, name, level) {
  if (!(await globalConfirm('花费' + (level * 300) + '铜币精炼 ' + name + '？'))) return;
  try {
    const d = await Api.post('/smith/refine', { inventory_id: id });
    msg.value = d.msg; msgType.value = d.success ? 'success' : 'error';
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user);
    await loadRefineItems();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

onMounted(() => { load(); loadIdentify(); });

// Watch tab changes
import { watch } from 'vue';
watch(tab, (t) => { msg.value = ''; if (t === 'repair') loadRepairItems(); if (t === 'refine') loadRefineItems(); });
</script>

<style scoped>
.smith-page { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 8px 10px; min-height: 100%; overflow-y: auto; }
.smith-bg { position: fixed; inset: 0; z-index: 0; background: linear-gradient(160deg, #0d1117 0%, #1a1410 50%, #0d1117 100%); pointer-events: none; }
.top-hud { position: relative; z-index: 2; background: rgba(13, 17, 23, 0.88); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-money { font-size: 14px; font-weight: 700; color: #f1c40f; }

.tab-bar { position: relative; z-index: 2; display: flex; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 4px; }
.tab-btn { flex: 1; padding: 7px 8px; border-radius: 8px; border: none; background: transparent; color: #7f8c8d; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: rgba(201, 167, 88, 0.15); color: #c9a758; }

.rule-card { position: relative; z-index: 2; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
.rule-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rule-item { display: flex; flex-direction: column; align-items: center; gap: 2px; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 6px; }
.rule-label { font-size: 11px; color: #7f8c8d; }
.rule-rate { font-size: 16px; font-weight: 800; }
.rate-high { color: #27ae60; }
.rate-mid { color: #f1c40f; }
.rate-low { color: #e74c3c; }
.rule-note { font-size: 10px; color: #7f8c8d; text-align: center; }
.rule-row { display: flex; justify-content: space-between; align-items: center; }
.ri-label { font-size: 11px; color: #7f8c8d; }
.ri-val { font-size: 11px; color: #c9a758; font-weight: 700; }

.msg-card { position: relative; z-index: 2; background: rgba(39,174,96,0.08); border: 1px solid rgba(39,174,96,0.3); border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #27ae60; text-align: center; }
.msg-card.error { background: rgba(184,90,58,0.08); border-color: rgba(184,90,58,0.3); color: #e74c3c; }

.empty-card { position: relative; z-index: 2; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-icon { font-size: 36px; }
.empty-text { font-size: 13px; color: #7f8c8d; }

.equip-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.equip-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.id-card { border-left-color: #9b59b6; }
.repair-card { border-left-color: #f39c12; }
.ec-top { display: flex; gap: 10px; align-items: center; }
.ec-icon { font-size: 28px; flex-shrink: 0; }
.ec-info { flex: 1; min-width: 0; }
.ec-name { font-size: 14px; font-weight: 600; color: #f0f0f0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.ec-enh { font-weight: 800; }
.ec-stats { display: flex; gap: 8px; margin-top: 2px; font-size: 11px; color: #7f8c8d; }
.ec-atk { color: #e74c3c; }
.ec-def { color: #3498db; }
.ec-affixes { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
.affix-tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); }
.affix-tag.rarity-1 { color: #7f8c8d; }
.affix-tag.rarity-2 { color: #3498db; background: rgba(52,152,219,0.12); }
.affix-tag.rarity-3 { color: #e2b714; background: rgba(226,183,20,0.12); }

.q-badge { font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 800; }
.q-1 { color: #aaa; background: rgba(170,170,170,0.15); }
.q-2 { color: #2ecc71; background: rgba(46,204,113,0.12); }
.q-3 { color: #3498db; background: rgba(52,152,219,0.12); }
.q-4 { color: #9b59b6; background: rgba(155,89,182,0.12); }
.q-5 { color: #e67e22; background: rgba(230,126,34,0.12); }
.ec-lv { font-size: 10px; color: #7f8c8d; }

.ec-dur { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.ec-dur > span { font-size: 11px; color: #7f8c8d; }
.dur-bar-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.dur-fill { height: 100%; background: linear-gradient(90deg, #f39c12, #e67e22); border-radius: 2px; transition: width 0.3s; }
.dur-fill.low { background: linear-gradient(90deg, #c0392b, #e74c3c); }

.ec-bottom { display: flex; justify-content: space-between; align-items: center; }
.ec-cost { display: flex; align-items: center; gap: 8px; }
.cost-coin { font-size: 12px; color: #f1c40f; font-weight: 600; }
.cost-rate { font-size: 13px; font-weight: 700; }
.id-count { font-size: 11px; color: #9b59b6; }
.ec-btn { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; border: none; border-radius: 8px; padding: 6px 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.ec-btn:hover { opacity: 0.9; }
.id-btn { background: linear-gradient(135deg, #4a1a6a, #9b59b6); }
.repair-btn { background: linear-gradient(135deg, #4a3a10, #f39c12); }
.refine-btn { background: linear-gradient(135deg, #3a1a4a, #9b59b6); }
.ec-max { text-align: center; font-size: 13px; font-weight: 700; color: #c9a758; }

.back-btn { position: relative; z-index: 2; display: block; text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #95a5a6; padding: 10px; border-radius: 10px; font-size: 13px; text-decoration: none; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>