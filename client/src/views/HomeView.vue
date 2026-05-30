<template>
  <div class="home-page" v-if="userStore.isLoggedIn">
    <div class="home-bg"></div>

    <!-- ===== 顶部：城市名 + 在线奖励/快捷操作 ===== -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🏛️</div>
        <div class="hud-info">
          <div class="hud-city">{{ cityName }}</div>
          <div class="hud-place">{{ placeName }}</div>
        </div>
      </div>
      <div class="hud-right">
      </div>
    </div>

    <!-- ===== 状态条 ===== -->
    <div class="status-bar">
      <div class="sb-user">
        <span class="sb-name">{{ userStore.user?.username }}</span>
        <span class="sb-lv">Lv.{{ userStore.user?.level }}</span>
      </div>
      <div class="sb-bars">
        <div class="sb-item">
          <span class="sb-icon">❤️</span>
          <div class="sb-bar-wrap"><div class="sb-bar sb-hp" :style="{width: hpPct+'%'}"></div></div>
          <span class="sb-val">{{ userStore.user?.hp }}/{{ userStore.user?.hp_max }}</span>
        </div>
        <div class="sb-item">
          <span class="sb-icon">⭐</span>
          <div class="sb-bar-wrap"><div class="sb-bar sb-exp" :style="{width: expPct+'%'}"></div></div>
          <span class="sb-val">{{ userStore.user?.exp }}/{{ userStore.user?.exp_max }}</span>
        </div>
      </div>
      <div class="sb-money">
        <span class="sb-icon">💰</span>
        <span class="sb-money-val">{{ formatMoney(userStore.user?.money) }}</span>
        <span class="sb-divider">|</span>
        <span class="sb-icon"><img src="/icons/silver_coin.png" style="width:14px;height:14px;vertical-align:middle;" /></span>
        <span class="sb-money-val silver">{{ formatMoney(userStore.user?.silver) }}</span>
        <span class="sb-divider">|</span>
        <span class="sb-icon"><img src="/icons/gold_coin.png" style="width:14px;height:14px;vertical-align:middle;" /></span>
        <span class="sb-money-val gold">{{ formatMoney(userStore.user?.gold) }}</span>
      </div>
    </div>

    <!-- ===== 主体（可滚动） ===== -->
    <div class="home-body">
      <!-- ===== 在线奖励悬浮卡 ===== -->
      <div class="online-reward-card" v-if="onlineReward" :class="{claimable: onlineReward.canClaim}">
        <div class="orc-body" v-if="!onlineReward.loading">
          <span class="orc-time" v-if="!onlineReward.canClaim">在线 <span class="orc-mins">{{ onlineReward.totalMinutes }}</span> 分钟，还需 {{ Math.ceil(onlineReward.remainingSeconds / 60) }} 分钟</span>
          <span class="orc-time orc-ready" v-else>在线 <span class="orc-mins">{{ onlineReward.totalMinutes }}</span> 分钟——可领取！</span>
          <div class="orc-reward-box">
            <span v-if="onlineReward.reward.reward_type === 'money'">💰 铜币 × {{ onlineReward.reward.reward_value }}</span>
            <span v-else-if="onlineReward.reward.reward_type === 'item'">📦 {{ onlineReward.reward.itemName }} × {{ onlineReward.reward.quantity }}</span>
            <span v-else>🎁 铜币×5000 + 龙泉水×2</span>
          </div>
          <button v-if="onlineReward.canClaim" @click="claimOnline" class="orc-claim-btn">🎁 立即领取</button>
          <div v-else class="orc-countdown">⏳ {{ Math.ceil(onlineReward.remainingSeconds / 60) }} 分钟后可领取</div>
        </div>
      </div>

      <!-- ===== 地点信息 ===== -->
      <div class="scene-body" v-if="sceneData">
        <div class="place-desc" v-if="sceneData.place?.description">
          {{ sceneData.place.description }}
        </div>
        <div class="npc-section" v-if="sceneData.npcs?.length">
          <div class="section-title">你看到：</div>
          <div class="npc-list">
            <div v-for="npc in sceneData.npcs" :key="npc.id" class="npc-item" @click="talkToNpc(npc)">
              <div class="npc-info"><span class="npc-name">{{ npc.name }}</span><span v-if="npc.dialog" class="npc-dialog">{{ npc.dialog }}</span></div>
              <div class="npc-tags"><span v-if="npc.quest_count > 0" class="npc-quest-tag">{{ npc.quest_count }}任务</span><span class="npc-arrow">›</span></div>
            </div>
          </div>
        </div>
        <div class="npc-empty" v-else-if="sceneData.monsters?.length">
          <div class="section-title">你遇到：</div>
          <div class="monster-list">
            <div v-for="m in sceneData.monsters" :key="m.id" class="monster-item">
              <span class="monster-icon">{{ monsterIcon(m) }}</span>
              <span class="monster-name">{{ m.name }}</span>
              <span class="monster-lv">Lv.{{ m.level }}</span>
            </div>
          </div>
        </div>
        <div class="npc-empty" v-else><div class="empty-text">此地暂无NPC或怪物</div></div>

        <div class="exit-section" v-if="hasExits">
          <div class="section-title">请选择出口：</div>
          <div class="exit-list">
            <a v-for="(exit, dir) in exitsDisplay" :key="dir" href="javascript:void(0)" class="exit-item" @click.prevent="goDir(dir)">
              <span class="exit-dir">{{ dirLabel(dir) }}</span>
              <span class="exit-name">{{ exit.name }}</span>
              <span class="exit-arrow">›</span>
            </a>
          </div>
        </div>
      </div>

      <!-- ===== 附近玩家 ===== -->
      <div class="nearby-section" v-if="sceneData?.onlineUsers?.length">
        <div class="section-title">附近玩家：</div>
        <div class="nearby-list">
          <span v-for="u in sceneData.onlineUsers" :key="u.id" class="nearby-name">{{ u.username }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 底部快捷入口 ===== -->
    <div class="home-bottom">
      <div class="quick-strip">
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/status')">👤<span>状态</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/inventory')">🎒<span>背包</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/quest')">📋<span>任务</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/daily')">📅<span>每日</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/welfare')">🎁<span>福利</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/mall')">🛒<span>商城</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/pet')">🐶<span>宠物</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/dungeon')">🏔️<span>副本</span></a>
      </div>
      <div class="quick-strip">
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/guild')">🏴<span>帮会</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/mentor')">🎓<span>师徒</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/arena')">⚔️<span>竞技</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/friend')">👥<span>好友</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/rank')">🏆<span>排行</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/codex')">📜<span>图鉴</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/citymap')">🗺️<span>地图</span></a>
        <a href="javascript:void(0)" class="qs-btn" @click.prevent="goPage('/mall')">🛒<span>更多</span></a>
      </div>
    </div>

    <!-- ===== 更多菜单弹窗 ===== -->
    <div v-if="showMenu" class="menu-overlay" @click.self="showMenu = false">
      <div class="menu-card">
        <button class="menu-close" @click="showMenu = false">✕</button>
        <div class="menu-title">📋 功能菜单</div>
        <div class="menu-list">
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/status'); showMenu=false">👤 状态</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/equipment'); showMenu=false">⚔️ 装备</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/inventory'); showMenu=false">🎒 背包</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/quest'); showMenu=false">📋 任务</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/friend'); showMenu=false">👥 好友</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/pet'); showMenu=false">🐶 宠物</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/rank'); showMenu=false">🏆 排行</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/arena'); showMenu=false">⚔️ 竞技场</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/guild'); showMenu=false">🏴 帮会</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/welfare'); showMenu=false">🎁 福利</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/mall'); showMenu=false">🛒 商城</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/codex'); showMenu=false">📜 图鉴</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/citymap'); showMenu=false">🗺️ 城内地图</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/fishing'); showMenu=false">🎣 钓鱼</a>
          <a href="javascript:void(0)" class="menu-item" @click="goPage('/chat'); showMenu=false">💬 聊天</a>
          <a href="javascript:void(0)" class="menu-item logout-item" @click="doLogout">🚪 退出登录</a>
        </div>
      </div>
    </div>
  </div>

  <!-- 未登录 -->
  <div class="home-page" v-else>
    <div class="home-bg"></div>
    <div class="guest-hero">
      <div class="guest-logo">⚓</div>
      <h1 class="guest-title">纵横四海</h1>
      <p class="guest-subtitle">大航海时代的冒险</p>
      <p class="guest-version">v2.0.0</p>
    </div>
    <div class="guest-desc-card">
      <div class="gdc-title">📜 游戏简介</div>
      <p class="gdc-text">
        1453年，奥斯曼帝国攻陷君士坦丁堡，东西方贸易路线被切断。<br><br>
        面对危机，欧洲的航海家们纷纷扬帆远航，寻找通往东方的新航线……<br><br>
        在这个大航海时代，你将作为一名年轻的冒险者，从威尼斯出发，横跨地中海，穿越非洲，探索东亚，驶向印度洋，最终到达神秘的新大陆……
      </p>
    </div>
    <div class="home-actions">
      <router-link to="/register" class="btn-primary-action">🚀 创建角色</router-link>
      <router-link to="/login" class="btn-secondary-action">🔑 登录游戏</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';
