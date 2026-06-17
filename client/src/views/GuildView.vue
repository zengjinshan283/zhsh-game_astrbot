<template>
<div class="page-wrap guild-page">
  <template v-if="myGuild">
    <!-- 帮会信息 HUD -->
    <div class="page-hud">
      <div class="gh-emblem">🏰</div>
      <div class="gh-info">
        <div class="gh-name">{{ myGuild.guild_name }}</div>
        <div class="gh-meta">
          <span>⭐ Lv.{{ myGuild.guild_level }}</span>
          <span>👥 {{ members.length }}/{{ myGuild.member_max }}</span>
          <span :style="{color: roleColors[myGuild.role]}">{{ roleNames[myGuild.role] }}</span>
          <span>💰 {{ myGuild.contribution }}</span>
        </div>
      </div>
    </div>

    <!-- 公告 -->
    <div v-if="myGuild.notice" class="guild-notice">
      📢 {{ myGuild.notice }}
    </div>

    <!-- 消息 -->
    <div v-if="msg" class="guild-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
      {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
    </div>

    <!-- Tab -->
    <div class="guild-tabs">
      <button class="gt-btn" :class="{active: tab === 'members'}" @click="tab = 'members'">👥 成员</button>
      <button class="gt-btn" :class="{active: tab === 'list'}" @click="loadGuilds(); tab = 'list'">🏰 列表</button>
      <button class="gt-btn" :class="{active: tab === 'territory'}" @click="tab = 'territory'; loadTerritory()">🗺️ 领地</button>
      <button class="gt-btn" :class="{active: tab === 'war'}" @click="tab = 'war'; loadWars()">⚔️ 战争</button>
      <button class="gt-btn" :class="{active: tab === 'boss'}" @click="tab = 'boss'; loadBoss()">🐲 帮派BOSS</button>
      <button class="gt-btn" :class="{active: tab === 'buff'}" @click="tab = 'buff'; loadBuff()">📜 帮会BUFF</button>
    </div>

    <!-- 成员列表 -->
    <template v-if="tab === 'members'">
      <div class="member-list">
        <div v-for="m in members" :key="m.user_id" class="member-card">
          <div class="mc-avatar">{{ m.sex === 2 ? '♀' : '♂' }}</div>
          <div class="mc-info">
            <div class="mc-name" :style="{color: roleColors[m.role], fontWeight: m.role >= 2 ? '700' : '400'}">
              {{ m.username }}
              <span class="mc-lv">Lv.{{ m.level }}</span>
              <span class="mc-role-tag">{{ roleNames[m.role] }}</span>
            </div>
            <div class="mc-online" :class="isOnline(m.lastdate) ? 'online' : 'offline'">
              {{ isOnline(m.lastdate) ? '🟢 在线' : '⚫ 离线' }}
            </div>
          </div>
          <button v-if="isLeader && m.user_id !== userStore.user.id" class="mc-kick" @click="kick(m.user_id)">踢</button>
        </div>
      </div>

      <!-- 公告编辑（副会长以上） -->
      <div v-if="isViceLeader" class="notice-edit">
        <input v-model="noticeText" type="text" maxlength="200" placeholder="编辑帮会公告..." class="notice-input">
        <button class="notice-save" @click="saveNotice">保存</button>
      </div>

      <!-- 退出/解散 -->
      <div class="guild-danger-zone">
        <button v-if="!isLeader" class="gz-btn gz-leave" @click="leave">🚪 退出帮会</button>
        <button v-else class="gz-btn gz-disband" @click="disband">⚠️ 解散帮会</button>
      </div>
    </template>

    <!-- 帮会列表 -->
    <template v-if="tab === 'list'">
      <div class="guild-list">
        <div v-for="g in guildList" :key="g.id" class="guild-card" :class="{current: g.id === myGuild.guild_id}">
          <div class="gc-emblem">🏰</div>
          <div class="gc-body">
            <div class="gc-name">{{ g.id === myGuild.guild_id ? '⭐ ' : '' }}{{ g.name }}</div>
            <div class="gc-meta">Lv.{{ g.level }} · {{ g.member_count }}人</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 帮派 BOSS -->
    <template v-if="tab === 'boss'">
      <div v-if="!boss" class="boss-loading">🐲 BOSS 正在刷新...</div>
      <div v-else class="boss-panel glass-card elevated">
        <div class="boss-banner">
          <div class="bb-icon float">🐲</div>
          <div class="bb-info">
            <div class="bb-name">深海龙龟</div>
            <div class="bb-meta text-muted">每日重置 · 今日已打 {{ boss.my.attack_count }} / {{ boss.config.attack_limit }} 次</div>
          </div>
        </div>

        <div class="boss-hp">
          <div class="bh-label">
            <span>❤️ BOSS 血量</span>
            <span class="bh-pct">{{ boss.boss.hp_pct }}%</span>
          </div>
          <GProgress :value="boss.boss.hp" :max="boss.boss.hp_max" color="red" thickness="lg" />
          <div class="bh-num">{{ boss.boss.hp.toLocaleString() }} / 1,000,000</div>
        </div>

        <div v-if="boss.boss.defeated" class="boss-killed">
          ✅ 已被击杀！本轮结束，明天 0 点重置
        </div>

        <div v-else class="boss-action">
          <button class="boss-btn" :disabled="bossAttacking || boss.my.remaining <= 0" @click="attackBoss">
            {{ bossAttacking ? '⚔️ 出战中...' : (boss.my.remaining <= 0 ? '今日次数已尽' : '⚔️ 攻击') }}
          </button>
          <button v-if="boss.my.damage > 0 && !boss.my.reward_claimed" class="boss-btn boss-btn-claim" @click="claimBossReward">
            🎁 领取奖励
          </button>
        </div>

        <div v-if="boss.my.reward_claimed" class="boss-reward-claimed">
          ✅ 今日奖励已领取
        </div>

        <div v-if="lastAttack" class="boss-log" :class="lastAttack.crit ? 'log-crit' : 'log-hit'">
          {{ lastAttack.crit ? '💥' : '⚔️' }} {{ lastAttack.damage.toLocaleString() }} 伤害
          <span class="log-meta">累计 {{ lastAttack.totalDamage.toLocaleString() }} · 剩 {{ lastAttack.remaining }} 次</span>
        </div>

        <div class="boss-rank">
          <div class="br-title">🏆 今日伤害榜</div>
          <div v-if="!boss.rank?.length" class="br-empty">暂无伤害记录</div>
          <div v-for="(r, i) in boss.rank" :key="r.user_id" class="br-row" :class="{me: r.user_id === userStore.user?.id}">
            <span class="br-rank">{{ ['🥇','🥈','🥉'][i] || (i+1) }}</span>
            <span class="br-name">{{ r.username }}</span>
            <span class="br-dmg">{{ r.damage.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 帮会领地 -->
    <template v-if="tab === 'territory'">
      <div class="terr-banner">
        🗺️ 帮会占领的领地每周可领奖一次，先占领先得
      </div>
      <div v-if="!territories.length" class="terr-loading">加载中...</div>
      <div v-else class="terr-list">
        <div v-for="t in territories" :key="t.territory_key" class="terr-card" :class="{mine: t.guild_id === myGuild.guild_id}">
          <div class="tc-icon">{{ t.icon || '🏝️' }}</div>
          <div class="tc-body">
            <div class="tc-name">{{ t.name }} <span class="tc-lv">Lv.{{ t.level_req }}+</span></div>
            <div class="tc-reward">💰 {{ t.weekly_gold }}铜 · 💎 {{ t.weekly_silver }}银</div>
            <div v-if="t.guild_id === myGuild.guild_id" class="tc-owner">⭐ 已被我帮会占领</div>
            <div v-else-if="t.guild_id" class="tc-owner enemy">⚔️ {{ t.guild_name || '敌对帮会' }} 占领中</div>
            <div v-else class="tc-owner free">🟢 无主之地</div>
          </div>
          <button v-if="t.guild_id === myGuild.guild_id" class="terr-btn" :disabled="terrClaiming" @click="claimTerritory(t.territory_key)">
            {{ terrClaiming ? '领取中...' : '🎁 领取' }}
          </button>
        </div>
      </div>
    </template>

    <!-- 帮会BUFF/技能 -->
    <template v-if="tab === 'buff'">
      <div class="buff-hud">
        <div class="bh-title">📜 帮会技能 / 全体加成</div>
        <div class="bh-tip">每级帮会技能为<strong>全帮成员</strong>提供战斗加成，消耗帮会 exp 升级</div>
        <div class="bh-bonus" v-if="myBonus && (myBonus.atk||myBonus.def||myBonus.hp||myBonus.speed)">
          <span class="bbb-item">⚔️ +{{ myBonus.atk || 0 }} 攻</span>
          <span class="bbb-item">🛡️ +{{ myBonus.def || 0 }} 防</span>
          <span class="bbb-item">❤️ +{{ myBonus.hp || 0 }} 血</span>
          <span class="bbb-item">💨 +{{ myBonus.speed || 0 }} 速</span>
        </div>
      </div>

      <div class="skill-list">
        <div v-for="sk in skillList" :key="sk.key" class="skill-card" :class="`rarity-${sk.rarity || 'rare'}`">
          <div class="sk-icon">{{ sk.icon }}</div>
          <div class="sk-info">
            <div class="sk-name">
              {{ sk.name }} <span class="sk-lv">Lv.{{ sk.level }}/{{ sk.maxLevel }}</span>
            </div>
            <div class="sk-desc">{{ sk.desc }}</div>
            <div class="sk-effect">当前效果: <strong>{{ formatBonus(sk.bonus) }}</strong></div>
            <div class="sk-cost">下级消耗: <span class="cost-num">{{ sk.expToNext }}</span> 帮会exp</div>
          </div>
          <div class="sk-action">
            <button v-if="canUpgrade(sk)" class="sk-up-btn" @click="upgradeSkill(sk.key)">升级</button>
            <span v-else-if="sk.level >= sk.maxLevel" class="sk-max">已满级</span>
            <span v-else class="sk-noauth">
              {{ !isLeader ? '需会长' : 'exp不足' }}
            </span>
          </div>
        </div>
      </div>

      <div class="buff-tip-card">
        💡 提示：捐献金钱/银币/元宝可获得帮会 exp，作为升级帮会技能的燃料！
      </div>
    </template>

    <!-- 帮会战争 -->
    <template v-if="tab === 'war'">
      <!-- 宣战入口（仅会长） -->
      <div v-if="isLeader" class="war-declare">
        <div class="wd-title">⚔️ 会长宣战</div>
        <div class="wd-tip">宣战费 1000 铜币 · 需 ≥5 成员 · 战后冷却 24h</div>
        <div class="wd-row">
          <select v-model="declareTarget" class="wd-select">
            <option value="">-- 选择目标帮会 --</option>
            <option v-for="g in warTargetList" :key="g.id" :value="g.id">{{ g.name }} (Lv.{{ g.level }})</option>
          </select>
          <button class="wd-btn" :disabled="!declareTarget || declaring" @click="declareWar">
            {{ declaring ? '宣战中...' : '⚔️ 宣战' }}
          </button>
        </div>
      </div>

      <!-- 战争列表 -->
      <div class="war-list">
        <div v-if="!wars.length" class="war-empty">暂无帮会战记录</div>
        <div v-for="w in wars" :key="w.id" class="war-card" :class="'war-' + warStatusName(w.status).key">
          <div class="wc-side wc-attack">
            <div class="wc-avatar">⚔️</div>
            <div class="wc-name">{{ w.attacker.name }}</div>
            <div v-if="w.winnerId === w.attacker.id" class="wc-win">🏆 胜</div>
          </div>
          <div class="wc-vs">VS</div>
          <div class="wc-side wc-defend">
            <div class="wc-avatar">🛡️</div>
            <div class="wc-name">{{ w.defender.name }}</div>
            <div v-if="w.winnerId === w.defender.id" class="wc-win">🏆 胜</div>
          </div>
          <div class="wc-meta">
            <div class="wc-status">{{ warStatusName(w.status).label }}</div>
            <div v-if="w.mySide === w.attacker.name || w.mySide === 'attacker'" class="wc-side-tag my">我方进攻</div>
            <div v-else class="wc-side-tag my">我方防守</div>
            <div v-if="w.status === 1" class="wc-time">⏰ {{ formatWarTime(w.warTime, w.duration) }}</div>
            <button v-if="w.status === 1 && canJoin(w)" class="wc-join" @click="joinWar(w.id)">加入战斗</button>
            <button v-if="w.status === 1" class="wc-detail" @click="viewWarDetail(w.id)">战况</button>
            <button v-if="w.status === 0 && isLeader" class="wc-force" @click="forceStartWar(w.id)">⚡立即开始</button>
            <button v-if="w.status === 1" class="wc-end" @click="endWar(w.id)">🏁 结算</button>
          </div>
        </div>
      </div>

      <!-- 战况弹窗 -->
      <div v-if="warDetailOpen && warDetail" class="war-modal" @click.self="warDetailOpen = false">
        <div class="war-modal-card">
          <div class="wm-header">
            <div class="wm-title">⚔️ 战况 - {{ warDetail.war.attacker_name }} VS {{ warDetail.war.defender_name }}</div>
            <button class="wm-close" @click="warDetailOpen = false">✕</button>
          </div>
          <div class="wm-scores">
            <div class="wms-side wms-att">
              <div class="wms-name">⚔️ {{ warDetail.war.attacker_name }}</div>
              <div class="wms-score">{{ warDetail.war.attacker_score || 0 }}</div>
            </div>
            <div class="wms-vs">VS</div>
            <div class="wms-side wms-def">
              <div class="wms-name">🛡️ {{ warDetail.war.defender_name }}</div>
              <div class="wms-score">{{ warDetail.war.defender_score || 0 }}</div>
            </div>
          </div>
          <div class="wm-status">{{ warStatusName(warDetail.war.status).label }}</div>

          <!-- 攻击敌人 -->
          <div v-if="warDetail.war.status === 1 && warEnemies.length" class="wm-section">
            <div class="wms-h">🎯 选择攻击目标</div>
            <div class="wm-enemy-list">
              <div v-for="e in warEnemies" :key="e.id" class="wm-enemy">
                <div class="wme-info">
                  <div class="wme-name">{{ e.username }} Lv.{{ e.level }}</div>
                  <div class="wme-hp">❤️ {{ e.hp }} / {{ e.hp_max }}</div>
                </div>
                <button class="wme-attack" @click="attackEnemy(e.id)">⚔️ 攻击</button>
              </div>
            </div>
          </div>

          <!-- 排行榜 -->
          <div v-if="warRank.length" class="wm-section">
            <div class="wms-h">🏅 贡献排行榜</div>
            <div class="wm-rank">
              <div v-for="(r, idx) in warRank.slice(0, 10)" :key="r.id" class="wmr-row">
                <span class="wmr-idx">{{ idx + 1 }}</span>
                <span class="wmr-name">{{ r.username }}</span>
                <span class="wmr-guild" :class="{'wmr-my': r.guild_id === myGuild?.guild_id}">{{ r.guild_name }}</span>
                <span class="wmr-ct">{{ r.contribution }} 伤害</span>
                <span class="wmr-kc">🎯{{ r.kill_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </template>

  <!-- 未加入帮会 -->
  <template v-else>
    <div class="page-hud">
      <div class="gh-emblem">🏰</div>
      <div class="gh-info"><div class="gh-name">未加入帮会</div></div>
    </div>

    <div v-if="msg" class="guild-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
      {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
    </div>

    <div class="join-section">
      <!-- 创建帮会 -->
      <div class="js-card">
        <div class="js-title">🏗️ 创建帮会</div>
        <div class="js-cost">等级≥5，花费5000铜币</div>
        <div class="js-row">
          <input v-model="createName" type="text" maxlength="12" placeholder="帮会名称(2-12字)" class="js-input">
          <button class="js-btn js-btn-create" @click="create">创建</button>
        </div>
      </div>

      <!-- 加入帮会 -->
      <div class="js-card">
        <div class="js-title">🔍 加入帮会</div>
        <div class="js-row">
          <input v-model="joinName" type="text" maxlength="12" placeholder="输入帮会名称" class="js-input">
          <button class="js-btn js-btn-join" @click="join">申请</button>
        </div>
      </div>
    </div>
  </template>
</div>
</template>

<script setup>
import { globalConfirm } from '../composables/useConfirm';
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import GProgress from '../components/GProgress.vue';

const userStore = useUserStore();
const myGuild = ref(null);
const members = ref([]);
const guildList = ref([]);
const tab = ref('members');
const msg = ref('');
const msgType = ref('');
const createName = ref('');
const joinName = ref('');
const noticeText = ref('');
const boss = ref(null);
const bossAttacking = ref(false);
const lastAttack = ref(null);
const roleNames = {0:'成员',1:'长老',2:'副会长',3:'会长'};
const roleColors = {0:'#bdc3c7',1:'#27ae60',2:'#8e44ad',3:'#f1c40f'};
const isLeader = computed(() => myGuild.value?.role === 3);
const isViceLeader = computed(() => myGuild.value?.role >= 2);

function isOnline(t) { return t > Date.now()/1000 - 900; }

async function load() { try { const d = await Api.get('/guild/my'); myGuild.value = d.myGuild; members.value = d.members||[]; guildList.value = d.guildList||[]; } catch(e) {} }
async function create() { try { const d = await Api.post('/guild/create', {name: createName.value}); msg.value = d.msg; msgType.value = 'success'; createName.value = ''; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function join() { try { const d = await Api.post('/guild/join', {name: joinName.value}); msg.value = d.msg; msgType.value = 'success'; joinName.value = ''; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function leave() { if (!(await globalConfirm('确定退出？'))) return; try { const d = await Api.post('/guild/leave'); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function disband() { if (!(await globalConfirm('确定解散？不可恢复！'))) return; try { const d = await Api.post('/guild/disband'); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function saveNotice() { try { await Api.post('/guild/notice', {notice: noticeText.value}); msg.value = '公告已更新'; msgType.value = 'success'; } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function kick(uid) { if (!(await globalConfirm('踢出？'))) return; try { await Api.post('/guild/kick', {user_id: uid}); await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; } }
async function loadGuilds() { try { const d = await Api.get('/guild/my'); guildList.value = d.guildList||[]; } catch(e) {} }

onMounted(load);

async function loadBoss() {
  try { boss.value = await Api.get('/guild/boss/status'); } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
async function attackBoss() {
  if (bossAttacking.value) return;
  bossAttacking.value = true;
  try {
    const d = await Api.post('/guild/boss/attack');
    lastAttack.value = {damage: d.damage, totalDamage: d.totalDamage, remaining: d.remaining, crit: d.crit};
    msg.value = d.crit ? `💥 暴击！造成 ${d.damage.toLocaleString()} 伤害` : `⚔️ 造成 ${d.damage.toLocaleString()} 伤害`;
    msgType.value = 'success';
    await loadBoss();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  finally { bossAttacking.value = false; }
}
async function claimBossReward() {
  try {
    const d = await Api.post('/guild/boss/claim');
    msg.value = d.msg;
    msgType.value = 'success';
    await loadBoss();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

// === 帮会领地 ===
const territories = ref([]);
const terrClaiming = ref(false);

async function loadTerritory() {
  try {
    const d = await Api.get('/guild/territory');
    territories.value = d.territories || [];
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function claimTerritory(key) {
  if (terrClaiming.value) return;
  terrClaiming.value = true;
  try {
    const d = await Api.post('/guild/claim-territory', { territory_key: key });
    msg.value = d.msg;
    msgType.value = 'success';
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  finally { terrClaiming.value = false; }
}

// === 帮会战 ===
const wars = ref([]);
const declaring = ref(false);
const declareTarget = ref('');
const warTargetList = ref([]);

async function loadWars() {
  try {
    const d = await Api.get('/guild/war-list');
    wars.value = d.wars || [];
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  // 同时拉取可宣战的目标帮会列表
  if (isLeader.value) {
    try {
      const d = await Api.get('/guild/my');
      warTargetList.value = (d.guildList || []).filter(g => g.id !== myGuild.value?.guild_id);
    } catch(e) {}
  }
}

function warStatusName(status) {
  if (status === 0) return { key: 'declared', label: '🟡 宣战中' };
  if (status === 1) return { key: 'fighting', label: '🔴 进行中' };
  return { key: 'ended', label: '⚫ 已结束' };
}

function formatWarTime(warTime, duration) {
  const now = Math.floor(Date.now() / 1000);
  if (now < warTime) {
    const sec = warTime - now;
    return `${Math.floor(sec/60)}分${sec%60}秒后开始`;
  } else if (now < warTime + duration) {
    const left = warTime + duration - now;
    return `还剩 ${Math.floor(left/3600)}小时${Math.floor((left%3600)/60)}分`;
  }
  return '已结束';
}

function canJoin(w) {
  // 战争进行中即可加入
  return w.status === 1;
}

async function declareWar() {
  if (!declareTarget.value || declaring.value) return;
  declaring.value = true;
  try {
    const d = await Api.post('/guild/declare-war', { target_guild_id: Number(declareTarget.value) });
    msg.value = d.msg;
    msgType.value = 'success';
    declareTarget.value = '';
    await loadWars();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  finally { declaring.value = false; }
}

async function joinWar(warId) {
  try {
    const d = await Api.post(`/guild/join-war/${warId}`);
    msg.value = d.msg;
    msgType.value = 'success';
    await viewWarDetail(warId);
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function viewWarDetail(warId) {
  currentWar.value = warId;
  await Promise.all([loadWarDetail(warId), loadWarEnemies(warId), loadWarRank(warId)]);
  warDetailOpen.value = true;
}

const warDetailOpen = ref(false);
const currentWar = ref(null);
const warDetail = ref(null);
const warEnemies = ref([]);
const warRank = ref([]);
async function loadWarDetail(warId) {
  try { const d = await Api.get(`/guild/war-status/${warId}`); warDetail.value = d; }
  catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
async function loadWarEnemies(warId) {
  try { const d = await Api.get(`/guild/war-enemies/${warId}`); warEnemies.value = d.enemies || []; }
  catch(e) { warEnemies.value = []; }
}
async function loadWarRank(warId) {
  try { const d = await Api.get(`/guild/war-rank/${warId}`); warRank.value = d.rank || []; }
  catch(e) { warRank.value = []; }
}

async function attackEnemy(targetId) {
  if (!currentWar.value) return;
  try {
    const d = await Api.post(`/guild/war-attack/${currentWar.value}`, { target_user_id: targetId });
    msg.value = d.msg;
    msgType.value = d.success ? 'success' : 'error';
    await loadWarDetail(currentWar.value);
    await loadWarEnemies(currentWar.value);
    await loadWarRank(currentWar.value);
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function forceStartWar(warId) {
  try {
    const d = await Api.post(`/guild/war-force-start/${warId}`);
    msg.value = d.msg;
    msgType.value = d.success ? 'success' : 'error';
    await loadWars();
    if (warDetailOpen.value) await viewWarDetail(warId);
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

async function endWar(warId) {
  if (!await globalConfirm('确认结束战争并结算？')) return;
  try {
    const d = await Api.post(`/guild/war-end/${warId}`);
    msg.value = d.msg;
    msgType.value = 'success';
    warDetailOpen.value = false;
    await loadWars();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}

// === 帮会BUFF/技能 ===
const skillList = ref([]);
const myBonus = ref({ atk: 0, def: 0, hp: 0, speed: 0 });
const guildExp = ref(0);
async function loadBuff() {
  try {
    const d = await Api.get('/guildskill/list');
    skillList.value = d.skills || [];
    guildExp.value = d.guild_exp || 0;
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
  try {
    myBonus.value = await Api.get('/guildskill/bonus');
  } catch(e) {}
}
function calcEffect(sk) {
  return (sk.level || 0) * sk.per_level;
}
function formatBonus(b) {
  if (!b) return '未激活';
  const parts = [];
  if (b.atk) parts.push(`+${b.atk}攻`);
  if (b.def) parts.push(`+${b.def}防`);
  if (b.hp) parts.push(`+${b.hp}血`);
  if (b.speed) parts.push(`+${b.speed}速`);
  return parts.length ? parts.join(' ') : '未激活';
}
function canUpgrade(sk) {
  if (!isLeader.value) return false;
  if (sk.level >= sk.maxLevel) return false;
  if (guildExp.value < sk.expToNext) return false;
  return true;
}
async function upgradeSkill(key) {
  try {
    const d = await Api.post('/guildskill/upgrade', { skill_key: key });
    msg.value = d.msg || '升级成功';
    msgType.value = 'success';
    await loadBuff();
  } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
</script>

<style scoped>
/* BOSS 面板 */
.boss-panel { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px; }
.boss-loading { text-align: center; padding: 40px; color: rgba(255,255,255,0.6); position: relative; z-index: 2; }
.boss-banner { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: linear-gradient(135deg, rgba(231,76,60,0.25), rgba(192,57,43,0.15)); border: 1px solid rgba(231,76,60,0.4); border-radius: 12px; }
.bb-icon { font-size: 48px; animation: bbPulse 2s ease-in-out infinite; }
@keyframes bbPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.bb-info { flex: 1; }
.bb-name { font-size: 18px; font-weight: 700; color: #fff; }
.bb-meta { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px; }
.boss-hp { padding: 14px 16px; background: rgba(0,0,0,0.3); border-radius: 12px; }
.bh-label { display: flex; justify-content: space-between; color: #fff; font-size: 13px; margin-bottom: 8px; }
.bh-pct { color: #f1c40f; font-weight: 700; }
.bh-bar { height: 14px; background: rgba(0,0,0,0.5); border-radius: 7px; overflow: hidden; }
.bh-fill { height: 100%; background: linear-gradient(90deg, #e74c3c, #f39c12, #f1c40f); border-radius: 7px; transition: width 0.5s ease; box-shadow: 0 0 8px rgba(241,196,15,0.5); }
.bh-num { text-align: center; color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 6px; font-family: monospace; }
.boss-killed { padding: 12px; text-align: center; background: rgba(46,204,113,0.2); border: 1px solid rgba(46,204,113,0.4); border-radius: 10px; color: #2ecc71; font-weight: 700; }
.boss-action { display: flex; gap: 10px; }
.boss-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; border: 0; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(231,76,60,0.3); transition: transform 0.15s; }
.boss-btn:hover:not(:disabled) { transform: translateY(-2px); }
.boss-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.boss-btn-claim { background: linear-gradient(135deg, #f1c40f, #f39c12); box-shadow: 0 4px 12px rgba(241,196,15,0.4); }
.boss-reward-claimed { padding: 10px 14px; text-align: center; background: rgba(46,204,113,0.15); border-radius: 8px; color: #2ecc71; font-size: 13px; }
.boss-log { padding: 10px 14px; background: rgba(0,0,0,0.4); border-radius: 8px; color: #fff; font-weight: 700; }
.log-hit { border-left: 3px solid #f39c12; }
.log-crit { border-left: 3px solid #e74c3c; background: rgba(231,76,60,0.3); }
.log-meta { display: block; font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 400; margin-top: 4px; }
.boss-rank { padding: 12px 14px; background: rgba(0,0,0,0.3); border-radius: 10px; }
.br-title { color: #f1c40f; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.br-empty { color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; padding: 12px; }
.br-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; }
.br-row.me { background: rgba(241,196,15,0.15); }
.br-rank { font-size: 16px; width: 24px; text-align: center; }
.br-name { flex: 1; color: #fff; font-size: 13px; }
.br-dmg { color: #f39c12; font-weight: 700; font-size: 13px; font-family: monospace; }

.guild-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
/* HUD */
.gh-emblem { font-size: 28px; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 12px; flex-shrink: 0; }
.gh-info { flex: 1; }
.gh-name { font-size: 15px; font-weight: 700; color: #f0f0f0; }
.gh-meta { display: flex; gap: 8px; font-size: 10px; color: #7f8c8d; margin-top: 3px; flex-wrap: wrap; }

/* 公告 */
.guild-notice {
  position: relative; z-index: 2;
  background: rgba(241,196,15,0.06); border: 1px solid rgba(241,196,15,0.2);
  border-left: 3px solid #f1c40f; border-radius: 8px;
  padding: 8px 12px; font-size: 11px; color: #f1c40f;
}

/* Toast */
.guild-toast { position: relative; z-index: 2; border-radius: 8px; padding: 7px 12px; font-size: 11px; }
.toast-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.toast-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* Tab */
.guild-tabs { position: relative; z-index: 2; display: flex; gap: 6px; }
.gt-btn {
  flex: 1; padding: 8px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #7f8c8d; font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.gt-btn.active { background: rgba(241,196,15,0.1); border-color: rgba(241,196,15,0.4); color: #f1c40f; }

/* 成员列表 */
.member-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; }
.member-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px;
}
.mc-avatar { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.mc-info { flex: 1; }
.mc-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mc-lv { font-size: 10px; color: #7f8c8d; font-weight: 400; }
.mc-role-tag { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #7f8c8d; }
.mc-online { font-size: 10px; }
.online { color: #2ecc71; }
.offline { color: #555; }
.mc-kick { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; padding: 4px 10px; border-radius: 6px; font-size: 10px; cursor: pointer; transition: all 0.2s; }
.mc-kick:hover { background: rgba(231,76,60,0.2); }

/* 公告编辑 */
.notice-edit { position: relative; z-index: 2; display: flex; gap: 6px; }
.notice-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #f0f0f0; outline: none;
}
.notice-input:focus { border-color: rgba(255,255,255,0.2); }
.notice-save { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 11px; font-weight: 600; cursor: pointer; }

/* 危险区 */
.guild-danger-zone { position: relative; z-index: 2; }
.gz-btn { width: 100%; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; transition: opacity 0.2s; }
.gz-leave { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.gz-disband { background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.4); color: #e74c3c; }
.gz-btn:hover { opacity: 0.85; }

/* 帮会列表 */
.guild-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; }
.guild-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px;
}
.guild-card.current { border-color: rgba(241,196,15,0.4); background: rgba(241,196,15,0.04); }
.gc-emblem { font-size: 22px; }
.gc-body { flex: 1; }
.gc-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.gc-meta { font-size: 10px; color: #7f8c8d; margin-top: 2px; }

/* 未入帮 */
.join-section { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.js-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; }
.js-title { font-size: 13px; font-weight: 700; color: #f0f0f0; margin-bottom: 4px; }
.js-cost { font-size: 10px; color: #7f8c8d; margin-bottom: 8px; }
.js-row { display: flex; gap: 6px; }
.js-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #f0f0f0; outline: none; }
.js-input:focus { border-color: rgba(255,255,255,0.2); }
.js-btn { padding: 8px 14px; border: none; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
.js-btn-create { background: linear-gradient(135deg, #4a1a1a, #c0392b); color: #fff; }
.js-btn-join { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; }
.js-btn:hover { opacity: 0.9; }

/* === 帮会领地 === */
.terr-banner { position: relative; z-index: 2; padding: 10px 14px; background: rgba(52,152,219,0.1); border: 1px solid rgba(52,152,219,0.3); border-radius: 10px; color: #5dade2; font-size: 11px; text-align: center; }
.terr-loading { text-align: center; padding: 30px; color: rgba(255,255,255,0.5); position: relative; z-index: 2; font-size: 12px; }
.terr-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; }
.terr-card { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 12px; transition: all 0.2s; }
.terr-card.mine { border-color: rgba(241,196,15,0.4); background: rgba(241,196,15,0.04); }
.tc-icon { font-size: 28px; flex-shrink: 0; }
.tc-body { flex: 1; min-width: 0; }
.tc-name { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.tc-lv { font-size: 10px; color: #7f8c8d; font-weight: 400; margin-left: 4px; }
.tc-reward { font-size: 11px; color: #f39c12; margin-top: 3px; }
.tc-owner { font-size: 10px; margin-top: 2px; }
.tc-owner:not(.enemy):not(.free) { color: #f1c40f; }
.tc-owner.enemy { color: #e74c3c; }
.tc-owner.free { color: #2ecc71; }
.terr-btn { padding: 8px 12px; background: linear-gradient(135deg, #f1c40f, #f39c12); color: #000; border: 0; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
.terr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* === 帮会战争 === */
.war-declare { position: relative; z-index: 2; padding: 12px 14px; background: linear-gradient(135deg, rgba(231,76,60,0.12), rgba(192,57,43,0.06)); border: 1px solid rgba(231,76,60,0.3); border-radius: 12px; margin-bottom: 8px; }
.wd-title { font-size: 13px; font-weight: 700; color: #e74c3c; margin-bottom: 4px; }
.wd-tip { font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
.wd-row { display: flex; gap: 6px; }
.wd-select { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #f0f0f0; outline: none; }
.wd-btn { padding: 8px 14px; background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; border: 0; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
.wd-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.war-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.war-empty { text-align: center; padding: 30px; color: rgba(255,255,255,0.5); font-size: 12px; }
.war-card { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 12px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
.war-card.war-declared { border-color: rgba(241,196,15,0.3); }
.war-card.war-fighting { border-color: rgba(231,76,60,0.4); background: rgba(231,76,60,0.05); }
.wc-side { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.wc-attack { color: #e74c3c; }
.wc-defend { color: #3498db; }
.wc-avatar { font-size: 24px; }
.wc-name { font-size: 12px; font-weight: 700; color: #f0f0f0; text-align: center; word-break: break-all; }
.wc-win { font-size: 11px; color: #f1c40f; font-weight: 700; }
.wc-vs { font-size: 14px; font-weight: 900; color: #f1c40f; padding: 0 4px; }
.wc-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
.wc-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
.wc-side-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(241,196,15,0.15); color: #f1c40f; }
.wc-time { font-size: 10px; color: #e74c3c; font-weight: 600; }
.wc-join, .wc-detail { padding: 4px 10px; font-size: 10px; border: 0; border-radius: 6px; cursor: pointer; font-weight: 600; }
.wc-join { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; }
.wc-detail { background: rgba(255,255,255,0.08); color: #f0f0f0; border: 1px solid rgba(255,255,255,0.15); }
.wc-force { background: linear-gradient(135deg, #d68910, #f39c12); color: #fff; padding: 4px 10px; font-size: 10px; border: 0; border-radius: 6px; cursor: pointer; font-weight: 600; }
.wc-end { background: rgba(127,140,141,0.3); color: #bdc3c7; border: 1px solid rgba(127,140,141,0.4); padding: 4px 10px; font-size: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; }

/* 战况弹窗 */
.war-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.war-modal-card { background: linear-gradient(160deg, #1a2530 0%, #0d1117 100%); border: 1px solid rgba(231,76,60,0.3); border-radius: 14px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
.wm-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(231,76,60,0.2); }
.wm-title { font-size: 15px; font-weight: 700; color: #fff; }
.wm-close { background: none; border: 0; color: #95a5a6; font-size: 20px; cursor: pointer; padding: 0 4px; }
.wm-close:hover { color: #e74c3c; }
.wm-scores { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: rgba(0,0,0,0.3); }
.wms-side { text-align: center; flex: 1; }
.wms-name { font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
.wms-score { font-size: 28px; font-weight: 800; }
.wms-att .wms-score { color: #e74c3c; }
.wms-def .wms-score { color: #3498db; }
.wms-vs { font-size: 16px; font-weight: 700; color: #95a5a6; padding: 0 12px; }
.wm-status { text-align: center; padding: 8px; font-size: 13px; font-weight: 600; color: #f39c12; background: rgba(243,156,18,0.1); border-bottom: 1px solid rgba(243,156,18,0.2); }
.wm-section { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.06); }
.wms-h { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); margin-bottom: 10px; }
.wm-enemy-list { display: flex; flex-direction: column; gap: 6px; }
.wm-enemy { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(231,76,60,0.08); border: 1px solid rgba(231,76,60,0.2); border-radius: 8px; }
.wme-info { flex: 1; }
.wme-name { font-size: 12px; font-weight: 600; color: #fff; }
.wme-hp { font-size: 10px; color: #e74c3c; margin-top: 2px; }
.wme-attack { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; border: 0; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
.wme-attack:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(231,76,60,0.4); }
.wm-rank { display: flex; flex-direction: column; gap: 4px; }
.wmr-row { display: grid; grid-template-columns: 20px 1fr auto auto auto; gap: 8px; align-items: center; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 11px; }
.wmr-idx { font-weight: 700; color: #f39c12; }
.wmr-name { color: #fff; font-weight: 600; }
.wmr-guild { color: rgba(255,255,255,0.5); font-size: 10px; }
.wmr-guild.wmr-my { color: #f39c12; font-weight: 700; }
.wmr-ct { color: #c0392b; font-weight: 600; }
.wmr-kc { color: rgba(255,255,255,0.5); }

/* === 帮会BUFF === */
.buff-hud { position: relative; z-index: 2; padding: 12px 14px; background: linear-gradient(135deg, rgba(155,89,182,0.15), rgba(142,68,173,0.06)); border: 1px solid rgba(155,89,182,0.3); border-radius: 12px; margin-bottom: 10px; }
.bh-title { font-size: 14px; font-weight: 700; color: #bb8fce; margin-bottom: 4px; }
.bh-tip { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.bh-tip strong { color: #f1c40f; }
.bh-bonus { display: flex; gap: 12px; flex-wrap: wrap; padding: 8px 10px; background: rgba(0,0,0,0.25); border-radius: 8px; }
.bbb-item { font-size: 12px; color: #f1c40f; font-weight: 700; }

.skill-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.skill-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
.skill-card.rarity-epic { border-color: rgba(155,89,182,0.4); background: linear-gradient(135deg, rgba(155,89,182,0.08), rgba(255,255,255,0.04)); }
.skill-card.rarity-legend { border-color: rgba(241,196,15,0.4); background: linear-gradient(135deg, rgba(241,196,15,0.08), rgba(255,255,255,0.04)); }
.sk-icon { font-size: 28px; flex-shrink: 0; width: 40px; text-align: center; }
.sk-info { flex: 1; min-width: 0; }
.sk-name { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.sk-lv { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 400; margin-left: 4px; }
.sk-desc { font-size: 11px; color: rgba(255,255,255,0.6); margin: 2px 0; }
.sk-effect { font-size: 11px; color: #f1c40f; }
.sk-cost { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.cost-num { color: #bb8fce; font-weight: 700; }
.sk-action { flex-shrink: 0; }
.sk-up-btn { padding: 6px 12px; background: linear-gradient(135deg, #8e44ad, #bb8fce); color: #fff; border: 0; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
.sk-up-btn:active { transform: scale(0.96); }
.sk-max { font-size: 11px; color: #f1c40f; font-weight: 700; }
.sk-noauth { font-size: 10px; color: rgba(255,255,255,0.4); }

.buff-tip-card { position: relative; z-index: 2; margin-top: 10px; padding: 10px 12px; background: rgba(241,196,15,0.06); border: 1px solid rgba(241,196,15,0.2); border-radius: 10px; font-size: 11px; color: rgba(255,255,255,0.7); text-align: center; }
</style>