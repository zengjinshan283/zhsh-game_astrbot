<template>
<div class="page-wrap mkt-page">

  <div class="page-hud"><div class="page-hud-title">🛒 市场</div></div>  <!-- HUD -->
  <div class="mkt-hud">
    <div class="mh-city">🏪 {{ city?.name || '' }} 市场</div>
    <div class="mh-info">
      <span>📍 {{ regionName }}</span>
      <span>💰 <span class="text-gold">{{ formatMoney(money) }}</span></span>
    </div>
  </div>

  <!-- 消息 -->
  <div v-if="msg" class="mkt-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
    {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
  </div>

  <!-- 船只信息 -->
  <template v-if="ship">
    <div class="ship-card">
      <div class="sc-header">
        <div class="sch-icon">🚢</div>
        <div class="sch-info">
          <div class="sch-name">{{ ship.name }}</div>
          <div class="sch-cargo">货舱 <span :style="{color: cargoUsed/cargoMax>0.8?'#e74c3c':'#2ecc71', fontWeight:'700'}">{{ cargoUsed }}</span>/{{ cargoMax }}</div>
        </div>
        <div class="sch-total" v-if="selectedGoods">
          <div class="sct-label">预计{{ selectedGoods.action === 'buy' ? '花费' : '收益' }}</div>
          <div class="sct-amount" :class="selectedGoods.action === 'sell' ? 'text-gold' : 'text-red'">{{ formatMoney(selectedGoods.total) }}</div>
        </div>
      </div>
      <div class="sc-bar">
        <div class="scb-fill" :style="{width: Math.min(100, Math.round(cargoUsed/cargoMax*100))+'%', background: cargoUsed/cargoMax>0.8?'#e74c3c':'#27ae60'}"></div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="no-ship">⚠️ 没有船只，无法贸易。请先到码头购买。</div>
  </template>

  <!-- 分类标签 -->
  <div class="cat-tabs">
    <button v-for="c in categories" :key="c.key" class="cat-tab" :class="{active: activeCat===c.key}" @click="activeCat=c.key">{{ c.label }}</button>
  </div>

  <!-- 日期标签 + 波动说明 -->
  <div class="mkt-date-tag">
    📅 今日价格波动 <span class="fluct-legend">↓便宜 <span class="text-green">绿色</span> | ↑贵 <span class="text-red">红色</span></span>
  </div>

  <!-- 商品列表 -->
  <div class="goods-list">
    <div v-for="g in filteredGoods" :key="g.id" class="goods-card" :class="{selected: selectedGoods?.id===g.id}">
      <div class="gc-header">
        <div class="gch-left">
          <div class="gch-name">{{ g.name }}</div>
          <div class="gch-desc">{{ g.description }}</div>
        </div>
        <div class="gch-right">
          <div class="gch-price">
            <span class="gchp-num">{{ g.price }}</span>
            <span class="gcp-unit">/{{ g.unit }}</span>
            <span v-if="g.fluctuation !== 0" class="gchp-fluct" :class="g.fluctuation > 0 ? 'up' : 'down'">
              {{ g.fluctuation > 0 ? '↑' : '↓' }}{{ Math.abs(g.fluctuation) }}%
            </span>
          </div>
          <div class="gch-weight">⏱ {{ g.weight }}舱位</div>
        </div>
      </div>
      <div v-if="g.hold > 0" class="gc-stock">📦 持有 ×{{ g.hold }}</div>
      <div v-if="ship" class="gc-trade">
        <div class="gct-qty">
          <button class="qty-btn" @click="adjustQty(g, -1)">−</button>
          <input type="number" v-model.number="qtyMap[g.id]" min="1" :max="g.hold || 99" class="qty-input" @change="onQtyChange(g)">
          <button class="qty-btn" @click="adjustQty(g, 1)">+</button>
        </div>
        <button class="gct-buy" :disabled="!canBuy(g)" @click="selectAndBuy(g)">🛒 买</button>
        <button v-if="g.hold > 0" class="gct-sell" @click="selectAndSell(g)">💰 卖</button>
      </div>
    </div>
  </div>

  <!-- 走商参考 -->
  <div class="price-hints" v-if="priceHints.length">
    <div class="ph-title">📊 走商参考（其他区域均价）</div>
    <div v-for="h in priceHints" :key="h.name" class="ph-row">
      <div class="ph-name">{{ h.name }}</div>
      <div class="ph-regions">
        <span v-for="r in h.regions" :key="r.rid" class="ph-region" :class="getRegionClass(r.avgp, h.regions)">{{ r.rname }}:{{ r.avgp }}</span>
      </div>
    </div>
    <div class="ph-tip">💡 卖出价为买入价的90%，注意货舱容量和价格波动</div>
  </div>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const city = ref(null);
const regionName = ref('');
const ship = ref(null);
const cargoUsed = ref(0);
const cargoMax = ref(0);
const goodsList = ref([]);
const priceHints = ref([]);
const money = ref(0);
const msg = ref('');
const msgType = ref('');
const qtyMap = reactive({});
const selectedGoods = ref(null);
const activeCat = ref('all');

const categories = [
  { key: 'all', label: '全部' },
  { key: '0', label: '日常品' },
  { key: '1', label: '酒类油类' },
  { key: '2', label: '香料' },
  { key: '3', label: '矿石' },
  { key: '4', label: '珍宝' },
];

const filteredGoods = computed(() => {
  if (activeCat.value === 'all') return goodsList.value;
  return goodsList.value.filter(g => g.category == activeCat.value);
});

function getRegionClass(avgp, regions) {
  if (!regions || regions.length === 0) return '';
  const prices = regions.map(r => r.avgp);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  if (avgp === max) return 'region-high';
  if (avgp === min) return 'region-low';
  return '';
}

function adjustQty(g, delta) {
  const cur = qtyMap[g.id] || 1;
  qtyMap[g.id] = Math.max(1, Math.min(99, cur + delta));
  onQtyChange(g);
}

function onQtyChange(g) {
  if (qtyMap[g.id] < 1) qtyMap[g.id] = 1;
  updateSelected(g);
}

function updateSelected(g) {
  const qty = qtyMap[g.id] || 1;
  selectedGoods.value = { id: g.id, name: g.name, price: g.price, qty, total: g.price * qty, action: null };
}

function selectAndBuy(g) {
  if (!canBuy(g)) return;
  const qty = qtyMap[g.id] || 1;
  selectedGoods.value = { id: g.id, name: g.name, price: g.price, qty, total: g.price * qty, action: 'buy' };
  buyGoods(g);
}

function selectAndSell(g) {
  if (g.hold <= 0) return;
  const qty = qtyMap[g.id] || 1;
  selectedGoods.value = { id: g.id, name: g.name, price: g.price, qty, total: Math.round(g.price * qty * 0.9), action: 'sell' };
  sellGoods(g);
}

function canBuy(g) {
  const qty = qtyMap[g.id] || 1;
  return money.value >= g.price * qty && (cargoUsed.value + g.weight * qty <= cargoMax.value);
}

async function load() {
  try {
    const d = await Api.get('/market/info');
    city.value = d.city; regionName.value = d.regionName;
    ship.value = d.ship; cargoUsed.value = d.cargoUsed; cargoMax.value = d.cargoMax;
    goodsList.value = d.goodsList||[]; priceHints.value = d.priceHints||[]; money.value = d.money;
    selectedGoods.value = null;
    d.goodsList?.forEach(g => { if (!qtyMap[g.id]) qtyMap[g.id] = 1; });
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function buyGoods(g) { const qty = qtyMap[g.id]||1; try { const d = await Api.post('/market/buy', {goods_id: g.id, quantity: qty}); msg.value = d.msg; msgType.value = 'success'; selectedGoods.value = null; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function sellGoods(g) { const qty = qtyMap[g.id]||1; try { const d = await Api.post('/market/sell', {goods_id: g.id, quantity: qty}); msg.value = d.msg; msgType.value = 'success'; selectedGoods.value = null; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }

onMounted(load);
</script>

<style scoped>
.mkt-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
/* HUD */
.mkt-hud {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
}
.mh-city { font-size: 15px; font-weight: 700; color: #f0f0f0; }
.mh-info { display: flex; gap: 10px; font-size: 11px; color: #7f8c8d; }

/* Toast */
.mkt-toast { position: relative; z-index: 2; border-radius: 8px; padding: 7px 12px; font-size: 11px; }
.toast-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.toast-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* 船只卡 */
.ship-card {
  position: relative; z-index: 2;
  background: rgba(52,152,219,0.06); border: 1px solid rgba(52,152,219,0.2);
  border-radius: 12px; padding: 12px;
}
.sc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sch-icon { font-size: 22px; }
.sch-info { flex: 1; }
.sch-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.sch-cargo { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.sch-total { text-align: right; }
.sct-label { font-size: 10px; color: #7f8c8d; }
.sct-amount { font-size: 14px; font-weight: 700; }
.sc-bar { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.scb-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

/* 无船只 */
.no-ship {
  position: relative; z-index: 2;
  text-align: center; font-size: 11px; color: #e74c3c;
  background: rgba(231,76,60,0.06); border: 1px solid rgba(231,76,60,0.2);
  border-radius: 10px; padding: 10px;
}

/* 分类标签 */
.cat-tabs {
  position: relative; z-index: 2;
  display: flex; gap: 6px; flex-wrap: wrap;
}
.cat-tab {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #7f8c8d; border-radius: 8px; padding: 4px 10px;
  font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.cat-tab.active {
  background: rgba(52,152,219,0.2); border-color: rgba(52,152,219,0.5);
  color: #3498db; font-weight: 600;
}

/* 日期标签 */
.mkt-date-tag {
  position: relative; z-index: 2;
  font-size: 11px; color: #7a6848;
  display: flex; align-items: center; gap: 8px;
}
.fluct-legend { font-size: 10px; color: #555; }

/* 商品列表 */
.goods-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.goods-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
  transition: all 0.2s;
}
.goods-card:hover { background: rgba(255,255,255,0.06); }
.goods-card.selected { border-color: rgba(52,152,219,0.5); background: rgba(52,152,219,0.06); }
.gc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.gch-left { flex: 1; }
.gch-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.gch-desc { font-size: 10px; color: #7a6848; margin-top: 1px; }
.gch-right { text-align: right; flex-shrink: 0; }
.gch-price { font-size: 15px; font-weight: 700; color: #f39c12; display: flex; align-items: baseline; gap: 4px; }
.gchp-num { color: #f39c12; }
.gcp-unit { font-size: 10px; color: #7a6848; font-weight: 400; }
.gchp-fluct { font-size: 11px; font-weight: 600; margin-left: 2px; }
.gchp-fluct.up { color: #e74c3c; }
.gchp-fluct.down { color: #2ecc71; }
.gch-weight { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.gc-stock { font-size: 10px; color: #27ae60; background: rgba(39,174,96,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px; }
.gc-trade { display: flex; align-items: center; gap: 6px; }
.gct-qty { display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
.qty-btn { width: 28px; height: 28px; border: none; background: rgba(255,255,255,0.06); color: #bdc3c7; font-size: 14px; cursor: pointer; }
.qty-input { width: 40px; height: 28px; border: none; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 12px; color: #f0f0f0; background: rgba(255,255,255,0.04); outline: none; }
.gct-buy { flex: 1; background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; border: none; border-radius: 6px; padding: 7px; font-size: 11px; font-weight: 600; cursor: pointer; }
.gct-buy:disabled { opacity: 0.4; cursor: not-allowed; }
.gct-sell { flex: 1; background: rgba(241,196,15,0.15); border: 1px solid rgba(241,196,15,0.4); color: #f39c12; border-radius: 6px; padding: 7px; font-size: 11px; font-weight: 600; cursor: pointer; }

/* 走商参考 */
.price-hints {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.ph-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.ph-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ph-name { font-size: 11px; font-weight: 600; color: #f0f0f0; min-width: 60px; }
.ph-regions { display: flex; gap: 6px; flex-wrap: wrap; }
.ph-region { font-size: 10px; color: #7a6848; background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px; }
.ph-region.region-high { color: #e74c3c; background: rgba(231,76,60,0.1); }
.ph-region.region-low { color: #2ecc71; background: rgba(39,174,96,0.1); }
.ph-tip { font-size: 10px; color: #555; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }

/* Utility */
.text-gold { color: #f39c12; }
.text-red { color: #e74c3c; }
.text-green { color: #2ecc71; }
</style>