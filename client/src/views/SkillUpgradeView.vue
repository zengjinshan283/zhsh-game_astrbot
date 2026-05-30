<template>
  <div class="skill-page">
    <div class="skill-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">⚡</div>
        <div class="hud-title">技能升级</div>
      </div>
      <div class="hud-right">
        <span class="hud-gold">💰 {{ formatMoney(money) }}</span>
      </div>
    </div>

    <!-- 消息 -->
    <div v-if="msg" class="msg-card" :class="msgType === 'error' ? 'msg-err' : 'msg-ok'">
      {{ msg }}
    </div>

    <!-- 升级详情弹窗 -->
    <Teleport to="body">
      <div v-if="upgradeSkill" class="modal-overlay" @click.self="upgradeSkill = null">
        <div class="modal-card">
          <div class="modal-header">
            <div class="mh-icon">{{ skillTypeIcon(upgradeSkill.type) }}</div>
            <div class="mh-info">
              <div class="mh-name">{{ upgradeSkill.name }}</div>
              <div class="mh-type">{{ skillTypeLabel(upgradeSkill.type) }} · Lv.{{ upgradeSkill.level }} → {{ upgradeSkill.level + 1 }}</div>
            </div>
            <button class="mh-close" @click="upgradeSkill = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="upgrade-preview">
              <div class="up-label">升级效果预览</div>
              <div class="up-compare">
                <div class="upc-row">
                  <span class="upcr-label">攻击力加成</span>
                  <span class="upcr-old">{{ upgradeSkill.current.atk_multiplier }}x</span>
                  <span class="upcr-arrow">→</span>
                  <span class="upcr-new">{{ upgradeSkill.next.atk_multiplier }}x</span>
                </div>
                <div class="upc-row">
                  <span class="upcr-label">防御加成</span>
                  <span class="upcr-old">{{ upgradeSkill.current.def_multiplier }}x</span>
                  <span class="upcr-arrow">→</span>
                  <span class="upcr-new">{{ upgradeSkill.next.def_multiplier }}x</span>
                </div>
                <div class="upc-row" v-if="upgradeSkill.current.mp_cost">
                  <span class="upcr-label">消耗MP</span>
                  <span class="upcr-old">{{ upgradeSkill.current.mp_cost }}</span>
                  <span class="upcr-arrow">→</span>
                  <span class="upcr-new">{{ upgradeSkill.next.mp_cost }}</span>
                </div>
                <div class="upc-row" v-if="upgradeSkill.current.cooldown">
                  <span class="upcr-label">冷却秒数</span>
                  <span class="upcr-old">{{ upgradeSkill.current.cooldown }}s</span>
                  <span class="upcr-arrow">→</span>
                  <span class="upcr-new">{{ upgradeSkill.next.cooldown }}s</span>
                </div>
              </div>
              <div class="up-cost">
                <span class="upc-icon">💰</span>
                <span class="upc-label">升级费用：</span>
                <span class="upc-val">{{ upgradeSkill.cost }} 铜币</span>
              </div>
            </div>
            <div class="modal-actions">
              <button class="ma-cancel" @click="upgradeSkill = null">取消</button>
              <button class="ma-upgrade" @click="doUpgrade">立即升级</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 分类 Tab -->
      <div class="filter-bar">
        <div v-for="f in filters" :key="f.key" :class="['filter-btn', { active: activeFilter === f.key }]" @click="activeFilter = f.key">
          {{ f.icon }} {{ f.label }}
        </div>
      </div>

      <!-- 无技能提示 -->
      <div v-if="!filteredSkills.length" class="empty-card">
        <div class="empty-icon">📜</div>
        <div class="empty-text">{{ activeFilter === 'all' ? '尚未学会任何技能' : '此类暂无技能' }}</div>
        <div class="empty-tip">可找师父学习技能</div>
      </div>

      <!-- 技能列表 -->
      <div class="skill-list">
        <div v-for="s in filteredSkills" :key="s.id" class="skill-card" :class="'type-' + s.type">
          <div class="sc-header">
            <div class="sch-icon">{{ skillTypeIcon(s.type) }}</div>
            <div class="sch-info">
              <div class="sch-name">{{ s.name }}</div>
              <div class="sch-meta">
                <span class="sch-type">{{ skillTypeLabel(s.type) }}</span>
                <span class="sch-lv">Lv.{{ s.level }}/10</span>
                <span v-if="s.level >= 10" class="sch-max">满级</span>
              </div>
            </div>
            <div class="sch-level">
              <div class="sl-badge" :class="s.level >= 10 ? 'sl-max' : 'sl-normal'">{{ s.level }}</div>
            </div>
          </div>

          <div class="sc-desc">{{ s.description || '无描述' }}</div>

          <div class="sc-stats">
            <div class="scs-item">
              <span class="scsi-label">⚔️攻击</span>
              <span class="scsi-val" :class="s.type === 1 ? 'stat-atk' : 'stat-inactive'">{{ s.atk_multiplier }}x</span>
            </div>
            <div class="scs-item">
              <span class="scsi-label">🛡️防御</span>
              <span class="scsi-val" :class="s.type === 2 ? 'stat-def' : 'stat-inactive'">{{ s.def_multiplier }}x</span>
            </div>
            <div class="scs-item" v-if="s.mp_cost > 0">
              <span class="scsi-label">💧MP</span>
              <span class="scsi-val">{{ s.mp_cost }}</span>
            </div>
            <div class="scs-item" v-if="s.cooldown > 0">
              <span class="scsi-label">⏱️冷却</span>
              <span class="scsi-val">{{ s.cooldown }}s</span>
            </div>
          </div>

          <!-- 冷却中 -->
          <div v-if="s.cooldown_remaining > 0" class="sc-cooldown">
            <span>⏳ 冷却中：{{ fmtCd(s.cooldown_remaining) }}</span>
          </div>

          <!-- 经验条 -->
          <div class="sc-exp-bar" v-if="s.level < 10">
            <div class="exp-fill" :style="{ width: (s.level / 10 * 100) + '%' }"></div>
          </div>

          <div class="sc-action">
            <div class="sca-cost" v-if="s.level < 10">
              💰 {{ getCost(s) }} 铜币
            </div>
            <button
              v-if="s.level < 10"
              class="sca-upgrade-btn"
              @click="previewUpgrade(s)"
              :disabled="money < getCost(s) || s.cooldown_remaining > 0"
            >
              ⬆️ 升级
            </button>
            <div v-else class="sca-max">⭐ 最高级</div>
          </div>
        </div>
      </div>
    </div>

    <button @click="$router.back()" class="back-btn">返回</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';
