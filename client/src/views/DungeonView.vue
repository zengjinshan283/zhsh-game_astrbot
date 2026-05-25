<template>
<div class="dungeon-page" :class="'mode-'+mode">
  <div class="dungeon-bg"></div>

  <!-- 副本列表模式 -->
  <template v-if="mode === 'list'">
    <div class="page-header">
      <div class="ph-title">🏰 副本</div>
      <div class="ph-sub">选择副本入口</div>
    </div>

    <div v-if="error" class="error-card">❌ {{ error }}</div>
    <div v-if="loading" class="loading-card">加载中...</div>

    <div class="dungeon-grid">
      <div v-for="d in dungeons" :key="d.name" class="dungeon-card" :class="{disabled: !d.can_enter}">
        <div class="dc-emoji">{{ d.name.includes('四象') ? '🐉' : '🏝️' }}</div>
        <div class="dc-body">
          <div class="dc-name">{{ d.name }}</div>
          <div class="dc-tags">
            <span class="dc-tag">📍 {{ d.place_id === 9001 ? '印度洋' : '长安广场' }}</span>
            <span class="dc-tag">🏔️ {{ d.max_floor }}层</span>
          </div>
          <div class="dc-desc">{{ d.description || '击败所有楼层可获得丰厚奖励！' }}</div>
          <div class="dc-stats">
            <div class="dcs-item">
              <span class="dcs-label">等级</span>
              <span class="dcs-val" :style="{color: userLevel >= d.level_req ? '#2ecc71' : '#e74c3c'}">Lv.{{ d.level_req }}</span>
            </div>
            <div class="dcs-item">
              <span class="dcs-label">入场</span>
              <span class="dcs-val" :style="{color: d.is_free ? '#2ecc71' : '#f1c40f'}">{{ d.is_free ? '免费' : d.entry_fee+'银' }}</span>
            </div>
          </div>
        </div>
        <div class="dc-action">
          <button v-if="!d.can_enter" class="dc-btn dc-btn-disabled" disabled>等级不足</button>
          <button v-else-if="!d.has_enough_money && !d.is_free" class="dc-btn dc-btn-disabled" disabled>银币不足</button>
          <button v-else class="dc-btn dc-btn-enter" @click="enterDungeon(d)">🚪 进入</button>
        </div>
      </div>
    </div>

    <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
  </template>

  <!-- 楼层选择模式 -->
  <template v-else-if="mode === 'floors'">
    <div class="page-header">
      <div class="ph-title">🏰 {{ currentDungeon?.name }}</div>
      <a href="javascript:void(0)" @click="exitDungeon" class="ph-back">← 退出副本</a>
    </div>

    <div class="dungeon-status-bar" v-if="dungeonInfo">
      <div class="dsb-item">
        <div class="dsb-label">当前层</div>
        <div class="dsb-val">{{ dungeonInfo.current_floor || 1 }} / {{ dungeonInfo.max_floor }}</div>
      </div>
      <div class="dsb-divider"></div>
      <div class="dsb-item">
        <div class="dsb-label">入场费</div>
        <div class="dsb-val">{{ dungeonInfo.entry_fee > 0 ? dungeonInfo.entry_fee+'银币' : '免费' }}</div>
      </div>
      <div class="dsb-divider"></div>
      <div class="dsb-item">
        <div class="dsb-label">已通关</div>
        <div class="dsb-val" style="color:#2ecc71;">{{ clearedCount }}层</div>
      </div>
    </div>

    <!-- 楼层进度条 -->
    <div class="floor-progress-track" v-if="dungeonInfo">
      <div class="fpt-bar">
        <div class="fpt-fill" :style="{width: floorProgressPct+'%'}"></div>
      </div>
      <div class="fpt-label">{{ dungeonInfo.current_floor || 1 }} / {{ dungeonInfo.max_floor }}</div>
    </div>

    <div class="floor-grid">
      <div
        v-for="f in floors"
        :key="f.floor"
        class="floor-cell"
        :class="{
          'cleared': f.cleared,
          'current': f.floor === dungeonInfo?.current_floor,
          'locked': f.floor > (dungeonInfo?.current_floor || 1)
        }"
        @click="f.floor <= (dungeonInfo?.current_floor || 1) ? selectFloor(f) : null"
      >
        <div class="fc-num">{{ f.floor }}</div>
        <div class="fc-name">{{ f.monster_name?.substring(0,4) }}</div>
        <div class="fc-status">
          <template v-if="f.cleared">✅</template>
          <template v-else-if="f.floor === dungeonInfo?.current_floor">⚔️</template>
          <template v-else-if="f.floor > (dungeonInfo?.current_floor || 1)">🔒</template>
          <template v-else>▶️</template>
        </div>
      </div>
    </div>

    <!-- 楼层详情 -->
    <div class="floor-detail-card" v-if="selectedFloor">
      <div class="fdc-header">
        <span class="fdc-icon">🏔️</span>
        <div class="fdc-title">第 {{ selectedFloor.floor }} 层 · {{ selectedFloor.monster_name }}</div>
      </div>
      <div class="fdc-stats">
        <div class="fdc-stat"><span class="fdc-sl">❤️ HP</span><span class="fdc-sv">{{ selectedFloor.monster_hp }}</span></div>
        <div class="fdc-stat"><span class="fdc-sl">⚔️ ATK</span><span class="fdc-sv">{{ selectedFloor.monster_atk_min }}~{{ selectedFloor.monster_atk_max }}</span></div>
        <div class="fdc-stat"><span class="fdc-sl">🛡️ DEF</span><span class="fdc-sv">{{ selectedFloor.monster_def }}</span></div>
        <div class="fdc-stat"><span class="fdc-sl">✨ EXP</span><span class="fdc-sv">{{ selectedFloor.monster_exp }}</span></div>
      </div>
      <div class="fdc-desc">{{ selectedFloor.description }}</div>
      <div class="fdc-action">
        <template v-if="selectedFloor.cleared">
          <div class="fdc-cleared">✅ 已通关</div>
        </template>
        <template v-else-if="selectedFloor.floor === dungeonInfo?.current_floor">
          <button class="fdc-btn-fight" @click="startFloorBattle">⚔️ 挑战此层</button>
        </template>
        <template v-else>
          <div class="fdc-locked">🔒 从第 {{ dungeonInfo?.current_floor }} 层开始挑战</div>
        </template>
      </div>
    </div>
    <div class="floor-empty" v-else>👆 点击选择一个楼层</div>
  </template>

  <!-- 副本结算 -->
  <template v-else-if="mode === 'result'">
    <div class="page-header">
      <div class="ph-title">⚔️ 副本结算</div>
      <div class="ph-sub">{{ battleResult.dungeon_name || currentDungeon?.name }}</div>
    </div>

    <div class="result-card" :class="'result-'+battleResult.result">
      <div class="rc-emoji">
        <template v-if="battleResult.result === 'dungeon_clear'">🏆</template>
        <template v-else-if="battleResult.result === 'floor_clear'">⚔️</template>
        <template v-else-if="battleResult.result === 'flee'">🏃</template>
        <template v-else>💀</template>
      </div>
      <div class="rc-title">
        <template v-if="battleResult.result === 'dungeon_clear'">🏆 副本通关！</template>
        <template v-else-if="battleResult.result === 'floor_clear'">⚔️ 楼层击败！</template>
        <template v-else-if="battleResult.result === 'flee'">🏃 已撤退</template>
        <template v-else>💀 挑战失败</template>
      </div>
      <div class="rc-msg">
        <template v-if="battleResult.result === 'dungeon_clear'">
          恭喜通关 <strong>{{ currentDungeon?.name }}</strong> 全部 {{ currentDungeon?.max_floor }} 层！通关奖励已发放！
        </template>
        <template v-else-if="battleResult.result === 'floor_clear'">
          成功击败第 {{ battleResult.floor }} 层怪物！
          <template v-if="battleResult.current_floor <= battleResult.max_floor">
            <br>下一层：第 {{ battleResult.current_floor }} 层
          </template>
        </template>
        <template v-else-if="battleResult.result === 'flee'">战术性撤退，保存实力下次再战。</template>
        <template v-else>虽然失败了，但你的经验得到了提升。</template>
      </div>
      <div class="rc-rewards">
        <div class="rc-rew" v-if="battleResult.exp_gained">✨ 经验 +{{ battleResult.exp_gained }}</div>
        <div class="rc-rew" v-if="battleResult.money_gained">💰 铜币 +{{ battleResult.money_gained }}</div>
      </div>
    </div>

    <div class="battle-log-card">
      <div class="blc-title">📜 战斗回顾</div>
      <div class="blc-log">
        <div v-for="(log, i) in battleResult.log" :key="i" class="bl-line" :class="'bl-'+log.type">{{ log.text }}</div>
      </div>
    </div>

    <div class="result-actions">
      <template v-if="battleResult.result === 'floor_clear' && battleResult.current_floor <= battleResult.max_floor">
        <button class="ra-btn ra-btn-danger" @click="continueNextFloor">⚔️ 继续挑战第 {{ battleResult.current_floor }} 层</button>
      </template>
      <template v-if="battleResult.result === 'dungeon_clear'">
        <button class="ra-btn ra-btn-secondary" @click="mode = 'floors'; loadFloors()">🏰 返回副本</button>
      </template>
      <button class="ra-btn ra-btn-ghost" @click="exitDungeon">🗺️ 返回地图</button>
    </div>
  </template>
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

