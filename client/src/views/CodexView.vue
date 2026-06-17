<template>
  <div class="page-wrap codex-page">

  <div class="page-hud"><div class="page-hud-title">📖 图鉴</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">{{ activeTab === 'pets' ? '🐾' : '📜' }}</div>
        <div class="hud-title">{{ activeTab === 'pets' ? '宠物图鉴' : '装备图鉴' }}</div>
      </div>
      <div class="hud-right" v-if="activeTab !== 'pets'">
        <span class="hud-counter">{{ unlockedCount }}/{{ total }}</span>
        <span class="hud-label">已解锁</span>
      </div>
      <div class="hud-right" v-else>
        <span class="hud-counter">{{ petsUnlocked }}/{{ petsTotal }}</span>
        <span class="hud-label">已解锁</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-card" v-if="activeTab !== 'pets'">
      <div class="progress-info">
        <span class="progress-label">收集进度</span>
        <span class="progress-value">{{ Math.round(unlockedCount/total*100) }}%</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" :style="{ width: (unlockedCount/total*100) + '%' }"></div>
      </div>
    </div>

    <!-- 宠物进度条 -->
    <div class="progress-card" v-else>
      <div class="progress-info">
        <span class="progress-label">收集进度</span>
        <span class="progress-value">{{ Math.round(petsUnlocked/Math.max(petsTotal,1)*100) }}%</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" :style="{ width: (petsUnlocked/Math.max(petsTotal,1)*100) + '%', background: 'linear-gradient(90deg, #c9a84c, #f1c40f)' }"></div>
      </div>
    </div>

    <!-- 分类切换 -->
    <div class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-btn"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 奖励面板 -->
    <div v-else-if="activeTab === 'rewards'">
      <div v-if="!rewards.length" class="empty-card">
        <div class="empty-icon">🎁</div>
        <div class="empty-text">暂无奖励</div>
      </div>
      <div v-else class="rewards-list">
        <div class="rewards-progress">
          <span>当前收集：{{ codexCount }} 件</span>
          <span>{{ nextReward ? '下一档：' + nextReward.require_count + '件' : '已满级' }}</span>
        </div>
        <div
          v-for="r in rewards"
          :key="r.id"
          class="reward-card"
          :class="{
            'reward-claimed': r.is_claimed,
            'reward-available': r.can_claim,
            'reward-locked': !r.can_claim && !r.is_claimed
          }"
        >
          <div class="rc-info">
            <div class="rc-title">{{ r.title }}</div>
            <div class="rc-desc">{{ r.description }}</div>
            <div class="rc-items">
              <span v-if="r.reward_money">💰 {{ r.reward_money }}铜币</span>
              <span v-if="r.reward_exp">✨ {{ r.reward_exp }}经验</span>
            </div>
          </div>
          <div class="rc-action">
            <div v-if="r.is_claimed" class="claimed-badge">✅ 已领取</div>
            <div v-else-if="r.can_claim">
              <button class="claim-btn" @click="claimReward(r)">领取</button>
            </div>
            <div v-else class="locked-badge">{{ r.current_count }}/{{ r.require_count }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 宠物网格 -->
    <div v-else-if="activeTab === 'pets'">
      <div v-if="petsLoading" class="loading-card">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
      <div v-else-if="!filteredPets.length" class="empty-card">
        <div class="empty-icon">🐾</div>
        <div class="empty-text">暂无宠物图鉴数据</div>
      </div>
      <div v-else class="pets-grid">
        <div v-for="p in filteredPets" :key="p.id" class="pet-codex-item" :class="{ unlocked: p.unlocked }">
          <div class="pci-icon" :style="{ color: p.quality_color }">{{ p.unlocked ? '🐾' : '❓' }}</div>
          <div class="pci-name">{{ p.unlocked ? p.name : '???' }}</div>
          <div class="pci-type" :style="{ color: p.quality_color }">{{ p.unlocked ? p.type_label : '未知' }}</div>
          <div class="pci-stats" v-if="p.unlocked">
            <span>⚔️{{ p.atk }}</span>
            <span>❤️{{ p.hp }}</span>
            <span>🛡️{{ p.def_val }}</span>
          </div>
          <div class="pci-skill" v-if="p.unlocked && p.skill_name">⚡{{ p.skill_name }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!filteredItems.length" class="empty-card">
      <div class="empty-icon">📦</div>
      <div class="empty-text">暂无{{ activeTab === 'all' ? '' : tabs.find(t => t.value === activeTab)?.label }}装备</div>
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
          <span>{{ getItemIcon(item) }}</span>
        </div>
        <div class="item-name">{{ item.name }}</div>
        <div class="item-type">{{ getTypeLabel(item.type) }}</div>
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
              <div v-if="!selectedItem.atk && !selectedItem.def_val" class="stat-row">
                <span class="stat-name" style="color:#555;">无战斗属性</span>
              </div>
            </div>
          </div>
          <div class="detail-section" v-if="selectedItem.description">
            <div class="detail-label">描述</div>
            <div class="detail-desc">{{ selectedItem.description }}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">来源</div>
            <div class="detail-source">{{ selectedItem.source || '击败怪物/商店购买/任务奖励' }}</div>
          </div>
          <div v-if="selectedItem.unlocked" class="detail-section unlock-info">
            <div class="unlocked-badge">✅ 已收录图鉴</div>
            <div class="unlock-time" v-if="selectedItem.unlocked_at">{{ formatTime(selectedItem.unlocked_at) }} 解锁</div>
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
import { globalAlert } from '../composables/useConfirm';

const loading = ref(true);
const items = ref([]);
const activeTab = ref('all');
const showModal = ref(false);
const selectedItem = ref(null);
const rewards = ref([]);
const codexCount = ref(0);
const pets = ref([]);
const petsLoading = ref(false);

const tabs = [
  { label: '全部', value: 'all', icon: '📦' },
  { label: '武器', value: '1', icon: '🗡️' },
  { label: '防具', value: '2', icon: '🛡️' },
  { label: '饰品', value: '3', icon: '💍' },
  { label: '消耗品', value: '4', icon: '🧪' },
  { label: '材料', value: '5', icon: '💎' },
  { label: '奖励', value: 'rewards', icon: '🎁' },
  { label: '宠物', value: 'pets', icon: '🐾' }
];

const total = computed(() => items.value.length);
const unlockedCount = computed(() => items.value.filter(i => i.unlocked).length);
const filteredItems = computed(() => {
  if (activeTab.value === 'all') return items.value;
  return items.value.filter(i => String(i.type) === activeTab.value);
});
const nextReward = computed(() => rewards.value.find(r => !r.is_claimed));
const filteredPets = computed(() => pets.value);
const petsTotal = computed(() => pets.value.length);
const petsUnlocked = computed(() => pets.value.filter(p => p.unlocked).length);

async function loadPets() {
  try {
    petsLoading.value = true;
    const d = await Api.get('/codex/pets');
    pets.value = d.pets || [];
  } catch (e) {} finally { petsLoading.value = false; }
}

function getItemIcon(item) {
  const map = { 1: '🗡️', 2: '🛡️', 3: '💍', 4: '🧪', 5: '💎' };
  return map[item.type] || '📦';
}
function getTypeLabel(type) {
  const map = { 1: '武器', 2: '防具', 3: '饰品', 4: '消耗品', 5: '材料' };
  return map[type] || '其他';
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
  } catch (e) {} finally { loading.value = false; }
}

async function loadRewards() {
  try {
    loading.value = true;
    const d = await Api.get('/codex/rewards');
    rewards.value = d.rewards || [];
    codexCount.value = d.current_count || 0;
  } catch (e) {} finally { loading.value = false; }
}

async function claimReward(r) {
  try {
    const d = await Api.post(`/codex/rewards/${r.id}/claim`);
    globalAlert(d.msg || '领取成功');
    await loadRewards();
  } catch (e) { globalAlert(e.message || '领取失败', 'error'); }
}

function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'rewards') loadRewards();
  else if (tab === 'pets') loadPets();
  else load();
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
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
.hud-right { display: flex; align-items: center; gap: 6px; }
.hud-counter { font-size: 16px; font-weight: 700; color: #c9a758; }
.hud-label { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }

.progress-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}
.progress-label { color: #7f8c8d; }
.progress-value { color: #c9a758; font-weight: 700; }
.progress-bar-wrap {
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #c9a758, #e8d5a3);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.tab-bar {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.tab-btn.active {
  background: rgba(201, 167, 88, 0.12);
  border-color: rgba(201, 167, 88, 0.3);
}
.tab-icon { font-size: 14px; }
.tab-label { font-size: 12px; font-weight: 600; color: #7f8c8d; }
.tab-btn.active .tab-label { color: #c9a758; }

.loading-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #c9a758;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.empty-card {
  position: relative;
  z-index: 2;
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

/* 宠物网格 */
.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}
.pet-codex-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 6px;
  text-align: center;
  transition: all 0.2s;
}
.pet-codex-item.unlocked {
  border-color: rgba(201,168,88,0.3);
  background: rgba(201,168,88,0.05);
}
.pet-codex-item:not(.unlocked) { opacity: 0.5; filter: grayscale(60%); }
.pci-icon { font-size: 24px; margin-bottom: 4px; }
.pci-name { font-size: 11px; font-weight: 600; color: #e8d5a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pci-type { font-size: 10px; margin-top: 2px; }
.pci-stats { display: flex; justify-content: center; gap: 3px; margin-top: 4px; font-size: 9px; color: #7f8c8d; }
.pci-skill { font-size: 9px; color: #c9a758; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.codex-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
  gap: 8px;
}

.codex-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.codex-item:hover:not(.locked) { transform: translateY(-2px); border-color: rgba(201, 167, 88, 0.3); }
.codex-item.locked { opacity: 0.5; filter: grayscale(60%); }
.codex-item.quality-4, .codex-item.quality-5 { border-color: rgba(139, 92, 246, 0.4); }

.item-icon { font-size: 26px; height: 34px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.locked-icon { font-size: 22px; opacity: 0.5; }
.item-name { font-size: 11px; color: #e8d5a3; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-name.locked-name { color: #555; }
.item-type { font-size: 10px; color: #555; margin-top: 2px; }

/* 奖励面板 */
.rewards-list {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rewards-progress {
  display: flex;
  justify-content: space-between;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  color: #7f8c8d;
}
.reward-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s;
}
.reward-card.reward-available { border-color: rgba(201,167,88,0.3); background: rgba(201,167,88,0.05); }
.reward-card.reward-claimed { opacity: 0.5; }
.reward-card.reward-locked { opacity: 0.5; }

.rc-info { flex: 1; }
.rc-title { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 4px; }
.rc-desc { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.rc-items { display: flex; gap: 12px; font-size: 12px; color: #c9a758; }

.rc-action { text-align: center; }
.claimed-badge { color: #27ae60; font-size: 12px; font-weight: 700; }
.locked-badge { color: #555; font-size: 12px; padding: 4px 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; }
.claim-btn {
  background: linear-gradient(135deg, #c9a758, #a08040);
  border: none;
  border-radius: 6px;
  color: #0a0a1a;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.claim-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(201,167,88,0.4); }

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
  backdrop-filter: blur(4px);
}
.modal-card {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 340px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  gap: 12px;
}
.modal-icon { font-size: 36px; }
.modal-title { flex: 1; }
.modal-item-name { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.modal-item-type { font-size: 12px; color: #7f8c8d; margin-top: 2px; }
.modal-close {
  background: none;
  border: none;
  color: #555;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}
.modal-close:hover { color: #888; }
.modal-body { padding: 16px; }
.detail-section { margin-bottom: 14px; }
.detail-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.detail-stats { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px 14px; }
.stat-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
.stat-name { color: #7f8c8d; }
.stat-value { color: #c9a758; font-weight: 700; }
.detail-desc { font-size: 13px; color: #7f8c8d; line-height: 1.5; }
.detail-source { font-size: 13px; color: #7f8c8d; }
.unlock-info { display: flex; flex-direction: column; gap: 4px; }
.unlocked-badge { color: #27ae60; font-size: 13px; font-weight: 700; }
.unlock-time { font-size: 11px; color: #555; }
.locked-badge { color: #7f8c8d; font-size: 12px; }
.lock-tip { font-size: 12px; color: #555; margin-top: 4px; }
</style>