<template>
<div class="guild-page">
  <div class="guild-bg"></div>

  <template v-if="myGuild">
    <!-- 帮会信息 HUD -->
    <div class="guild-hud">
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
  </template>

  <!-- 未加入帮会 -->
  <template v-else>
    <div class="guild-hud">
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
</script>

<style scoped>
.guild-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.guild-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0d0d 50%, #0d1117 100%);
  pointer-events: none;
}

/* HUD */
.guild-hud {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 12px;
}
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
</style>