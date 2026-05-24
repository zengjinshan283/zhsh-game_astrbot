<template>
<div class="mall-page">
  <div class="mall-bg"></div>

  <!-- 顶部 HUD -->
  <div class="mall-hud">
    <div class="mh-title">🏪 商城</div>
    <div class="mh-balance">
      <span class="mh-icon">💰</span>
      <span class="mh-val">{{ formatMoney(userStore.money) }} 铜</span>
    </div>
  </div>

  <div v-if="error" class="mall-msg mall-err">❌ {{ error }}</div>
  <div v-if="success" class="mall-msg mall-ok">✅ {{ success }}</div>

  <!-- 分类标签 -->
  <div class="tab-scroll">
    <button
      v-for="item in categories"
      :key="item.key"
      class="tab-btn"
      :class="{active: activeTab === item.key}"
      @click="activeTab = item.key"
    >
      <span class="tab-icon">{{ item.icon }}</span>
      <span class="tab-label">{{ item.label }}</span>
    </button>
  </div>

  <!-- 商品列表 -->
  <div v-if="loading" class="mall-loading">加载中...</div>
  <div v-else-if="!filteredItems.length" class="mall-empty">该分类暂无商品</div>
  <div v-else class="item-list">
    <div v-for="item in filteredItems" :key="item.id" class="item-card">
      <div class="ic-left">
        <div class="ic-icon">{{ getItemIcon(item) }}</div>
      </div>
      <div class="ic-body">
        <div class="ic-name">{{ item.name }}</div>
        <div class="ic-desc">{{ item.description }}</div>
        <div class="ic-stats">
          <span v-if="item.atk_min > 0" class="ic-stat">⚔️ +{{ item.atk_min }}</span>
          <span v-if="item.def > 0" class="ic-stat">🛡️ +{{ item.def }}</span>
          <span v-if="item.hp_max > 0" class="ic-stat">❤️ +{{ item.hp_max }}</span>
          <span v-if="item.agility > 0" class="ic-stat">💨 +{{ item.agility }}</span>
        </div>
      </div>
      <div class="ic-right">
        <div class="ic-price">{{ formatMoney(item.price) }}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" @click="qtyMap[item.id] = Math.max(1, (qtyMap[item.id] || 1) - 1)">−</button>
          <input type="number" v-model.number="qtyMap[item.id]" min="1" max="99" class="qty-input">
          <button class="qty-btn" @click="qtyMap[item.id] = Math.min(99, (qtyMap[item.id] || 1) + 1)">+</button>
        </div>
        <button class="buy-btn" @click="buyItem(item)" :disabled="purchasing === item.id">
          {{ purchasing === item.id ? '购买中...' : '购买' }}
        </button>
      </div>
    </div>
  </div>

  <router-link to="/map" class="back-btn">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore = useUserStore();
const allItems = ref([]);
const categories = ref([
  { key: 'weapon', label: '武器', icon: '⚔️' },
  { key: 'armor', label: '防具', icon: '🛡️' },
  { key: 'accessory', label: '饰品', icon: '💍' },
  { key: 'consumable', label: '消耗', icon: '💊' },
  { key: 'material', label: '材料', icon: '📦' },
]);
const loading = ref(false);
const error = ref('');
const success = ref('');
const activeTab = ref('weapon');
const qtyMap = reactive({});
const purchasing = ref(0);

function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

function getItemIcon(item) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍', consumable: '💊', material: '📦' };
  return icons[item.category] || '📦';
}

const filteredItems = computed(() => allItems.value.filter(i => i.category === activeTab.value));

async function loadItems() {
  loading.value = true; error.value = '';
  try { allItems.value = (await Api.get('/mall/items')).items || []; }
  catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

async function buyItem(item) {
  const qty = qtyMap[item.id] || 1;
  purchasing.value = item.id;
  error.value = ''; success.value = '';
  try {
    await Api.post('/mall/buy', { item_id: item.id, quantity: qty });
    success.value = `${item.name} x${qty} 购买成功`;
    setTimeout(() => { success.value = ''; }, 2500);
  } catch (e) { error.value = e.message; }
  finally { purchasing.value = 0; }
}

onMounted(loadItems);
</script>

<style scoped>
.mall-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.mall-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0d0d 50%, #0d1117 100%);
  pointer-events: none;
}

/* ===== HUD ===== */
.mall-hud {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 14px;
}
.mh-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.mh-balance { display: flex; align-items: center; gap: 5px; }
.mh-icon { font-size: 14px; }
.mh-val { font-size: 13px; font-weight: 600; color: #f1c40f; }

/* 消息提示 */
.mall-msg { position: relative; z-index: 2; border-radius: 8px; padding: 7px 10px; font-size: 11px; }
.mall-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.mall-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* ===== 分类标签 ===== */
.tab-scroll {
  position: relative; z-index: 2;
  display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;
}
.tab-scroll::-webkit-scrollbar { height: 2px; }
.tab-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.tab-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  font-size: 11px; color: #7f8c8d;
  cursor: pointer; white-space: nowrap;
  transition: all 0.2s;
}
.tab-btn.active {
  background: rgba(39,174,96,0.12);
  border-color: rgba(39,174,96,0.4);
  color: #2ecc71;
}
.tab-icon { font-size: 13px; }

/* ===== 商品列表 ===== */
.item-list {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 8px;
}
.item-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.item-card:hover { background: rgba(255,255,255,0.07); }
.ic-left { flex-shrink: 0; }
.ic-icon { font-size: 26px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 10px; }
.ic-body { flex: 1; min-width: 0; }
.ic-name { font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 3px; }
.ic-desc { font-size: 10px; color: #7f8c8d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
.ic-stats { display: flex; flex-wrap: wrap; gap: 4px; }
.ic-stat { font-size: 10px; color: #95a5a6; background: rgba(255,255,255,0.04); padding: 2px 5px; border-radius: 4px; }
.ic-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.ic-price { font-size: 13px; font-weight: 700; color: #f1c40f; }
.qty-ctrl { display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; overflow: hidden; }
.qty-btn { width: 22px; height: 24px; border: none; background: rgba(255,255,255,0.06); color: #bdc3c7; font-size: 12px; cursor: pointer; }
.qty-input { width: 32px; height: 24px; border: none; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 11px; background: rgba(255,255,255,0.04); color: #f0f0f0; outline: none; }
.buy-btn { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.buy-btn:hover:not(:disabled) { opacity: 0.9; }
.buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.mall-loading { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 20px; }
.mall-empty { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 20px; }
.back-btn {
  position: relative; z-index: 2;
  display: block; text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>