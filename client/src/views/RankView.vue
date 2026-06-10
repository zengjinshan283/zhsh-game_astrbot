<template>
  <div class="rank-page">
    <div class="rank-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🏆</div>
        <div class="hud-title">排行榜</div>
      </div>
      <div class="hud-right">
        <span class="hud-user">{{ userStore.user?.username }}</span>
        <span class="hud-lv">Lv.{{ userStore.user?.level }}</span>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: tab === t.key }"
        @click="loadTab(t.key)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span class="tab-label">{{ t.label }}</span>
      </div>
    </div>

    <!-- 等级榜 -->
    <div class="rank-card" v-if="tab === 'level'">
      <div class="rc-header">⭐ 等级排行榜 TOP20</div>
      <div class="rc-list">
        <div
          v-for="(p, idx) in levelList"
          :key="p.id"
          class="rank-row"
          :class="{ 'row-me': isMe(p.id), 'row-top': idx < 3 }"
        >
          <div class="rank-rank">
            <span class="rank-medal">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : '' }}</span>
            <span class="rank-num" v-if="idx >= 3">{{ idx + 1 }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-sex">{{ p.sex === 2 ? '♀' : '♂' }}</span>
            <span class="rank-name" :class="{ 'name-me': isMe(p.id) }">{{ p.username }}</span>
            <span class="rank-tag" v-if="isMe(p.id)">[我]</span>
          </div>
          <div class="rank-val">
            <span class="rank-level">Lv.{{ p.level }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 财富榜 -->
    <div class="rank-card" v-if="tab === 'wealth'">
      <div class="rc-header">💰 财富排行榜 TOP20</div>
      <div class="rc-list">
        <div
          v-for="(p, idx) in wealthList"
          :key="p.id"
          class="rank-row"
          :class="{ 'row-me': isMe(p.id), 'row-top': idx < 3 }"
        >
          <div class="rank-rank">
            <span class="rank-medal">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : '' }}</span>
            <span class="rank-num" v-if="idx >= 3">{{ idx + 1 }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-sex">{{ p.sex === 2 ? '♀' : '♂' }}</span>
            <span class="rank-name" :class="{ 'name-me': isMe(p.id) }">{{ p.username }}</span>
            <span class="rank-tag" v-if="isMe(p.id)">[我]</span>
          </div>
          <div class="rank-val">
            <span class="rank-money">{{ formatMoney((p.money || 0) + (p.bank_money || 0)) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 战力榜 -->
    <div class="rank-card" v-if="tab === 'power'">
      <div class="rc-header">⚔️ 战力排行榜 TOP20</div>
      <div class="rc-list">
        <div
          v-for="(p, idx) in powerList"
          :key="p.id"
          class="rank-row"
          :class="{ 'row-me': isMe(p.id), 'row-top': idx < 3 }"
        >
          <div class="rank-rank">
            <span class="rank-medal">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : '' }}</span>
            <span class="rank-num" v-if="idx >= 3">{{ idx + 1 }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-sex">{{ p.sex === 2 ? '♀' : '♂' }}</span>
            <span class="rank-name" :class="{ 'name-me': isMe(p.id) }">{{ p.username }}</span>
            <span class="rank-lv">Lv.{{ p.level }}</span>
          </div>
          <div class="rank-val">
            <span class="rank-power">{{ p.power || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 宝图榜 -->
    <div class="rank-card" v-if="tab === 'treasure'">
      <div class="rc-header">🗺️ 寻宝达人榜 TOP20</div>
      <div class="rc-list">
        <div
          v-for="(t, idx) in treasureList"
          :key="t.id"
          class="rank-row"
          :class="{ 'row-me': isMe(t.id), 'row-top': idx < 3 }"
        >
          <div class="rank-rank">
            <span class="rank-medal">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : '' }}</span>
            <span class="rank-num" v-if="idx >= 3">{{ idx + 1 }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-sex">{{ t.sex === 2 ? '♀' : '♂' }}</span>
            <span class="rank-name" :class="{ 'name-me': isMe(t.id) }">{{ t.username }}</span>
            <span class="rank-lv">Lv.{{ t.level }}</span>
          </div>
          <div class="rank-val">
            <span class="rank-power">⛏ {{ t.dig_count || 0 }} 次</span>
          </div>
        </div>
        <div v-if="treasureList.length === 0" style="padding:40px;text-align:center;color:#7f8c8d;font-size:12px;">
          🏜️ 暂无寻宝者，快去挖宝吧！
        </div>
      </div>
    </div>

    <!-- 帮会榜 -->
    <div class="rank-card" v-if="tab === 'guild'">
      <div class="rc-header">🏰 帮会排行榜 TOP10</div>
      <div class="rc-list">
        <div
          v-for="(g, idx) in guildList"
          :key="g.id"
          class="rank-row"
          :class="{ 'row-top': idx < 3 }"
        >
          <div class="rank-rank">
            <span class="rank-medal">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : '' }}</span>
            <span class="rank-num" v-if="idx >= 3">{{ idx + 1 }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-name">{{ g.name }}</span>
          </div>
          <div class="rank-val rank-val-right">
            <div class="rv-main">Lv.{{ g.level }} · {{ g.member_count }}人</div>
            <div class="rv-sub">总等级: {{ g.total_level || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rank-footer">排行榜数据实时更新</div>

    <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const userStore = useUserStore();
const tab = ref('level');
const levelList = ref([]);
const wealthList = ref([]);
const powerList = ref([]);
const treasureList = ref([]);
const guildList = ref([]);

const tabs = [
  { key: 'level', label: '等级', icon: '⭐' },
  { key: 'wealth', label: '财富', icon: '💰' },
  { key: 'power', label: '战力', icon: '⚔️' },
  { key: 'treasure', label: '宝图', icon: '🗺️' },
  { key: 'guild', label: '帮会', icon: '🏰' }
];

function isMe(id) { return userStore.user?.id === id; }

async function loadTab(t) {
  try {
    if (t === 'level') { const d = await Api.get('/rank/level'); levelList.value = d.list || []; }
    else if (t === 'wealth') { const d = await Api.get('/rank/wealth'); wealthList.value = d.list || []; }
    else if (t === 'power') { const d = await Api.get('/rank/power'); powerList.value = d.list || []; }
    else if (t === 'treasure') { const d = await Api.get('/rank/treasure'); treasureList.value = d.list || []; }
    else if (t === 'guild') { const d = await Api.get('/rank/guild'); guildList.value = d.list || []; }
  } catch (e) {}
}

onMounted(() => loadTab('level'));
</script>

<style scoped>
.rank-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.rank-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
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
.hud-user { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.hud-lv { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px; }

.tab-bar {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
}
.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.5;
}
.tab-btn.active { background: rgba(39, 174, 96, 0.2); opacity: 1; }
.tab-icon { font-size: 18px; }
.tab-label { font-size: 11px; color: #bdc3c7; }

.rank-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
}
.rc-header {
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #c9a758;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.rc-list {}
.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.15s;
}
.rank-row:last-child { border-bottom: none; }
.rank-row.row-me { background: rgba(201, 165, 88, 0.08); }
.rank-row.row-top { }

.rank-rank {
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.rank-medal { font-size: 18px; }
.rank-num { font-size: 13px; color: #7f8c8d; }

.rank-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.rank-sex { font-size: 12px; }
.rank-name {
  font-size: 13px;
  color: #bdc3c7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-name.name-me { color: #c9a758; font-weight: 600; }
.rank-tag { font-size: 10px; color: #c9a758; }
.rank-lv { font-size: 10px; color: #7f8c8d; margin-left: 2px; }

.rank-val { flex-shrink: 0; }
.rank-level { font-size: 13px; font-weight: 700; color: #c9a758; }
.rank-money { font-size: 13px; font-weight: 700; color: #f1c40f; }
.rank-power { font-size: 13px; font-weight: 700; color: #e74c3c; }
.rank-val-right { text-align: right; }
.rv-main { font-size: 12px; color: #c9a758; font-weight: 600; }
.rv-sub { font-size: 10px; color: #7f8c8d; }

.rank-footer {
  position: relative;
  z-index: 2;
  text-align: center;
  font-size: 11px;
  color: #555;
  padding: 4px;
}

.back-btn {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>