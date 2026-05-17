<template>
<div class="page dungeon-page">
  <!-- 副本列表模式 -->
  <template v-if="mode === 'list'">
    <div class="location-bar">
      <div class="location-name">🏰 副本</div>
      <div class="location-path">选择副本入口</div>
    </div>

    <div v-if="error" class="card" style="border-color:#73281c;padding:3px 8px;">
      <p style="color:#b85a3a;font-size:11px;margin:0;">❌ {{ error }}</p>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else class="dungeon-list">
      <div v-for="d in dungeons" :key="d.name" class="dungeon-card" :class="{disabled: !d.can_enter}">
        <div class="dungeon-header">
          <div class="dungeon-emoji">{{ d.name.includes('四象') ? '🐉' : '🐂' }}</div>
          <div class="dungeon-title">
            <div class="dungeon-name">{{ d.name }}</div>
            <div class="dungeon-meta">
              <span class="meta-tag">📍 {{ d.place_id === 9001 ? '印度洋' : '长安广场' }}</span>
              <span class="meta-tag">🏔️ {{ d.max_floor }}层</span>
            </div>
          </div>
        </div>
        <div class="dungeon-info">
          <div class="info-row">
            <span class="info-label">等级要求</span>
            <span class="info-value" :style="{color: userLevel >= d.level_req ? '#2e5a3b' : '#b85a3a'}">
              Lv.{{ d.level_req }} {{ userLevel >= d.level_req ? '✅' : '❌' }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">入场费</span>
            <span class="info-value" :style="{color: d.is_free ? '#2e5a3b' : '#c9a84c'}">
              <template v-if="d.is_free">免费</template>
              <template v-else>{{ d.entry_fee }}银币 💰</template>
            </span>
          </div>
        </div>
        <div class="dungeon-desc">{{ d.description || '强大的副本，击败所有楼层可获得丰厚奖励！' }}</div>
        <div class="dungeon-actions">
          <button v-if="!d.can_enter" class="btn btn-secondary" disabled>等级不足</button>
          <button v-else-if="!d.has_enough_money && !d.is_free" class="btn btn-secondary" disabled>铜币不足</button>
          <button v-else class="btn btn-primary" @click="enterDungeon(d)">🚪 进入副本</button>
        </div>
      </div>
    </div>
  </template>

  <!-- 楼层选择模式 -->
  <template v-else-if="mode === 'floors'">
    <div class="location-bar">
      <div class="location-name">🏰 {{ currentDungeon?.name }}</div>
      <div class="location-path">
        <a href="javascript:void(0)" @click="exitDungeon" style="color:#c9a758;">← 退出副本</a>
      </div>
    </div>

    <div v-if="dungeonInfo" class="dungeon-status-bar">
      <div class="dsb-item">
        <span class="dsb-label">当前层</span>
        <span class="dsb-value">{{ dungeonInfo.current_floor || 1 }} / {{ dungeonInfo.max_floor }}</span>
      </div>
      <div class="dsb-item">
        <span class="dsb-label">入场费</span>
        <span class="dsb-value">{{ dungeonInfo.entry_fee > 0 ? dungeonInfo.entry_fee + '银币' : '免费' }}</span>
      </div>
    </div>

    <div class="floor-grid">
      <div
        v-for="f in floors"
        :key="f.floor"
        class="floor-cell"
        :class="{
          cleared: f.cleared,
          current: f.floor === dungeonInfo?.current_floor,
          locked: f.floor > (dungeonInfo?.current_floor || 1)
        }"
        @click="selectFloor(f)"
      >
        <div class="floor-num">{{ f.floor }}</div>
        <div class="floor-name">{{ f.monster_name }}</div>
        <div class="floor-status">
          <template v-if="f.cleared">✅</template>
          <template v-else-if="f.floor === dungeonInfo?.current_floor">⚔️</template>
          <template v-else-if="f.floor > (dungeonInfo?.current_floor || 1)">🔒</template>
          <template v-else>🔓</template>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:10px;">
      <div class="card-title">📜 楼层详情</div>
      <div v-if="selectedFloor" class="floor-detail">
        <div class="fd-header">第 {{ selectedFloor.floor }} 层 · {{ selectedFloor.monster_name }}</div>
        <div class="fd-stats">
          <div class="fd-stat">❤️ HP: {{ selectedFloor.monster_hp }}</div>
          <div class="fd-stat">⚔️ ATK: {{ selectedFloor.monster_atk_min }}~{{ selectedFloor.monster_atk_max }}</div>
          <div class="fd-stat">🛡️ DEF: {{ selectedFloor.monster_def }}</div>
          <div class="fd-stat">✨ EXP: {{ selectedFloor.monster_exp }}</div>
        </div>
        <div class="fd-desc">{{ selectedFloor.description }}</div>
        <div class="fd-action">
          <template v-if="selectedFloor.cleared">
            <button class="btn btn-secondary" disabled>已通关</button>
          </template>
          <template v-else-if="selectedFloor.floor === dungeonInfo?.current_floor">
            <button class="btn btn-danger" @click="startFloorBattle">⚔️ 挑战此层</button>
          </template>
          <template v-else>
            <button class="btn btn-secondary" disabled>请从第 {{ dungeonInfo?.current_floor }} 层开始</button>
          </template>
        </div>
      </div>
      <div v-else class="empty-state">点击选择一个楼层</div>
    </div>
  </template>

  <!-- 副本战斗结算 -->
  <template v-else-if="mode === 'result'">
    <div class="location-bar">
      <div class="location-name">⚔️ 副本结算</div>
      <div class="location-path">{{ battleResult.dungeon_name || currentDungeon?.name }}</div>
    </div>

    <div class="card" style="border-color:#27ae60;margin-bottom:10px;">
      <div class="card-title" style="color:#27ae60;">
        <template v-if="battleResult.result === 'dungeon_clear'">🏆 副本通关！</template>
        <template v-else-if="battleResult.result === 'floor_clear'">⚔️ 楼层击败！</template>
        <template v-else-if="battleResult.result === 'flee'">🏃 已撤退</template>
        <template v-else>💀 挑战失败</template>
      </div>
      <div class="divider"></div>
      <p v-if="battleResult.result === 'dungeon_clear'">
        🎉 恭喜通关 <strong>{{ currentDungeon?.name }}</strong> 全部 {{ currentDungeon?.max_floor }} 层！<br>
        通关奖励已发放！
      </p>
      <p v-else-if="battleResult.result === 'floor_clear'">
        ⚔️ 成功击败第 {{ battleResult.floor }} 层怪物！<br>
        <template v-if="battleResult.current_floor <= battleResult.max_floor">
          下一层：第 {{ battleResult.current_floor }} 层
        </template>
      </p>
      <p v-if="battleResult.exp_gained">✨ 经验 +{{ battleResult.exp_gained }}</p>
      <p v-if="battleResult.money_gained">💰 铜币 +{{ battleResult.money_gained }}</p>
    </div>

    <div class="card">
      <div class="card-title">📜 战斗回顾</div>
      <div class="battle-log-full">
        <div v-for="(log, i) in battleResult.log" :key="i" class="log-line" :class="'log-' + log.type">{{ log.text }}</div>
      </div>
    </div>

    <div style="text-align:center;padding:12px 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
      <template v-if="battleResult.result === 'floor_clear' && battleResult.current_floor <= battleResult.max_floor">
        <button class="btn btn-danger" @click="continueNextFloor">⚔️ 继续挑战第 {{ battleResult.current_floor }} 层</button>
      </template>
      <template v-if="battleResult.result === 'dungeon_clear'">
        <button class="btn btn-primary" @click="mode = 'floors'; loadFloors()">🏰 返回副本</button>
      </template>
      <button class="btn btn-secondary" @click="exitDungeon">🗺️ 返回地图</button>
    </div>
  </template>

  <router-link to="/map" class="btn btn-secondary btn-block mt-10" v-if="mode === 'list'">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();

