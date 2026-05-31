<template>
<div class="auction-page">
  <div class="auction-bg"></div>

  <!-- 顶部 HUD -->
  <div class="au-hud">
    <div class="au-title">🔨 拍卖行</div>
    <div class="au-balance">
      <span class="au-icon">💰</span>
      <span class="au-val">{{ formatMoney(userStore.money) }} 铜</span>
    </div>
  </div>

  <!-- 消息 -->
  <div v-if="error"  class="au-msg au-err">❌ {{ error }}</div>
  <div v-if="success" class="au-msg au-ok">✅ {{ success }}</div>

  <!-- 主Tab: 浏览/我的拍卖/我的竞价/成交/关注 -->
  <div class="tab-scroll">
    <button v-for="t in mainTabs" :key="t.key" class="tab-btn"
      :class="{active: activeMainTab === t.key}" @click="switchMainTab(t.key)">
      <span>{{ t.icon }}</span><span>{{ t.label }}</span>
    </button>
  </div>

  <!-- 发布拍卖按钮 (仅在看"浏览"/"我的拍卖"时显示) -->
  <div v-if="activeMainTab === 'browse' || activeMainTab === 'selling'" class="publish-bar">
    <button class="publish-btn" @click="openPublishModal" :disabled="publishLoading">
      📋 发布拍卖
    </button>
  </div>

  <!-- 子Tab: 分类(浏览模式) -->
  <div v-if="activeMainTab === 'browse'" class="tab-scroll sub-tabs">
    <button class="tab-btn" :class="{active: !filterCategory}" @click="filterCategory = null">全部</button>
    <button v-for="c in categories" :key="c.id" class="tab-btn"
      :class="{active: filterCategory === c.id}" @click="filterCategory = c.id">
      <span>{{ c.icon }}</span><span>{{ c.name }}</span>
    </button>
  </div>

  <!-- 加载 / 空状态 -->
  <div v-if="loading" class="au-loading">加载中...</div>
  <div v-else-if="!displayList.length" class="au-empty">
    {{ emptyText }}
  </div>

  <!-- 拍卖列表 -->
  <div v-else class="au-list">
    <div v-for="a in displayList" :key="a.id" class="au-card"
      :class="{'au-ended': a.status !== 0, 'au-ended-won': a.winner_id === userStore.id}">

      <!-- 左: 图标 -->
      <div class="ac-left">
        <div class="ac-icon">{{ getItemIcon(a) }}</div>
        <div class="ac-status-badge" v-if="a.status !== 0">
          {{ statusLabel(a) }}
        </div>
      </div>

      <!-- 中: 信息 -->
      <div class="ac-body">
        <div class="ac-name">{{ a.title || a.item_name }}</div>
        <div class="ac-meta">
          <span class="ac-cat">{{ getCatName(a.category_id) }}</span>
          <span class="ac-seller">卖家: {{ a.seller_name }}</span>
          <span class="ac-bids">出价{{ a.bid_count }}次</span>
        </div>
        <div class="ac-price-row">
          <span class="ac-current-price">{{ formatMoney(a.current_price) }}铜</span>
          <span v-if="a.buyout_price > 0" class="ac-buyout">一口价: {{ formatMoney(a.buyout_price) }}铜</span>
        </div>
        <div class="ac-time" :class="{'ac-time-urgent': isUrgent(a)}">
          ⏰ {{ getTimeLeft(a) }}
        </div>
        <!-- 我的最后出价 -->
        <div v-if="activeMainTab === 'bidding' && a.my_last_bid" class="ac-my-bid">
          我的出价: {{ formatMoney(a.my_last_bid) }}铜
          <span v-if="a.highest_bidder_id === userStore.id" class="ac-winning">当前最高 ⭐</span>
          <span v-else class="ac-outbid">已被超越</span>
        </div>
      </div>

      <!-- 右: 操作 -->
      <div class="ac-right">
        <div v-if="a.seller_id !== userStore.id && a.status === 0" class="ac-bid-area">
          <div class="bid-ctrl">
            <button class="bid-btn" @click="a._bidQty = Math.max(a.starting_price, (a._bidQty||a.current_price) - stepPrice(a))">−</button>
            <input type="number" v-model.number="a._bidQty" class="bid-input"
              :min="a.highest_bidder_id ? a.current_price + stepPrice(a) : a.starting_price">
            <button class="bid-btn" @click="a._bidQty += stepPrice(a)">+</button>
          </div>
          <button class="auction-btn bid-confirm-btn" @click="quickBid(a)">出价</button>
        </div>

        <div class="ac-actions">
          <button v-if="a.seller_id !== userStore.id && a.status === 0 && a.buyout_price > 0"
            class="auction-btn buyout-btn"
            @click="doBuyout(a)">一口价</button>
          <button class="auction-btn watch-btn"
            :class="{watching: a.is_watching}"
            @click="toggleWatch(a)">
            {{ a.is_watching ? '⭐已关注' : '☆关注' }}
          </button>
          <button class="auction-btn detail-btn" @click="goDetail(a)">详情</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部翻页 -->
  <div v-if="totalPages > 1" class="pagination">
    <button class="pg-btn" :disabled="page <= 1" @click="page--; loadAuctions()">上一页</button>
    <span class="pg-info">{{ page }} / {{ totalPages }}</span>
    <button class="pg-btn" :disabled="page >= totalPages" @click="page++; loadAuctions()">下一页</button>
  </div>

  <router-link to="/citymap" class="back-btn">← 返回地图</router-link>

  <!-- 发布拍卖弹窗 -->
  <div v-if="showPublishModal" class="modal-overlay" @click.self="showPublishModal=false">
    <div class="modal-box">
      <div class="modal-title">📋 发布拍卖</div>

      <div class="modal-section">
        <label class="modal-label">选择物品 (背包中未装备)</label>
        <div v-if="publishItems.length === 0" class="modal-empty">背包中无可拍卖物品</div>
        <div v-else class="inv-grid">
          <div v-for="it in publishItems" :key="it.inv_id"
            class="inv-item" :class="{selected: selectedInvId === it.inv_id}"
            @click="selectedInvId = it.inv_id">
            <div class="inv-icon">{{ getItemIconById(it.item_id) }}</div>
            <div class="inv-name">{{ it.name }}</div>
            <div class="inv-qty">x{{ it.quantity }}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <label class="modal-label">拍卖标题</label>
        <input v-model="pubForm.title" class="modal-input" placeholder="例如: 极品倚天剑" maxlength="100">
      </div>

      <div class="modal-section">
        <label class="modal-label">分类</label>
        <select v-model="pubForm.category_id" class="modal-input">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
        </select>
      </div>

      <div class="modal-row">
        <div class="modal-section half">
          <label class="modal-label">起拍价 (铜币)</label>
          <input type="number" v-model.number="pubForm.starting_price" class="modal-input" min="1">
        </div>
        <div class="modal-section half">
          <label class="modal-label">一口价 (铜币,0=无)</label>
          <input type="number" v-model.number="pubForm.buyout_price" class="modal-input" min="0">
        </div>
      </div>

      <div class="modal-section">
        <label class="modal-label">持续时长</label>
        <select v-model="pubForm.duration_hours" class="modal-input">
          <option :value="6">6小时</option>
          <option :value="12">12小时</option>
          <option :value="24">24小时</option>
          <option :value="48">48小时</option>
          <option :value="72">3天</option>
          <option :value="168">7天</option>
        </select>
      </div>

      <div class="modal-section">
        <label class="modal-label">描述 (可选)</label>
        <textarea v-model="pubForm.description" class="modal-input" rows="3" maxlength="500"
          placeholder="补充物品属性说明..."></textarea>
      </div>

      <div class="modal-err" v-if="pubError">{{ pubError }}</div>

      <div class="modal-actions">
        <button class="modal-cancel" @click="showPublishModal=false">取消</button>
        <button class="modal-confirm" @click="doPublish" :disabled="publishing">发布拍卖</button>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal=false">
    <div class="modal-box wide">
      <div class="modal-title">{{ selectedAuction.title || selectedAuction.item_name }}</div>

      <div class="detail-section">
        <div class="detail-row">
          <span class="detail-label">物品:</span><span>{{ selectedAuction.item_name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">卖家:</span><span>{{ selectedAuction.seller_name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">当前价:</span>
          <span class="price-highlight">{{ formatMoney(selectedAuction.current_price) }}铜</span>
        </div>
        <div class="detail-row" v-if="selectedAuction.buyout_price > 0">
          <span class="detail-label">一口价:</span><span>{{ formatMoney(selectedAuction.buyout_price) }}铜</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">出价次数:</span><span>{{ selectedAuction.bid_count }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">剩余时间:</span>
          <span :class="{'ac-time-urgent': isUrgent(selectedAuction)}">{{ getTimeLeft(selectedAuction) }}</span>
        </div>
        <div class="detail-row" v-if="selectedAuction.description">
          <span class="detail-label">描述:</span><span>{{ selectedAuction.description }}</span>
        </div>
      </div>

      <!-- 出价记录 -->
      <div class="detail-section" v-if="detailBids.length">
        <div class="detail-subtitle">出价记录</div>
        <div v-for="b in detailBids" :key="b.id" class="bid-record"
          :class="{top: b.is_winning}">
          <span>{{ b.bidder_name }} ({{ b.bidder_level }}级)</span>
          <span class="bid-price">{{ formatMoney(b.bid_price) }}铜</span>
          <span>{{ formatTime(b.created_at) }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="modal-cancel" @click="showDetailModal=false">关闭</button>
        <button v-if="selectedAuction.seller_id !== userStore.id && selectedAuction.status === 0"
          class="modal-confirm" @click="openBidFromDetail">去出价</button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';
import router from '../router';

const userStore = useUserStore();
const loading = ref(false);
const error = ref('');
const success = ref('');
const categories = ref([]);
const activeMainTab = ref('browse');
const filterCategory = ref(null);
const auctionList = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 15;
const watchMap = ref({});
const selectedAuction = ref({});
const detailBids = ref([]);
const showDetailModal = ref(false);

// 发布相关
const showPublishModal = ref(false);
const publishItems = ref([]);
const selectedInvId = ref(null);
const pubForm = reactive({ title: '', category_id: 7, starting_price: 100, buyout_price: 0, duration_hours: 24, description: '' });
const pubError = ref('');
const publishing = ref(false);
const publishLoading = ref(false);

const mainTabs = [
  { key: 'browse',   label: '浏览',     icon: '🔍' },
  { key: 'selling', label: '我的拍卖',  icon: '📤' },
  { key: 'bidding', label: '我的竞价',  icon: '🎯' },
  { key: 'won',     label: '我成交的',  icon: '🏆' },
  { key: 'watch',   label: '我关注的',  icon: '⭐' },
];

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1);

const displayList = computed(() => {
  if (activeMainTab.value === 'browse') {
    if (!filterCategory.value) return auctionList.value;
    return auctionList.value.filter(a => a.category_id === filterCategory.value);
  }
  return auctionList.value;
});

const emptyText = computed(() => {
  const map = {
    browse: '当前没有进行中的拍卖', selling: '暂无正在拍卖的物品',
    bidding: '暂无正在竞价的拍卖', won: '暂无成交记录', watch: '暂无关注的拍卖',
  };
  return map[activeMainTab.value] || '暂无数据';
});

function getCatName(cid) {
  const c = categories.value.find(c => c.id === cid);
  return c ? `${c.icon} ${c.name}` : '其他';
}

function stepPrice(a) {
  return Math.max(100, Math.ceil(a.current_price * 0.05));
}

function getItemIconById(itemId) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍', consumable: '💊', material: '📦' };
  return icons[itemId] || '📦';
}

function getItemIcon(a) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍', consumable: '💊', material: '📦' };
  return icons[a.item_type] || '📦';
}

