<template>
  <div class="page-wrap pet-page">
    <!-- 顶部 HUD -->
    <div class="page-hud">
      <div class="hud-left">
        <div class="hud-icon">🐕</div>
        <div class="hud-title">宠物</div>
      </div>
      <div class="hud-count">{{ pets.length }}/{{ MAX }} 只</div>
    </div>

    <!-- 消息提示 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">
      {{ msg }}
    </div>

    <!-- 出战宠物 -->
    <div v-if="activePet" class="active-pet-card" :style="{ borderColor: petColors[activePet.type] }">
      <div class="ap-header">
        <div class="ap-avatar">{{ petEmojis[activePet.pet_id] || '🐕' }}</div>
        <div class="ap-info">
          <div class="ap-name" :style="{ color: petColors[activePet.type] }">
            {{ activePet.nickname }}
            <span class="ap-badge">⭐ 出战中</span>
          </div>
          <div class="ap-type" :style="{ color: petColors[activePet.type] }">{{ petTypeNames[activePet.type] }}</div>
        </div>
      </div>

      <div class="ap-stats">
        <div class="aps-item">
          <span class="aps-label">⭐等级</span>
          <span class="aps-value" :style="{ color: petColors[activePet.type] }">Lv.{{ activePet.level }}</span>
        </div>
        <div class="aps-item">
          <span class="aps-label">⚔️攻击</span>
          <span class="aps-value atk">{{ activePet.effective_atk }}</span>
        </div>
        <div class="aps-item">
          <span class="aps-label">❤️生命</span>
          <span class="aps-value hp">{{ activePet.effective_hp }}</span>
        </div>
      </div>

      <!-- 技能 -->
      <div v-if="activePet.skill_name" class="ap-skill">
        <span class="skill-icon">⚡</span>
        <span class="skill-name">{{ activePet.skill_name }}</span>
        <span class="skill-desc">{{ activePet.skill_desc }}</span>
      </div>

      <!-- 经验条 -->
      <div class="ap-exp">
        <div class="exp-bar">
          <div class="exp-fill" :style="{ width: activePetExpPct + '%', background: petColors[activePet.type] }"></div>
        </div>
        <div class="exp-text">
          {{ activePet.exp }}/{{ activePet.exp_max }} EXP
          <span v-if="activePet.exp < activePet.exp_max">，再获取 {{ activePet.exp_max - activePet.exp }} EXP 升级</span>
        </div>
      </div>

      <!-- 饱食度 -->
      <div class="ap-satiety">
        <div class="sat-label">🍖 饱食度 {{ activePet.satiety || 0 }}/100</div>
        <div class="sat-bar">
          <div class="sat-fill" :style="{ width: (activePet.satiety || 0) + '%', background: satColor }"></div>
        </div>
        <div class="sat-tip">饱食度耗尽时宠物无法参战，战斗中每回合-2</div>
      </div>

      <!-- 喂食按钮 -->
      <div class="feed-section">
        <div class="feed-label">🍖 喂食口粮：</div>
        <div v-if="petFoods && petFoods.length" class="feed-btns">
          <button v-for="food in petFoods" :key="food.item_id" class="feed-btn" @click="feedPet(food.item_id)">
            {{ food.name }} ×{{ food.quantity }}
          </button>
        </div>
        <div v-else class="feed-empty">🍖 暂无宠物食物，据说驯兽师处可以购买</div>
      </div>

      <div class="ap-actions">
        <button class="ap-release-btn" @click="releasePet(activePet)">放生</button>
        <button class="ap-rename-btn" @click="startRename(activePet)">✏️ 改名</button>
      </div>
    </div>

    <!-- 我的宠物列表 -->
    <div v-if="pets.length" class="pets-card">
      <div class="pets-header">🐾 我的宠物（{{ pets.length }}/{{ MAX }}）</div>
      <div class="pets-list">
        <div v-for="p in pets" :key="p.id" class="pet-item" :class="{ active: p.is_active }">
          <div class="pi-left">
            <span class="pi-emoji">{{ petEmojis[p.pet_id] || '🐕' }}</span>
            <div class="pi-info">
              <span class="pi-name" :style="{ color: petColors[p.type] }">
                {{ p.nickname }}
                <span class="pi-stars" :style="{ color: starColor(p.star || 1) }">★x{{ p.star || 1 }}</span>
              </span>
              <span class="pi-lv">Lv.{{ p.level }}</span>
              <span v-if="p.is_active" class="pi-active">⭐出战</span>
            </div>
          </div>
          <div class="pi-actions">
            <button class="pi-upgrade-btn" @click="upgrade(p)" :disabled="!canUpgrade(p)">⭐进阶</button>
            <button v-if="!p.is_active" class="pi-set-btn" @click="setActive(p)">出战</button>
            <span v-else class="pi-set-done">已出战</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 改名输入 -->
    <div v-if="renameTarget" class="rename-card">
      <input v-model="newName" type="text" maxlength="20" :placeholder="renameTarget.nickname" class="rename-input" />
      <button class="rename-confirm" @click="doRename">确认</button>
      <button class="rename-cancel" @click="renameTarget = null">取消</button>
    </div>

    <!-- 野外捕捉 -->
    <div v-if="!activePet && allSpecies.length" class="wild-card">
      <div class="wild-header">🗺️ 野外探索（捕捉宠物）</div>
      <div class="wild-list">
        <div v-for="p in allSpecies" :key="p.id" class="wild-item">
          <div class="wi-left">
            <span class="wi-emoji">{{ petEmojis[p.id] || '🐕' }}</span>
            <div class="wi-info">
              <span class="wi-name" :style="{ color: petColors[p.type] }">{{ p.name }}</span>
              <span class="wi-stats">Lv.1 ⚔️{{ p.atk }} ❤️{{ p.hp }}</span>
              <span v-if="p.skill_name" class="wi-skill">⚡{{ p.skill_name }}</span>
            </div>
          </div>
          <button
            class="wi-capture-btn"
            :disabled="hasPet(p.id) || pets.length >= MAX"
            @click="capture(p)"
          >
            {{ hasPet(p.id) ? '已拥有' : '捕捉(' + p.capture_rate + '%)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const MAX = 3;
const pets = ref([]);
const activePet = ref(null);
const allSpecies = ref([]);
const petFoods = ref([]);
const msg = ref('');
const msgType = ref('');
const newName = ref('');
const renameTarget = ref(null);

const petColors = { 1: '#aaaaaa', 2: '#4caf50', 3: '#2196f3', 4: '#9c27b0', 5: '#ff9800' };
const petTypeNames = { 1: '飞行', 2: '野兽', 3: '昆虫', 4: '海兽', 5: '灵兽' };
const petEmojis = { 1: '🐱', 2: '🦅', 3: '🦊', 4: '🐻', 5: '🦅', 6: '🦊', 7: '🐙', 8: '🦄', 9: '🦅', 10: '🐵' };

const activePetExpPct = computed(() => activePet.value ? Math.round(activePet.value.exp / activePet.value.exp_max * 100) : 0);
const satColor = computed(() => {
  const s = activePet.value?.satiety || 0;
  if (s > 60) return '#27ae60';
  if (s > 30) return '#c9a758';
  return '#b85a3a';
});

function hasPet(petId) { return pets.value.some(p => p.pet_id === petId); }

async function load() {
  try { const d = await Api.get('/pet/info'); pets.value = d.pets || []; activePet.value = d.activePet || null; allSpecies.value = d.allSpecies || []; petFoods.value = d.petFoods || []; }
  catch (e) {}
}

async function capture(p) {
  if (!(await globalConfirm(`捕捉${p.name}? 概率:${p.capture_rate}%`))) return;
  try { const d = await Api.post('/pet/capture', { pet_id: p.id }); msg.value = d.msg; msgType.value = d.success ? 'success' : 'error'; await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function setActive(p) {
  try { const d = await Api.post('/pet/setActive', { user_pet_id: p.id }); msg.value = d.msg; msgType.value = 'success'; await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function feedPet(itemId) {
  try { const d = await Api.post('/pet/feed', { item_id: itemId }); msg.value = d.msg; msgType.value = d.success ? 'success' : 'error'; if (d.success) await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function releasePet(p) {
  if (!(await globalConfirm('确定放生?'))) return;
  try { const d = await Api.post('/pet/release', { user_pet_id: p.id }); msg.value = d.msg; msgType.value = 'success'; await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

function startRename(p) { renameTarget.value = p; newName.value = p.nickname; }

const STAR_COLORS = { 1: '#9ca3af', 2: '#22c55e', 3: '#3b82f6', 4: '#a855f7', 5: '#f59e0b' };
function starColor(s) { return STAR_COLORS[s] || STAR_COLORS[1]; }
function canUpgrade(p) { const s = p.star || 1; return s < 5; }

async function upgrade(p) {
  if (!canUpgrade(p)) { msg.value = '⭐⭐⭐⭐⭐ 已满星'; msgType.value = 'error'; return; }
  try { const d = await Api.post('/pet/upgrade', { user_pet_id: p.id }); msg.value = d.msg || (d.success ? '✅ 进阶成功' : d.error); msgType.value = d.success ? 'success' : 'error'; if (d.success) await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function doRename() {
  if (!newName.value || !renameTarget.value) return;
  try { const d = await Api.post('/pet/rename', { user_pet_id: renameTarget.value.id, name: newName.value }); msg.value = d.msg || '✅ 宠物改名成功'; msgType.value = 'success'; newName.value = ''; renameTarget.value = null; await load(); }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

onMounted(load);
</script>

<style scoped>
.pet-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.pet-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1a28 50%, #0d1117 100%);
  pointer-events: none;
}
.hud-count { font-size: 12px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }
.msg-card {
  position: relative; z-index: 2;
  border-radius: 10px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.msg-card.error { background: rgba(184,90,58,0.1); border: 1px solid rgba(184,90,58,0.3); color: #e74c3c; }
.msg-card:not(.error) { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #27ae60; }
.active-pet-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid; border-radius: 14px; padding: 16px;
}
.ap-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.ap-avatar { font-size: 36px; }
.ap-info { flex: 1; }
.ap-name { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.ap-badge { font-size: 10px; color: #c9a758; background: rgba(201,168,76,0.15); padding: 2px 8px; border-radius: 8px; }
.ap-type { font-size: 12px; margin-top: 2px; }
.ap-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 12px; }
.aps-item { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 6px; text-align: center; }
.aps-label { display: block; font-size: 10px; color: #7f8c8d; margin-bottom: 2px; }
.aps-value { font-size: 14px; font-weight: 700; }
.aps-value.atk { color: #b85a3a; }
.aps-value.hp { color: #27ae60; }
.ap-skill {
  display: flex; align-items: center; gap: 6px;
  background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.15);
  border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;
}
.skill-icon { font-size: 14px; }
.skill-name { font-size: 12px; color: #c9a758; font-weight: 600; }
.skill-desc { font-size: 11px; color: #7f8c8d; }
.ap-exp { margin-bottom: 10px; }
.exp-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.exp-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.exp-text { font-size: 10px; color: #7f8c8d; }
.ap-satiety { margin-bottom: 10px; }
.sat-label { font-size: 12px; color: #ddd; margin-bottom: 4px; }
.sat-bar { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
.sat-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.sat-tip { font-size: 10px; color: #555; }
.feed-section { margin-bottom: 10px; }
.feed-label { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.feed-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.feed-btn {
  background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.25);
  color: #27ae60; border-radius: 6px; padding: 6px 12px;
  font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.feed-btn:hover { background: rgba(39,174,96,0.2); }
.feed-empty {
  font-size: 12px; color: #7f8c8d; background: rgba(255,255,255,0.03);
  padding: 8px 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.1);
}
.ap-actions { display: flex; gap: 8px; }
.ap-release-btn {
  flex: 1; background: rgba(184,90,58,0.12); border: 1px solid rgba(184,90,58,0.25);
  color: #e74c3c; border-radius: 8px; padding: 8px 16px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.ap-release-btn:hover { background: rgba(184,90,58,0.2); }
.ap-rename-btn {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #f0f0f0; border-radius: 8px; padding: 8px 16px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.ap-rename-btn:hover { background: rgba(255,255,255,0.1); }
.pets-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.pets-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.pets-list { display: flex; flex-direction: column; gap: 6px; }
.pet-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
}
.pet-item.active { border-color: rgba(201,168,76,0.2); background: rgba(201,168,76,0.04); }
.pi-left { display: flex; align-items: center; gap: 8px; }
.pi-emoji { font-size: 20px; }
.pi-info { display: flex; align-items: center; gap: 6px; }
.pi-name { font-size: 14px; font-weight: 600; }
.pi-lv { font-size: 11px; color: #7f8c8d; }
.pi-active { font-size: 10px; color: #c9a758; }
.pi-set-btn {
  background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 6px; color: #fff; font-weight: 600;
  font-size: 11px; padding: 5px 12px; cursor: pointer; transition: all 0.2s;
}
.pi-set-done { font-size: 11px; color: #555; padding: 5px 12px; }
.pi-stars { font-size: 11px; margin-left: 6px; font-weight: 700; letter-spacing: 0.5px; }
.pi-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.pi-upgrade-btn {
  background: linear-gradient(135deg, rgba(245,158,11,0.3), rgba(168,85,247,0.3));
  border: 1px solid #f59e0b;
  color: #fbbf24;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.pi-upgrade-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(245,158,11,0.55), rgba(168,85,247,0.55));
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(245,158,11,0.3);
}
.pi-upgrade-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.rename-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 12px; display: flex; gap: 8px;
}
.rename-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #f0f0f0; outline: none;
}
.rename-input:focus { border-color: rgba(39,174,96,0.4); }
.rename-confirm {
  background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 8px; color: #fff; font-size: 12px; font-weight: 600;
  padding: 8px 14px; cursor: pointer;
}
.rename-cancel {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 12px; padding: 8px 12px; cursor: pointer;
}
.wild-card {
  position: relative; z-index: 2;
  background: rgba(95,74,49,0.1); border: 1px solid rgba(95,74,49,0.3);
  border-radius: 14px; padding: 14px 16px;
}
.wild-header { font-size: 14px; font-weight: 700; color: #5f4a31; margin-bottom: 10px; }
.wild-list { display: flex; flex-direction: column; gap: 8px; }
.wild-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border-radius: 10px;
}
.wi-left { display: flex; align-items: center; gap: 8px; }
.wi-emoji { font-size: 20px; }
.wi-info { display: flex; align-items: center; gap: 6px; }
.wi-name { font-size: 13px; font-weight: 600; }
.wi-stats { font-size: 11px; color: #7f8c8d; }
.wi-skill { font-size: 11px; color: #c9a758; }
.wi-capture-btn {
  background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 6px; color: #fff; font-weight: 600;
  font-size: 11px; padding: 6px 12px; cursor: pointer; transition: all 0.2s;
}
.wi-capture-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>