const mode = ref('list'); // 'list' | 'floors' | 'result'
const loading = ref(false);
const error = ref('');
const dungeons = ref([]);
const currentDungeon = ref(null);
const dungeonInfo = ref(null);
const floors = ref([]);
const selectedFloor = ref(null);
const battleResult = ref(null);
const userLevel = computed(() => userStore.user?.level || 1);

async function loadDungeonList() {
  loading.value = true;
  error.value = '';
  try {
    const data = await Api.get('/dungeon/list');
    dungeons.value = data.dungeons || [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function enterDungeon(d) {
  error.value = '';
  try {
    const data = await Api.post('/dungeon/' + encodeURIComponent(d.name) + '/enter', {});
    if (data.ok || data.msg) {
      currentDungeon.value = d;
      mode.value = 'floors';
      await loadFloors();
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function loadFloors() {
  if (!currentDungeon.value) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await Api.get('/dungeon/' + encodeURIComponent(currentDungeon.value.name) + '/floors');
    dungeonInfo.value = data.dungeon;
    floors.value = data.floors || [];
    selectedFloor.value = null;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function selectFloor(f) {
  selectedFloor.value = f;
}

async function startFloorBattle() {
  if (!selectedFloor.value || !currentDungeon.value) return;
  error.value = '';
  try {
    const data = await Api.post(
      '/dungeon/' + encodeURIComponent(currentDungeon.value.name) +
      '/floor/' + selectedFloor.value.floor + '/attack',
      { action: 'attack' }
    );
    battleResult.value = data;
    mode.value = 'result';
    // Update user stats
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
  } catch (e) {
    error.value = e.message;
  }
}

async function continueNextFloor() {
  if (!battleResult.value || !currentDungeon.value) return;
  // Load the next floor
  selectedFloor.value = floors.value.find(f => f.floor === battleResult.value.current_floor);
  if (selectedFloor.value) {
    try {
      const data = await Api.post(
        '/dungeon/' + encodeURIComponent(currentDungeon.value.name) +
        '/floor/' + selectedFloor.value.floor + '/attack',
        { action: 'attack' }
      );
      battleResult.value = data;
      mode.value = 'result';
      const me = await Api.get('/auth/me');
      userStore.updateUser(me.user);
    } catch (e) {
      error.value = e.message;
    }
  }
}

async function exitDungeon() {
  try {
    await Api.post('/dungeon/exit', {});
  } catch (e) {}
  currentDungeon.value = null;
  dungeonInfo.value = null;
  floors.value = [];
  selectedFloor.value = null;
  battleResult.value = null;
  mode.value = 'list';
  await loadDungeonList();
}

onMounted(loadDungeonList);
</script>

<style scoped>
.dungeon-page { padding: 4px 6px; }

.dungeon-list { display: flex; flex-direction: column; gap: 10px; }

.dungeon-card {
  background: rgba(20, 20, 35, 0.8);
  border: 2px solid rgba(169, 119, 78, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.dungeon-card.disabled { opacity: 0.6; }

.dungeon-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.dungeon-emoji { font-size: 32px; }
.dungeon-title { flex: 1; }
.dungeon-name { font-size: 16px; font-weight: 700; color: #c9a758; }
.dungeon-meta { display: flex; gap: 8px; margin-top: 2px; }
.meta-tag { font-size: 11px; color: #8a7a5a; background: rgba(169,119,78,0.08); padding: 2px 6px; border-radius: 4px; }

.dungeon-info { display: flex; gap: 12px; margin-bottom: 6px; }
.info-row { display: flex; gap: 4px; align-items: center; }
.info-label { font-size: 11px; color: #8a7a5a; }
.info-value { font-size: 12px; font-weight: 600; }

.dungeon-desc { font-size: 11px; color: #8a7a5a; margin-bottom: 8px; }

.dungeon-actions { display: flex; justify-content: flex-end; }

.dungeon-status-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(169,119,78,0.08);
  border: 1px solid rgba(169,119,78,0.15);
  border-radius: 8px;
}
.dsb-item { display: flex; flex-direction: column; gap: 2px; }
.dsb-label { font-size: 10px; color: #8a7a5a; }
.dsb-value { font-size: 13px; font-weight: 600; color: #c9a758; }

.floor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.floor-cell {
  background: rgba(20,20,35,0.8);
  border: 2px solid rgba(169,119,78,0.2);
  border-radius: 8px;
  padding: 8px 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}
.floor-cell:hover { border-color: rgba(169,119,78,0.5); }
.floor-cell.current { border-color: #e74c3c; background: rgba(231,76,60,0.1); }
.floor-cell.cleared { border-color: #27ae60; background: rgba(39,174,96,0.08); }
.floor-cell.locked { opacity: 0.5; cursor: not-allowed; }

.floor-num { font-size: 18px; font-weight: 700; color: #c9a758; }
.floor-name { font-size: 9px; color: #8a7a5a; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.floor-status { font-size: 14px; margin-top: 4px; }

.floor-detail { padding: 4px 0; }
.fd-header { font-size: 14px; font-weight: 600; color: #c9a758; margin-bottom: 6px; }
.fd-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.fd-stat { font-size: 11px; color: #ddd; background: rgba(255,255,255,0.04); padding: 3px 8px; border-radius: 4px; }
.fd-desc { font-size: 11px; color: #8a7a5a; margin-bottom: 8px; }
.fd-action { text-align: center; }

.battle-log-full {
  max-height: 40vh;
  overflow-y: auto;
  background: #0f0f2e;
  border: 1px solid #2a2a4e;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
}

.log-line { margin-bottom: 2px; }
.log-attack { color: #e74c3c; }
.log-defend { color: #f39c12; }
.log-info { color: #3498db; }
.log-system { color: #9b59b6; }
.log-heal { color: #2ecc71; }
.log-skill { color: #e2b714; }

.divider { border: none; border-top: 1px solid rgba(226,183,20,0.1); margin: 8px 0; }
.mt-10 { margin-top: 10px; }
.btn-block { display: block; width: 100%; text-align: center; }
.text-gold { color: #e2b714; }
</style>