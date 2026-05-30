<template>
  <div class="shop-page">
    <div class="shop-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🏪</div>
        <div class="hud-title">商店</div>
      </div>
      <div class="hud-money">💰 {{ formatMoney(userStore.money) }}</div>
    </div>

    <!-- 提示 -->
    <div class="tip-card error" v-if="error">{{ error }}</div>
    <div class="tip-card success" v-if="success">{{ success }}</div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-btn" :class="{ active: tab === 'buy' }" @click="tab = 'buy'">
        🛒 购买
      </div>
      <div class="tab-btn" :class="{ active: tab === 'sell' }" @click="loadInv(); tab = 'sell'">
        💰 出售
      </div>
    </div>

    <!-- 购买列表 -->
    <div class="item-list" v-if="tab === 'buy'">
      <div v-for="item in items" :key="item.id" class="item-card">
        <div class="ic-icon">{{ item.subtype === 'weapon' ? '⚔️' : item.subtype === 'armor' ? '🛡️' : '💊' }}</div>
        <div class="ic-info">
          <div class="ic-name">
            {{ item.name }}
            <span class="ic-lv" v-if="item.level_req > 1">Lv.{{ item.level_req }}</span>
          </div>
          <div class="ic-desc">{{ item.description }}</div>
          <div class="ic-stats">
            <span v-if="item.atk">⚔️ 攻+{{ item.atk }}</span>
            <span v-if="item.def_val">🛡️ 防+{{ item.def_val }}</span>
            <span v-if="item.hp">❤️ HP+{{ item.hp }}</span>
          </div>
        </div>
        <div class="ic-right">
          <div class="ic-price">{{ item.price_buy }}💰</div>
          <div class="qty-row">
            <button class="qty-btn" @click="qtyMap[item.id] = Math.max(1, (qtyMap[item.id] || 1) - 1)">−</button>
            <input type="number" v-model.number="qtyMap[item.id]" min="1" max="99" class="qty-input" />
            <button class="qty-btn" @click="qtyMap[item.id] = Math.min(99, (qtyMap[item.id] || 1) + 1)">+</button>
          </div>
          <button class="buy-btn" @click="buy(item)">购买</button>
        </div>
      </div>
    </div>

    <!-- 出售列表 -->
    <div class="item-list" v-if="tab === 'sell'">
      <div v-if="!invItems.length" class="empty-card">
        <div class="empty-icon">🎒</div>
        <div class="empty-text">背包中没有可出售的物品</div>
      </div>
      <div v-for="item in invItems" :key="item.inv_id" class="item-card">
        <div class="ic-icon">📦</div>
        <div class="ic-info">
          <div class="ic-name">
            {{ item.name }}
            <span class="ic-qty" v-if="item.quantity > 1"> ×{{ item.quantity }}</span>
          </div>
          <div class="ic-desc">{{ item.description }}</div>
        </div>
        <div class="ic-right">
          <div class="ic-price sell-price">{{ item.price_sell || Math.floor((item.price_buy || 0) * 0.5) }}💰/个</div>
          <div class="qty-row">
            <button class="qty-btn" @click="sellQtyMap[item.inv_id] = Math.max(1, (sellQtyMap[item.inv_id] || 1) - 1)">−</button>
            <input type="number" v-model.number="sellQtyMap[item.inv_id]" min="1" :max="item.quantity" class="qty-input" />
            <button class="qty-btn" @click="sellQtyMap[item.inv_id] = Math.min(item.quantity, (sellQtyMap[item.inv_id] || 1) + 1)">+</button>
          </div>
          <button class="sell-btn" @click="sell(item)">出售</button>
        </div>
      </div>
    </div>

    <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const route = useRoute();
const userStore = useUserStore();
const items = ref([]);
const invItems = ref([]);
const error = ref('');
const success = ref('');
const tab = ref('buy');
const qtyMap = reactive({});
const sellQtyMap = reactive({});
const npcId = route.params.npcId || 1;

async function load() {
  try { const d = await Api.get(`/npc/${npcId}/shop`); items.value = d.items || []; }
  catch (e) { error.value = e.message; }
}
async function loadInv() {
  try { const d = await Api.get('/user/inventory'); invItems.value = (d.items || []).filter(i => !i.equipped); }
  catch (e) { error.value = e.message; }
}
async function buy(item) {
  error.value = ''; success.value = '';
  const qty = qtyMap[item.id] || 1;
  try {
    const d = await Api.post('/npc/buy', { npc_id: npcId, item_id: item.id, quantity: qty });
    success.value = `购买 ${d.item_name}×${d.quantity}`;
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
  } catch (e) { error.value = e.message; }
}
async function sell(item) {
  error.value = ''; success.value = '';
  const qty = Math.min(sellQtyMap[item.inv_id] || 1, item.quantity);
  try {
    const d = await Api.post('/npc/sell', { inventory_id: item.inv_id, quantity: qty });
    success.value = `出售 ${d.item_name}×${d.quantity}，获得 ${d.earn} 铜币`;
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    await loadInv();
  } catch (e) { error.value = e.message; }
}

onMounted(loadShop);
</script>

<style scoped>
.shop-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.shop-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-money { font-size: 14px; font-weight: 700; color: #f1c40f; }

.tip-card {
  position: relative;
  z-index: 2;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
.tip-card.error { background: rgba(184, 90, 58, 0.08); border: 1px solid rgba(184, 90, 58, 0.3); color: #e74c3c; }
.tip-card.success { background: rgba(39, 174, 96, 0.08); border: 1px solid rgba(39, 174, 96, 0.3); color: #27ae60; }

.tab-bar {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
}
.tab-btn {
  padding: 10px;
  text-align: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active { background: rgba(39, 174, 96, 0.2); color: #27ae60; }

.item-list {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.ic-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
.ic-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ic-name { font-size: 14px; font-weight: 600; color: #f0f0f0; display: flex; align-items: center; gap: 4px; }
.ic-lv { font-size: 10px; color: #7f8c8d; font-weight: normal; }
.ic-qty { font-size: 11px; color: #f1c40f; font-weight: normal; }
.ic-desc { font-size: 11px; color: #7f8c8d; }
.ic-stats { display: flex; gap: 8px; font-size: 11px; color: #95a5a6; }

.ic-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.ic-price { font-size: 14px; font-weight: 700; color: #f1c40f; }
.sell-price { color: #95a5a6; font-size: 12px; }

.qty-row {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  overflow: hidden;
}
.qty-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #bdc3c7;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.qty-btn:hover { background: rgba(255, 255, 255, 0.12); }
.qty-input {
  width: 32px;
  height: 24px;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #f0f0f0;
  font-size: 12px;
  text-align: center;
  outline: none;
}

.buy-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.buy-btn:hover { opacity: 0.9; }
.sell-btn {
  background: linear-gradient(135deg, #73281c, #b85a3a);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.sell-btn:hover { opacity: 0.9; }

.empty-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon { font-size: 32px; }
.empty-text { font-size: 12px; color: #7f8c8d; }

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
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>