import { globalAlert } from '../composables/useConfirm';

const loading = ref(true);
const skills = ref([]);
const money = ref(0);
const msg = ref('');
const msgType = ref('');
const activeFilter = ref('all');
const upgradeSkill = ref(null);
let refreshTimer = null;
const now = ref(Date.now());

const filters = [
  { key: 'all', label: '全部', icon: '📜' },
  { key: '1', label: '攻击', icon: '⚔️' },
  { key: '2', label: '防御', icon: '🛡️' },
  { key: '3', label: '被动', icon: '✨' },
];

const filteredSkills = computed(() => {
  if (activeFilter.value === 'all') return skills.value;
  return skills.value.filter(s => String(s.type) === activeFilter.value);
});

function skillTypeIcon(type) {
  return { 1: '⚔️', 2: '🛡️', 3: '✨' }[type] || '📜';
}
function skillTypeLabel(type) {
  return { 1: '攻击技能', 2: '防御技能', 3: '被动技能' }[type] || '通用';
}

function fmtCd(sec) {
  if (sec >= 3600) return Math.floor(sec / 3600) + '小时';
  if (sec >= 60) return Math.floor(sec / 60) + '分';
  return sec + '秒';
}

async function load() {
  try {
    loading.value = true;
    const [skillRes, statusRes] = await Promise.all([
      Api.get('/npc/skills/my'),
      Api.get('/user/status')
    ]);
    skills.value = skillRes.skills || [];
    money.value = statusRes.user?.money || 0;
  } catch (e) {
    msg.value = e.message;
    msgType.value = 'error';
  } finally {
    loading.value = false;
  }
}

async function previewUpgrade(s) {
  try {
    const d = await Api.get('/skill/upgrade-info', { skill_id: s.skill_id });
    upgradeSkill.value = { ...s, ...d };
  } catch (e) {
    msg.value = e.message;
    msgType.value = 'error';
  }
}

async function doUpgrade() {
  if (!upgradeSkill.value) return;
  try {
    const d = await Api.post('/skill/upgrade', { skill_id: upgradeSkill.value.skill_id });
    msg.value = d.msg;
    msgType.value = 'success';
    upgradeSkill.value = null;
    await load();
  } catch (e) {
    msg.value = e.message;
    msgType.value = 'error';
  }
}