import { globalAlert } from '../composables/useConfirm';

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();

const sceneData = ref(null);
const cityName = ref('');
const placeName = ref('');
const showMenu = ref(false);

const onlineReward = ref(null);
const ONLINE_TOTAL_TIERS = 12;
const ITEM_NAMES = { 94: '龙泉水', 96: '体力宝', 97: '大体力宝' };

const hpPct = computed(() => {
  const u = userStore.user;
  return u?.hp_max > 0 ? Math.round(u.hp / u.hp_max * 100) : 0;
});
const expPct = computed(() => {
  const u = userStore.user;
  return u?.exp_max > 0 ? Math.round(u.exp / u.exp_max * 100) : 0;
});

const hasExits = computed(() => Object.values(exitsDisplay.value).some(Boolean));
const exitsDisplay = computed(() => {
  const m = { n: null, s: null, e: null, w: null };
  for (const [d, v] of Object.entries(sceneData.value?.exits || {})) {
    if (v) m[d] = v;
  }
  return m;
});

function dirLabel(dir) {
  return { n: '北:', s: '南:', e: '东:', w: '西:' }[dir] || dir + ':';
}

function monsterIcon(m) {
  if (!m) return '🐾';
  if (m.name?.includes('海盗')) return '🏴‍☠️';
  if (m.name?.includes('狼') || m.name?.includes('狗')) return '🐺';
  if (m.name?.includes('虎') || m.name?.includes('狮')) return '🦁';
  if (m.name?.includes('龙')) return '🐉';
  if (m.name?.includes('鱼')) return '🐟';
  return '🐾';
}

