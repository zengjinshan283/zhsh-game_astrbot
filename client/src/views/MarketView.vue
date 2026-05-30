<template>
<div class="mkt-page">
  <div class="mkt-bg"></div>

  <!-- HUD -->
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
      </div>
      <div class="sc-bar">
        <div class="scb-fill" :style="{width: Math.min(100, Math.round(cargoUsed/cargoMax*100))+'%', background: cargoUsed/cargoMax>0.8?'#e74c3c':'#27ae60'}"></div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="no-ship">⚠️ 没有船只，无法贸易。请先到码头购买。</div>
  </template>

  <!-- 日期标签 -->
  <div class="mkt-date-tag">📅 今日价格（每天变化一次）</div>

  <!-- 商品列表 -->
  <div class="goods-list">
    <div v-for="g in goodsList" :key="g.id" class="goods-card">
      <div class="gc-header">
        <div class="gch-left">
          <div class="gch-name">{{ g.name }}</div>
          <div class="gch-desc">{{ g.description }}</div>
        </div>
        <div class="gch-right">
          <div class="gch-price">{{ g.price }}<span class="gcp-unit">铜/{{ g.unit }}</span></div>
          <div class="gch-weight">⏱ {{ g.weight }}舱位</div>
        </div>
      </div>
      <div v-if="g.hold > 0" class="gc-stock">📦 持有 ×{{ g.hold }}</div>
      <div v-if="ship" class="gc-trade">
        <div class="gct-qty">
          <button class="qty-btn" @click="setQty(g.id, -1)">−</button>
          <input type="number" v-model.number="qtyMap[g.id]" min="1" :max="g.hold || 99" class="qty-input">
          <button class="qty-btn" @click="setQty(g.id, 1)">+</button>
        </div>
        <button class="gct-buy" @click="buyGoods(g)">🛒 买</button>
        <button v-if="g.hold > 0" class="gct-sell" @click="sellGoods(g)">💰 卖</button>
      </div>
    </div>
  </div>

  <!-- 走商参考 -->
  <div class="price-hints" v-if="priceHints.length">
    <div class="ph-title">📊 走商参考（其他区域均价）</div>
    <div v-for="h in priceHints" :key="h.name" class="ph-row">
      <div class="ph-name">{{ h.name }}</div>
      <div class="ph-regions">
        <span v-for="r in h.regions" :key="r.rid" class="ph-region">{{ r.rname }}{{ r.avgp }}</span>
      </div>
    </div>
    <div class="ph-tip">💡 卖出价为买入价的90%，注意货舱容量和价格波动</div>
  </div>
</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
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



async function load() {
  try {
    const d = await Api.get('/market/info');
    city.value = d.city; regionName.value = d.regionName;
    ship.value = d.ship; cargoUsed.value = d.cargoUsed; cargoMax.value = d.cargoMax;
    goodsList.value = d.goodsList||[]; priceHints.value = d.priceHints||[]; money.value = d.money;
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function buyGoods(g) { const qty = qtyMap[g.id]||1; try { const d = await Api.post('/market/buy', {goods_id: g.id, quantity: qty}); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function sellGoods(g) { const qty = qtyMap[g.id]||1; try { const d = await Api.post('/market/sell', {goods_id: g.id, quantity: qty}); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }

onMounted(load);
</script>

<style scoped>
.mkt-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.mkt-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0d1a1a 50%, #0d1117 100%);
  pointer-events: none;
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
.sc-bar { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.scb-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

/* 无船只 */
.no-ship {
  position: relative; z-index: 2;
  text-align: center; font-size: 11px; color: #e74c3c;
  background: rgba(231,76,60,0.06); border: 1px solid rgba(231,76,60,0.2);
  border-radius: 10px; padding: 10px;
}

/* 日期标签 */
.mkt-date-tag { position: relative; z-index: 2; font-size: 11px; color: #7a6848; }

/* 商品列表 */
.goods-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.goods-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
  transition: all 0.2s;
}
.goods-card:hover { background: rgba(255,255,255,0.06); }
.gc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.gch-left { flex: 1; }
.gch-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.gch-desc { font-size: 10px; color: #7a6848; margin-top: 1px; }
.gch-right { text-align: right; flex-shrink: 0; }
.gch-price { font-size: 15px; font-weight: 700; color: #f39c12; }
.gcp-unit { font-size: 10px; color: #7a6848; font-weight: 400; }
.gch-weight { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.gc-stock { font-size: 10px; color: #27ae60; background: rgba(39,174,96,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px; }
.gc-trade { display: flex; align-items: center; gap: 6px; }
.gct-qty { display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
.qty-btn { width: 28px; height: 28px; border: none; background: rgba(255,255,255,0.06); color: #bdc3c7; font-size: 14px; cursor: pointer; }
.qty-input { width: 40px; height: 28px; border: none; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 12px; color: #f0f0f0; background: rgba(255,255,255,0.04); outline: none; }
.gct-buy { flex: 1; background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; border: none; border-radius: 6px; padding: 7px; font-size: 11px; font-weight: 600; cursor: pointer; }
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
.ph-tip { font-size: 10px; color: #555; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }
</style>