const mode = ref('list');
const loading = ref(false);
const error = ref('');
const dungeons = ref([]);
const currentDungeon = ref(null);
const dungeonInfo = ref(null);
const floors = ref([]);
const selectedFloor = ref(null);
const battleResult = ref(null);
const userLevel = computed(() => userStore.user?.level || 1);

const clearedCount = computed(() => floors.value.filter(f => f.cleared).length);
const floorProgressPct = computed(() => {
  if (!dungeonInfo.value) return 0;
  return Math.round((clearedCount.value / dungeonInfo.value.max_floor) * 100);
});

async function loadDungeonList() {
  loading.value = true; error.value = '';
  try { dungeons.value = (await Api.get('/dungeon/list')).dungeons || []; }
  catch (e) { error.value = e.message; }
  finally { loading.value = false; }
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
  } catch (e) { error.value = e.message; }
}

async function loadFloors() {
  if (!currentDungeon.value) return;
  loading.value = true; error.value = '';
  try {
    const data = await Api.get('/dungeon/' + encodeURIComponent(currentDungeon.value.name) + '/floors');
    dungeonInfo.value = data.dungeon;
    floors.value = data.floors || [];
    selectedFloor.value = null;
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

function selectFloor(f) { selectedFloor.value = f; }

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
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
  } catch (e) { error.value = e.message; }
}

