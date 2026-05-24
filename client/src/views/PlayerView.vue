<template>
<div class="page">
  <div class="top-hud">
    <div class="hud-title">{{ target.sex===2?'♀':'♂' }} {{ target.username }}</div>
    <div class="hud-badge">
      <span class="badge-level">Lv.{{ target.level }}</span>
      <span class="badge-gender">{{ target.sex===2?'♀':'♂' }}</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">⚔️ 角色属性</div>
    <div class="stat-row">
      <span class="stat-icon">❤️</span>
      <span class="stat-name">生命值</span>
      <span class="stat-value">{{ target.hp }}/{{ target.hp_max }}</span>
      <div class="progress-track">
        <div class="progress-fill hp-fill" :style="{width: (target.hp/target.hp_max*100) + '%'}"></div>
      </div>
    </div>
    <div class="stat-row">
      <span class="stat-icon">⚔️</span>
      <span class="stat-name">攻击力</span>
      <span class="stat-value">{{ target.atk_min }} - {{ target.atk_max }}</span>
      <div class="progress-track">
        <div class="progress-fill atk-fill" :style="{width: Math.min(100, (target.atk_max/300)*100) + '%'}"></div>
      </div>
    </div>
    <div class="stat-row">
      <span class="stat-icon">🛡️</span>
      <span class="stat-name">防御力</span>
      <span class="stat-value">{{ target.def }}</span>
      <div class="progress-track">
        <div class="progress-fill def-fill" :style="{width: Math.min(100, (target.def/200)*100) + '%'}"></div>
      </div>
    </div>
    <div class="stat-row">
      <span class="stat-icon">💨</span>
      <span class="stat-name">敏捷</span>
      <span class="stat-value">{{ target.agility }}</span>
      <div class="progress-track">
        <div class="progress-fill agi-fill" :style="{width: Math.min(100, (target.agility/200)*100) + '%'}"></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">🗡️ 已装备</div>
    <div v-if="equipped.length" v-for="eq in equipped" :key="eq.id" class="equip-row">
      <span class="equip-icon">⚔️</span>
      <span class="equip-name">{{ eq.name }}</span>
      <span class="equip-bonus">
        <span v-if="eq.atk>0" class="bonus-atk">攻+{{ eq.atk }}</span>
        <span v-if="eq.def_val>0" class="bonus-def">防+{{ eq.def_val }}</span>
      </span>
    </div>
    <div v-else class="empty-state">暂无装备</div>
  </div>

  <div class="card">
    <div class="card-title">📊 战斗统计</div>
    <div class="stat-row">
      <span class="stat-icon">⚔️</span>
      <span class="stat-name">总战斗</span>
      <span class="stat-value">{{ battleCount }} 场</span>
    </div>
    <div class="stat-row">
      <span class="stat-icon">🏆</span>
      <span class="stat-name">胜利</span>
      <span class="stat-value">{{ winCount }} 场</span>
    </div>
    <div class="stat-row">
      <span class="stat-icon">📈</span>
      <span class="stat-name">胜率</span>
      <span class="stat-value win-rate">{{ battleCount > 0 ? Math.round(winCount/battleCount*100) : 0 }}%</span>
    </div>
  </div>

  <router-link to="/map" class="back-btn">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Api } from '../composables/useApi';
const route = useRoute();
const target = ref({});
const equipped = ref([]);
const winCount = ref(0);
const battleCount = ref(0);
async function load() {
  try {
    const d = await Api.get(`/user/view/${route.params.id}`);
    target.value = d.target || {};
    equipped.value = d.equipped || [];
    winCount.value = d.winCount || 0;
    battleCount.value = d.battleCount || 0;
  } catch (e) {}
}
onMounted(load);
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
  padding: 16px;
  padding-bottom: 80px;
  position: relative;
}

.page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(88, 166, 255, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.top-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  margin-bottom: 10px;
}

.hud-title {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f0;
}

.hud-badge {
  display: flex;
  gap: 8px;
}

.badge-level {
  background: linear-gradient(135deg, #2e5a3b, #1a3d25);
  color: #7dcea0;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.badge-gender {
  background: rgba(255, 255, 255, 0.08);
  color: #bdc3c7;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 14px;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-row {
  display: grid;
  grid-template-columns: 24px 60px 1fr 100px;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.stat-icon {
  font-size: 16px;
  text-align: center;
}

.stat-name {
  color: #bdc3c7;
  font-size: 14px;
}

.stat-value {
  color: #f0f0f0;
  font-size: 14px;
  text-align: right;
  font-weight: 500;
}

.progress-track {
  grid-column: 4;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.hp-fill {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.atk-fill {
  background: linear-gradient(90deg, #e67e22, #d35400);
}

.def-fill {
  background: linear-gradient(90deg, #3498db, #2980b9);
}

.agi-fill {
  background: linear-gradient(90deg, #9b59b6, #8e44ad);
}

.equip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.equip-icon {
  font-size: 16px;
}

.equip-name {
  color: #f0f0f0;
  font-size: 14px;
  flex: 1;
}

.equip-bonus {
  display: flex;
  gap: 8px;
}

.bonus-atk {
  color: #27ae60;
  font-size: 13px;
}

.bonus-def {
  color: #27ae60;
  font-size: 13px;
}

.empty-state {
  color: #7f8c8d;
  font-size: 14px;
  text-align: center;
  padding: 12px 0;
}

.win-rate {
  color: #f1c40f !important;
}

.back-btn {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 400px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #27ae60, #1e8449);
  color: #f0f0f0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(39, 174, 96, 0.3);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  box-shadow: 0 6px 24px rgba(39, 174, 96, 0.4);
}
</style>