function getTimeLeft(a) {
  if (a.status !== 0) return statusLabel(a);
  const now = Date.now();
  const end = new Date(a.end_time).getTime();
  const diff = end - now;
  if (diff <= 0) return '已到期';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `剩余${h}小时${m}分`;
  return `剩余${m}分钟`;
}

function isUrgent(a) {
  if (a.status !== 0) return false;
  const diff = new Date(a.end_time).getTime() - Date.now();
  return diff > 0 && diff < 3600000; // 不足1小时
}

function statusLabel(a) {
  if (a.status === 1) return '已成交';
  if (a.status === 2) return '流拍';
  if (a.status === 3) return '已取消';
  return '';
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

async function loadAuctions() {
  loading.value = true; error.value = '';
  try {
    const params = new URLSearchParams({ page: page.value, pageSize });
    if (filterCategory.value) params.set('category_id', filterCategory.value);
    if (activeMainTab.value === 'browse') {
      const data = await Api.get('/auction?' + params.toString());
      auctionList.value = data.list || [];
      total.value = data.total || 0;
      if (data.categories) categories.value = data.categories;
    } else if (activeMainTab.value === 'selling') {
      const data = await Api.get('/auction/my/selling');
      auctionList.value = data.list || [];
      total.value = data.list.length;
    } else if (activeMainTab.value === 'bidding') {
      const data = await Api.get('/auction/my/bidding');
      auctionList.value = data.list || [];
      total.value = data.list.length;
    } else if (activeMainTab.value === 'won') {
      const data = await Api.get('/auction/my/won');
      auctionList.value = data.list || [];
      total.value = data.list.length;
    } else if (activeMainTab.value === 'watch') {
      const data = await Api.get('/auction/watch/list');
      auctionList.value = data.list || [];
      total.value = data.list.length;
    }
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

async function switchMainTab(key) {
  activeMainTab.value = key;
  page.value = 1;
  await loadAuctions();
}

async function quickBid(a) {
  const bidPrice = a._bidQty || a.current_price + stepPrice(a);
  error.value = ''; success.value = '';
  try {
    const data = await Api.post(`/auction/${a.id}/bid`, { bid_price: bidPrice });
    a.current_price = data.current_price;
    a.bid_count = data.bid_count;
    a._bidQty = data.current_price + stepPrice(a);
    userStore.money = (userStore.money || 0) - bidPrice;
    success.value = `出价成功，当前${data.current_price}铜`;
    setTimeout(() => { success.value = ''; }, 2500);
  } catch (e) { error.value = e.message; }
}

async function doBuyout(a) {
  error.value = ''; success.value = '';
  if (!confirm(`确定以${formatMoney(a.buyout_price)}铜一口价购买？`)) return;
  try {
    const data = await Api.post(`/auction/${a.id}/buyout`);
    a.status = 1;
    userStore.money = (userStore.money || 0) - a.buyout_price;
    success.value = `一口价购买成功！花费${formatMoney(a.buyout_price)}铜`;
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (e) { error.value = e.message; }
}

async function toggleWatch(a) {
  try {
    const data = await Api.post(`/auction/watch/${a.id}`);
    a.is_watching = data.watching ? 1 : 0;
  } catch (e) { error.value = e.message; }
}

async function goDetail(a) {
  error.value = '';
  try {
    const data = await Api.get(`/auction/${a.id}`);
    selectedAuction.value = data.auction;
    detailBids.value = data.bids || [];
    showDetailModal.value = true;
  } catch (e) { error.value = e.message; }
}

function openBidFromDetail() {
  showDetailModal.value = false;
  switchMainTab('browse').then(() => {
    const found = auctionList.value.find(a => a.id === selectedAuction.value.id);
    if (found) {
      found._bidQty = found.current_price + stepPrice(found);
      document.querySelector('.au-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// 发布
async function openPublishModal() {
  showPublishModal.value = true;
  pubError.value = '';
  pubForm.title = '';
  pubForm.category_id = 7;
  pubForm.starting_price = 100;
  pubForm.buyout_price = 0;
  pubForm.duration_hours = 24;
  pubForm.description = '';
  selectedInvId.value = null;
  publishLoading.value = true;
  try {
    const data = await Api.get('/inventory');
    const rawItems = data.items || [];
    publishItems.value = rawItems.filter(it => !it.equipped).map(it => ({
      inv_id: it.id, item_id: it.item_id, name: it.name,
      quantity: it.quantity, type: it.type,
    }));
  } catch (e) {
    pubError.value = '加载背包失败';
    publishItems.value = [];
  } finally { publishLoading.value = false; }
}

async function doPublish() {
  pubError.value = '';
  if (!selectedInvId.value) { pubError.value = '请选择物品'; return; }
  if (!pubForm.title.trim()) { pubError.value = '请输入标题'; return; }
  if (!pubForm.starting_price || pubForm.starting_price < 1) { pubError.value = '起拍价至少1铜'; return; }
  publishing.value = true;
  try {
    await Api.post('/auction', {
      item_id: selectedInvId.value,
      category_id: pubForm.category_id,
      title: pubForm.title,
      description: pubForm.description,
      starting_price: pubForm.starting_price,
      buyout_price: pubForm.buyout_price || 0,
      duration_hours: pubForm.duration_hours,
    });
    success.value = '拍卖发布成功';
    showPublishModal.value = false;
    setTimeout(() => { success.value = ''; }, 3000);
    if (activeMainTab.value === 'selling') await loadAuctions();
  } catch (e) { pubError.value = e.message; }
  finally { publishing.value = false; }
}

// 定时刷新
let tickTimer = null;
function startTick() {
  tickTimer = setInterval(() => {
    auctionList.value = [...auctionList.value];
  }, 30000);
}

onMounted(async () => {
  await loadAuctions();
  startTick();
});
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});
</script>

<style scoped>
.auction-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.auction-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1208 50%, #0d1117 100%);
  pointer-events: none;
}

.au-hud { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
}
.au-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.au-balance { display: flex; align-items: center; gap: 5px; }
.au-icon { font-size: 14px; }
.au-val { font-size: 13px; font-weight: 600; color: #f1c40f; }

.au-msg { position: relative; z-index: 2; border-radius: 8px; padding: 7px 10px; font-size: 11px; }
.au-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.au-ok  { background: rgba(39,174,96,0.1);  border: 1px solid rgba(39,174,96,0.3);  color: #2ecc71; }

.tab-scroll { position: relative; z-index: 2; display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.tab-scroll::-webkit-scrollbar { height: 2px; }
.tab-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.tab-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px; font-size: 11px; color: #7f8c8d; cursor: pointer; white-space: nowrap;
  transition: all 0.2s;
}
.tab-btn.active { background: rgba(52,152,219,0.12); border-color: rgba(52,152,219,0.4); color: #3498db; }

.sub-tabs { padding-left: 4px; }
.sub-tabs .tab-btn { font-size: 10px; padding: 4px 10px; }

.publish-bar { position: relative; z-index: 2; display: flex; justify-content: flex-end; }
.publish-btn { padding: 7px 16px; background: rgba(39,174,96,0.15); border: 1px solid rgba(39,174,96,0.4);
  border-radius: 20px; font-size: 12px; color: #2ecc71; cursor: pointer; transition: all 0.2s; }
.publish-btn:hover { background: rgba(39,174,96,0.25); }
.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.au-loading, .au-empty { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 20px; }

.au-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.au-card { display: flex; align-items: flex-start; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 12px; transition: all 0.2s;
}
.au-card:hover { background: rgba(255,255,255,0.07); }
.au-card.au-ended { opacity: 0.65; }
.au-card.au-ended-won { border-color: rgba(39,174,96,0.4); background: rgba(39,174,96,0.05); }

.ac-left { flex-shrink: 0; position: relative; }
.ac-icon { font-size: 26px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border-radius: 10px; }
.ac-status-badge { position: absolute; top: -6px; right: -6px; font-size: 9px;
  background: rgba(150,150,150,0.8); color: #fff; border-radius: 6px; padding: 1px 4px; white-space: nowrap; }

.ac-body { flex: 1; min-width: 0; }
.ac-name { font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-meta { display: flex; flex-wrap: wrap; gap: 4px; font-size: 10px; color: #7f8c8d; margin-bottom: 4px; }
.ac-cat { color: #95a5a6; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
.ac-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.ac-current-price { font-size: 14px; font-weight: 700; color: #f1c40f; }
.ac-buyout { font-size: 10px; color: #e74c3c; }
.ac-time { font-size: 11px; color: #95a5a6; }
.ac-time-urgent { color: #e74c3c; font-weight: 600; }
.ac-my-bid { font-size: 10px; color: #7f8c8d; }
.ac-winning { color: #2ecc71; font-weight: 600; margin-left: 4px; }
.ac-outbid { color: #e74c3c; margin-left: 4px; }

.ac-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.ac-bid-area { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.bid-ctrl { display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; overflow: hidden; }
.bid-btn { width: 22px; height: 24px; border: none; background: rgba(255,255,255,0.06); color: #bdc3c7; font-size: 12px; cursor: pointer; }
.bid-input { width: 70px; height: 24px; border: none; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1);
  text-align: center; font-size: 11px; background: rgba(255,255,255,0.04); color: #f0f0f0; outline: none; }

.ac-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.auction-btn { padding: 4px 10px; border: none; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.bid-confirm-btn { background: linear-gradient(135deg, #1a3a5a, #2980b9); color: #fff; }
.buyout-btn { background: linear-gradient(135deg, #5a1a1a, #c0392b); color: #fff; }
.watch-btn { background: rgba(255,255,255,0.06); color: #7f8c8d; border: 1px solid rgba(255,255,255,0.1); }
.watch-btn.watching { background: rgba(241,196,15,0.1); color: #f1c40f; border-color: rgba(241,196,15,0.3); }
.detail-btn { background: rgba(255,255,255,0.06); color: #95a5a6; border: 1px solid rgba(255,255,255,0.1); }
.auction-btn:hover:not(:disabled) { opacity: 0.85; }
.auction-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pagination { position: relative; z-index: 2; display: flex; justify-content: center; align-items: center; gap: 12px; }
.pg-btn { padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; font-size: 11px; color: #95a5a6; cursor: pointer; transition: all 0.2s; }
.pg-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-info { font-size: 11px; color: #7f8c8d; }

.back-btn { position: relative; z-index: 2; display: block; text-align: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #95a5a6;
  padding: 10px; border-radius: 10px; font-size: 12px; text-decoration: none; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }

/* ===== Modal ===== */
.modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; padding: 10px; }
.modal-box { background: #1a1d23; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
  padding: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-box.wide { max-width: 560px; }
.modal-title { font-size: 15px; font-weight: 700; color: #f0f0f0; margin-bottom: 16px; text-align: center; }
.modal-section { margin-bottom: 14px; }
.modal-label { display: block; font-size: 11px; color: #95a5a6; margin-bottom: 5px; }
.modal-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #f0f0f0; box-sizing: border-box; outline: none;
  transition: border-color 0.2s; }
.modal-input:focus { border-color: rgba(52,152,219,0.5); }
.modal-input::placeholder { color: #555; }
.modal-row { display: flex; gap: 12px; }
.modal-section.half { flex: 1; }
.modal-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3);
  border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #e74c3c; margin-bottom: 12px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.modal-cancel { padding: 8px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; font-size: 12px; color: #95a5a6; cursor: pointer; }
.modal-confirm { padding: 8px 16px; background: linear-gradient(135deg, #1a4a2a, #27ae60);
  border: none; border-radius: 8px; font-size: 12px; font-weight: 600; color: #fff; cursor: pointer; }
.modal-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* 背包物品选择 */
.inv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 200px; overflow-y: auto; }
.inv-item { display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 8px 4px; cursor: pointer; transition: all 0.2s; }
.inv-item:hover { background: rgba(255,255,255,0.08); }
.inv-item.selected { border-color: rgba(39,174,96,0.5); background: rgba(39,174,96,0.1); }
.inv-icon { font-size: 22px; }
.inv-name { font-size: 9px; color: #95a5a6; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
.inv-qty { font-size: 9px; color: #7f8c8d; }

/* 详情弹窗 */
.detail-section { margin-bottom: 14px; }
.detail-subtitle { font-size: 12px; font-weight: 600; color: #95a5a6; margin-bottom: 8px; }
.detail-row { display: flex; gap: 8px; font-size: 12px; color: #bdc3c7; margin-bottom: 5px; }
.detail-label { color: #7f8c8d; flex-shrink: 0; }
.price-highlight { font-size: 14px; font-weight: 700; color: #f1c40f; }
.bid-record { display: flex; gap: 8px; justify-content: space-between; align-items: center;
  padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 4px;
  font-size: 11px; color: #95a5a6; }
.bid-record.top { border: 1px solid rgba(241,196,15,0.3); background: rgba(241,196,15,0.05); }
.bid-price { font-weight: 600; color: #f1c40f; }
</style>