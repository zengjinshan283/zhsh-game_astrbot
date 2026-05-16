<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏪 商城</div><div class="location-path">💰铜币：<span class="text-gold">{{ formatMoney(userStore.money) }}</span></div></div>
<div v-if="error" class="card" style="border-color:#73281c;padding:3px 8px;">
<p style="color:#b85a3a;font-size:11px;margin:0;">❌ {{ error }}</p>
</div>
<div v-if="success" class="card" style="border-color:#2e5a3b;padding:3px 8px;">
<p style="color:#2e5a3b;font-size:11px;margin:0;">✅ {{ success }}</p>
</div>

<!-- 分类标签 -->
<div class="tab-bar">
<a href="javascript:void(0)" :class="'btn '+(activeTab===item.key?'btn-primary':'btn-secondary')" v-for="item in categories" :key="item.key" @click="activeTab=item.key">{{ item.icon }} {{ item.label }}</a>
</div>

<!-- 商品列表 -->
<div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
<div v-else-if="!filteredItems.length" class="card"><div class="empty-state">该分类暂无商品</div></div>
<div v-else>
<div class="card" v-for="item in filteredItems" :key="item.id" style="padding:6px 10px;margin-bottom:6px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div style="flex:1;min-width:0;">
<div style="font-size:13px;font-weight:600;color:#ddd;">
{{ getItemIcon(item) }} {{ item.name }}
</div>
<p class="item-desc">{{ item.description }}</p>
<div style="font-size:10px;color:#8a7350;margin-top:2px;">
<span v-if="item.atk_min>0">攻击+{{ item.atk_min }}~{{ item.atk_max }}</span>
<span v-if="item.def>0">防御+{{ item.def }}</span>
<span v-if="item.hp_max>0">HP+{{ item.hp_max }}</span>
<span v-if="item.agility>0">敏捷+{{ item.agility }}</span>
</div>
</div>
<div style="text-align:right;flex-shrink:0;margin-left:8px;">
<div style="font-size:14px;font-weight:bold;color:#c9a84c;">{{ formatMoney(item.price) }}💰</div>
<div style="display:flex;align-items:center;gap:3px;margin-top:4px;">
<div style="display:inline-flex;align-items:center;border:1px solid rgba(169,119,78,0.2);border-radius:3px;overflow:hidden;">
<button style="width:24px;height:24px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="qtyMap[item.id]=Math.max(1,(qtyMap[item.id]||1)-1)">−</button>
<input type="number" v-model.number="qtyMap[item.id]" min="1" max="99" style="width:36px;height:24px;border:none;border-left:1px solid #ddd;border-right:1px solid #ddd;text-align:center;font-size:11px;outline:none;">
<button style="width:24px;height:24px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="qtyMap[item.id]=Math.min(99,(qtyMap[item.id]||1)+1)">+</button>
</div>
<button class="btn btn-primary" style="font-size:10px;padding:4px 8px;" @click="buyItem(item)" :disabled="purchasing === item.id">购买</button>
</div>
</div>
</div>
</div>
</div>

<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore = useUserStore();
const allItems = ref([]);
const categories = ref([]);
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

const filteredItems = computed(() => {
  return allItems.value.filter(i => i.category === activeTab.value);
});

async function loadMall() {
  loading.value = true;
  error.value = '';
  try {
    const d = await Api.get('/mall');
    categories.value = d.categories || [];
    allItems.value = d.items || [];
    if (categories.value.length && !categories.value.find(c => c.key === activeTab.value)) {
      activeTab.value = categories.value[0].key;
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function buyItem(item) {
  error.value = '';
  success.value = '';
  const qty = qtyMap[item.id] || 1;
  purchasing.value = item.id;
  try {
    const d = await Api.post('/mall/buy', { item_id: item.id, quantity: qty });
    success.value = d.msg || `购买 ${item.name}×${qty} 成功！`;
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
  } catch (e) {
    error.value = e.message;
  } finally {
    purchasing.value = 0;
  }
}

onMounted(loadMall);
</script>