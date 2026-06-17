<template>
<div class="page-wrap mall-page">

  <!-- 顶部 HUD -->
  <div class="page-hud">
    <div class="page-hud-title">🛒 商城</div>
    <div class="mh-balance">
      <span>💰</span>
      <span class="mh-val">{{ formatMoney(userStore.money) }} 铜</span>
    </div>
  </div>

  

  <!-- 刷新提示 & 按钮 -->
  <div class="refresh-bar">
    <span class="refresh-hint">
      {{ refreshUsed ? '今日免费刷新已用' : '今日还有1次免费刷新' }}
    </span>
    <button class="refresh-btn" @click="refreshMall" :disabled="refreshing">
      {{ refreshing ? '刷新中...' : '🔄 刷新商品' }}
      <span v-if="refreshCost > 0" class="r-cost">{{ refreshCost }}铜</span>
    </button>
  </div>

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
  <div v-else class="item-list grid grid-3">
    <div v-for="item in filteredItems" :key="item.item_id" class="item-card glass-card hover-lift stagger-item">
      <div class="ic-left">
        <div class="ic-icon">{{ getItemIcon(item) }}</div>
      </div>
      <div class="ic-body">
        <div class="ic-name">{{ getItemName(item) }}</div>
        <div class="ic-desc">{{ getItemDesc(item) }}</div>
        <div class="ic-type" v-if="getItemTypeLabel(item)">{{ getItemTypeLabel(item) }}</div>
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
          <button class="qty-btn" @click="qtyMap[item.item_id] = Math.max(1, (qtyMap[item.item_id] || 1) - 1)">−</button>
          <input type="number" v-model.number="qtyMap[item.item_id]" min="1" max="99" class="qty-input">
          <button class="qty-btn" @click="qtyMap[item.item_id] = Math.min(99, (qtyMap[item.item_id] || 1) + 1)">+</button>
        </div>
        <button class="buy-btn" @click="buyItem(item)" :disabled="purchasing === item.item_id">
          {{ purchasing === item.item_id ? '购买中...' : '购买' }}
        </button>
      </div>
    </div>
  </div>

  <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const userStore = useUserStore();
const allItems = ref([]);
const categories = ref([
  { key: 'weapon',    label: '武器',   icon: '⚔️' },
  { key: 'armor',     label: '防具',   icon: '🛡️' },
  { key: 'accessory', label: '饰品',   icon: '💍' },
  { key: 'consumable',label: '消耗品', icon: '💊' },
  { key: 'material',  label: '材料',   icon: '📦' },
]);
const loading = ref(false);
const error = ref('');
const success = ref('');
const activeTab = ref('weapon');
const qtyMap = reactive({});
const purchasing = ref(0);
const refreshing = ref(false);
const toast = useToast();
const refreshUsed = ref(false);
const refreshCost = ref(0);

// 物品描述/属性缓存
const itemMeta = {};
const ITEM_DESC = {
  201: '稀有武器，攻击力+50', 202: '稀有武器，攻击力+45', 203: '稀有武器，攻击力+55',
  301: '稀有防具，防御+40', 302: '稀有防具，防御+35',
  401: '生命值上限+100', 402: '敏捷+20',
  501: '恢复500HP', 502: '恢复300MP', 503: '获得5000经验',
  601: '稀有锻造材料', 602: '可用于强化装备', 603: '合成稀有道具的材料',
  90001: '标注神秘宝藏位置的古老地图',
  91001: '宠物学习「生命强化·初级」', 91002: '宠物学习「生命强化·中级」',
  91003: '宠物学习「生命强化·高级」', 91004: '宠物学习「攻击强化·初级」',
  91005: '宠物学习「攻击强化·中级」', 91006: '宠物学习「攻击强化·高级」',
  91007: '宠物学习「防御强化·初级」', 91008: '宠物学习「防御强化·中级」',
};

function getItemIcon(item) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍', consumable: '💊', material: '📦' };
  return icons[item.category] || '📦';
}
// 中文类型名映射
const CATEGORY_LABELS = {
  weapon: '武器', armor: '防具', accessory: '饰品',
  consumable: '消耗品', material: '材料',
};
const getItemTypeLabel = (item) => CATEGORY_LABELS[item.category] || item.category || '';
const getItemDesc = (item) => ITEM_DESC[item.item_id] || '';
const qualityPrefix = {0:'',1:'〖精良〗',2:'〖史诗〗',3:'〖传说〗'};
const getItemName = (item) => (qualityPrefix[item.quality] || '') + item.name;

const filteredItems = computed(() => allItems.value.filter(i => i.category === activeTab.value));

async function loadItems() {
  loading.value = true; error.value = '';
  try {
    const data = await Api.get('/mall');
    allItems.value = data.items || [];
    refreshUsed.value = data.refreshUsed > 0;
    refreshCost.value = data.refreshCost || 0;
    // 更新用户铜币
    if (data.userMoney !== undefined) userStore.money = data.userMoney;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
}

async function refreshMall() {
  refreshing.value = true; error.value = '';   try {
    const data = await Api.post('/mall/refresh', {});
    allItems.value = data.items || [];
    refreshUsed.value = true;
    if (data.cost > 0) {
      userStore.money = (userStore.money || 0) - data.cost;
      toast.success(`商品已刷新，花费${data.cost}铜币`);
    } else {
      toast.success('商品已刷新（今日免费次数已用完）');
    }
    setTimeout(() => { success.value = ''; }, 2500);
  } catch (e) { error.value = e.message; }
  finally { refreshing.value = false; }
}

async function buyItem(item) {
  const qty = qtyMap[item.item_id] || 1;
  purchasing.value = item.item_id;
  error.value = '';   try {
    const data = await Api.post('/mall/buy', { item_id: item.item_id, quantity: qty });
    if (data.remainingMoney !== undefined) userStore.money = data.remainingMoney;
    toast.success(`${item.name} x${qty} 购买成功`);
    setTimeout(() => { success.value = ''; }, 2500);
  } catch (e) { error.value = e.message; }
  finally { purchasing.value = 0; }
}

onMounted(loadItems);
</script>

<style scoped>
.mall-page { padding: 0; }
/* ===== HUD ===== */
.mh-balance { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.mh-val { font-weight: 700; color: var(--accent-gold); font-family: var(--font-mono); }
/* 消息提示 */
/* 刷新栏 */
.refresh-bar {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px;
}
.refresh-hint { font-size: 11px; color: #7f8c8d; flex: 1; }
.refresh-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  background: rgba(52,73,94,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  font-size: 12px; color: #ecf0f1;
  cursor: pointer; white-space: nowrap;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) { background: rgba(52,73,94,0.8); border-color: rgba(255,255,255,0.2); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.r-cost { font-size: 10px; color: #f1c40f; }

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
.ic-type { font-size: 10px; color: #95a5a6; background: rgba(255,255,255,0.06); padding: 2px 5px; border-radius: 4px; display: inline-block; }
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