async function continueNextFloor() {
  if (!battleResult.value || !currentDungeon.value) return;
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
    } catch (e) { error.value = e.message; }
  }
}

async function exitDungeon() {
  try { await Api.post('/dungeon/exit', {}); } catch (e) {}
  currentDungeon.value = null; dungeonInfo.value = null; floors.value = [];
  selectedFloor.value = null; battleResult.value = null; mode.value = 'list';
  await loadDungeonList();
}

onMounted(loadDungeonList);
</script>

<style scoped>
.dungeon-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.dungeon-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0d2e 50%, #0d1117 100%);
  pointer-events: none;
}

/* ===== 通用 ===== */
.page-header {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  padding: 2px 2px 6px;
}
.ph-title { font-size: 18px; font-weight: 700; color: #f0f0f0; }
.ph-sub { font-size: 11px; color: #7f8c8d; }
.ph-back { font-size: 12px; color: #3498db; text-decoration: none; }
.back-btn {
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

/* ===== 副本列表 ===== */
.dungeon-grid {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 8px;
}
.dungeon-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.dungeon-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); }
.dungeon-card.disabled { opacity: 0.5; }
.dc-emoji { font-size: 28px; flex-shrink: 0; }
.dc-body { flex: 1; min-width: 0; }
.dc-name { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 3px; }
.dc-tags { display: flex; gap: 6px; margin-bottom: 4px; }
.dc-tag { font-size: 10px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }
.dc-desc { font-size: 10px; color: #7f8c8d; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-stats { display: flex; gap: 10px; }
.dcs-item { display: flex; gap: 4px; align-items: center; }
.dcs-label { font-size: 10px; color: #555; }
.dcs-val { font-size: 11px; font-weight: 600; }
.dc-action { flex-shrink: 0; }
.dc-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.dc-btn-enter { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; }
.dc-btn-disabled { background: rgba(255,255,255,0.06); color: #555; cursor: not-allowed; }
.error-card { position: relative; z-index: 2; background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #e74c3c; }
.loading-card { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 20px; }

/* ===== 楼层模式 ===== */
.dungeon-status-bar {
  position: relative; z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 8px 12px;
}
.dsb-item { display: flex; flex-direction: column; gap: 2px; }
.dsb-label { font-size: 10px; color: #7f8c8d; }
.dsb-val { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.dsb-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.08); }

.floor-progress-track {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 8px;
}
.fpt-bar {
  flex: 1; height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden;
}
.fpt-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #f39c12);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.fpt-label { font-size: 10px; color: #7f8c8d; white-space: nowrap; }

.floor-grid {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}
.floor-cell {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.floor-cell:hover:not(.locked) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
.floor-cell.current { border-color: #e74c3c; background: rgba(231,76,60,0.1); }
.floor-cell.cleared { border-color: #27ae60; background: rgba(39,174,96,0.08); }
.floor-cell.locked { opacity: 0.4; cursor: not-allowed; }
.fc-num { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.fc-name { font-size: 8px; color: #7f8c8d; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.fc-status { font-size: 12px; }

/* 楼层详情卡 */
.floor-detail-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
}
.fdc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.fdc-icon { font-size: 20px; }
.fdc-title { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.fdc-stats { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.fdc-stat { display: flex; gap: 4px; align-items: center; background: rgba(255,255,255,0.04); padding: 3px 7px; border-radius: 6px; }
.fdc-sl { font-size: 10px; color: #7f8c8d; }
.fdc-sv { font-size: 11px; font-weight: 600; color: #bdc3c7; }
.fdc-desc { font-size: 10px; color: #7f8c8d; margin-bottom: 8px; }
.fdc-action { display: flex; justify-content: center; }
.fdc-btn-fight {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  color: #fff; border: none;
  padding: 8px 24px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s;
}
.fdc-btn-fight:hover { opacity: 0.9; }
.fdc-cleared { text-align: center; font-size: 12px; color: #27ae60; font-weight: 600; }
.fdc-locked { text-align: center; font-size: 11px; color: #7f8c8d; }
.floor-empty { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 16px; }

/* ===== 结算 ===== */
.result-card {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}
.result-card.result-dungeon_clear { border-color: rgba(39,174,96,0.4); background: rgba(39,174,96,0.06); }
.result-card.result-floor_clear { border-color: rgba(241,196,15,0.3); background: rgba(241,196,15,0.05); }
.result-card.result-flee { border-color: rgba(52,152,219,0.3); }
.result-card.result-defeat { border-color: rgba(231,76,60,0.3); background: rgba(231,76,60,0.05); }
.rc-emoji { font-size: 40px; }
.rc-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.rc-msg { font-size: 12px; color: #95a5a6; line-height: 1.6; }
.rc-rewards { display: flex; gap: 12px; justify-content: center; margin-top: 4px; }
.rc-rew { font-size: 12px; font-weight: 600; color: #f1c40f; }

.battle-log-card {
  position: relative; z-index: 2;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 10px;
}
.blc-title { font-size: 11px; color: #7f8c8d; margin-bottom: 6px; font-weight: 600; }
.blc-log { max-height: 30vh; overflow-y: auto; font-size: 11px; line-height: 1.6; }
.bl-line { margin-bottom: 1px; }
.bl-attack { color: #e74c3c; }
.bl-defend { color: #f39c12; }
.bl-info { color: #3498db; }
.bl-system { color: #9b59b6; }
.bl-heal { color: #2ecc71; }
.bl-skill { color: #f1c40f; }

.result-actions {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 6px;
}
.ra-btn {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: opacity 0.2s;
  text-decoration: none;
}
.ra-btn-danger { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; }
.ra-btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #bdc3c7; }
.ra-btn-ghost { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #7f8c8d; }
.ra-btn:hover { opacity: 0.9; }
</style>