onMounted(() => { load(); refreshTimer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<style scoped>
.skill-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.skill-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1a0d 50%, #0d1117 100%);
  pointer-events: none;
}
.top-hud {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-gold { font-size: 13px; color: #f1c40f; font-weight: 600; }

.msg-card {
  position: relative; z-index: 2; border-radius: 10px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.msg-err { background: rgba(184,90,58,0.12); border: 1px solid rgba(184,90,58,0.3); color: #e74c3c; }
.msg-ok { background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.3); color: #27ae60; }

.loading-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #c9a84c; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }

.filter-bar { display: flex; gap: 6px; }
.filter-btn {
  flex: 1; text-align: center; padding: 7px 6px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; font-size: 11px; color: #7f8c8d; cursor: pointer; transition: all 0.2s;
}
.filter-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.3); color: #c9a84c; }

.empty-card { text-align: center; padding: 30px; }
.empty-icon { font-size: 32px; }
.empty-text { font-size: 13px; color: #7f8c8d; margin-top: 8px; }
.empty-tip { font-size: 11px; color: #555; margin-top: 4px; }

.skill-list { display: flex; flex-direction: column; gap: 8px; }
.skill-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px;
}
.skill-card.type-1 { border-left: 3px solid rgba(231,76,60,0.5); }
.skill-card.type-2 { border-left: 3px solid rgba(52,152,219,0.5); }
.skill-card.type-3 { border-left: 3px solid rgba(201,168,76,0.5); }

.sc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sch-icon { font-size: 28px; flex-shrink: 0; }
.sch-info { flex: 1; }
.sch-name { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.sch-meta { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
.sch-type { font-size: 10px; color: #7f8c8d; }
.sch-lv { font-size: 10px; color: #c9a84c; }
.sch-max { font-size: 10px; color: #27ae60; }
.sch-level { flex-shrink: 0; }
.sl-badge {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
}
.sl-normal { background: rgba(201,168,76,0.15); border: 2px solid rgba(201,168,76,0.4); color: #c9a84c; }
.sl-max { background: rgba(39,174,96,0.15); border: 2px solid rgba(39,174,96,0.4); color: #27ae60; }

.sc-desc { font-size: 11px; color: #7f8c8d; margin-bottom: 8px; line-height: 1.4; }

.sc-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.scs-item { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); padding: 3px 8px; border-radius: 6px; }
.scsi-label { font-size: 10px; color: #7f8c8d; }
.scsi-val { font-size: 12px; font-weight: 700; color: #f0f0f0; }
.stat-atk { color: #e74c3c; }
.stat-def { color: #3498db; }
.stat-inactive { color: #555; }

.sc-cooldown { font-size: 11px; color: #f39c12; margin-bottom: 6px; }
.sc-exp-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
.exp-fill { height: 100%; background: linear-gradient(90deg, #c9a84c, #f1c40f); border-radius: 2px; transition: width 0.4s; }

.sc-action { display: flex; align-items: center; justify-content: space-between; }
.sca-cost { font-size: 12px; color: #f1c40f; }
.sca-upgrade-btn {
  background: linear-gradient(135deg, #c9a84c, #a08040); border: none;
  border-radius: 8px; color: #0a0a1a; font-weight: 700;
  font-size: 12px; padding: 7px 18px; cursor: pointer; transition: all 0.2s;
}
.sca-upgrade-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(201,168,76,0.4); }
.sca-upgrade-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sca-max { font-size: 12px; color: #27ae60; font-weight: 600; }

/* 弹窗 */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: rgba(13,17,23,0.96); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; width: 100%; max-width: 340px; max-height: 80vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); gap: 12px;
}
.mh-icon { font-size: 32px; }
.mh-info { flex: 1; }
.mh-name { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.mh-type { font-size: 12px; color: #7f8c8d; margin-top: 2px; }
.mh-close { background: none; border: none; color: #555; font-size: 18px; cursor: pointer; }
.mh-close:hover { color: #888; }
.modal-body { padding: 16px; }
.upgrade-preview { margin-bottom: 14px; }
.up-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.up-compare { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px 14px; margin-bottom: 10px; }
.upc-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; }
.upcr-label { flex: 1; color: #7f8c8d; }
.upcr-old { color: #e74c3c; text-decoration: line-through; }
.upcr-arrow { color: #555; }
.upcr-new { color: #27ae60; font-weight: 700; }
.up-cost { display: flex; align-items: center; gap: 6px; font-size: 14px; }
.upc-icon { font-size: 16px; }
.upc-label { color: #7f8c8d; }
.upc-val { color: #f1c40f; font-weight: 700; }
.modal-actions { display: flex; gap: 8px; }
.ma-cancel {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 13px; padding: 10px; cursor: pointer;
}
.ma-upgrade {
  flex: 2; background: linear-gradient(135deg, #c9a84c, #a08040); border: none;
  border-radius: 8px; color: #0a0a1a; font-weight: 700; font-size: 13px;
  padding: 10px; cursor: pointer; transition: all 0.2s;
}
.ma-upgrade:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(201,168,76,0.4); }

.back-btn {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #7f8c8d; font-size: 13px;
  padding: 10px; width: 100%; cursor: pointer; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.08); }
</style>