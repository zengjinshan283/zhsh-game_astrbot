<template>
<div class="page codex-page">
  <div class="location-bar">
    <div class="location-name">📜 装备图鉴</div>
    <div class="location-path">
      <span class="unlock-count">{{ unlockedCount }}/{{ total }}</span> 已解锁
    </div>
  </div>

  <!-- 进度条 -->
  <div class="progress-card">
    <div class="progress-info">
      <span class="progress-label">收集进度</span>
      <span class="progress-value">{{ Math.round(unlockedCount/total*100) }}%</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar" :style="{ width: (unlockedCount/total*100) + '%' }"></div>
    </div>
  </div>

  <!-- 分类切换 -->
  <div class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab-btn"
      :class="{ active: activeTab === tab.value }"
      @click="switchTab(tab.value)"
    >
      {{ tab.icon }} {{ tab.label }}
    </button>
  </div>

  <!-- 加载状态 -->
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner"></div>
    加载中...
  </div>

  <!-- 空状态 -->
  <div v-else-if="!filteredItems.length" class="empty-state">
    暂无{{ activeTab === 'all' ? '' : tabs.find(t => t.value === activeTab)?.label }}装备
  </div>

  <!-- 装备网格 -->
  <div v-else class="codex-grid">
    <div
      v-for="item in filteredItems"
      :key="item.id"
      class="codex-item"
      :class="{
        unlocked: item.unlocked,
        locked: !item.unlocked,
        ['quality-' + item.quality]: item.quality
      }"
      @click="showDetail(item)"
    >
      <div class="item-icon">
        <span v-if="item.unlocked">{{ getItemIcon(item) }}</span>
        <span v-else class="locked-icon">❓</span>
      </div>
      <div class="item-name" :class="{ 'locked-name': !item.unlocked }">
        {{ item.unlocked ? item.name : '???' }}
      </div>
      <div class="item-type">
        <span v-if="item.unlocked">{{ getTypeLabel(item.type) }}</span>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-icon">{{ getItemIcon(selectedItem) }}</div>
        <div class="modal-title">
          <div class="modal-item-name">{{ selectedItem.name }}</div>
          <div class="modal-item-type">{{ getTypeLabel(selectedItem.type) }} · {{ getQualityLabel(selectedItem.quality) }}</div>
        </div>
        <button class="modal-close" @click="showModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <div class="detail-label">属性</div>
          <div class="detail-stats">
            <div v-if="selectedItem.atk > 0" class="stat-row">
              <span class="stat-name">⚔️ 攻击力</span>
              <span class="stat-value">{{ selectedItem.atk }}</span>
            </div>
            <div v-if="selectedItem.def_val > 0" class="stat-row">
              <span class="stat-name">🛡️ 防御力</span>
              <span class="stat-value">{{ selectedItem.def_val }}</span>
            </div>
            <div v-if="selectedItem.magic_atk > 0" class="stat-row">
              <span class="stat-name">✨ 魔法攻击</span>
              <span class="stat-value">{{ selectedItem.magic_atk }}</span>
            </div>
            <div v-if="selectedItem.magic_def > 0" class="stat-row">
              <span class="stat-name">🔮 魔法防御</span>
              <span class="stat-value">{{ selectedItem.magic_def }}</span>
            </div>
            <div v-if="selectedItem.hp > 0" class="stat-row">
              <span class="stat-name">❤️ 生命值</span>
              <span class="stat-value">+{{ selectedItem.hp }}</span>
            </div>
            <div v-if="selectedItem.mp > 0" class="stat-row">
              <span class="stat-name">💧 魔法值</span>
              <span class="stat-value">+{{ selectedItem.mp }}</span>
            </div>
            <div v-if="!selectedItem.atk && !selectedItem.def_val && !selectedItem.magic_atk && !selectedItem.magic_def && !selectedItem.hp && !selectedItem.mp" class="stat-row">
              <span class="stat-name" style="color:#888;">无额外属性</span>
            </div>
          </div>
        </div>
        <div class="detail-section" v-if="selectedItem.description">
          <div class="detail-label">描述</div>
          <div class="detail-desc">{{ selectedItem.description }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">来源</div>
          <div class="detail-source">{{ selectedItem.source || '未知' }}</div>
        </div>
        <div v-if="selectedItem.unlocked" class="detail-section unlock-info">
          <div class="unlocked-badge">✅ 已收录图鉴</div>
          <div class="unlock-time">{{ formatTime(selectedItem.unlocked_at) }} 解锁</div>
        </div>
        <div v-else class="detail-section">
          <div class="locked-badge">❓ 尚未获得</div>
          <div class="lock-tip">击败怪物、开宝箱或商店购买可解锁</div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const loading = ref(true);
const items = ref([]);
const activeTab = ref('all');
const showModal = ref(false);
const selectedItem = ref(null);

const tabs = [
  { label: '全部', value: 'all', icon: '📦' },
  { label: '武器', value: '1', icon: '🗡️' },
  { label: '防具', value: '2', icon: '🛡️' },
  { label: '饰品', value: '3', icon: '💍' }
];

const total = computed(() => items.value.length);
const unlockedCount = computed(() => items.value.filter(i => i.unlocked).length);
const filteredItems = computed(() => {
  if (activeTab.value === 'all') return items.value;
  return items.value.filter(i => String(i.type) === activeTab.value);
});

function getItemIcon(item) {
  if (item.type == 1) return '🗡️';
  if (item.type == 2) return '🛡️';
  if (item.type == 3) return '💍';
  return '📦';
}

function getTypeLabel(type) {
  if (type == 1) return '武器';
  if (type == 2) return '防具';
  if (type == 3) return '饰品';
  return '其他';
}

function getQualityLabel(quality) {
  const map = { 1: '普通', 2: '优秀', 3: '精良', 4: '史诗', 5: '传说' };
  return map[quality] || '普通';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function load() {
  try {
    loading.value = true;
    const type = activeTab.value === 'all' ? '' : activeTab.value;
    const d = await Api.get('/codex/list', type ? { type } : {});
    items.value = d.items || [];
  } catch (e) {
    console.error('加载图鉴失败', e);
  } finally {
    loading.value = false;
  }
}

function switchTab(tab) {
  activeTab.value = tab;
  load();
}

function showDetail(item) {
  if (!item.unlocked) return;
  selectedItem.value = item;
  showModal.value = true;
}

onMounted(load);
</script>

<style scoped>
.codex-page {
  padding: 8px;
}

.progress-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #2a3a5a;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}

.progress-label {
  color: #8b9dc3;
}

.progress-value {
  color: #c9a758;
  font-weight: bold;
}

.progress-bar-wrap {
  height: 8px;
  background: #0f0f1a;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #c9a758 0%, #e8d5a3 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  padding: 8px 4px;
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 6px;
  color: #8b9dc3;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #2a3a5a 0%, #1a2744 100%);
  border-color: #c9a758;
  color: #c9a758;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #8b9dc3;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #2a3a5a;
  border-top-color: #c9a758;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #555;
  font-size: 14px;
}

.codex-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.codex-item {
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.codex-item.locked {
  opacity: 0.5;
  filter: grayscale(60%);
}

.codex-item.unlocked:hover {
  border-color: #c9a758;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(201, 167, 88, 0.2);
}

.codex-item.quality-4,
.codex-item.quality-5 {
  border-color: #8b5cf6;
}

.item-icon {
  font-size: 28px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.locked-icon {
  font-size: 24px;
  opacity: 0.5;
}

.item-name {
  font-size: 11px;
  color: #e8d5a3;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name.locked-name {
  color: #555;
}

.item-type {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
  border: 1px solid #3a4a6a;
  border-radius: 12px;
  width: 100%;
  max-width: 340px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a3a5a;
  gap: 12px;
}

.modal-icon {
  font-size: 36px;
}

.modal-title {
  flex: 1;
}

.modal-item-name {
  font-size: 16px;
  color: #e8d5a3;
  font-weight: bold;
}

.modal-item-type {
  font-size: 12px;
  color: #8b9dc3;
  margin-top: 2px;
}

.modal-close {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 16px;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.detail-stats {
  background: #0f0f1a;
  border-radius: 6px;
  padding: 8px 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.stat-name {
  color: #8b9dc3;
}

.stat-value {
  color: #c9a758;
  font-weight: bold;
}

.detail-desc {
  font-size: 13px;
  color: #8b9dc3;
  line-height: 1.5;
  background: #0f0f1a;
  border-radius: 6px;
  padding: 10px;
}

.detail-source {
  font-size: 13px;
  color: #8b9dc3;
  background: #0f0f1a;
  border-radius: 6px;
  padding: 8px 12px;
}

.unlock-info {
  text-align: center;
}

.unlocked-badge {
  color: #4ade80;
  font-size: 14px;
  font-weight: bold;
}

.unlock-time {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.locked-badge {
  color: #f87171;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}

.lock-tip {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 4px;
}

.unlock-count {
  color: #c9a758;
  font-weight: bold;
}
</style>