async function loadScene() {
  try {
    const d = await Api.get('/map/scene');
    sceneData.value = d;
    cityName.value = d.city?.name || '';
    placeName.value = d.place?.name || '';
  } catch (e) {}
}

async function loadOnlineReward() {
  try {
    const data = await Api.get('/welfare/online-status');
    if (data.reward) {
      if (data.reward.reward_type === 'item' || data.reward.reward_type === 'both') {
        data.reward.itemName = ITEM_NAMES[data.reward.reward_value] || '物品';
      }
    }
    data.totalTiers = ONLINE_TOTAL_TIERS;
    onlineReward.value = data;
  } catch (e) { onlineReward.value = { loading: false }; }
}

async function refreshScene() {
  await loadScene();
  await globalAlert('刷新成功');
}

async function goDir(dir) {
  try {
    const d = await Api.post('/map/move', { dir });
    if (d.error) { await globalAlert(d.error); return; }
    await loadScene();
  } catch (e) { await globalAlert(e.message); }
}

function talkToNpc(npc) {
  gameStore.showNpcDialog(npc.id, placeName.value);
}

function goPage(path) { router.push(path); }

async function claimOnline() {
  try {
    const res = await Api.post('/welfare/claim-online', {});
    await globalAlert(res.msg || '领取成功！');
    onlineReward.value = null;
    await loadOnlineReward();
  } catch (e) { await globalAlert(e.message); }
}

async function doLogout() {
  showMenu.value = false;
  userStore.logout();
  router.push('/login');
}

onMounted(async () => {
  if (!userStore.isLoggedIn) return;
  await loadScene();
  await loadOnlineReward();
});
</script>

<style scoped>
.home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.home-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}

/* ===== 顶部 HUD（固定不滚动） ===== */
.top-hud {
  position: relative; z-index: 2; flex-shrink: 0;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 10px 14px;
  display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 18px; }
.hud-info { display: flex; flex-direction: column; gap: 1px; }
.hud-city { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.hud-place { font-size: 10px; color: #7f8c8d; }
.hud-right { display: flex; align-items: center; }
.hud-act {
  font-size: 13px; font-weight: 600; color: #bdc3c7;
  text-decoration: none; padding: 4px 8px;
  border-radius: 6px; transition: all 0.2s;
}
.hud-act:hover { background: rgba(255,255,255,0.08); color: #f0f0f0; }

/* ===== 状态条（固定不滚动） ===== */
.status-bar {
  position: relative; z-index: 2; flex-shrink: 0;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
}
.sb-user { display: flex; flex-direction: column; gap: 2px; min-width: 60px; }
.sb-name { font-size: 12px; font-weight: 700; color: #f0f0f0; }
.sb-lv { font-size: 10px; color: #c9a758; font-weight: 600; }
.sb-bars { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.sb-item { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 11px; width: 14px; text-align: center; }
.sb-bar-wrap { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.sb-bar { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.sb-hp { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.sb-exp { background: linear-gradient(90deg, #1a7a3a, #27ae60); }
.sb-val { font-size: 9px; color: #95a5a6; width: 48px; text-align: right; white-space: nowrap; }
.sb-money { display: flex; align-items: center; gap: 3px; }
.sb-money-val { font-size: 13px; font-weight: 700; color: #f1c40f; }
.sb-money-val.silver { color: #bdc3c7; }
.sb-money-val.gold { color: #f39c12; }
.sb-divider { color: rgba(255,255,255,0.15); font-size: 10px; }

/* ===== 主体（可滚动） ===== */
.home-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column; gap: 6px;
  padding: 0 6px;
  position: relative; z-index: 2;
}

/* ===== 在线奖励 ===== */
.online-reward-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 8px 12px; margin-top: 4px;
}
.online-reward-card.claimable {
  background: rgba(39,174,96,0.08);
  border-color: rgba(39,174,96,0.3);
}
.orc-body { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.orc-time { font-size: 11px; color: #95a5a6; }
.orc-mins { color: #f1c40f; font-weight: 600; }
.orc-ready { color: #2ecc71; font-weight: 600; }
.orc-reward-box {
  background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #bdc3c7;
}
.orc-claim-btn {
  background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff;
  border: none; border-radius: 8px; padding: 5px 12px;
  font-size: 11px; font-weight: 600; cursor: pointer; margin-left: auto;
}
.orc-countdown { font-size: 10px; color: #7f8c8d; margin-left: auto; }

/* ===== 主体：地点描述 ===== */
.scene-body {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 10px;
}
.place-desc { font-size: 12px; color: #8b9a7c; margin-bottom: 8px; line-height: 1.5; font-style: italic; }
.section-title { font-size: 12px; font-weight: 600; color: #7f8c8d; margin-bottom: 5px; }

/* ===== NPC列表 ===== */
.npc-list { display: flex; flex-direction: column; gap: 3px; }
.npc-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.npc-item:hover { background: rgba(255,255,255,0.07); transform: translateX(2px); }
.npc-info { display: flex; flex-direction: column; gap: 1px; }
.npc-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.npc-dialog { font-size: 10px; color: #6b7280; }
.npc-tags { display: flex; align-items: center; gap: 5px; }
.npc-quest-tag {
  font-size: 9px; background: rgba(39,174,96,0.15);
  border: 1px solid rgba(39,174,96,0.3); color: #2ecc71;
  padding: 1px 5px; border-radius: 6px;
}
.npc-arrow { font-size: 14px; color: #555; }
.npc-empty { margin-top: 4px; }

/* ===== 怪物列表 ===== */
.monster-list { display: flex; flex-direction: column; gap: 3px; }
.monster-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
}
.monster-icon { font-size: 16px; }
.monster-name { font-size: 12px; color: #f0f0f0; flex: 1; }
.monster-lv { font-size: 10px; color: #c9a758; }
.empty-text { font-size: 11px; color: #555; }

/* ===== 出口方向 ===== */
.exit-section { margin-top: 8px; }
.exit-list { display: flex; flex-direction: column; gap: 3px; }
.exit-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px; cursor: pointer;
  text-decoration: none; transition: all 0.2s;
}
.exit-item:hover { background: rgba(255,255,255,0.07); transform: translateX(2px); }
.exit-dir { font-size: 12px; font-weight: 700; color: #c9a758; min-width: 30px; }
.exit-name { font-size: 12px; color: #bdc3c7; flex: 1; }
.exit-arrow { font-size: 14px; color: #555; }

/* ===== 附近玩家 ===== */
.nearby-section {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 10px;
}
.nearby-list { display: flex; flex-wrap: wrap; gap: 6px; }
.nearby-name {
  font-size: 11px; color: #8b9dc3;
  background: rgba(88,110,170,0.1);
  padding: 2px 8px; border-radius: 10px;
}

/* ===== 底部快捷入口（固定不滚动） ===== */
.home-bottom {
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
  padding: 6px 6px 8px;
  background: rgba(13,17,23,0.92);
  border-top: 1px solid rgba(255,255,255,0.07);
  position: relative; z-index: 2;
}
.quick-strip { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.qs-btn {
  display: flex; align-items: center; gap: 3px;
  padding: 5px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px; text-decoration: none;
  font-size: 12px; color: #8b9a7c;
  transition: all 0.2s; cursor: pointer;
}
.qs-btn:hover { background: rgba(255,255,255,0.09); color: #f0f0f0; transform: translateY(-1px); }
.qs-btn:active { transform: scale(0.97); }
.qs-btn span { font-size: 10px; font-weight: 500; }

/* ===== 菜单弹窗 ===== */
.menu-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
}
.menu-card {
  position: relative;
  background: rgba(20,25,35,0.97); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px 18px 0 0; padding: 16px 16px 32px;
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: 10px;
}
.menu-title { font-size: 13px; font-weight: 700; color: #c9a758; padding-left: 4px; }
.menu-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.menu-item {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; padding: 10px 4px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; text-decoration: none; cursor: pointer;
  font-size: 11px; color: #bdc3c7; font-weight: 600;
  transition: all 0.2s;
}
.menu-item:hover { background: rgba(255,255,255,0.09); transform: translateY(-1px); }
.menu-item.logout-item { border-color: rgba(231,76,60,0.3); color: #e74c3c; }
.menu-item.logout-item:hover { background: rgba(231,76,60,0.1); }
.menu-close {
  position: absolute; top: 14px; right: 16px;
  background: rgba(255,255,255,0.06); border: none;
  color: #7f8c8d; width: 28px; height: 28px;
  border-radius: 50%; font-size: 14px; cursor: pointer;
}

/* ===== 未登录页 ===== */
.guest-hero {
  position: relative; z-index: 2; text-align: center;
  padding: 40px 20px 16px;
}
.guest-logo { font-size: 56px; margin-bottom: 8px; }
.guest-title { font-size: 28px; font-weight: 800; color: #f0f0f0; margin-bottom: 6px; }
.guest-subtitle { font-size: 13px; color: #7f8c8d; margin-bottom: 4px; }
.guest-version { font-size: 10px; color: #555; }
.guest-desc-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 14px; margin: 0 10px;
}
.gdc-title { font-size: 12px; font-weight: 600; color: #bdc3c7; margin-bottom: 8px; }
.gdc-text { font-size: 12px; line-height: 1.8; color: #95a5a6; }

.home-actions {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 8px; padding: 0 10px;
}
.btn-primary-action {
  display: block; text-align: center;
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff; padding: 12px; border-radius: 10px;
  font-size: 14px; font-weight: 700; text-decoration: none;
}
.btn-secondary-action {
  display: block; text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #95a5a6; padding: 10px; border-radius: 10px;
  font-size: 12px; text-decoration: none;
}
</style>